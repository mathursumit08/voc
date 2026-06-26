import { pool } from "../db/pool.js";
import { processFeedbackUrgency } from "./urgencyService.js";

type ChurnRiskLevel = "Low" | "Medium" | "High" | "Critical";

const sentimentWeights: Record<string, number> = {
  Negative: 28,
  Mixed: 18,
  Unknown: 10,
  Neutral: 6,
  Positive: 0
};

const urgencyWeights: Record<string, number> = {
  Critical: 26,
  High: 18,
  Medium: 10,
  Low: 2
};

const issueWeights: Record<string, number> = {
  VehicleQuality: 16,
  RepairQuality: 15,
  WarrantyConcern: 13,
  PartsAvailability: 10,
  DeliveryDelay: 9,
  PriceTransparency: 8,
  ServiceQuality: 7,
  StaffBehavior: 6,
  FacilityExperience: 4,
  DigitalExperience: 4,
  Other: 5
};

export interface ChurnRiskResult {
  feedbackRecordId: string;
  customerId: string;
  vehicleId: string | null;
  score: number;
  riskLevel: ChurnRiskLevel;
  reasonSummary: string;
}

export interface ChurnRiskBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: ChurnRiskResult[];
}

function scoreToRiskLevel(score: number): ChurnRiskLevel {
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

async function loadChurnRiskContext(feedbackRecordId: string) {
  const result = await pool.query<{
    feedbackRecordId: string;
    customerId: string | null;
    vehicleId: string | null;
    feedbackDate: string;
    sentimentLabel: string;
    urgencyLevel: string;
    issueCategory: string;
    repeatCount: number;
    priorFeedbackCount: number;
    priorJobCardCount: number;
    priorWarrantyClaimCount: number;
  }>(
    `
      SELECT
        fr.id AS "feedbackRecordId",
        fr.customer_id AS "customerId",
        fr.vehicle_id AS "vehicleId",
        fr.feedback_date AS "feedbackDate",
        COALESCE(nr.sentiment_label::text, 'Unknown') AS "sentimentLabel",
        COALESCE(ic.urgency_level::text, 'Low') AS "urgencyLevel",
        COALESCE(ic.category::text, 'Other') AS "issueCategory",
        COALESCE(rcs.repeat_count, 0)::int AS "repeatCount",
        (
          SELECT COUNT(*)::int
          FROM feedback_records prior_fr
          WHERE prior_fr.id <> fr.id
            AND prior_fr.customer_id = fr.customer_id
            AND prior_fr.feedback_date >= fr.feedback_date - INTERVAL '180 days'
            AND prior_fr.feedback_date <= fr.feedback_date
        ) AS "priorFeedbackCount",
        (
          SELECT COUNT(*)::int
          FROM job_cards jc
          WHERE jc.customer_id = fr.customer_id
            AND jc.opened_at >= fr.feedback_date - INTERVAL '180 days'
            AND jc.opened_at <= fr.feedback_date
        ) AS "priorJobCardCount",
        (
          SELECT COUNT(*)::int
          FROM warranty_claims wc
          WHERE wc.customer_id = fr.customer_id
            AND wc.claim_date >= fr.feedback_date - INTERVAL '180 days'
            AND wc.claim_date <= fr.feedback_date
        ) AS "priorWarrantyClaimCount"
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      LEFT JOIN repeat_complaint_signals rcs ON rcs.feedback_record_id = fr.id
      WHERE fr.id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

function calculateChurnRiskScore(context: NonNullable<Awaited<ReturnType<typeof loadChurnRiskContext>>>) {
  const factors: string[] = [];
  let score = 8;

  const sentimentScore = sentimentWeights[context.sentimentLabel] ?? sentimentWeights.Unknown;
  score += sentimentScore;
  factors.push(`sentiment=${context.sentimentLabel} +${sentimentScore}`);

  const urgencyScore = urgencyWeights[context.urgencyLevel] ?? urgencyWeights.Low;
  score += urgencyScore;
  factors.push(`urgency=${context.urgencyLevel} +${urgencyScore}`);

  const issueScore = issueWeights[context.issueCategory] ?? issueWeights.Other;
  score += issueScore;
  factors.push(`issue=${context.issueCategory} +${issueScore}`);

  if (context.repeatCount > 0) {
    const repeatScore = Math.min(context.repeatCount * 12, 24);
    score += repeatScore;
    factors.push(`repeatComplaints=${context.repeatCount} +${repeatScore}`);
  }

  // Service history is represented by recent feedback, job-card, and warranty activity.
  const serviceHistoryScore = Math.min(context.priorFeedbackCount * 3 + context.priorJobCardCount * 2 + context.priorWarrantyClaimCount * 5, 20);
  score += serviceHistoryScore;
  factors.push(
    `serviceHistory=feedback:${context.priorFeedbackCount},jobCards:${context.priorJobCardCount},warranty:${context.priorWarrantyClaimCount} +${serviceHistoryScore}`
  );

  return {
    score: Math.min(score, 100),
    factors
  };
}

async function storeChurnRiskScore(context: NonNullable<Awaited<ReturnType<typeof loadChurnRiskContext>>>, score: number, riskLevel: ChurnRiskLevel, reasonSummary: string) {
  const existingScore = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM churn_scores
      WHERE feedback_record_id = $1::uuid
      ORDER BY scored_at DESC
      LIMIT 1
    `,
    [context.feedbackRecordId]
  );

  if (existingScore.rows[0]) {
    await pool.query(
      `
        UPDATE churn_scores
        SET
          customer_id = $2::uuid,
          vehicle_id = $3::uuid,
          score = $4,
          risk_level = $5::"ChurnRiskLevel",
          reason_summary = $6,
          scored_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
      `,
      [existingScore.rows[0].id, context.customerId, context.vehicleId, score, riskLevel, reasonSummary]
    );
    return;
  }

  await pool.query(
    `
      INSERT INTO churn_scores (
        customer_id,
        vehicle_id,
        feedback_record_id,
        score,
        risk_level,
        reason_summary,
        scored_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::"ChurnRiskLevel", $6, now(), now())
    `,
    [context.customerId, context.vehicleId, context.feedbackRecordId, score, riskLevel, reasonSummary]
  );
}

export async function generateChurnRiskScore(feedbackRecordId: string): Promise<ChurnRiskResult | null> {
  // Churn scoring depends on urgency and repeat-complaint signals, so generate those first when needed.
  await processFeedbackUrgency(feedbackRecordId);

  const context = await loadChurnRiskContext(feedbackRecordId);

  if (!context?.customerId) {
    return null;
  }

  const { score, factors } = calculateChurnRiskScore(context);
  const riskLevel = scoreToRiskLevel(score);
  const reasonSummary = `Churn score: ${score}/100. Factors: ${factors.join("; ")}.`;

  await storeChurnRiskScore(context, score, riskLevel, reasonSummary);

  return {
    feedbackRecordId: context.feedbackRecordId,
    customerId: context.customerId,
    vehicleId: context.vehicleId,
    score,
    riskLevel,
    reasonSummary
  };
}

export async function generatePendingChurnRiskScores(limit: number): Promise<ChurnRiskBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN churn_scores cs ON cs.feedback_record_id = fr.id
      WHERE fr.customer_id IS NOT NULL
        AND cs.id IS NULL
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: ChurnRiskResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await generateChurnRiskScore(row.id);

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
