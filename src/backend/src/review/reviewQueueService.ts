import { pool } from "../db/pool.js";
import type { PoolClient } from "pg";

type ReviewQueueStatus = "Open" | "InReview" | "Resolved" | "Dismissed";
type SentimentLabel = "Positive" | "Neutral" | "Negative" | "Mixed" | "Unknown";
type IssueCategory =
  | "ServiceQuality"
  | "RepairQuality"
  | "StaffBehavior"
  | "PriceTransparency"
  | "PartsAvailability"
  | "WarrantyConcern"
  | "VehicleQuality"
  | "DeliveryDelay"
  | "FacilityExperience"
  | "DigitalExperience"
  | "Other";
type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";

export interface ReviewQueueListFilters {
  status?: ReviewQueueStatus;
  limit: number;
  offset: number;
}

export interface ReviewQueueItemDto {
  id: string;
  feedbackRecordId: string;
  status: ReviewQueueStatus;
  reason: string;
  assignedTo: string | null;
  reviewerNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  sourceReferenceId: string;
  feedbackDate: string;
  maskedText: string | null;
  rawText: string;
  dealerName: string | null;
  dealerCode: string | null;
  sentimentLabel: SentimentLabel | null;
  topics: string[] | null;
  issueCategory: IssueCategory | null;
  urgencyLevel: UrgencyLevel | null;
}

export interface ReviewQueueListResult {
  totalCount: number;
  limit: number;
  offset: number;
  records: ReviewQueueItemDto[];
}

export interface ResolveReviewQueueInput {
  reviewItemId: string;
  sentimentLabel: SentimentLabel;
  topics: string[];
  issueCategory: IssueCategory;
  urgencyLevel: UrgencyLevel;
  reviewerNotes: string;
  assignedTo: string;
}

export async function createReviewQueueItem(feedbackRecordId: string, reason: string, client?: PoolClient) {
  const queryable = client ?? pool;
  const result = await queryable.query<{ id: string }>(
    `
      INSERT INTO human_review_queue (
        feedback_record_id,
        status,
        reason
      )
      SELECT
        $1::uuid,
        'Open'::"ReviewQueueStatus",
        $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM human_review_queue
        WHERE feedback_record_id = $1::uuid
          AND status IN ('Open'::"ReviewQueueStatus", 'InReview'::"ReviewQueueStatus")
          AND reason = $2
      )
      RETURNING id
    `,
    [feedbackRecordId, reason]
  );

  return result.rows[0]?.id ?? null;
}

export async function listReviewQueueItems(filters: ReviewQueueListFilters): Promise<ReviewQueueListResult> {
  const boundedLimit = Math.min(Math.max(filters.limit, 1), 100);
  const boundedOffset = Math.max(filters.offset, 0);
  const values: unknown[] = [boundedLimit, boundedOffset];
  const statusSql = filters.status ? `WHERE hrq.status = $3::"ReviewQueueStatus"` : "";

  if (filters.status) {
    values.push(filters.status);
  }

  const result = await pool.query<ReviewQueueItemDto & { totalCount: number }>(
    `
      SELECT
        hrq.id,
        hrq.feedback_record_id AS "feedbackRecordId",
        hrq.status::text AS status,
        hrq.reason,
        hrq.assigned_to AS "assignedTo",
        hrq.reviewer_notes AS "reviewerNotes",
        hrq.resolved_at AS "resolvedAt",
        hrq.created_at AS "createdAt",
        fr.source_reference_id AS "sourceReferenceId",
        fr.feedback_date AS "feedbackDate",
        fr.masked_text AS "maskedText",
        fr.raw_text AS "rawText",
        d.name AS "dealerName",
        d.code AS "dealerCode",
        nr.sentiment_label::text AS "sentimentLabel",
        nr.topics,
        ic.category::text AS "issueCategory",
        ic.urgency_level::text AS "urgencyLevel",
        COUNT(*) OVER()::int AS "totalCount"
      FROM human_review_queue hrq
      JOIN feedback_records fr ON fr.id = hrq.feedback_record_id
      LEFT JOIN dealers d ON d.id = fr.dealer_id
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      ${statusSql}
      ORDER BY
        CASE hrq.status
          WHEN 'Open'::"ReviewQueueStatus" THEN 1
          WHEN 'InReview'::"ReviewQueueStatus" THEN 2
          ELSE 3
        END,
        hrq.created_at DESC
      LIMIT $1
      OFFSET $2
    `,
    values
  );

  return {
    totalCount: result.rows[0]?.totalCount ?? 0,
    limit: boundedLimit,
    offset: boundedOffset,
    records: result.rows.map(({ totalCount: _totalCount, ...row }) => row)
  };
}

