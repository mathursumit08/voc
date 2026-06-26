import { pool } from "../db/pool.js";

export interface DealerDashboardSummary {
  dealer: {
    id: string;
    name: string;
    code: string;
    region: string;
    city: string;
    state: string;
  };
  scorecard: {
    csiScore: number | null;
    csiBenchmark: number | null;
    npsScore: number | null;
    npsBenchmark: number | null;
    sentimentScore: number | null;
    sentimentBenchmark: number | null;
    feedbackCount: number;
    openEscalations: number;
  };
  complaintVolume: Array<{ period: string; count: number }>;
  sentimentTrend: Array<{ period: string; positive: number; neutral: number; negative: number; mixed: number }>;
  topIssues: Array<{ category: string; count: number }>;
  openCrmTasks: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    dueAt: string | null;
    feedbackRecordId: string;
  }>;
}

export interface DealerLookupOption {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string;
  state: string;
}

export async function searchDealerLookupOptions(search?: string) {
  const result = await pool.query<DealerLookupOption>(
    `
      SELECT id, name, code, region, city, state
      FROM dealers
      WHERE is_active = true
        AND (
          $1::text IS NULL
          OR name ILIKE '%' || $1 || '%'
          OR code ILIKE '%' || $1 || '%'
          OR city ILIKE '%' || $1 || '%'
          OR region ILIKE '%' || $1 || '%'
        )
      ORDER BY name
      LIMIT 50
    `,
    [search?.trim() || null]
  );

  return result.rows;
}

async function resolveDealer(dealerCode?: string, dealerId?: string) {
  const result = await pool.query<DealerDashboardSummary["dealer"]>(
    `
      SELECT id, name, code, region, city, state
      FROM dealers
      WHERE is_active = true
        AND (
          ($1::text IS NOT NULL AND code = $1)
          OR ($2::uuid IS NOT NULL AND id = $2::uuid)
          OR ($1::text IS NULL AND $2::uuid IS NULL)
        )
      ORDER BY code
      LIMIT 1
    `,
    [dealerCode ?? null, dealerId ?? null]
  );

  return result.rows[0] ?? null;
}

export async function getDealerDashboardSummary(filters: { dealerCode?: string; dealerId?: string }): Promise<DealerDashboardSummary | null> {
  const dealer = await resolveDealer(filters.dealerCode, filters.dealerId);

  if (!dealer) {
    return null;
  }

  // Every query below is scoped by dealer.id to model assigned-dealer visibility for the prototype.
  const [scorecard, complaintVolume, sentimentTrend, topIssues, openCrmTasks] = await Promise.all([
    pool.query<DealerDashboardSummary["scorecard"]>(
      `
        WITH latest_scores AS (
          SELECT *
          FROM dealer_scores
          WHERE period_start = (SELECT MAX(period_start) FROM dealer_scores)
        )
        SELECT
          current_score.csi_score::float AS "csiScore",
          benchmark.csi_benchmark::float AS "csiBenchmark",
          current_score.nps_score::float AS "npsScore",
          benchmark.nps_benchmark::float AS "npsBenchmark",
          current_score.sentiment_score::float AS "sentimentScore",
          benchmark.sentiment_benchmark::float AS "sentimentBenchmark",
          COALESCE(current_score.feedback_count, 0)::int AS "feedbackCount",
          COALESCE(current_score.open_escalations, 0)::int AS "openEscalations"
        FROM latest_scores current_score
        CROSS JOIN (
          SELECT
            AVG(csi_score) AS csi_benchmark,
            AVG(nps_score) AS nps_benchmark,
            AVG(sentiment_score) AS sentiment_benchmark
          FROM latest_scores
        ) benchmark
        WHERE current_score.dealer_id = $1::uuid
      `,
      [dealer.id]
    ),
    pool.query<{ period: string; count: number }>(
      `
        SELECT to_char(date_trunc('month', feedback_date), 'YYYY-MM') AS period, COUNT(*)::int AS count
        FROM feedback_records
        WHERE dealer_id = $1::uuid
        GROUP BY date_trunc('month', feedback_date)
        ORDER BY period
      `,
      [dealer.id]
    ),
    pool.query<{ period: string; positive: number; neutral: number; negative: number; mixed: number }>(
      `
        SELECT
          to_char(date_trunc('month', fr.feedback_date), 'YYYY-MM') AS period,
          COUNT(*) FILTER (WHERE nr.sentiment_label = 'Positive'::"SentimentLabel")::int AS positive,
          COUNT(*) FILTER (WHERE nr.sentiment_label = 'Neutral'::"SentimentLabel" OR nr.sentiment_label = 'Unknown'::"SentimentLabel")::int AS neutral,
          COUNT(*) FILTER (WHERE nr.sentiment_label = 'Negative'::"SentimentLabel")::int AS negative,
          COUNT(*) FILTER (WHERE nr.sentiment_label = 'Mixed'::"SentimentLabel")::int AS mixed
        FROM feedback_records fr
        LEFT JOIN nlp_results nr ON nr.feedback_record_id = fr.id
        WHERE fr.dealer_id = $1::uuid
        GROUP BY date_trunc('month', fr.feedback_date)
        ORDER BY period
      `,
      [dealer.id]
    ),
    pool.query<{ category: string; count: number }>(
      `
        SELECT ic.category::text AS category, COUNT(*)::int AS count
        FROM issue_classifications ic
        JOIN feedback_records fr ON fr.id = ic.feedback_record_id
        WHERE fr.dealer_id = $1::uuid
          AND ic.is_primary = true
        GROUP BY ic.category
        ORDER BY count DESC, ic.category ASC
        LIMIT 5
      `,
      [dealer.id]
    ),
    pool.query<DealerDashboardSummary["openCrmTasks"][number]>(
      `
        SELECT
          id,
          title,
          priority::text AS priority,
          status::text AS status,
          due_at AS "dueAt",
          feedback_record_id AS "feedbackRecordId"
        FROM crm_tasks
        WHERE dealer_id = $1::uuid
          AND status IN ('Open'::"CrmTaskStatus", 'InProgress'::"CrmTaskStatus")
        ORDER BY due_at ASC NULLS LAST, created_at DESC
        LIMIT 10
      `,
      [dealer.id]
    )
  ]);

  return {
    dealer,
    scorecard: scorecard.rows[0] ?? {
      csiScore: null,
      csiBenchmark: null,
      npsScore: null,
      npsBenchmark: null,
      sentimentScore: null,
      sentimentBenchmark: null,
      feedbackCount: 0,
      openEscalations: 0
    },
    complaintVolume: complaintVolume.rows,
    sentimentTrend: sentimentTrend.rows,
    topIssues: topIssues.rows,
    openCrmTasks: openCrmTasks.rows
  };
}
