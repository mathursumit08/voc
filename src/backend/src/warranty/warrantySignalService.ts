import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

type SignalStatus = "Open" | "UnderReview" | "Escalated" | "Closed";

export interface WarrantySignalDto {
  id: string;
  dealerId: string | null;
  dealerName: string | null;
  warrantyClaimId: string | null;
  feedbackRecordId: string | null;
  model: string | null;
  partCode: string | null;
  issueCategory: string | null;
  signalScore: number | null;
  status: SignalStatus;
  supportingCount: number;
  summary: string | null;
  detectedAt: string;
  supportingFeedbackRecordIds: string[];
}

export interface WarrantySignalDetectionResult {
  lookbackDays: number;
  minimumSupportingCount: number;
  detectedCount: number;
  signals: WarrantySignalDto[];
}

interface CandidateGroup {
  dealerId: string | null;
  dealerName: string | null;
  model: string | null;
  partCode: string | null;
  issueCategory: string | null;
  supportingCount: number;
  feedbackRecordId: string;
  warrantyClaimId: string | null;
  supportingFeedbackRecordIds: string[];
}

function calculateSignalScore(group: CandidateGroup) {
  const countScore = Math.min(group.supportingCount * 24, 72);
  const issueScore = group.issueCategory === "WarrantyConcern" ? 18 : group.issueCategory === "VehicleQuality" ? 14 : 10;
  const partScore = group.partCode ? 10 : 4;
  return Math.min(countScore + issueScore + partScore, 100);
}

function buildSignalSummary(group: CandidateGroup, signalScore: number) {
  const dealerText = group.dealerName ?? "Unassigned dealer";
  const modelText = group.model ?? "Unknown model";
  const partText = group.partCode ?? "No part code";
  const issueText = group.issueCategory ?? "Other";

  return `${group.supportingCount} supporting feedback record(s) indicate ${issueText} for ${modelText}, part ${partText}, at ${dealerText}. Signal score ${signalScore}/100.`;
}

async function findCandidateGroups(): Promise<CandidateGroup[]> {
  const result = await pool.query<CandidateGroup>(
    `
      WITH candidate_feedback AS (
        SELECT
          fr.id,
          fr.feedback_date,
          fr.dealer_id,
          d.name AS "dealerName",
          fr.warranty_claim_id,
          v.model,
          wc.part_code,
          COALESCE(ic.category::text, 'WarrantyConcern') AS issue_category
        FROM feedback_records fr
        LEFT JOIN dealers d ON d.id = fr.dealer_id
        LEFT JOIN vehicles v ON v.id = fr.vehicle_id
        LEFT JOIN warranty_claims wc ON wc.id = fr.warranty_claim_id
        LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
        WHERE fr.feedback_date >= now() - ($1::int * INTERVAL '1 day')
          AND (
            fr.source_type = 'WarrantyClaim'::"FeedbackSourceType"
            OR fr.warranty_claim_id IS NOT NULL
            OR ic.category IN ('WarrantyConcern'::"IssueCategory", 'VehicleQuality'::"IssueCategory", 'RepairQuality'::"IssueCategory")
          )
      )
      SELECT
        dealer_id AS "dealerId",
        MAX("dealerName") AS "dealerName",
        model,
        part_code AS "partCode",
        issue_category AS "issueCategory",
        COUNT(*)::int AS "supportingCount",
        (ARRAY_AGG(id ORDER BY feedback_date DESC))[1] AS "feedbackRecordId",
        (ARRAY_AGG(warranty_claim_id ORDER BY feedback_date DESC))[1] AS "warrantyClaimId",
        ARRAY_AGG(id ORDER BY feedback_date DESC)::text[] AS "supportingFeedbackRecordIds"
      FROM candidate_feedback
      GROUP BY dealer_id, model, part_code, issue_category
      HAVING COUNT(*) >= $2::int
      ORDER BY COUNT(*) DESC, MAX(feedback_date) DESC
      LIMIT 25
    `,
    [env.WARRANTY_SIGNAL_LOOKBACK_DAYS, env.WARRANTY_SIGNAL_MIN_SUPPORTING_COUNT]
  );

  return result.rows;
}