export async function resolveReviewQueueItem(input: ResolveReviewQueueInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reviewItem = await client.query<{ feedbackRecordId: string }>(
      `
        SELECT feedback_record_id AS "feedbackRecordId"
        FROM human_review_queue
        WHERE id = $1::uuid
          AND status IN ('Open'::"ReviewQueueStatus", 'InReview'::"ReviewQueueStatus")
      `,
      [input.reviewItemId]
    );

    const feedbackRecordId = reviewItem.rows[0]?.feedbackRecordId;

    if (!feedbackRecordId) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `
        INSERT INTO nlp_results (
          feedback_record_id,
          detected_language,
          sentiment_label,
          topics,
          model_name,
          model_version,
          confidence_score,
          updated_at
        )
        VALUES ($1::uuid, 'English', $2::"SentimentLabel", $3::text[], 'human-review', 'prototype', 1, now())
        ON CONFLICT (feedback_record_id) DO UPDATE
        SET
          sentiment_label = EXCLUDED.sentiment_label,
          topics = EXCLUDED.topics,
          model_name = 'human-review',
          model_version = 'prototype',
          confidence_score = 1,
          updated_at = now()
      `,
      [feedbackRecordId, input.sentimentLabel, input.topics]
    );

    await client.query("DELETE FROM issue_classifications WHERE feedback_record_id = $1::uuid AND is_primary = true", [feedbackRecordId]);
    await client.query(
      `
        INSERT INTO issue_classifications (
          feedback_record_id,
          category,
          urgency_level,
          confidence_score,
          explanation,
          is_primary
        )
        VALUES ($1::uuid, $2::"IssueCategory", $3::"UrgencyLevel", 1, $4, true)
      `,
      [feedbackRecordId, input.issueCategory, input.urgencyLevel, `Human-reviewed classification. Notes: ${input.reviewerNotes}`]
    );

    const resolved = await client.query<ReviewQueueItemDto>(
      `
        UPDATE human_review_queue
        SET
          status = 'Resolved'::"ReviewQueueStatus",
          assigned_to = $2,
          reviewer_notes = $3,
          resolved_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING
          id,
          feedback_record_id AS "feedbackRecordId",
          status::text AS status,
          reason,
          assigned_to AS "assignedTo",
          reviewer_notes AS "reviewerNotes",
          resolved_at AS "resolvedAt",
          created_at AS "createdAt",
          NULL::text AS "sourceReferenceId",
          NULL::timestamptz AS "feedbackDate",
          NULL::text AS "maskedText",
          NULL::text AS "rawText",
          NULL::text AS "dealerName",
          NULL::text AS "dealerCode",
          $4::text AS "sentimentLabel",
          $5::text[] AS topics,
          $6::text AS "issueCategory",
          $7::text AS "urgencyLevel"
      `,
      [input.reviewItemId, input.assignedTo, input.reviewerNotes, input.sentimentLabel, input.topics, input.issueCategory, input.urgencyLevel]
    );

    await client.query(
      `
        UPDATE feedback_records
        SET processing_status = 'Completed'::"ProcessingStatus", updated_at = now()
        WHERE id = $1::uuid
      `,
      [feedbackRecordId]
    );

    await client.query("COMMIT");
    return resolved.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
