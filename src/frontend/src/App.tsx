import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Car, Filter, LineChart, RefreshCw, Search, Sparkles, TrendingUp, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { MetricCard } from "./components/MetricCard.js";

const dealers = ["AutoTech Motors", "Prestige AutoHouse", "Capital Auto Hub", "Sunrise Motors", "Elite Autoworks"];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const commandCenterMetrics = [
  { label: "CSI Score", value: "847", suffix: "/1000", accent: "blue", trend: "+2.4%" },
  { label: "Net Promoter Score", value: "+42", suffix: "NPS", accent: "teal", trend: "+3 pts" },
  { label: "Sentiment Score", value: "76.3%", suffix: "positive", accent: "green", trend: "+1.8%" },
  { label: "Customer Retention", value: "68.4%", suffix: "retained", accent: "amber", trend: "-1.2%" },
  { label: "Open Escalations", value: "247", suffix: "active", accent: "danger", trend: "+34" }
] as const;

const sourceTypes = ["Survey", "JobCard", "WarrantyClaim", "GoogleReview", "SocialMedia", "CallCenter", "MobileApp", "ManualUpload"];
const sentimentLabels = ["Positive", "Neutral", "Negative", "Mixed", "Unknown"];
const issueCategories = [
  "ServiceQuality",
  "RepairQuality",
  "StaffBehavior",
  "PriceTransparency",
  "PartsAvailability",
  "WarrantyConcern",
  "VehicleQuality",
  "DeliveryDelay",
  "FacilityExperience",
  "DigitalExperience",
  "Other"
];
const urgencyLevels = ["Low", "Medium", "High", "Critical"];
const pageSizeOptions = [10, 25, 50, 100];

interface FeedbackSummary {
  id: string;
  sourceType: string;
  sourceReferenceId: string;
  feedbackDate: string;
  rawText: string;
  maskedText: string | null;
  rating: number | null;
  processingStatus: string;
  dealerName: string | null;
  dealerCode: string | null;
  customerName: string | null;
  vehicleModel: string | null;
  sentimentLabel: string | null;
  topics: string[] | null;
  issueCategory: string | null;
  urgencyLevel: string | null;
}

interface FeedbackDetail extends FeedbackSummary {
  nlpResult: {
    detectedLanguage?: string;
    translatedText?: string | null;
    sentimentLabel?: string;
    sentimentScore?: number | null;
    topics?: string[] | null;
    confidenceScore?: number | null;
    modelName?: string | null;
    modelVersion?: string | null;
  } | null;
  issueClassifications: Array<{
    id: string;
    category: string;
    subCategory: string | null;
    urgencyLevel: string;
    confidenceScore: number | null;
    explanation: string | null;
    isPrimary: boolean;
  }>;
  reviewItems: Array<{
    id: string;
    status: string;
    reason: string;
    assignedTo: string | null;
  }>;
}

interface FeedbackListResponse {
  totalCount: number;
  limit: number;
  offset: number;
  records: FeedbackSummary[];
}

interface ExplorerFilters {
  sourceType: string;
  dealerName: string;
  sentimentLabel: string;
  issueCategory: string;
  urgencyLevel: string;
  vehicleModel: string;
  dateFrom: string;
  dateTo: string;
}

interface ExecutiveDashboardSummary {
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

type AppPage = "dashboard" | "executive" | "feedback";

export function App() {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-command-navy px-8 py-4 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <Car size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">AutoIndia Motors · Voice of Customer</p>
            <h1 className="text-lg font-bold">Customer Experience Command Center</h1>
          </div>
        </div>
        <nav className="order-3 flex w-full items-center gap-3 lg:order-none lg:w-auto">
          <MenuButton active={activePage === "dashboard"} onClick={() => setActivePage("dashboard")}>
            Command Center
          </MenuButton>
          <MenuButton active={activePage === "executive"} onClick={() => setActivePage("executive")}>
            Executive Dashboard
          </MenuButton>
          <MenuButton active={activePage === "feedback"} onClick={() => setActivePage("feedback")}>
            Feedback Workspace
          </MenuButton>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-300 md:flex">
            <Search size={16} />
            Search feedback, topics...
          </div>
          <Bell size={20} />
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">RK</span>
            <span className="hidden text-sm md:block">Rahul Kumar</span>
          </div>
        </div>
      </header>

      {activePage === "dashboard" ? <DashboardPage /> : activePage === "executive" ? <ExecutiveDashboardPage /> : <FeedbackWorkspacePage />}
    </main>
  );
}

function MenuButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm ${
        active ? "border border-blue-400/40 bg-blue-600/20 text-blue-100" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DashboardPage() {
  return (
    <section className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {commandCenterMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardPanel title="CSI Score Trend" subtitle="Customer Satisfaction Index · Jan 2025 - Jun 2026">
            <TrendPlaceholder icon={<LineChart />} color="blue" />
          </DashboardPanel>
          <DashboardPanel title="NPS Trend" subtitle="Net Promoter Score · Jan 2025 - Jun 2026">
            <TrendPlaceholder icon={<TrendingUp />} color="teal" />
          </DashboardPanel>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardPanel title="Regional Sentiment Heatmap" subtitle="India · State-wise CX Sentiment">
            <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-sm text-slate-500">
              Regional sentiment visualization placeholder
            </div>
          </DashboardPanel>
          <DashboardPanel title="Dealer Performance" subtitle="Top performers by CSI and NPS">
            <div className="space-y-3">
              {dealers.map((dealer, index) => (
                <div key={dealer} className="grid grid-cols-[32px_1fr_72px_72px] items-center rounded-xl bg-slate-50 px-3 py-3 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">{index + 1}</span>
                  <span className="font-semibold">{dealer}</span>
                  <span className="font-bold text-slate-900">{923 - index * 6}</span>
                  <span className="font-bold text-emerald-600">+{68 - index * 3}</span>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>

      <DashboardInsightsSidebar criticalText="4 active · 2 require immediate action" />
    </section>
  );
}

function ExecutiveDashboardPage() {
  const [dashboard, setDashboard] = useState<ExecutiveDashboardSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState("Loading executive dashboard...");

  async function loadDashboard() {
    setIsLoadingDashboard(true);

    try {
      const response = await fetch(`${apiBaseUrl}/dashboard/executive`);
      const payload = (await response.json()) as ExecutiveDashboardSummary;

      if (!response.ok) {
        throw new Error("Could not load executive dashboard.");
      }

      setDashboard(payload);
      setDashboardMessage("Live prototype dashboard data loaded.");
    } catch (error) {
      setDashboard(null);
      setDashboardMessage(error instanceof Error ? error.message : "Could not load executive dashboard.");
    } finally {
      setIsLoadingDashboard(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const positiveRate = dashboard?.totalFeedback ? Math.round((dashboard.positiveFeedback / dashboard.totalFeedback) * 100) : 76;
  const negativeRate = dashboard?.totalFeedback ? Math.round((dashboard.negativeFeedback / dashboard.totalFeedback) * 100) : 18;
  const dashboardMetrics = [
    { label: "Total Feedback", value: String(dashboard?.totalFeedback ?? 847), suffix: "records", accent: "blue", trend: "Live" },
    { label: "Positive Sentiment", value: `${positiveRate}%`, suffix: "positive", accent: "green", trend: "+1.8%" },
    { label: "Negative Sentiment", value: `${negativeRate}%`, suffix: "negative", accent: "amber", trend: "watch" },
    { label: "Critical Feedback", value: String(dashboard?.criticalFeedback ?? 4), suffix: "critical", accent: "danger", trend: "action" },
    { label: "Warranty Signals", value: String(dashboard?.openWarrantySignals ?? 0), suffix: "open", accent: "teal", trend: "quality" }
  ] as const;
  const sentimentRows = dashboard?.sentimentDistribution.length ? dashboard.sentimentDistribution : [
    { label: "Positive", count: 12 },
    { label: "Neutral", count: 4 },
    { label: "Negative", count: 3 }
  ];
  const topIssues = dashboard?.topIssueCategories.length ? dashboard.topIssueCategories : [
    { category: "RepairQuality", count: 8 },
    { category: "PriceTransparency", count: 5 },
    { category: "WarrantyConcern", count: 3 }
  ];
  const dealerRows = dashboard?.dealerComparison.length ? dashboard.dealerComparison : dealers.map((dealer, index) => ({
    dealerId: dealer,
    dealerName: dealer,
    dealerCode: `DEMO-${index + 1}`,
    region: "Demo",
    csiScore: 923 - index * 6,
    npsScore: 68 - index * 3,
    sentimentScore: null,
    openEscalations: index,
    feedbackCount: 20 - index
  }));

  return (
    <section className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-card">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Executive Dashboard</p>
              <h2 className="text-2xl font-black text-slate-950">OEM VoC Command Center</h2>
              <p className="mt-1 text-sm text-slate-500">{dashboardMessage}</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              type="button"
              onClick={() => void loadDashboard()}
            >
              <RefreshCw size={16} className={isLoadingDashboard ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {dashboardMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardPanel title="Overall Sentiment Distribution" subtitle="Current NLP sentiment labels">
              <DistributionList rows={sentimentRows.map((row) => ({ label: row.label, value: row.count }))} tone="sentiment" />
            </DashboardPanel>
            <DashboardPanel title="Top Issue Categories" subtitle="Primary classified issue categories">
              <DistributionList rows={topIssues.map((row) => ({ label: row.category, value: row.count }))} tone="issue" />
            </DashboardPanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardPanel title="Regional Sentiment Heatmap" subtitle="India · State-wise CX Sentiment">
              <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-sm text-slate-500">
                Regional sentiment visualization placeholder
              </div>
            </DashboardPanel>
            <DashboardPanel title="Dealer Performance" subtitle="Top performers by CSI and NPS">
              <div className="space-y-3">
                {dealerRows.map((dealer, index) => (
                  <div key={dealer.dealerId} className="grid grid-cols-[32px_1fr_72px_72px] items-center rounded-xl bg-slate-50 px-3 py-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-700">{index + 1}</span>
                    <span>
                      <span className="block font-semibold">{dealer.dealerName}</span>
                      <span className="text-xs text-slate-400">{dealer.region} · {dealer.feedbackCount} feedback</span>
                    </span>
                    <span className="font-bold text-slate-900">{Math.round(dealer.csiScore ?? 0)}</span>
                    <span className="font-bold text-emerald-600">+{Math.round(dealer.npsScore ?? 0)}</span>
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </div>

        </div>

        <DashboardInsightsSidebar
          criticalText={`${dashboard?.criticalFeedback ?? 4} critical feedback · ${dashboard?.openWarrantySignals ?? 0} open warranty signals`}
        />
      </section>
  );
}

function DashboardInsightsSidebar({ criticalText }: { criticalText: string }) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-xl bg-indigo-100 p-2 text-indigo-600"><Sparkles size={20} /></span>
          <div>
            <h2 className="font-bold">AI Generated Insights</h2>
            <p className="text-xs text-slate-500">Powered by AutoIndia CX Intelligence</p>
          </div>
        </div>
        {["South India Surge", "Price Transparency Alert", "NCR Retention Drop"].map((item, index) => (
          <article key={item} className="mb-3 rounded-xl border border-slate-100 p-4">
            <p className={`mb-2 text-xs font-bold uppercase ${index === 2 ? "text-red-600" : index === 1 ? "text-amber-600" : "text-emerald-600"}`}>
              {index === 2 ? "Risk Detected" : index === 1 ? "Action Required" : "Positive Trend"}
            </p>
            <h3 className="font-bold">{item}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Prototype insight summary for stakeholder validation and demo flow.</p>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle size={22} />
          <h2 className="font-bold text-slate-950">Critical Alerts</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">{criticalText}</p>
      </div>
    </aside>
  );
}

function DistributionList({ rows, tone }: { rows: Array<{ label: string; value: number }>; tone: "sentiment" | "issue" }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-slate-800">{row.label}</span>
            <span className="font-black text-slate-950">{row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-white">
            <div
              className={`h-2 rounded-full ${tone === "sentiment" ? "bg-emerald-500" : "bg-blue-600"}`}
              style={{ width: `${Math.max((row.value / maxValue) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedbackWorkspacePage() {
  return (
    <section className="space-y-6 p-6">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Feedback Workspace</p>
            <h2 className="text-2xl font-black text-slate-950">Upload And Explore Feedback</h2>
            <p className="mt-1 text-sm text-slate-500">Load prototype feedback files, then inspect normalized records and NLP outputs from one workspace.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
            <UploadCloud size={18} />
            Accepted: .csv, .xlsx
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <FeedbackUploadCard />
        <FeedbackExplorer />
      </div>
    </section>
  );
}

interface UploadResult {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  insertedRows: number;
}

function FeedbackExplorer() {
  const [filters, setFilters] = useState<ExplorerFilters>({
    sourceType: "",
    dealerName: "",
    sentimentLabel: "",
    issueCategory: "",
    urgencyLevel: "",
    vehicleModel: "",
    dateFrom: "",
    dateTo: ""
  });
  const [records, setRecords] = useState<FeedbackSummary[]>([]);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDetail | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [message, setMessage] = useState("Loading feedback records...");

  async function loadFeedback() {
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/feedback?${params.toString()}`);
      const payload = (await response.json()) as FeedbackListResponse;

      if (!response.ok) {
        throw new Error("Could not load feedback records.");
      }

      setRecords(payload.records);
      setTotalCount(payload.totalCount);
      setMessage(payload.records.length > 0 ? `${payload.totalCount} feedback records found.` : "No feedback found for the selected filters.");
    } catch (error) {
      setRecords([]);
      setTotalCount(0);
      setMessage(error instanceof Error ? error.message : "Could not load feedback records.");
    } finally {
      setIsLoading(false);
    }
  }

  async function openFeedbackDetail(feedbackId: string) {
    setSelectedFeedbackId(feedbackId);
    setSelectedFeedback(null);
    setIsDetailLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/feedback/${feedbackId}`);
      const payload = (await response.json()) as FeedbackDetail;

      if (!response.ok) {
        throw new Error("Could not open feedback detail.");
      }

      setSelectedFeedback(payload);
    } catch {
      setSelectedFeedback(null);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function updateFilter(key: keyof ExplorerFilters, value: string) {
    setPage(1);
    setSelectedFeedbackId(null);
    setSelectedFeedback(null);
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setSelectedFeedbackId(null);
    setSelectedFeedback(null);
    setFilters({
      sourceType: "",
      dealerName: "",
      sentimentLabel: "",
      issueCategory: "",
      urgencyLevel: "",
      vehicleModel: "",
      dateFrom: "",
      dateTo: ""
    });
  }

  useEffect(() => {
    void loadFeedback();
  }, [filters, page, pageSize]);

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const firstRecordIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecordIndex = Math.min(page * pageSize, totalCount);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Filter size={18} />
            </span>
            <h2 className="text-lg font-bold">Feedback Explorer</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Search and inspect customer comments across source, model, sentiment, issue, and urgency.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          type="button"
          onClick={() => void loadFeedback()}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
        <FilterSelect label="Source" value={filters.sourceType} values={sourceTypes} onChange={(value) => updateFilter("sourceType", value)} />
        <FilterInput label="Dealer" value={filters.dealerName} placeholder="e.g. AutoTech" onChange={(value) => updateFilter("dealerName", value)} />
        <FilterSelect label="Sentiment" value={filters.sentimentLabel} values={sentimentLabels} onChange={(value) => updateFilter("sentimentLabel", value)} />
        <FilterSelect label="Issue" value={filters.issueCategory} values={issueCategories} onChange={(value) => updateFilter("issueCategory", value)} />
        <FilterSelect label="Urgency" value={filters.urgencyLevel} values={urgencyLevels} onChange={(value) => updateFilter("urgencyLevel", value)} />
        <FilterInput label="Model" value={filters.vehicleModel} placeholder="e.g. Nexon" onChange={(value) => updateFilter("vehicleModel", value)} />
        <FilterInput label="From" value={filters.dateFrom} type="date" onChange={(value) => updateFilter("dateFrom", value)} />
        <FilterInput label="To" value={filters.dateTo} type="date" onChange={(value) => updateFilter("dateTo", value)} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">{message}</span>
        <button className="text-sm font-bold text-blue-600" type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1fr_420px]">
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <span>Feedback</span>
            <span>Dealer / Model</span>
            <span>Sentiment</span>
            <span>Issue</span>
            <span>Urgency</span>
          </div>
          {records.map((record) => (
            <button
              key={record.id}
              className={`grid w-full grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-t border-slate-100 px-4 py-4 text-left text-sm hover:bg-blue-50/60 ${
                selectedFeedbackId === record.id ? "bg-blue-50" : "bg-white"
              }`}
              type="button"
              onClick={() => void openFeedbackDetail(record.id)}
            >
              <span>
                <span className="block font-bold text-slate-950">{record.sourceReferenceId}</span>
                <span className="line-clamp-2 text-slate-500">{record.maskedText ?? record.rawText}</span>
              </span>
              <span className="text-slate-600">
                <span className="block font-semibold">{record.dealerName ?? "Unassigned"}</span>
                <span className="text-xs text-slate-400">{record.vehicleModel ?? "Model N/A"}</span>
              </span>
              <Badge tone={sentimentTone(record.sentimentLabel)}>{record.sentimentLabel ?? "Pending"}</Badge>
              <span className="font-semibold text-slate-700">{record.issueCategory ?? "Unclassified"}</span>
              <Badge tone={urgencyTone(record.urgencyLevel)}>{record.urgencyLevel ?? "Pending"}</Badge>
            </button>
          ))}
          {records.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              {isLoading ? "Loading feedback..." : "No records to show."}
            </div>
          ) : null}
        </div>

        <FeedbackDetailPanel feedback={selectedFeedback} isLoading={isDetailLoading} totalCount={totalCount} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">
          Showing {firstRecordIndex}-{lastRecordIndex} of {totalCount}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Rows
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700"
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <span className="font-bold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function FeedbackDetailPanel({ feedback, isLoading, totalCount }: { feedback: FeedbackDetail | null; isLoading: boolean; totalCount: number }) {
  if (isLoading) {
    return <aside className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-500">Loading feedback detail...</aside>;
  }

  if (!feedback) {
    return (
      <aside className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        <p className="font-bold text-slate-700">Select a feedback row</p>
        <p className="mt-2">Explorer has {totalCount} matching records. Open one to review text, translation, NLP output, classifications, and follow-up items.</p>
      </aside>
    );
  }

  const primaryIssue = feedback.issueClassifications.find((item) => item.isPrimary) ?? feedback.issueClassifications[0];

  return (
    <aside className="rounded-xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{feedback.sourceType}</p>
          <h3 className="text-lg font-black text-slate-950">{feedback.sourceReferenceId}</h3>
          <p className="text-sm text-slate-500">{new Date(feedback.feedbackDate).toLocaleDateString()}</p>
        </div>
        <Badge tone={urgencyTone(primaryIssue?.urgencyLevel)}>{primaryIssue?.urgencyLevel ?? "Pending"}</Badge>
      </div>

      <DetailBlock title="Raw Text">{feedback.rawText}</DetailBlock>
      <DetailBlock title="Masked Text">{feedback.maskedText ?? "Not available"}</DetailBlock>
      <DetailBlock title="Translated Text">{feedback.nlpResult?.translatedText ?? "English or not processed yet"}</DetailBlock>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailMetric label="Sentiment" value={feedback.nlpResult?.sentimentLabel ?? "Pending"} />
        <DetailMetric label="Language" value={feedback.nlpResult?.detectedLanguage ?? "Pending"} />
        <DetailMetric label="Issue" value={primaryIssue?.category ?? "Unclassified"} />
        <DetailMetric label="Confidence" value={formatPercent(primaryIssue?.confidenceScore ?? feedback.nlpResult?.confidenceScore)} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Topics</p>
        <div className="flex flex-wrap gap-2">
          {(feedback.nlpResult?.topics?.length ? feedback.nlpResult.topics : ["Pending"]).map((topic) => (
            <Badge key={topic} tone="blue">{topic}</Badge>
          ))}
        </div>
      </div>

      <DetailBlock title="Classification Explanation">{primaryIssue?.explanation ?? "Classification has not been generated yet."}</DetailBlock>
      <DetailBlock title="Related Actions">
        {feedback.reviewItems.length > 0
          ? feedback.reviewItems.map((item) => `${item.status}: ${item.reason}`).join(" | ")
          : "No review or recovery action has been created yet."}
      </DetailBlock>
    </aside>
  );
}

function FilterSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({ label, value, placeholder, type = "text", onChange }: { label: string; value: string; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl bg-white p-4">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-sm leading-6 text-slate-700">{children}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}

function Badge({ tone, children }: { tone: "blue" | "green" | "amber" | "red" | "slate"; children: ReactNode }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600"
  };

  return <span className={`inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-xs font-black ${classes[tone]}`}>{children}</span>;
}

function sentimentTone(value: string | null): "green" | "amber" | "red" | "slate" {
  if (value === "Positive") {
    return "green";
  }

  if (value === "Negative") {
    return "red";
  }

  if (value === "Mixed") {
    return "amber";
  }

  return "slate";
}

function urgencyTone(value: string | null | undefined): "green" | "amber" | "red" | "slate" {
  if (value === "Critical" || value === "High") {
    return "red";
  }

  if (value === "Medium") {
    return "amber";
  }

  if (value === "Low") {
    return "green";
  }

  return "slate";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "Pending";
}

function FeedbackUploadCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string>("Accepted formats: .csv and .xlsx only.");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function uploadFeedback() {
    if (!selectedFile) {
      setMessage("Choose a feedback file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setIsUploading(true);
    setMessage("Uploading feedback data...");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploads/feedback`, {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Feedback upload failed.");
      }

      setResult(payload);
      setMessage("Upload processed successfully.");
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "Feedback upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-xl bg-blue-100 p-2 text-blue-600">
          <UploadCloud size={20} />
        </span>
        <div>
          <h2 className="font-bold">Feedback Upload</h2>
          <p className="text-xs text-slate-500">Accepted: .csv, .xlsx</p>
        </div>
      </div>
      <p className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
        Upload only CSV or Excel workbook files with extensions .csv or .xlsx.
      </p>
      <input
        className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        type="file"
        accept=".csv,.xlsx"
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
      />
      <button
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        type="button"
        disabled={isUploading}
        onClick={uploadFeedback}
      >
        {isUploading ? "Uploading..." : "Upload Feedback"}
      </button>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      {result ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Metric label="Total" value={result.totalRows} />
          <Metric label="Inserted" value={result.insertedRows} />
          <Metric label="Rejected" value={result.rejectedRows} />
          <Metric label="Duplicates" value={result.duplicateRows} />
        </dl>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-lg font-black text-slate-950">{value}</dd>
    </div>
  );
}

function DashboardPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {children}
    </section>
  );
}

function TrendPlaceholder({ icon, color }: { icon: ReactNode; color: "blue" | "teal" }) {
  const colorClass = color === "blue" ? "text-blue-600" : "text-cyan-600";

  return (
    <div className={`flex h-64 items-center justify-center rounded-xl bg-slate-50 ${colorClass}`}>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">{icon}</div>
        <p className="text-sm font-semibold">Chart component placeholder</p>
      </div>
    </div>
  );
}

export default App;
