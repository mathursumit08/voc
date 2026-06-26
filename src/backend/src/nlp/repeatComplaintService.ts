import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

export interface RepeatComplaintResult {
  feedbackRecordId: string;
  lookbackDays: number;
  repeatCount: number;
  isRepeat: boolean;
  matchingFeedbackRecordIds: string[];
  reasonSummary: string;
}

export interface RepeatComplaintBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: RepeatComplaintResult[];
}

async function loadRepeatComplaintContext(feedbackRecordId: string) {
  const result = await pool.query<{
    id: string;
    feedbackDate: string;
    customerId: string | null;
    vehicleId: string | null;
  }>(
    `
      SELECT
        id,
        feedback_date AS "feedbackDate",
        customer_id AS "customerId",
        vehicle_id AS "vehicleId"
      FROM feedback_records
      WHERE id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

async function findRepeatMatches(context: NonNullable<Awaited<ReturnType<typeof loadRepeatComplaintContext>>>, lookbackDays: number) {
  if (!context.customerId && !context.vehicleId) {
    return [];
  }

  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      WHERE fr.id <> $1::uuid
        AND fr.feedback_date >= $2::timestamptz - ($5::int * INTERVAL '1 day')
        AND fr.feedback_date <= $2::timestamptz
        AND (
          ($3::uuid IS NOT NULL AND fr.customer_id = $3::uuid)
          OR ($4::uuid IS NOT NULL AND fr.vehicle_id = $4::uuid)
        )
      ORDER BY fr.feedback_date DESC, fr.created_at DESC
    `,
    [context.id, context.feedbackDate, context.customerId, context.vehicleId, lookbackDays]
  );

  return result.rows.map((row) => row.id);
}

function buildReasonSummary(repeatCount: number, lookbackDays: number, hasCustomer: boolean, hasVehicle: boolean) {
  if (repeatCount === 0) {
    return hasCustomer || hasVehicle
      ? `No prior matching customer or vehicle feedback found in the last ${lookbackDays} days.`
      : "Repeat complaint could not be evaluated because the feedback is not linked to a customer or vehicle.";
  }

  const matchScope = hasCustomer && hasVehicle ? "customer or vehicle" : hasCustomer ? "customer" : "vehicle";
  return `${repeatCount} prior feedback record(s) found for the same ${matchScope} within ${lookbackDays} days.`;
}

async function storeRepeatComplaintSignal(context: NonNullable<Awaited<ReturnType<typeof loadRepeatComplaintContext>>>, matchingFeedbackRecordIds: string[], lookbackDays: number) {
  const repeatCount = matchingFeedbackRecordIds.length;
  const reasonSummary = buildReasonSummary(repeatCount, lookbackDays, Boolean(context.customerId), Boolean(context.vehicleId));

  await pool.query(
    `
      INSERT INTO repeat_complaint_signals (
        feedback_record_id,
        customer_id,
        vehicle_id,
        lookback_days,
        repeat_count,
        matching_feedback_record_ids,
        is_repeat,
        reason_summary,
        detected_at,
        updated_at
      )
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::uuid[], $7, $8, now(), now())
      ON CONFLICT (feedback_record_id) DO UPDATE
      SET
        customer_id = EXCLUDED.customer_id,
        vehicle_id = EXCLUDED.vehicle_id,
        lookback_days = EXCLUDED.lookback_days,
        repeat_count = EXCLUDED.repeat_count,
        matching_feedback_record_ids = EXCLUDED.matching_feedback_record_ids,
        is_repeat = EXCLUDED.is_repeat,
        reason_summary = EXCLUDED.reason_summary,
        detected_at = now(),
        updated_at = now()
    `,
    [
      context.id,
      context.customerId,
      context.vehicleId,
      lookbackDays,
      repeatCount,
      matchingFeedbackRecordIds,
      repeatCount > 0,
      reasonSummary
    ]
  );

  return {
    feedbackRecordId: context.id,
    lookbackDays,
    repeatCount,
    isRepeat: repeatCount > 0,
    matchingFeedbackRecordIds,
    reasonSummary
  };
}

export async function detectRepeatComplaint(feedbackRecordId: string): Promise<RepeatComplaintResult | null> {
  const context = await loadRepeatComplaintContext(feedbackRecordId);

  if (!context) {
    return null;
  }

  const lookbackDays = env.REPEAT_COMPLAINT_LOOKBACK_DAYS;
  const matchingFeedbackRecordIds = await findRepeatMatches(context, lookbackDays);
  return storeRepeatComplaintSignal(context, matchingFeedbackRecordIds, lookbackDays);
}

export async function detectPendingRepeatComplaints(limit: number): Promise<RepeatComplaintBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN repeat_complaint_signals rcs ON rcs.feedback_record_id = fr.id
      WHERE rcs.id IS NULL
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: RepeatComplaintResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await detectRepeatComplaint(row.id);

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
