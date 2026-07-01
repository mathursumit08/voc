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

const demoJourneys = [
  {
    title: "Critical EV Charging Recovery",
    feedbackId: "FB-015",
    customer: "Customer Gurugram 015",
    route: "Feedback Workspace",
    summary: "Charging speed remains unresolved, urgency and churn risk can drive CRM recovery and response draft."
  },
  {
    title: "Warranty Quality Signal",
    feedbackId: "FB-005",
    customer: "Customer Chennai 005",
    route: "Executive Dashboard",
    summary: "Hybrid warning lamp recurrence can be grouped into warranty quality signals by model, part, issue, and dealer."
  },
  {
    title: "Human Review Correction",
    feedbackId: "FB-013",
    customer: "Customer Indore 013",
    route: "Feedback Workspace",
    summary: "Reviewer corrects low-confidence classification, updates topics, issue, urgency, and stores review notes."
  }
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
const churnRiskLevels = ["Low", "Medium", "High", "Critical"];
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
  isRepeatComplaint: boolean;
  repeatComplaintCount: number;
  churnRiskScore: number | null;
  churnRiskLevel: string | null;
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
  crmTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    dueAt: string | null;
    closedAt: string | null;
    resolutionNotes: string | null;
    createdAt: string;
  }>;
  repeatComplaintSignal: {
    isRepeat: boolean;
    repeatCount: number;
    lookbackDays: number;
    matchingFeedbackRecordIds: string[];
    reasonSummary: string | null;
    detectedAt: string;
  } | null;
  churnRisk: {
    score: number;
    riskLevel: string;
    reasonSummary: string | null;
    scoredAt: string;
  } | null;
}

interface ResponseDraft {
  feedbackRecordId: string;
  tone: string;
  issueCategory: string;
  sentimentLabel: string;
  draftText: string;
}

interface FeedbackListResponse {
  totalCount: number;
  limit: number;
  offset: number;
  records: FeedbackSummary[];
}

interface ReviewQueueItem {
  id: string;
  feedbackRecordId: string;
  status: string;
  reason: string;
  assignedTo: string | null;
  reviewerNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  sourceReferenceId: string;
  feedbackDate: string;
  maskedText: string | null;
  rawText: string;
  dealerName: string | null;
  dealerCode: string | null;
  sentimentLabel: string | null;
  topics: string[] | null;
  issueCategory: string | null;
  urgencyLevel: string | null;
}

interface ReviewQueueListResponse {
  totalCount: number;
  limit: number;
  offset: number;
  records: ReviewQueueItem[];
}

interface ExplorerFilters {
  sourceType: string;
  dealerName: string;
  sentimentLabel: string;
  issueCategory: string;
  urgencyLevel: string;
  churnRiskLevel: string;
  vehicleModel: string;
  dateFrom: string;
  dateTo: string;
}

interface ExecutiveDashboardSummary {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  criticalFeedback: number;
  highRiskCustomers: number;
  openWarrantySignals: number;
  sentimentDistribution: Array<{ label: string; count: number }>;
  churnRiskDistribution: Array<{ label: string; count: number }>;
  topIssueCategories: Array<{ category: string; count: number }>;
  warrantySignals: WarrantySignal[];
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

interface WarrantySignal {
  id: string;
  dealerId: string | null;
  dealerName: string | null;
  warrantyClaimId: string | null;
  feedbackRecordId: string | null;
  model: string | null;
  partCode: string | null;
  issueCategory: string | null;
  signalScore: number | null;
  status: string;
  supportingCount: number;
  summary: string | null;
  detectedAt: string;
  supportingFeedbackRecordIds: string[];
}

interface DealerDashboardSummary {
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
    highRiskCustomers: number;
  };
  complaintVolume: Array<{ period: string; count: number }>;
  sentimentTrend: Array<{ period: string; positive: number; neutral: number; negative: number; mixed: number }>;
  topIssues: Array<{ category: string; count: number }>;
  openCrmTasks: Array<{ id: string; title: string; priority: string; status: string; dueAt: string | null; feedbackRecordId: string }>;
}

interface DealerLookupOption {
  id: string;
  name: string;
  code: string;
  region: string;
  city: string;
  state: string;
}

type UserRole = "Admin" | "OemUser" | "DealerUser" | "Reviewer";
interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  dealerCode?: string;
}
interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

type AppPage = "dashboard" | "executive" | "dealer" | "feedback";
type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;
const authStorageKey = "voc.auth";

function readStoredAuthSession() {
  const storedValue = window.localStorage.getItem(authStorageKey);
  return storedValue ? (JSON.parse(storedValue) as AuthSession) : null;
}

function storeAuthSession(session: AuthSession | null) {
  if (session) {
    window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    return;
  }

  window.localStorage.removeItem(authStorageKey);
}

function defaultPageForRole(role: UserRole): AppPage {
  if (role === "DealerUser") {
    return "dealer";
  }

  if (role === "Reviewer") {
    return "feedback";
  }

  return "dashboard";
}

