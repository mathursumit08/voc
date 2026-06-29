import { pool } from "../db/pool.js";

type CrmTaskStatus = "Open" | "InProgress" | "Closed" | "Cancelled";
type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";

export interface CrmTaskDto {
  id: string;
  feedbackRecordId: string;
  customerId: string | null;
  dealerId: string | null;
  title: string;
  description: string | null;
  priority: UrgencyLevel;
  status: CrmTaskStatus;
  dueAt: string | null;
  closedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateCrmTaskInput {
  feedbackRecordId: string;
  dealerCode?: string;
  dueAt?: string;
}

interface CloseCrmTaskInput {
  taskId: string;
  resolutionNotes: string;
  dealerCode?: string;
}

function defaultDueAt(priority: UrgencyLevel) {
  const dueDate = new Date();
  const daysToAdd = priority === "Critical" ? 1 : priority === "High" ? 2 : 3;
  dueDate.setUTCDate(dueDate.getUTCDate() + daysToAdd);
  return dueDate.toISOString();
}

async function loadFeedbackForTask(feedbackRecordId: string, dealerCode?: string) {
  const values: unknown[] = [feedbackRecordId];
  const dealerScopeSql = dealerCode ? "AND d.code = $2" : "";

  if (dealerCode) {
    values.push(dealerCode);
  }

  const result = await pool.query<{
    id: string;
    sourceReferenceId: string;
    customerId: string | null;
    dealerId: string | null;
    dealerName: string | null;
    customerName: string | null;
    issueCategory: string;
    urgencyLevel: UrgencyLevel;
    rawText: string;
  }>(
    `
      SELECT
        fr.id,
        fr.source_reference_id AS "sourceReferenceId",
        fr.customer_id AS "customerId",
        fr.dealer_id AS "dealerId",
        d.name AS "dealerName",
        c.masked_name AS "customerName",
        COALESCE(ic.category::text, 'Other') AS "issueCategory",
        COALESCE(ic.urgency_level, 'Medium'::"UrgencyLevel") AS "urgencyLevel",
        fr.raw_text AS "rawText"
      FROM feedback_records fr
      LEFT JOIN dealers d ON d.id = fr.dealer_id
      LEFT JOIN customers c ON c.id = fr.customer_id
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      WHERE fr.id = $1::uuid
      ${dealerScopeSql}
    `,
    values
  );

  return result.rows[0] ?? null;
}

async function loadActiveTaskForFeedback(feedbackRecordId: string) {
  const result = await pool.query<CrmTaskDto>(
    `
      SELECT
        id,
        feedback_record_id AS "feedbackRecordId",
        customer_id AS "customerId",
        dealer_id AS "dealerId",
        title,
        description,
        priority::text AS priority,
        status::text AS status,
        due_at AS "dueAt",
        closed_at AS "closedAt",
        resolution_notes AS "resolutionNotes",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM crm_tasks
      WHERE feedback_record_id = $1::uuid
        AND status IN ('Open'::"CrmTaskStatus", 'InProgress'::"CrmTaskStatus")
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

export async function createCrmTaskForFeedback(input: CreateCrmTaskInput) {
  const feedback = await loadFeedbackForTask(input.feedbackRecordId, input.dealerCode);

  if (!feedback) {
    return null;
  }

  const activeTask = await loadActiveTaskForFeedback(input.feedbackRecordId);

  if (activeTask) {
    return activeTask;
  }

  const priority = feedback.urgencyLevel;
  const title = `${priority} recovery: ${feedback.issueCategory}`;
  const description = [
    `Mock CRM recovery task for feedback ${feedback.sourceReferenceId}.`,
    `Dealer: ${feedback.dealerName ?? "Unassigned"}.`,
    `Customer: ${feedback.customerName ?? "Unknown"}.`,
    `Issue: ${feedback.issueCategory}.`
  ].join(" ");

  const result = await pool.query<CrmTaskDto>(
    `
      INSERT INTO crm_tasks (
        feedback_record_id,
        customer_id,
        dealer_id,
        title,
        description,
        priority,
        status,
        due_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::"UrgencyLevel", 'Open'::"CrmTaskStatus", $7::timestamptz, now())
      RETURNING
        id,
        feedback_record_id AS "feedbackRecordId",
        customer_id AS "customerId",
        dealer_id AS "dealerId",
        title,
        description,
        priority::text AS priority,
        status::text AS status,
        due_at AS "dueAt",
        closed_at AS "closedAt",
        resolution_notes AS "resolutionNotes",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      feedback.id,
      feedback.customerId,
      feedback.dealerId,
      title,
      description,
      priority,
      input.dueAt ?? defaultDueAt(priority)
    ]
  );

  return result.rows[0];
}

export async function closeCrmTask(input: CloseCrmTaskInput) {
  const values: unknown[] = [input.taskId, input.resolutionNotes.trim()];

  if (input.dealerCode) {
    values.push(input.dealerCode);
  }

  const result = await pool.query<CrmTaskDto>(
    `
      UPDATE crm_tasks task
      SET
        status = 'Closed'::"CrmTaskStatus",
        resolution_notes = $2,
        closed_at = now(),
        updated_at = now()
      WHERE task.id = $1::uuid
        ${input.dealerCode ? "AND EXISTS (SELECT 1 FROM dealers d WHERE d.id = task.dealer_id AND d.code = $3)" : ""}
      RETURNING
        task.id,
        task.feedback_record_id AS "feedbackRecordId",
        task.customer_id AS "customerId",
        task.dealer_id AS "dealerId",
        task.title,
        task.description,
        task.priority::text AS priority,
        task.status::text AS status,
        task.due_at AS "dueAt",
        task.closed_at AS "closedAt",
        task.resolution_notes AS "resolutionNotes",
        task.created_at AS "createdAt",
        task.updated_at AS "updatedAt"
    `,
    values
  );

  return result.rows[0] ?? null;
}
