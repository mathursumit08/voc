import { pool } from "../db/pool.js";

export interface ResponseDraftResult {
  feedbackRecordId: string;
  tone: string;
  issueCategory: string;
  sentimentLabel: string;
  draftText: string;
}

async function loadFeedbackDraftContext(feedbackRecordId: string, dealerCode?: string) {
  const values: unknown[] = [feedbackRecordId];
  const dealerScopeSql = dealerCode ? "AND d.code = $2" : "";

  if (dealerCode) {
    values.push(dealerCode);
  }

  const result = await pool.query<{
    feedbackRecordId: string;
    sourceReferenceId: string;
    dealerName: string | null;
    customerName: string | null;
    sentimentLabel: string;
    issueCategory: string;
    urgencyLevel: string;
    processedText: string;
  }>(
    `
      SELECT
        fr.id AS "feedbackRecordId",
        fr.source_reference_id AS "sourceReferenceId",
        d.name AS "dealerName",
        c.masked_name AS "customerName",
        COALESCE(nr.sentiment_label::text, 'Unknown') AS "sentimentLabel",
        COALESCE(ic.category::text, 'Other') AS "issueCategory",
        COALESCE(ic.urgency_level::text, 'Medium') AS "urgencyLevel",
        COALESCE(nr.translated_text, fr.masked_text, fr.raw_text) AS "processedText"
      FROM feedback_records fr
      LEFT JOIN dealers d ON d.id = fr.dealer_id
      LEFT JOIN customers c ON c.id = fr.customer_id
      LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
      LEFT JOIN issue_classifications ic ON ic.feedback_record_id = fr.id AND ic.is_primary = true
      WHERE fr.id = $1::uuid
      ${dealerScopeSql}
    `,
    values
  );

  return result.rows[0] ?? null;
}

function toneForSentiment(sentimentLabel: string) {
  if (sentimentLabel === "Negative") {
    return "Apologetic";
  }

  if (sentimentLabel === "Mixed" || sentimentLabel === "Unknown") {
    return "Reassuring";
  }

  if (sentimentLabel === "Positive") {
    return "Appreciative";
  }

  return "Professional";
}

function issuePhrase(issueCategory: string) {
  const phrases: Record<string, string> = {
    ServiceQuality: "your service experience",
    RepairQuality: "the repair quality concern",
    StaffBehavior: "the staff interaction concern",
    PriceTransparency: "the pricing transparency concern",
    PartsAvailability: "the parts availability concern",
    WarrantyConcern: "the warranty concern",
    VehicleQuality: "the vehicle quality concern",
    DeliveryDelay: "the delivery delay",
    FacilityExperience: "your facility experience",
    DigitalExperience: "the digital experience concern",
    Other: "the concern you shared"
  };

  return phrases[issueCategory] ?? phrases.Other;
}

function buildDraft(context: NonNullable<Awaited<ReturnType<typeof loadFeedbackDraftContext>>>) {
  const tone = toneForSentiment(context.sentimentLabel);
  const issue = issuePhrase(context.issueCategory);
  const customerName = context.customerName ?? "Customer";
  const dealerName = context.dealerName ?? "our dealership";
  const urgencyLine =
    context.urgencyLevel === "Critical" || context.urgencyLevel === "High"
      ? "We are treating this as a priority and will have our service team review it urgently."
      : "We will review the details with our service team and follow up with the next steps.";

  const draftText = [
    `Dear ${customerName},`,
    "",
    `Thank you for sharing your feedback with ${dealerName}. We have noted ${issue} and understand the tone of your feedback as ${context.sentimentLabel.toLowerCase()}.`,
    "",
    `${urgencyLine} Your comments help us improve the ownership and service experience, and we appreciate the opportunity to make this right.`,
    "",
    "Regards,",
    `${dealerName} Customer Experience Team`
  ].join("\n");

  return {
    tone,
    issueCategory: context.issueCategory,
    sentimentLabel: context.sentimentLabel,
    draftText
  };
}

export async function generateResponseDraft(feedbackRecordId: string, dealerCode?: string): Promise<ResponseDraftResult | null> {
  const context = await loadFeedbackDraftContext(feedbackRecordId, dealerCode);

  if (!context) {
    return null;
  }

  const draft = buildDraft(context);

  return {
    feedbackRecordId: context.feedbackRecordId,
    ...draft
  };
}