function canAccessPage(role: UserRole, page: AppPage) {
  const permissions: Record<UserRole, AppPage[]> = {
    Admin: ["dashboard", "executive", "dealer", "feedback"],
    OemUser: ["dashboard", "executive", "dealer", "feedback"],
    DealerUser: ["dealer", "feedback"],
    Reviewer: ["feedback"]
  };

  return permissions[role].includes(page);
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredAuthSession());
  const [activePage, setActivePage] = useState<AppPage>(() => (session ? defaultPageForRole(session.user.role) : "dashboard"));

  function saveSession(nextSession: AuthSession | null) {
    storeAuthSession(nextSession);
    setSession(nextSession);

    if (nextSession) {
      setActivePage(defaultPageForRole(nextSession.user.role));
    }
  }

  async function authFetch(input: string, init: RequestInit = {}) {
    if (!session) {
      throw new Error("Authentication required.");
    }

    async function sendRequest(accessToken: string) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      return fetch(input, { ...init, headers });
    }

    const response = await sendRequest(session.accessToken);

    if (response.status !== 401) {
      return response;
    }

    const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });

    if (!refreshResponse.ok) {
      saveSession(null);
      return response;
    }

    const refreshedSession = (await refreshResponse.json()) as AuthSession;
    saveSession(refreshedSession);
    return sendRequest(refreshedSession.accessToken);
  }

  if (!session) {
    return <LoginPage onAuthenticated={saveSession} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-command-navy px-8 py-4 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <Car size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">Voice of Customer</p>
            <h1 className="text-lg font-bold">Customer Experience Command Center</h1>
          </div>
        </div>
        <nav className="order-3 flex w-full items-center gap-3 lg:order-none lg:w-auto">
          {canAccessPage(session.user.role, "dashboard") ? (
            <MenuButton active={activePage === "dashboard"} onClick={() => setActivePage("dashboard")}>
              Command Center
            </MenuButton>
          ) : null}
          {canAccessPage(session.user.role, "executive") ? (
            <MenuButton active={activePage === "executive"} onClick={() => setActivePage("executive")}>
              Executive Dashboard
            </MenuButton>
          ) : null}
          {canAccessPage(session.user.role, "dealer") ? (
            <MenuButton active={activePage === "dealer"} onClick={() => setActivePage("dealer")}>
              Dealer Dashboard
            </MenuButton>
          ) : null}
          {canAccessPage(session.user.role, "feedback") ? (
            <MenuButton active={activePage === "feedback"} onClick={() => setActivePage("feedback")}>
              Feedback Workspace
            </MenuButton>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-300 md:flex">
            <Search size={16} />
            Search feedback, topics...
          </div>
          <Bell size={20} />
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">RK</span>
            <span className="hidden text-sm md:block">{session.user.displayName}</span>
          </div>
          <button className="rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-200" type="button" onClick={() => saveSession(null)}>
            Logout
          </button>
        </div>
      </header>

      {activePage === "dashboard" ? (
        <DashboardPage />
      ) : activePage === "executive" ? (
        <ExecutiveDashboardPage authFetch={authFetch} />
      ) : activePage === "dealer" ? (
        <DealerDashboardPage authFetch={authFetch} user={session.user} />
      ) : (
        <FeedbackWorkspacePage authFetch={authFetch} user={session.user} />
      )}
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

function LoginPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in with your assigned VoC account.");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function login() {
    setIsLoggingIn(true);
    setMessage("Signing in...");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Login failed.");
      }

      onAuthenticated(payload as AuthSession);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Car size={24} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">VoC Prototype</p>
            <h1 className="text-xl font-black">Sign In</h1>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void login();
          }}
        >
          <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Username
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="mb-4 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Password
            <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="submit"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">{message}</p>
      </section>
    </main>
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

        <DashboardPanel title="Prototype Walkthrough" subtitle="Curated journeys for stakeholder validation">
          <div className="grid gap-3 xl:grid-cols-3">
            {demoJourneys.map((journey) => (
              <article key={journey.feedbackId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">{journey.feedbackId}</p>
                    <h3 className="font-black text-slate-950">{journey.title}</h3>
                  </div>
                  <Badge tone="blue">{journey.route}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-600">{journey.customer}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{journey.summary}</p>
              </article>
            ))}
          </div>
        </DashboardPanel>

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

function ExecutiveDashboardPage({ authFetch }: { authFetch: AuthFetch }) {
  const [dashboard, setDashboard] = useState<ExecutiveDashboardSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isRunningWarrantySignals, setIsRunningWarrantySignals] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState("Loading executive dashboard...");

  async function loadDashboard() {
    setIsLoadingDashboard(true);

    try {
      const response = await authFetch(`${apiBaseUrl}/dashboard/executive`);
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

  async function runWarrantySignalDetection() {
    setIsRunningWarrantySignals(true);
    setDashboardMessage("Detecting warranty and quality signals...");

    try {
      const response = await authFetch(`${apiBaseUrl}/warranty-signals/run`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not detect warranty signals.");
      }

      setDashboardMessage(`${payload.detectedCount ?? 0} warranty signal group(s) refreshed.`);
      await loadDashboard();
    } catch (error) {
      setDashboardMessage(error instanceof Error ? error.message : "Could not detect warranty signals.");
    } finally {
      setIsRunningWarrantySignals(false);
    }
  }

  const positiveRate = dashboard?.totalFeedback ? Math.round((dashboard.positiveFeedback / dashboard.totalFeedback) * 100) : 76;
  const negativeRate = dashboard?.totalFeedback ? Math.round((dashboard.negativeFeedback / dashboard.totalFeedback) * 100) : 18;
  const dashboardMetrics = [
    { label: "Total Feedback", value: String(dashboard?.totalFeedback ?? 847), suffix: "records", accent: "blue", trend: "Live" },
    { label: "Positive Sentiment", value: `${positiveRate}%`, suffix: "positive", accent: "green", trend: "+1.8%" },
    { label: "Negative Sentiment", value: `${negativeRate}%`, suffix: "negative", accent: "amber", trend: "watch" },
    { label: "Critical Feedback", value: String(dashboard?.criticalFeedback ?? 4), suffix: "critical", accent: "danger", trend: "action" },
    { label: "High Risk Customers", value: String(dashboard?.highRiskCustomers ?? 0), suffix: "customers", accent: "danger", trend: "retention" }
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
  const churnRiskRows = dashboard?.churnRiskDistribution.length ? dashboard.churnRiskDistribution : [
    { label: "High", count: 0 },
    { label: "Medium", count: 0 },
    { label: "Low", count: 0 }
  ];
  const warrantySignals = dashboard?.warrantySignals.length ? dashboard.warrantySignals : [];
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
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              type="button"
              disabled={isRunningWarrantySignals}
              onClick={() => void runWarrantySignalDetection()}
            >
              <RefreshCw size={16} className={isRunningWarrantySignals ? "animate-spin" : ""} />
              Run Detection
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

          <DashboardPanel title="Churn Risk Distribution" subtitle="Customers by latest generated churn risk">
            <DistributionList rows={churnRiskRows.map((row) => ({ label: row.label, value: row.count }))} tone="issue" />
          </DashboardPanel>

          <DashboardPanel title="Warranty And Quality Signals" subtitle="Active grouped signals by model, part, issue, and dealer">
            <div className="space-y-3">
              {warrantySignals.length ? (
                warrantySignals.map((signal) => (
                  <div key={signal.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{signal.model ?? "Unknown model"} · {signal.partCode ?? "No part"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {signal.dealerName ?? "Unassigned dealer"} · {signal.issueCategory ?? "Other"} · {signal.supportingCount} supporting
                        </p>
                      </div>
                      <Badge tone={signal.status === "Escalated" ? "red" : signal.status === "UnderReview" ? "amber" : "blue"}>{signal.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{signal.summary ?? "Signal summary pending."}</p>
                    <p className="mt-2 text-xs font-bold text-slate-400">Score {Math.round(signal.signalScore ?? 0)}/100</p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No active warranty signals detected yet.</p>
              )}
            </div>
          </DashboardPanel>

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
          criticalText={`${dashboard?.criticalFeedback ?? 4} critical feedback · ${dashboard?.highRiskCustomers ?? 0} high-risk customers · ${dashboard?.openWarrantySignals ?? 0} open warranty signals`}
        />
      </section>
  );
}

function DealerDashboardPage({ authFetch, user }: { authFetch: AuthFetch; user: AuthUser }) {
  const [dealerCode, setDealerCode] = useState(user.dealerCode ?? "AT-BLR-001");
  const [dealerSearch, setDealerSearch] = useState("");
  const [dealerOptions, setDealerOptions] = useState<DealerLookupOption[]>([]);
  const [isDealerDropdownOpen, setIsDealerDropdownOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DealerDashboardSummary | null>(null);
  const [isLoadingDealerDashboard, setIsLoadingDealerDashboard] = useState(false);
  const [message, setMessage] = useState("Loading assigned dealer dashboard...");

  async function loadDealerDashboard() {
    setIsLoadingDealerDashboard(true);

    try {
      const params = new URLSearchParams({ dealerCode });
      const response = await authFetch(`${apiBaseUrl}/dashboard/dealer?${params.toString()}`);
      const payload = (await response.json()) as DealerDashboardSummary;

      if (!response.ok) {
        throw new Error("Could not load dealer dashboard.");
      }

      setDashboard(payload);
      setMessage(`Showing assigned dealer data for ${payload.dealer.name}.`);
    } catch (error) {
      setDashboard(null);
      setMessage(error instanceof Error ? error.message : "Could not load dealer dashboard.");
    } finally {
      setIsLoadingDealerDashboard(false);
    }
  }

  async function loadDealerOptions(search: string) {
    if (user.role === "DealerUser") {
      return;
    }

    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    try {
      const response = await authFetch(`${apiBaseUrl}/dashboard/dealers?${params.toString()}`);
      const payload = (await response.json()) as { dealers: DealerLookupOption[] };

      if (response.ok) {
        setDealerOptions(payload.dealers);
      }
    } catch {
      setDealerOptions([]);
    }
  }

  useEffect(() => {
    void loadDealerDashboard();
  }, [dealerCode]);

  useEffect(() => {
    void loadDealerOptions(dealerSearch);
  }, [dealerSearch, user.role]);

  const scorecardMetrics = [
    {
      label: "CSI Score",
      value: Math.round(dashboard?.scorecard.csiScore ?? 0),
      benchmark: Math.round(dashboard?.scorecard.csiBenchmark ?? 0)
    },
    {
      label: "NPS Score",
      value: Math.round(dashboard?.scorecard.npsScore ?? 0),
      benchmark: Math.round(dashboard?.scorecard.npsBenchmark ?? 0)
    },
    {
      label: "Sentiment",
      value: Math.round((dashboard?.scorecard.sentimentScore ?? 0) * 100),
      benchmark: Math.round((dashboard?.scorecard.sentimentBenchmark ?? 0) * 100)
    }
  ];
  const complaintRows = dashboard?.complaintVolume.length ? dashboard.complaintVolume.map((row) => ({ label: row.period, value: row.count })) : [
    { label: "No feedback", value: 0 }
  ];
  const topIssueRows = dashboard?.topIssues.length ? dashboard.topIssues.map((row) => ({ label: row.category, value: row.count })) : [
    { label: "No issues", value: 0 }
  ];

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-card">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Dealer Dashboard</p>
          <h2 className="text-2xl font-black text-slate-950">{dashboard?.dealer.name ?? "Assigned Dealer"}</h2>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {user.role !== "DealerUser" ? (
            <DealerSearchDropdown
              dealerCode={dealerCode}
              options={dealerOptions}
              search={dealerSearch}
              isOpen={isDealerDropdownOpen}
              onSearchChange={(value) => {
                setDealerSearch(value);
                setIsDealerDropdownOpen(true);
              }}
              onFocus={() => {
                setIsDealerDropdownOpen(true);
                void loadDealerOptions(dealerSearch);
              }}
              onSelect={(dealer) => {
                setDealerCode(dealer.code);
                setDealerSearch(`${dealer.name} (${dealer.code})`);
                setIsDealerDropdownOpen(false);
              }}
            />
          ) : null}
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            type="button"
            onClick={() => void loadDealerDashboard()}
          >
            <RefreshCw size={16} className={isLoadingDealerDashboard ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Feedback Volume" value={String(dashboard?.scorecard.feedbackCount ?? 0)} suffix="records" accent="blue" trend="dealer" />
        <MetricCard label="Open CRM Tasks" value={String(dashboard?.openCrmTasks.length ?? 0)} suffix="tasks" accent="danger" trend="recovery" />
        <MetricCard label="Open Escalations" value={String(dashboard?.scorecard.openEscalations ?? 0)} suffix="active" accent="amber" trend="ops" />
        <MetricCard label="CSI vs Benchmark" value={String(Math.round(dashboard?.scorecard.csiScore ?? 0))} suffix={`/ ${Math.round(dashboard?.scorecard.csiBenchmark ?? 0)}`} accent="green" trend="bench" />
        <MetricCard label="High Risk Customers" value={String(dashboard?.scorecard.highRiskCustomers ?? 0)} suffix="customers" accent="danger" trend="retention" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardPanel title="Scorecard Benchmark" subtitle="Current dealer vs network benchmark">
          <div className="space-y-3">
            {scorecardMetrics.map((metric) => (
              <BenchmarkRow key={metric.label} {...metric} />
            ))}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Complaint Volume" subtitle="Feedback records by month">
          <DistributionList rows={complaintRows} tone="issue" />
        </DashboardPanel>
        <DashboardPanel title="Top Issues" subtitle="Primary categories for assigned dealer">
          <DistributionList rows={topIssueRows} tone="issue" />
        </DashboardPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <DashboardPanel title="Sentiment Trend" subtitle="Monthly positive, neutral, negative, and mixed feedback">
          <div className="space-y-3">
            {(dashboard?.sentimentTrend.length ? dashboard.sentimentTrend : [{ period: "No data", positive: 0, neutral: 0, negative: 0, mixed: 0 }]).map((row) => (
              <div key={row.period} className="rounded-xl bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800">{row.period}</span>
                  <span className="text-xs font-bold text-slate-400">{row.positive + row.neutral + row.negative + row.mixed} total</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">Positive {row.positive}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">Neutral {row.neutral}</span>
                  <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700">Negative {row.negative}</span>
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">Mixed {row.mixed}</span>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Open CRM Tasks" subtitle="Service recovery queue for assigned dealer">
          <div className="space-y-3">
            {(dashboard?.openCrmTasks.length ? dashboard.openCrmTasks : []).map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{task.title}</h3>
                  <Badge tone={urgencyTone(task.priority)}>{task.priority}</Badge>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{task.status} · Due {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "not set"}</p>
              </div>
            ))}
            {dashboard?.openCrmTasks.length === 0 || !dashboard ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No open CRM recovery tasks for this dealer.</p>
            ) : null}
          </div>
        </DashboardPanel>
      </div>
    </section>
  );
}

function BenchmarkRow({ label, value, benchmark }: { label: string; value: number; benchmark: number }) {
  const delta = value - benchmark;

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-slate-800">{label}</span>
        <span className={`font-black ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Dealer {value} · Benchmark {benchmark}</p>
    </div>
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
            <p className="text-xs text-slate-500">Powered by VoC CX Intelligence</p>
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

function FeedbackWorkspacePage({ authFetch, user }: { authFetch: AuthFetch; user: AuthUser }) {
  const canUploadFeedback = user.role === "Admin" || user.role === "OemUser";
  const canReviewQueue = user.role === "Admin" || user.role === "OemUser" || user.role === "Reviewer";
  const pageTitle = canUploadFeedback ? "Upload And Explore Feedback" : user.role === "Reviewer" ? "Review And Explore Feedback" : "View Dealer Feedback";
  const pageDescription = canUploadFeedback
    ? "Load prototype feedback files, then inspect normalized records and NLP outputs from one workspace."
    : user.role === "Reviewer"
      ? "Inspect assigned feedback records, NLP outputs, issue classifications, urgency, and review actions from one workspace."
      : "View your dealership feedback, sentiment, issue classifications, urgency, and related follow-up context from one workspace.";

  return (
    <section className="space-y-6 p-6">
      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Feedback Workspace</p>
            <h2 className="text-2xl font-black text-slate-950">{pageTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
          </div>
          {canUploadFeedback ? (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
              <UploadCloud size={18} />
              Accepted: .csv, .xlsx
            </div>
          ) : null}
        </div>
      </div>

      {canReviewQueue ? <ReviewQueuePanel authFetch={authFetch} /> : null}

      <div className={`grid gap-6 ${canUploadFeedback ? "xl:grid-cols-[360px_1fr]" : ""}`}>
        {canUploadFeedback ? <FeedbackUploadCard authFetch={authFetch} /> : null}
        <FeedbackExplorer authFetch={authFetch} />
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

function ReviewQueuePanel({ authFetch }: { authFetch: AuthFetch }) {
  const [records, setRecords] = useState<ReviewQueueItem[]>([]);
  const [status, setStatus] = useState("Open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Loading review queue...");
  const [edits, setEdits] = useState<Record<string, { sentimentLabel: string; topics: string; issueCategory: string; urgencyLevel: string; reviewerNotes: string }>>({});

  async function loadReviewQueue() {
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });

    if (status) {
      params.set("status", status);
    }

    setIsLoading(true);

    try {
      const response = await authFetch(`${apiBaseUrl}/review-queue?${params.toString()}`);
      const payload = (await response.json()) as ReviewQueueListResponse;

      if (!response.ok) {
        throw new Error("Could not load review queue.");
      }

      setRecords(payload.records);
      setTotalCount(payload.totalCount);
      setMessage(payload.records.length ? `${payload.totalCount} review item(s) found.` : "No review items for this status.");
    } catch (error) {
      setRecords([]);
      setTotalCount(0);
      setMessage(error instanceof Error ? error.message : "Could not load review queue.");
    } finally {
      setIsLoading(false);
    }
  }

  function draftFor(item: ReviewQueueItem) {
    return edits[item.id] ?? {
      sentimentLabel: item.sentimentLabel ?? "Unknown",
      topics: item.topics?.join(", ") ?? "",
      issueCategory: item.issueCategory ?? "Other",
      urgencyLevel: item.urgencyLevel ?? "Low",
      reviewerNotes: ""
    };
  }

  function updateDraft(item: ReviewQueueItem, key: keyof ReturnType<typeof draftFor>, value: string) {
    setEdits((current) => ({ ...current, [item.id]: { ...draftFor(item), [key]: value } }));
  }

  async function resolveItem(item: ReviewQueueItem) {
    const draft = draftFor(item);

    if (!draft.reviewerNotes.trim()) {
      setMessage("Reviewer notes are required before resolving an item.");
      return;
    }

    try {
      const response = await authFetch(`${apiBaseUrl}/review-queue/${item.id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentimentLabel: draft.sentimentLabel,
          topics: draft.topics.split(",").map((topic) => topic.trim()).filter(Boolean),
          issueCategory: draft.issueCategory,
          urgencyLevel: draft.urgencyLevel,
          reviewerNotes: draft.reviewerNotes
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not resolve review item.");
      }

      setEdits((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setMessage("Review item resolved and corrections saved.");
      await loadReviewQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resolve review item.");
    }
  }

  useEffect(() => {
    void loadReviewQueue();
  }, [status, page, pageSize]);

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const firstRecordIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecordIndex = Math.min(page * pageSize, totalCount);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Human Review Queue</p>
          <h2 className="text-xl font-black text-slate-950">Review Low-Confidence And Critical Feedback</h2>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Status"
            value={status}
            values={["Open", "InReview", "Resolved", "Dismissed"]}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            type="button"
            onClick={() => void loadReviewQueue()}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {records.map((item) => {
          const draft = draftFor(item);

          return (
            <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{item.sourceReferenceId}</p>
                  <h3 className="font-black text-slate-950">{item.reason}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.dealerName ?? "Unassigned dealer"} · {new Date(item.feedbackDate).toLocaleDateString()}</p>
                </div>
                <Badge tone={item.status === "Resolved" ? "green" : item.status === "InReview" ? "amber" : "red"}>{item.status}</Badge>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.maskedText ?? item.rawText}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <FilterSelect label="Sentiment" value={draft.sentimentLabel} values={sentimentLabels} onChange={(value) => updateDraft(item, "sentimentLabel", value)} />
                <FilterSelect label="Issue" value={draft.issueCategory} values={issueCategories} onChange={(value) => updateDraft(item, "issueCategory", value)} />
                <FilterSelect label="Urgency" value={draft.urgencyLevel} values={urgencyLevels} onChange={(value) => updateDraft(item, "urgencyLevel", value)} />
                <FilterInput label="Topics" value={draft.topics} placeholder="comma-separated" onChange={(value) => updateDraft(item, "topics", value)} />
              </div>
              <textarea
                className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="Reviewer notes for traceability..."
                value={draft.reviewerNotes}
                onChange={(event) => updateDraft(item, "reviewerNotes", event.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <button
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={item.status === "Resolved" || !draft.reviewerNotes.trim()}
                  onClick={() => void resolveItem(item)}
                >
                  Resolve Review
                </button>
              </div>
            </article>
          );
        })}
        {records.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">{isLoading ? "Loading review items..." : "No review items to show."}</p>
        ) : null}
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
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <span className="font-bold text-slate-700">Page {page} of {totalPages}</span>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:opacity-40" type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
            Previous
          </button>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 disabled:opacity-40" type="button" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function FeedbackExplorer({ authFetch }: { authFetch: AuthFetch }) {
  const [filters, setFilters] = useState<ExplorerFilters>({
    sourceType: "",
    dealerName: "",
    sentimentLabel: "",
    issueCategory: "",
    urgencyLevel: "",
    churnRiskLevel: "",
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
      const response = await authFetch(`${apiBaseUrl}/feedback?${params.toString()}`);
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
      const response = await authFetch(`${apiBaseUrl}/feedback/${feedbackId}`);
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

  async function createRecoveryTask(feedbackId: string) {
    try {
      const response = await authFetch(`${apiBaseUrl}/feedback/${feedbackId}/crm-tasks`, { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not create CRM recovery task.");
      }

      setMessage("CRM recovery task is ready for follow-up.");
      await openFeedbackDetail(feedbackId);
      await loadFeedback();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create CRM recovery task.");
    }
  }

  async function closeRecoveryTask(taskId: string, resolutionNotes: string) {
    try {
      const response = await authFetch(`${apiBaseUrl}/crm-tasks/${taskId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not close CRM recovery task.");
      }

      setMessage("CRM recovery task closed with resolution notes.");

      if (selectedFeedbackId) {
        await openFeedbackDetail(selectedFeedbackId);
      }

      await loadFeedback();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not close CRM recovery task.");
    }
  }

  async function generateResponseDraft(feedbackId: string) {
    const response = await authFetch(`${apiBaseUrl}/feedback/${feedbackId}/response-draft`, { method: "POST" });
    const payload = (await response.json()) as ResponseDraft | { message?: string };

    if (!response.ok) {
      throw new Error("message" in payload ? payload.message ?? "Could not generate response draft." : "Could not generate response draft.");
    }

    return payload as ResponseDraft;
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
      churnRiskLevel: "",
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

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-9">
        <FilterSelect label="Source" value={filters.sourceType} values={sourceTypes} onChange={(value) => updateFilter("sourceType", value)} />
        <FilterInput label="Dealer" value={filters.dealerName} placeholder="e.g. AutoTech" onChange={(value) => updateFilter("dealerName", value)} />
        <FilterSelect label="Sentiment" value={filters.sentimentLabel} values={sentimentLabels} onChange={(value) => updateFilter("sentimentLabel", value)} />
        <FilterSelect label="Issue" value={filters.issueCategory} values={issueCategories} onChange={(value) => updateFilter("issueCategory", value)} />
        <FilterSelect label="Urgency" value={filters.urgencyLevel} values={urgencyLevels} onChange={(value) => updateFilter("urgencyLevel", value)} />
        <FilterSelect label="Churn Risk" value={filters.churnRiskLevel} values={churnRiskLevels} onChange={(value) => updateFilter("churnRiskLevel", value)} />
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
          <div className="grid grid-cols-[1.1fr_0.8fr_0.65fr_0.75fr_0.65fr_0.65fr_0.75fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <span>Feedback</span>
            <span>Dealer / Model</span>
            <span>Sentiment</span>
            <span>Issue</span>
            <span>Urgency</span>
            <span>Repeat</span>
            <span>Churn</span>
          </div>
          {records.map((record) => (
            <button
              key={record.id}
              className={`grid w-full grid-cols-[1.1fr_0.8fr_0.65fr_0.75fr_0.65fr_0.65fr_0.75fr] gap-3 border-t border-slate-100 px-4 py-4 text-left text-sm hover:bg-blue-50/60 ${
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
              <Badge tone={record.isRepeatComplaint ? "red" : "slate"}>{record.isRepeatComplaint ? `${record.repeatComplaintCount} match` : "No"}</Badge>
              <Badge tone={urgencyTone(record.churnRiskLevel)}>{record.churnRiskLevel ? `${record.churnRiskLevel} ${Math.round(record.churnRiskScore ?? 0)}` : "Pending"}</Badge>
            </button>
          ))}
          {records.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              {isLoading ? "Loading feedback records..." : "No records match these filters. Clear filters or reset demo data to return to the curated walkthrough."}
            </div>
          ) : null}
        </div>

        <FeedbackDetailPanel
          feedback={selectedFeedback}
          isLoading={isDetailLoading}
          totalCount={totalCount}
          onCreateRecoveryTask={createRecoveryTask}
          onCloseRecoveryTask={closeRecoveryTask}
          onGenerateResponseDraft={generateResponseDraft}
        />
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

function FeedbackDetailPanel({
  feedback,
  isLoading,
  totalCount,
  onCreateRecoveryTask,
  onCloseRecoveryTask,
  onGenerateResponseDraft
}: {
  feedback: FeedbackDetail | null;
  isLoading: boolean;
  totalCount: number;
  onCreateRecoveryTask: (feedbackId: string) => Promise<void>;
  onCloseRecoveryTask: (taskId: string, resolutionNotes: string) => Promise<void>;
  onGenerateResponseDraft: (feedbackId: string) => Promise<ResponseDraft>;
}) {
  const [resolutionNotesByTaskId, setResolutionNotesByTaskId] = useState<Record<string, string>>({});
  const [isTaskActionRunning, setIsTaskActionRunning] = useState(false);
  const [responseDraft, setResponseDraft] = useState<ResponseDraft | null>(null);
  const [editableDraftText, setEditableDraftText] = useState("");
  const [draftMessage, setDraftMessage] = useState("Generate a draft response for dealer review.");
  const [isDraftGenerating, setIsDraftGenerating] = useState(false);

  useEffect(() => {
    setResponseDraft(null);
    setEditableDraftText("");
    setDraftMessage("Generate a draft response for dealer review.");
  }, [feedback?.id]);

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
  const hasOpenRecoveryTask = feedback.crmTasks.some((task) => task.status === "Open" || task.status === "InProgress");

  async function runTaskAction(action: () => Promise<void>) {
    setIsTaskActionRunning(true);

    try {
      await action();
    } finally {
      setIsTaskActionRunning(false);
    }
  }

  async function runDraftGeneration() {
    if (!feedback) {
      return;
    }

    const feedbackId = feedback.id;
    setIsDraftGenerating(true);
    setDraftMessage("Generating response draft...");

    try {
      const draft = await onGenerateResponseDraft(feedbackId);
      setResponseDraft(draft);
      setEditableDraftText(draft.draftText);
      setDraftMessage(`Draft generated with ${draft.tone.toLowerCase()} tone for ${draft.issueCategory}.`);
    } catch (error) {
      setResponseDraft(null);
      setEditableDraftText("");
      setDraftMessage(error instanceof Error ? error.message : "Could not generate response draft.");
    } finally {
      setIsDraftGenerating(false);
    }
  }

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
        <DetailMetric label="Repeat Complaint" value={feedback.repeatComplaintSignal?.isRepeat ? `${feedback.repeatComplaintSignal.repeatCount} match(es)` : "No"} />
        <DetailMetric label="Lookback" value={feedback.repeatComplaintSignal ? `${feedback.repeatComplaintSignal.lookbackDays} days` : "Pending"} />
        <DetailMetric label="Churn Risk" value={feedback.churnRisk ? `${feedback.churnRisk.riskLevel} (${Math.round(feedback.churnRisk.score)}/100)` : "Pending"} />
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
      <DetailBlock title="Repeat Complaint Signal">
        {feedback.repeatComplaintSignal?.reasonSummary ?? "Repeat complaint detection has not been run yet."}
      </DetailBlock>
      <DetailBlock title="Churn Risk Reason">
        {feedback.churnRisk?.reasonSummary ?? "Churn risk scoring has not been run yet."}
      </DetailBlock>
      <div className="mt-4 rounded-xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Dealer Response Draft</p>
            <p className="mt-1 text-sm text-slate-500">{draftMessage}</p>
          </div>
          <button
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isDraftGenerating}
            onClick={() => void runDraftGeneration()}
          >
            {responseDraft ? "Regenerate" : "Generate Draft"}
          </button>
        </div>
        {responseDraft ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">Tone: {responseDraft.tone}</Badge>
              <Badge tone={sentimentTone(responseDraft.sentimentLabel)}>Sentiment: {responseDraft.sentimentLabel}</Badge>
              <Badge tone="slate">Issue: {responseDraft.issueCategory}</Badge>
            </div>
            <textarea
              className="min-h-56 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-400"
              value={editableDraftText}
              onChange={(event) => setEditableDraftText(event.target.value)}
            />
            <div className="flex justify-end">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"
                type="button"
                onClick={() => {
                  setResponseDraft(null);
                  setEditableDraftText("");
                  setDraftMessage("Draft discarded. Generate another draft when needed.");
                }}
              >
                Discard Draft
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
            The draft is generated for review only. Edit it here before using it outside the prototype.
          </p>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">CRM Recovery Tasks</p>
            <p className="mt-1 text-sm text-slate-500">Mock service recovery follow-up for this feedback.</p>
          </div>
          <button
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isTaskActionRunning || hasOpenRecoveryTask}
            onClick={() => void runTaskAction(() => onCreateRecoveryTask(feedback.id))}
          >
            {hasOpenRecoveryTask ? "Task Open" : "Create Task"}
          </button>
        </div>
        <div className="space-y-3">
          {feedback.crmTasks.length ? (
            feedback.crmTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {task.status} · Due {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "not set"}
                    </p>
                  </div>
                  <Badge tone={urgencyTone(task.priority)}>{task.priority}</Badge>
                </div>
                {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                {task.status === "Closed" ? (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    Resolution: {task.resolutionNotes ?? "Closed without notes."}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <textarea
                      className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      placeholder="Add resolution notes before closing..."
                      value={resolutionNotesByTaskId[task.id] ?? ""}
                      onChange={(event) => setResolutionNotesByTaskId((current) => ({ ...current, [task.id]: event.target.value }))}
                    />
                    <button
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={isTaskActionRunning || !(resolutionNotesByTaskId[task.id] ?? "").trim()}
                      onClick={() => void runTaskAction(() => onCloseRecoveryTask(task.id, resolutionNotesByTaskId[task.id] ?? ""))}
                    >
                      Close Task
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">No CRM recovery task has been created for this feedback.</p>
          )}
        </div>
      </div>
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

function FilterInput({ label, value, placeholder, type = "text", disabled = false, onChange }: { label: string; value: string; placeholder?: string; type?: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
      {label}
      <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:bg-slate-100" type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DealerSearchDropdown({
  dealerCode,
  search,
  options,
  isOpen,
  onSearchChange,
  onFocus,
  onSelect
}: {
  dealerCode: string;
  search: string;
  options: DealerLookupOption[];
  isOpen: boolean;
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (dealer: DealerLookupOption) => void;
}) {
  return (
    <div className="relative min-w-[320px] text-xs font-bold uppercase tracking-wide text-slate-400">
      <label>
        Dealer
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-700 focus-within:border-blue-400">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full border-0 bg-transparent p-0 text-sm font-semibold outline-none placeholder:text-slate-400"
            value={search}
            placeholder="Search dealer name, code, city..."
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={onFocus}
          />
        </div>
      </label>
      <p className="mt-1 text-xs font-semibold normal-case tracking-normal text-slate-500">Selected dealer code: {dealerCode}</p>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-2 shadow-card">
          {options.length ? (
            options.map((dealer) => (
              <button
                key={dealer.id}
                className="w-full px-3 py-2 text-left normal-case tracking-normal hover:bg-blue-50"
                type="button"
                onClick={() => onSelect(dealer)}
              >
                <span className="block text-sm font-black text-slate-900">{dealer.name}</span>
                <span className="block text-xs font-semibold text-slate-500">
                  {dealer.code} - {dealer.city}, {dealer.state} - {dealer.region}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-500">No active dealers found.</p>
          )}
        </div>
      ) : null}
    </div>
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

function FeedbackUploadCard({ authFetch }: { authFetch: AuthFetch }) {
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
      const response = await authFetch(`${apiBaseUrl}/uploads/feedback`, {
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
