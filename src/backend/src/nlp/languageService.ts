import { pool } from "../db/pool.js";

const languageProfiles = [
  {
    code: "hi",
    name: "Hindi",
    scriptPattern: /[\u0900-\u097F]/,
    keywordPattern: /\b(namaste|kripya|seva|samasy|samasya|gaadi|gadi|der|shikayat)\b/i
  },
  {
    code: "ta",
    name: "Tamil",
    scriptPattern: /[\u0B80-\u0BFF]/,
    keywordPattern: /\b(vanakkam|sevai|pirachanai|neram|nandri)\b/i
  },
  {
    code: "te",
    name: "Telugu",
    scriptPattern: /[\u0C00-\u0C7F]/,
    keywordPattern: /\b(namaskaram|seva|samasya|dhanyavadalu|alasya)\b/i
  }
] as const;

const prototypeTranslations: Record<string, Array<[RegExp, string]>> = {
  hi: [
    [/सेवा/g, "service"],
    [/समस्या/g, "issue"],
    [/देरी/g, "delay"],
    [/कृपया/g, "please"],
    [/गाड़ी/g, "vehicle"],
    [/\bseva\b/gi, "service"],
    [/\bsamasya\b/gi, "issue"],
    [/\bder\b/gi, "delay"],
    [/\bkripya\b/gi, "please"],
    [/\bgadi|gaadi\b/gi, "vehicle"]
  ],
  ta: [
    [/சேவை/g, "service"],
    [/பிரச்சனை/g, "issue"],
    [/தாமதம்/g, "delay"],
    [/நன்றி/g, "thank you"],
    [/\bsevai\b/gi, "service"],
    [/\bpirachanai\b/gi, "issue"],
    [/\bneram\b/gi, "time"],
    [/\bnandri\b/gi, "thank you"]
  ],
  te: [
    [/సేవ/g, "service"],
    [/సమస్య/g, "issue"],
    [/ఆలస్యం/g, "delay"],
    [/ధన్యవాదాలు/g, "thank you"],
    [/\bseva\b/gi, "service"],
    [/\bsamasya\b/gi, "issue"],
    [/\balasya\b/gi, "delay"],
    [/\bdhanyavadalu\b/gi, "thank you"]
  ]
};

export interface LanguageProcessingResult {
  feedbackRecordId: string;
  detectedLanguage: string;
  translatedText: string | null;
  confidenceScore: number;
  processedText: string;
}

export interface LanguageProcessingBatchResult {
  requestedLimit: number;
  processedCount: number;
  records: LanguageProcessingResult[];
}

function detectLanguage(text: string) {
  for (const profile of languageProfiles) {
    if (profile.scriptPattern.test(text)) {
      return {
        detectedLanguage: profile.name,
        languageCode: profile.code,
        confidenceScore: 0.94
      };
    }
  }

  for (const profile of languageProfiles) {
    if (profile.keywordPattern.test(text)) {
      return {
        detectedLanguage: profile.name,
        languageCode: profile.code,
        confidenceScore: 0.72
      };
    }
  }

  return {
    detectedLanguage: "English",
    languageCode: "en",
    confidenceScore: 0.88
  };
}

function translateToEnglish(text: string, languageCode: string) {
  if (languageCode === "en") {
    return null;
  }

  const translatedText = (prototypeTranslations[languageCode] ?? []).reduce((currentText, [pattern, replacement]) => {
    return currentText.replace(pattern, replacement);
  }, text);

  return `[Prototype ${languageCode.toUpperCase()} to EN] ${translatedText}`;
}

async function loadFeedbackText(feedbackRecordId: string) {
  const result = await pool.query<{ id: string; processedText: string }>(
    `
      SELECT id, COALESCE(masked_text, raw_text) AS "processedText"
      FROM feedback_records
      WHERE id = $1::uuid
    `,
    [feedbackRecordId]
  );

  return result.rows[0] ?? null;
}

async function storeLanguageResult(feedbackRecordId: string, detectedLanguage: string, translatedText: string | null, confidenceScore: number) {
  const result = await pool.query<LanguageProcessingResult>(
    `
      INSERT INTO nlp_results (
        feedback_record_id,
        detected_language,
        translated_text,
        sentiment_label,
        topics,
        model_name,
        model_version,
        confidence_score,
        processed_at
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        'Unknown'::"SentimentLabel",
        ARRAY[]::text[],
        'PrototypeLanguageRules',
        'v1',
        $4,
        now()
      )
      ON CONFLICT (feedback_record_id) DO UPDATE SET
        detected_language = EXCLUDED.detected_language,
        translated_text = EXCLUDED.translated_text,
        confidence_score = EXCLUDED.confidence_score,
        processed_at = now(),
        updated_at = now()
      RETURNING
        feedback_record_id AS "feedbackRecordId",
        detected_language AS "detectedLanguage",
        translated_text AS "translatedText",
        confidence_score::float AS "confidenceScore",
        COALESCE(translated_text, '') AS "processedText"
    `,
    [feedbackRecordId, detectedLanguage, translatedText, confidenceScore]
  );

  return result.rows[0];
}

export async function processFeedbackLanguage(feedbackRecordId: string) {
  const feedbackRecord = await loadFeedbackText(feedbackRecordId);

  if (!feedbackRecord) {
    return null;
  }

  const { detectedLanguage, languageCode, confidenceScore } = detectLanguage(feedbackRecord.processedText);
  const translatedText = translateToEnglish(feedbackRecord.processedText, languageCode);
  const storedResult = await storeLanguageResult(feedbackRecord.id, detectedLanguage, translatedText, confidenceScore);

  return {
    ...storedResult,
    processedText: translatedText ?? feedbackRecord.processedText
  };
}

export async function processPendingFeedbackLanguages(limit: number): Promise<LanguageProcessingBatchResult> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const result = await pool.query<{ id: string }>(
    `
      SELECT fr.id
      FROM feedback_records fr
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      WHERE nr.id IS NULL
      ORDER BY fr.feedback_date ASC, fr.created_at ASC
      LIMIT $1
    `,
    [boundedLimit]
  );

  const records: LanguageProcessingResult[] = [];

  for (const row of result.rows) {
    const processedRecord = await processFeedbackLanguage(row.id);

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
