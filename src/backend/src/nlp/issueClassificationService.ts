import { pool } from "../db/pool.js";
import { processFeedbackSentimentTopics } from "./sentimentTopicService.js";

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

const lowConfidenceThreshold = 0.65;

const classificationRules: Array<{
  category: IssueCategory;
  subCategory: string;
  pattern: RegExp;
  confidenceScore: number;
  explanation: string;
}> = [
  {
    category: "WarrantyConcern",
    subCategory: "WarrantyCommunication",
    pattern: /\b(warranty|claim|goodwill)\b/i,
    confidenceScore: 0.86,
    explanation: "Warranty or claim terms were mentioned in the feedback text."
  },
  {
    category: "PriceTransparency",
    subCategory: "BillingOrEstimate",
    pattern: /\b(price|billing|estimate|breakup|consumables|cost)\b/i,
    confidenceScore: 0.84,
    explanation: "Billing, estimate, or price transparency language was detected."
  },
  {
    category: "RepairQuality",
    subCategory: "RepeatOrUnresolvedRepair",
    pattern: /\b(unresolved|still present|came back|repeat|fixed|repair)\b/i,
    confidenceScore: 0.82,
    explanation: "The feedback refers to repair completion, repeat concern, or unresolved work."
  },
  {
    category: "VehicleQuality",
    subCategory: "VehicleConcern",
    pattern: /\b(noise|vibration|warning lamp|battery|charging|steering|brake|ac|infotainment|dashboard)\b/i,
    confidenceScore: 0.8,
    explanation: "A vehicle system, component, or quality symptom was mentioned."
  },
  {
    category: "DeliveryDelay",
    subCategory: "TimeDelay",
    pattern: /\b(delay|delayed|too long|timeline|wait|waiting|delivery)\b/i,
    confidenceScore: 0.78,
    explanation: "The feedback includes waiting time, delivery delay, or timeline concerns."
  },
  {
    category: "ServiceQuality",
    subCategory: "AdvisorOrServiceExperience",
    pattern: /\b(service|advisor|explanation|explained|updates|communication)\b/i,
    confidenceScore: 0.74,
    explanation: "Service advisor, communication, or service quality terms were detected."
  },
  {
    category: "StaffBehavior",
    subCategory: "StaffConduct",
    pattern: /\b(staff|polite|rude|behavior|behaviour)\b/i,
    confidenceScore: 0.72,
    explanation: "Staff conduct or behavior language was detected."
  },
  {
    category: "FacilityExperience",
    subCategory: "FacilityAndConvenience",
    pattern: /\b(clean facility|washing|pickup|drop|facility)\b/i,
    confidenceScore: 0.7,
    explanation: "Facility, washing, pickup, or drop experience language was detected."
  },
  {
    category: "PartsAvailability",
    subCategory: "PartsDelay",
    pattern: /\b(part|parts|spare|replacement)\b/i,
    confidenceScore: 0.7,
    explanation: "Parts or replacement availability language was detected."
  },
  {
    category: "DigitalExperience",
    subCategory: "DigitalChannel",
    pattern: /\b(app|portal|website|digital|online)\b/i,
    confidenceScore: 0.7,
    explanation: "Digital channel language was detected."
  }
];

export interface IssueClassificationResult {
  feedbackRecordId: string;
  category: IssueCategory;
  subCategory: string;
  urgencyLevel: UrgencyLevel;
  confidenceScore: number;
  explanation: string;
  isPrimary: boolean;
  routedToReview: boolean;
  reviewQueueItemId: string | null;
}

export interface IssueClassificationBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: IssueClassificationResult[];
}

function classifyText(text: string, sentimentLabel?: string): Omit<IssueClassificationResult, "feedbackRecordId" | "routedToReview" | "reviewQueueItemId"> {
  const matchedRule = classificationRules.find((rule) => rule.pattern.test(text));

  if (!matchedRule) {
    return {
      category: "Other",
      subCategory: "NeedsManualReview",
      urgencyLevel: sentimentLabel === "Negative" ? "Medium" : "Low",
      confidenceScore: 0.52,
      explanation: "No high-confidence automotive rule matched; manual review is recommended.",
      isPrimary: true
    };
  }

  return {
    category: matchedRule.category,
    subCategory: matchedRule.subCategory,
    urgencyLevel: sentimentLabel === "Negative" ? "Medium" : "Low",
    confidenceScore: matchedRule.confidenceScore,
    explanation: matchedRule.explanation,
    isPrimary: true
  };
}

async function loadClassificationText(feedbackRecordId: string) {
  const result = await pool.query<{ id: string; processedText: string; sentimentLabel: string | null }>(
    `
      SELECT
        fr.id,
        COALESCE(nr.translated_text, fr.masked_text, fr.raw_text) AS "processedText",
        nr.sentiment_label::text AS "sentimentLabel"
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      WHERE fr.id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

async function storePrimaryClassification(feedbackRecordId: string, classification: ReturnType<typeof classifyText>) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM issue_classifications WHERE feedback_record_id = $1::uuid AND is_primary = true", [feedbackRecordId]);

    const classificationResult = await client.query<IssueClassificationResult>(
      `
        INSERT INTO issue_classifications (
          feedback_record_id,
          category,
          sub_category,
          urgency_level,
          confidence_score,
          explanation,
          is_primary
        )
        VALUES (
          $1::uuid,
          $2::"IssueCategory",
          $3,
          $4::"UrgencyLevel",
          $5,
          $6,
          true
        )
        RETURNING
          feedback_record_id AS "feedbackRecordId",
          category::text AS category,
          sub_category AS "subCategory",
          urgency_level::text AS "urgencyLevel",
          confidence_score::float AS "confidenceScore",
          explanation,
          is_primary AS "isPrimary"
      `,
      [
        feedbackRecordId,
        classification.category,
        classification.subCategory,
        classification.urgencyLevel,
        classification.confidenceScore,
        classification.explanation
      ]
    );

    const storedClassification = classificationResult.rows[0];
    let reviewQueueItemId: string | null = null;

    if (storedClassification.confidenceScore < lowConfidenceThreshold) {
      const reviewResult = await client.query<{ id: string }>(
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
        [feedbackRecordId, "Low-confidence issue classification requires review."]
      );

      reviewQueueItemId = reviewResult.rows[0]?.id ?? null;
    }

    await client.query("COMMIT");

    return {
      ...storedClassification,
      routedToReview: storedClassification.confidenceScore < lowConfidenceThreshold,
      reviewQueueItemId
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function processFeedbackIssueClassification(feedbackRecordId: string) {
  const sentimentResult = await processFeedbackSentimentTopics(feedbackRecordId);

  if (!sentimentResult) {
    return null;
  }

  const feedbackRecord = await loadClassificationText(feedbackRecordId);

  if (!feedbackRecord) {
    return null;
  }

  const classification = classifyText(feedbackRecord.processedText, feedbackRecord.sentimentLabel ?? undefined);
  return storePrimaryClassification(feedbackRecord.id, classification);
}

export async function processPendingFeedbackIssueClassifications(limit: number): Promise<IssueClassificationBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      WHERE ic.id IS NULL
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: IssueClassificationResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await processFeedbackIssueClassification(row.id);

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
