import { pool } from "../db/pool.js";
import { processFeedbackLanguage } from "./languageService.js";

const positivePatterns = [
  /\b(excellent|smooth|good|great|polite|clear|clearly|resolved|improved|early|on time|same day|thank you)\b/i
];

const negativePatterns = [
  /\b(bad|poor|unresolved|still present|still unresolved|repeat|delay|delayed|too long|urgently|urgent|complaint|not communicated|without explaining|issue remains)\b/i
];

const topicRules = [
  { topic: "ServiceQuality", pattern: /\b(service quality|routine service|service|advisor|staff|polite)\b/i },
  { topic: "RepairQuality", pattern: /\b(repair|resolved|unresolved|fixed|still present|came back|repeat)\b/i },
  { topic: "PriceTransparency", pattern: /\b(price|billing|estimate|breakup|consumables|cost)\b/i },
  { topic: "WarrantyConcern", pattern: /\b(warranty|claim|goodwill)\b/i },
  { topic: "VehicleQuality", pattern: /\b(noise|vibration|warning lamp|battery|charging|steering|brake|ac|infotainment|dashboard)\b/i },
  { topic: "DeliveryDelay", pattern: /\b(delay|delayed|too long|timeline|wait|waiting|delivery)\b/i },
  { topic: "FacilityExperience", pattern: /\b(clean facility|washing|pickup|drop)\b/i },
  { topic: "Communication", pattern: /\b(call|called|communicated|updates|explained|explanation)\b/i }
] as const;

type SentimentLabel = "Positive" | "Neutral" | "Negative" | "Mixed";

export interface SentimentTopicProcessingResult {
  feedbackRecordId: string;
  sentimentLabel: SentimentLabel;
  sentimentScore: number;
  topics: string[];
  confidenceScore: number;
  processedText: string;
  modelName: string;
  modelVersion: string;
}

export interface SentimentTopicBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: SentimentTopicProcessingResult[];
}

function analyzeSentiment(text: string) {
  const positiveHits = positivePatterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const negativeHits = negativePatterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);

  if (positiveHits > 0 && negativeHits > 0) {
    return {
      sentimentLabel: "Mixed" as const,
      sentimentScore: 0,
      confidenceScore: 0.68
    };
  }

  if (positiveHits > 0) {
    return {
      sentimentLabel: "Positive" as const,
      sentimentScore: 0.72,
      confidenceScore: 0.76
    };
  }

  if (negativeHits > 0) {
    return {
      sentimentLabel: "Negative" as const,
      sentimentScore: -0.74,
      confidenceScore: 0.78
    };
  }

  return {
    sentimentLabel: "Neutral" as const,
    sentimentScore: 0,
    confidenceScore: 0.58
  };
}

function extractTopics(text: string) {
  const topics = topicRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.topic);
  return topics.length > 0 ? [...new Set(topics)] : ["Other"];
}

async function loadAnalysisText(feedbackRecordId: string) {
  const result = await pool.query<{ id: string; processedText: string }>(
    `
      SELECT
        fr.id,
        COALESCE(nr.translated_text, fr.masked_text, fr.raw_text) AS "processedText"
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      WHERE fr.id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

async function storeSentimentTopics(
  feedbackRecordId: string,
  sentimentLabel: SentimentLabel,
  sentimentScore: number,
  topics: string[],
  confidenceScore: number
) {
  const result = await pool.query<Omit<SentimentTopicProcessingResult, "processedText">>(
    `
      UPDATE nlp_results
      SET
        sentiment_label = $2::"SentimentLabel",
        sentiment_score = $3,
        topics = $4::text[],
        model_name = 'PrototypeNlpRules',
        model_version = 'v1',
        confidence_score = $5,
        processed_at = now(),
        updated_at = now()
      WHERE feedback_record_id = $1::uuid
      RETURNING
        feedback_record_id AS "feedbackRecordId",
        sentiment_label AS "sentimentLabel",
        sentiment_score::float AS "sentimentScore",
        topics,
        confidence_score::float AS "confidenceScore",
        model_name AS "modelName",
        model_version AS "modelVersion"
    `,
    [feedbackRecordId, sentimentLabel, sentimentScore, topics, confidenceScore]
  );

  return result.rows[0];
}

export async function processFeedbackSentimentTopics(feedbackRecordId: string) {
  const languageResult = await processFeedbackLanguage(feedbackRecordId);

  if (!languageResult) {
    return null;
  }

  const feedbackRecord = await loadAnalysisText(feedbackRecordId);

  if (!feedbackRecord) {
    return null;
  }

  const sentiment = analyzeSentiment(feedbackRecord.processedText);
  const topics = extractTopics(feedbackRecord.processedText);
  const storedResult = await storeSentimentTopics(
    feedbackRecord.id,
    sentiment.sentimentLabel,
    sentiment.sentimentScore,
    topics,
    sentiment.confidenceScore
  );

  return {
    ...storedResult,
    processedText: feedbackRecord.processedText
  };
}

export async function processPendingFeedbackSentimentTopics(limit: number): Promise<SentimentTopicBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      WHERE nr.id IS NULL OR nr.sentiment_label = 'Unknown'::"SentimentLabel" OR cardinality(nr.topics) = 0
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: SentimentTopicProcessingResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await processFeedbackSentimentTopics(row.id);

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