async function storeSignal(group: CandidateGroup): Promise<WarrantySignalDto> {
  const signalScore = calculateSignalScore(group);
  const summary = buildSignalSummary(group, signalScore);
  const existing = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM warranty_signals
      WHERE status IN ('Open'::"SignalStatus", 'UnderReview'::"SignalStatus", 'Escalated'::"SignalStatus")
        AND dealer_id IS NOT DISTINCT FROM $1::uuid
        AND model IS NOT DISTINCT FROM $2
        AND part_code IS NOT DISTINCT FROM $3
        AND issue_category IS NOT DISTINCT FROM $4::"IssueCategory"
      ORDER BY detected_at DESC
      LIMIT 1
    `,
    [group.dealerId, group.model, group.partCode, group.issueCategory]
  );

  const status: SignalStatus = signalScore >= 85 ? "Escalated" : signalScore >= 65 ? "UnderReview" : "Open";

  if (existing.rows[0]) {
    const updated = await pool.query<WarrantySignalDto>(
      `
        UPDATE warranty_signals
        SET
          warranty_claim_id = $2::uuid,
          feedback_record_id = $3::uuid,
          signal_score = $4,
          status = CASE WHEN status = 'Closed'::"SignalStatus" THEN status ELSE $5::"SignalStatus" END,
          supporting_count = $6,
          summary = $7,
          detected_at = now(),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING
          id,
          dealer_id AS "dealerId",
          NULL::text AS "dealerName",
          warranty_claim_id AS "warrantyClaimId",
          feedback_record_id AS "feedbackRecordId",
          model,
          part_code AS "partCode",
          issue_category::text AS "issueCategory",
          signal_score::float AS "signalScore",
          status::text AS status,
          supporting_count AS "supportingCount",
          summary,
          detected_at AS "detectedAt",
          $8::text[] AS "supportingFeedbackRecordIds"
      `,
      [existing.rows[0].id, group.warrantyClaimId, group.feedbackRecordId, signalScore, status, group.supportingCount, summary, group.supportingFeedbackRecordIds]
    );

    return { ...updated.rows[0], dealerName: group.dealerName };
  }

  const inserted = await pool.query<WarrantySignalDto>(
    `
      INSERT INTO warranty_signals (
        dealer_id,
        warranty_claim_id,
        feedback_record_id,
        model,
        part_code,
        issue_category,
        signal_score,
        status,
        supporting_count,
        summary,
        detected_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::"IssueCategory", $7, $8::"SignalStatus", $9, $10, now(), now())
      RETURNING
        id,
        dealer_id AS "dealerId",
        NULL::text AS "dealerName",
        warranty_claim_id AS "warrantyClaimId",
        feedback_record_id AS "feedbackRecordId",
        model,
        part_code AS "partCode",
        issue_category::text AS "issueCategory",
        signal_score::float AS "signalScore",
        status::text AS status,
        supporting_count AS "supportingCount",
        summary,
        detected_at AS "detectedAt",
        $11::text[] AS "supportingFeedbackRecordIds"
    `,
    [
      group.dealerId,
      group.warrantyClaimId,
      group.feedbackRecordId,
      group.model,
      group.partCode,
      group.issueCategory,
      signalScore,
      status,
      group.supportingCount,
      summary,
      group.supportingFeedbackRecordIds
    ]
  );

  return { ...inserted.rows[0], dealerName: group.dealerName };
}

export async function detectWarrantySignals(): Promise<WarrantySignalDetectionResult> {
  const groups = await findCandidateGroups();
  const signals: WarrantySignalDto[] = [];

  for (const group of groups) {
    signals.push(await storeSignal(group));
  }

  return {
    lookbackDays: env.WARRANTY_SIGNAL_LOOKBACK_DAYS,
    minimumSupportingCount: env.WARRANTY_SIGNAL_MIN_SUPPORTING_COUNT,
    detectedCount: signals.length,
    signals
  };
}

export async function listActiveWarrantySignals(limit = 10): Promise<WarrantySignalDto[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const result = await pool.query<WarrantySignalDto>(
    `
      SELECT
        ws.id,
        ws.dealer_id AS "dealerId",
        d.name AS "dealerName",
        ws.warranty_claim_id AS "warrantyClaimId",
        ws.feedback_record_id AS "feedbackRecordId",
        ws.model,
        ws.part_code AS "partCode",
        ws.issue_category::text AS "issueCategory",
        ws.signal_score::float AS "signalScore",
        ws.status::text AS status,
        ws.supporting_count AS "supportingCount",
        ws.summary,
        ws.detected_at AS "detectedAt",
        COALESCE(supporting.feedback_ids, '{}')::text[] AS "supportingFeedbackRecordIds"
      FROM warranty_signals ws
      LEFT JOIN dealers d ON d.id = ws.dealer_id
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(fr.id ORDER BY fr.feedback_date DESC)::text[] AS feedback_ids
        FROM feedback_records fr
        LEFT JOIN vehicles v ON v.id = fr.vehicle_id
        LEFT JOIN warranty_claims wc ON wc.id = fr.warranty_claim_id
        LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
        WHERE fr.dealer_id IS NOT DISTINCT FROM ws.dealer_id
          AND fr.feedback_date >= ws.detected_at - ($2::int * INTERVAL '1 day')
          AND (ws.model IS NULL OR v.model = ws.model)
          AND (ws.part_code IS NULL OR wc.part_code = ws.part_code)
          AND (ws.issue_category IS NULL OR ic.category = ws.issue_category)
      ) supporting ON true
      WHERE ws.status IN ('Open'::"SignalStatus", 'UnderReview'::"SignalStatus", 'Escalated'::"SignalStatus")
      ORDER BY ws.signal_score DESC NULLS LAST, ws.detected_at DESC
      LIMIT $1
    `,
    [boundedLimit, env.WARRANTY_SIGNAL_LOOKBACK_DAYS]
  );

  return result.rows;
}
