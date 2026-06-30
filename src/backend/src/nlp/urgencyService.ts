import { pool } from "../db/pool.js";
import { createReviewQueueItem } from "../review/reviewQueueService.js";
import { processFeedbackIssueClassification } from "./issueClassificationService.js";
import { detectRepeatComplaint } from "./repeatComplaintService.js";

type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";

const severeComplaintPattern = /\b(urgent|urgently|escalation|senior technician|unsafe|breakdown|stranded|repeat|came back|still unresolved|unresolved|issue remains)\b/i;

const categoryWeights: Record<string, number> = {
  VehicleQuality: 22,
  RepairQuality: 20,
  WarrantyConcern: 16,
  PartsAvailability: 14,
  DeliveryDelay: 12,
  PriceTransparency: 10,
  ServiceQuality: 8,
  StaffBehavior: 8,
  FacilityExperience: 5,
  DigitalExperience: 5,
  Other: 6
};

const sentimentWeights: Record<string, number> = {
  Negative: 28,
  Mixed: 16,
  Neutral: 6,
  Positive: 0,
  Unknown: 8
};

export interface UrgencyProcessingResult {
  feedbackRecordId: string;
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  isCritical: boolean;
  repeatComplaintCount: number;
  factors: string[];
}

export interface UrgencyBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: UrgencyProcessingResult[];
}

function scoreToUrgencyLevel(score: number): UrgencyLevel {
  if (score >= 80) {
    return "Critical";
  }

  if (score >= 60) {
    return "High";
  }

  if (score >= 35) {
    return "Medium";
  }

  return "Low";
}

async function loadUrgencyContext(feedbackRecordId: string) {
  const result = await pool.query<{
    id: string;
    processedText: string;
    sentimentLabel: string;
    category: string;
    explanation: string | null;
  }>(
    `
      SELECT
        fr.id,
        COALESCE(nr.translated_text, fr.masked_text, fr.raw_text) AS "processedText",
        COALESCE(nr.sentiment_label::text, 'Unknown') AS "sentimentLabel",
        ic.category::text AS category,
        ic.explanation
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      WHERE fr.id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

function calculateUrgencyScore(context: Awaited<ReturnType<typeof loadUrgencyContext>>, repeatComplaintCount: number) {
  if (!context) {
    return {
      urgencyScore: 0,
      factors: [] as string[]
    };
  }

  const factors: string[] = [];
  let score = 10;

  const sentimentScore = sentimentWeights[context.sentimentLabel] ?? sentimentWeights.Unknown;
  score += sentimentScore;
  factors.push(`sentiment=${context.sentimentLabel} +${sentimentScore}`);

  const categoryScore = categoryWeights[context.category] ?? categoryWeights.Other;
  score += categoryScore;
  factors.push(`issue=${context.category} +${categoryScore}`);

  if (repeatComplaintCount > 0) {
    const repeatScore = Math.min(repeatComplaintCount * 14, 28);
    score += repeatScore;
    factors.push(`repeatComplaints=${repeatComplaintCount} +${repeatScore}`);
  }

  if (severeComplaintPattern.test(context.processedText)) {
    score += 22;
    factors.push("severityKeywords +22");
  }

  return {
    urgencyScore: Math.min(score, 100),
    factors
  };
}

async function storeUrgencyResult(feedbackRecordId: string, urgencyScore: number, urgencyLevel: UrgencyLevel, factors: string[], existingExplanation: string | null) {
  await pool.query(
    `
      UPDATE issue_classifications
      SET
        urgency_level = $2::"UrgencyLevel",
        explanation = $3,
        updated_at = now()
      WHERE feedback_record_id = $1::uuid
        AND is_primary = true
    `,
    [
      feedbackRecordId,
      urgencyLevel,
      `Urgency score: ${urgencyScore}/100. Factors: ${factors.join("; ")}. Classification rationale: ${
        existingExplanation ?? "Not available."
      }`
    ]
  );
}

export async function processFeedbackUrgency(feedbackRecordId: string) {
  const classificationResult = await processFeedbackIssueClassification(feedbackRecordId);

  if (!classificationResult) {
    return null;
  }

  const context = await loadUrgencyContext(feedbackRecordId);

  if (!context) {
    return null;
  }

  const repeatComplaint = await detectRepeatComplaint(context.id);
  const repeatComplaintCount = repeatComplaint?.repeatCount ?? 0;
  const { urgencyScore, factors } = calculateUrgencyScore(context, repeatComplaintCount);
  const urgencyLevel = scoreToUrgencyLevel(urgencyScore);

  await storeUrgencyResult(context.id, urgencyScore, urgencyLevel, factors, context.explanation);

  if (urgencyLevel === "Critical") {
    await createReviewQueueItem(context.id, "Critical feedback requires human review.");
  }

  return {
    feedbackRecordId: context.id,
    urgencyScore,
    urgencyLevel,
    isCritical: urgencyLevel === "Critical",
    repeatComplaintCount,
    factors
  };
}

export async function processPendingFeedbackUrgency(limit: number): Promise<UrgencyBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      WHERE ic.id IS NULL
        OR ic.explanation IS NULL
        OR ic.explanation NOT LIKE 'Urgency score:%'
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: UrgencyProcessingResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await processFeedbackUrgency(row.id);

    if (processedRecord) {
      records.push(processedRecord);
    }
  }

  return {
    requestedLimit: boundedLimit,
    processedCount: records.length,
    records
  };
}
