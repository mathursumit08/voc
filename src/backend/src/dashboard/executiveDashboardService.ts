import { pool } from "../db/pool.js";

export interface ExecutiveDashboardSummary {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  criticalFeedback: number;
  openWarrantySignals: number;
  sentimentDistribution: Array<{ label: string; count: number }>;
  topIssueCategories: Array<{ category: string; count: number }>;
  dealerComparison: Array<{
    dealerId: string;
    dealerName: string;
    dealerCode: string;
    region: string;
    csiScore: number | null;
    npsScore: number | null;
    sentimentScore: number | null;
    openEscalations: number;
    feedbackCount: number;
  }>;
}

export async function getExecutiveDashboardSummary(): Promise<ExecutiveDashboardSummary> {
  // Dashboard queries intentionally follow indexed reporting paths defined in the prototype schema.
  const [totals, sentimentDistribution, topIssueCategories, dealerComparison] = await Promise.all([
    pool.query<{
      totalFeedback: number;
      positiveFeedback: number;
      negativeFeedback: number;
      criticalFeedback: number;
      openWarrantySignals: number;
    }>(
      `
        SELECT
          (SELECT COUNT(*)::int FROM feedback_records) AS "totalFeedback",
          (SELECT COUNT(*)::int FROM nlp_results WHERE sentiment_label = 'Positive'::"SentimentLabel") AS "positiveFeedback",
          (SELECT COUNT(*)::int FROM nlp_results WHERE sentiment_label = 'Negative'::"SentimentLabel") AS "negativeFeedback",
          (SELECT COUNT(*)::int FROM issue_classifications WHERE urgency_level = 'Critical'::"UrgencyLevel") AS "criticalFeedback",
          (SELECT COUNT(*)::int FROM warranty_signals WHERE status IN ('Open'::"SignalStatus", 'UnderReview'::"SignalStatus", 'Escalated'::"SignalStatus")) AS "openWarrantySignals"
      `
    ),
    pool.query<{ label: string; count: number }>(
      `
        SELECT sentiment_label::text AS label, COUNT(*)::int AS count
        FROM nlp_results
        GROUP BY sentiment_label
        ORDER BY count DESC, sentiment_label ASC
      `
    ),
    pool.query<{ category: string; count: number }>(
      `
        SELECT category::text AS category, COUNT(*)::int AS count
        FROM issue_classifications
        WHERE is_primary = true
        GROUP BY category
        ORDER BY count DESC, category ASC
        LIMIT 8
      `
    ),
    pool.query<ExecutiveDashboardSummary["dealerComparison"][number]>(
      `
        SELECT
          d.id AS "dealerId",
          d.name AS "dealerName",
          d.code AS "dealerCode",
          d.region,
          ds.csi_score::float AS "csiScore",
          ds.nps_score::float AS "npsScore",
          ds.sentiment_score::float AS "sentimentScore",
          ds.open_escalations AS "openEscalations",
          ds.feedback_count AS "feedbackCount"
        FROM dealer_scores ds
        JOIN dealers d ON d.id = ds.dealer_id
        WHERE ds.period_start = (SELECT MAX(period_start) FROM dealer_scores)
        ORDER BY ds.csi_score DESC NULLS LAST, ds.nps_score DESC NULLS LAST
        LIMIT 10
      `
    )
  ]);

  return {
    totalFeedback: totals.rows[0]?.totalFeedback ?? 0,
    positiveFeedback: totals.rows[0]?.positiveFeedback ?? 0,
    negativeFeedback: totals.rows[0]?.negativeFeedback ?? 0,
    criticalFeedback: totals.rows[0]?.criticalFeedback ?? 0,
    openWarrantySignals: totals.rows[0]?.openWarrantySignals ?? 0,
    sentimentDistribution: sentimentDistribution.rows,
    topIssueCategories: topIssueCategories.rows,
    dealerComparison: dealerComparison.rows
  };
}
