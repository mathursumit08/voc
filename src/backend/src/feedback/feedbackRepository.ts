import { pool } from "../db/pool.js";

const allowedSourceTypes = new Set([
  "Survey",
  "JobCard",
  "WarrantyClaim",
  "GoogleReview",
  "SocialMedia",
  "CallCenter",
  "MobileApp",
  "ManualUpload"
]);

const allowedProcessingStatuses = new Set(["Pending", "Processing", "Completed", "Failed", "NeedsReview"]);
const allowedUrgencyLevels = new Set(["Low", "Medium", "High", "Critical"]);

export interface FeedbackFilters {
  sourceType?: string;
  processingStatus?: string;
  dealerId?: string;
  customerId?: string;
  vehicleId?: string;
  urgencyLevel?: string;
  limit: number;
  offset: number;
}

export function validateFeedbackFilters(filters: FeedbackFilters) {
  if (filters.sourceType && !allowedSourceTypes.has(filters.sourceType)) {
    throw new Error(`Invalid sourceType filter: ${filters.sourceType}`);
  }

  if (filters.processingStatus && !allowedProcessingStatuses.has(filters.processingStatus)) {
    throw new Error(`Invalid processingStatus filter: ${filters.processingStatus}`);
  }

  if (filters.urgencyLevel && !allowedUrgencyLevels.has(filters.urgencyLevel)) {
    throw new Error(`Invalid urgencyLevel filter: ${filters.urgencyLevel}`);
  }
}

export async function listFeedbackRecords(filters: FeedbackFilters) {
  validateFeedbackFilters(filters);

  const conditions: string[] = [];
  const values: unknown[] = [];

  function addCondition(sql: string, value: unknown) {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  }

  if (filters.sourceType) {
    addCondition("fr.source_type = ?::\"FeedbackSourceType\"", filters.sourceType);
  }

  if (filters.processingStatus) {
    addCondition("fr.processing_status = ?::\"ProcessingStatus\"", filters.processingStatus);
  }

  if (filters.dealerId) {
    addCondition("fr.dealer_id = ?::uuid", filters.dealerId);
  }

  if (filters.customerId) {
    addCondition("fr.customer_id = ?::uuid", filters.customerId);
  }

  if (filters.vehicleId) {
    addCondition("fr.vehicle_id = ?::uuid", filters.vehicleId);
  }

  if (filters.urgencyLevel) {
    addCondition("primary_issue.urgency_level = ?::\"UrgencyLevel\"", filters.urgencyLevel);
  }

  values.push(filters.limit, filters.offset);
  const limitParam = `$${values.length - 1}`;
  const offsetParam = `$${values.length}`;
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Keep the listing query explicit because this endpoint drives filtering in
  // feedback explorer screens and should stay aligned with indexed columns.
  const result = await pool.query(
    `
      SELECT
        fr.id,
        fr.source_type AS "sourceType",
        fr.source_reference_id AS "sourceReferenceId",
        fr.feedback_date AS "feedbackDate",
        fr.raw_text AS "rawText",
        fr.masked_text AS "maskedText",
        fr.rating,
        fr.processing_status AS "processingStatus",
        fr.created_at AS "createdAt",
        d.name AS "dealerName",
        d.code AS "dealerCode",
        c.masked_name AS "customerName",
        v.model AS "vehicleModel",
        primary_issue.category AS "issueCategory",
        primary_issue.urgency_level AS "urgencyLevel",
        COUNT(*) OVER()::int AS "totalCount"
      FROM feedback_records fr
      LEFT JOIN dealers d ON d.id = fr.dealer_id
      LEFT JOIN customers c ON c.id = fr.customer_id
      LEFT JOIN vehicles v ON v.id = fr.vehicle_id
      LEFT JOIN issue_classifications primary_issue ON primary_issue.feedback_record_id = fr.id AND primary_issue.is_primary = true
      ${whereClause}
      ORDER BY fr.feedback_date DESC, fr.created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam};
    `,
    values
  );

  const totalCount = result.rows[0]?.totalCount ?? 0;
  return {
    totalCount,
    limit: filters.limit,
    offset: filters.offset,
    records: result.rows.map(({ totalCount: _totalCount, ...row }) => row)
  };
}

export async function getFeedbackRecordById(id: string) {
  const result = await pool.query(
    `
      SELECT
        fr.id,
        fr.source_type AS "sourceType",
        fr.source_reference_id AS "sourceReferenceId",
        fr.feedback_date AS "feedbackDate",
        fr.raw_text AS "rawText",
        fr.masked_text AS "maskedText",
        fr.rating,
        fr.processing_status AS "processingStatus",
        fr.processing_error AS "processingError",
        fr.created_at AS "createdAt",
        fr.updated_at AS "updatedAt",
        CASE
          WHEN nr.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'detectedLanguage', nr.detected_language,
            'translatedText', nr.translated_text,
            'sentimentLabel', nr.sentiment_label,
            'sentimentScore', nr.sentiment_score,
            'topics', nr.topics,
            'entities', nr.entities,
            'confidenceScore', nr.confidence_score,
            'modelName', nr.model_name,
            'modelVersion', nr.model_version,
            'processedAt', nr.processed_at
          )
        END AS "nlpResult",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ic.id,
                'category', ic.category,
                'subCategory', ic.sub_category,
                'urgencyLevel', ic.urgency_level,
                'confidenceScore', ic.confidence_score,
                'explanation', ic.explanation,
                'isPrimary', ic.is_primary,
                'createdAt', ic.created_at
              )
              ORDER BY ic.is_primary DESC, ic.created_at DESC
            )
            FROM issue_classifications ic
            WHERE ic.feedback_record_id = fr.id
          ),
          '[]'::jsonb
        ) AS "issueClassifications",
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', hrq.id,
                'status', hrq.status,
                'reason', hrq.reason,
                'assignedTo', hrq.assigned_to,
                'createdAt', hrq.created_at
              )
              ORDER BY hrq.created_at DESC
            )
            FROM human_review_queue hrq
            WHERE hrq.feedback_record_id = fr.id
          ),
          '[]'::jsonb
        ) AS "reviewItems",
        jsonb_build_object('id', d.id, 'name', d.name, 'code', d.code, 'region', d.region) AS dealer,
        jsonb_build_object('id', c.id, 'maskedName', c.masked_name, 'city', c.city, 'state', c.state) AS customer,
        jsonb_build_object('id', v.id, 'model', v.model, 'variant', v.variant, 'modelYear', v.model_year) AS vehicle,
        jsonb_build_object('id', jc.id, 'externalId', jc.external_id, 'serviceType', jc.service_type) AS "jobCard",
        jsonb_build_object('id', wc.id, 'externalId', wc.external_id, 'partCode', wc.part_code, 'claimCategory', wc.claim_category) AS "warrantyClaim"
      FROM feedback_records fr
      LEFT JOIN dealers d ON d.id = fr.dealer_id
      LEFT JOIN customers c ON c.id = fr.customer_id
      LEFT JOIN vehicles v ON v.id = fr.vehicle_id
      LEFT JOIN job_cards jc ON jc.id = fr.job_card_id
      LEFT JOIN warranty_claims wc ON wc.id = fr.warranty_claim_id
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      WHERE fr.id = $1::uuid;
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

