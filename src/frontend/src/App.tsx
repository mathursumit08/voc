import { useState } from "react";
import { AlertTriangle, Bell, Car, LineChart, Search, Sparkles, TrendingUp, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { MetricCard } from "./components/MetricCard";

const metrics = [
  { label: "CSI Score", value: "847", suffix: "/1000", accent: "blue", trend: "+2.4%" },
  { label: "Net Promoter Score", value: "+42", suffix: "NPS", accent: "teal", trend: "+3 pts" },
  { label: "Sentiment Score", value: "76.3%", suffix: "positive", accent: "green", trend: "+1.8%" },
  { label: "Customer Retention", value: "68.4%", suffix: "retained", accent: "amber", trend: "-1.2%" },
  { label: "Open Escalations", value: "247", suffix: "active", accent: "danger", trend: "+34" }
];

const dealers = ["AutoTech Motors", "Prestige AutoHouse", "Capital Auto Hub", "Sunrise Motors", "Elite Autoworks"];

export function App() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="flex items-center justify-between bg-command-navy px-8 py-4 text-white shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg">
            <Car size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">AutoIndia Motors · Voice of Customer</p>
            <h1 className="text-lg font-bold">Customer Experience Command Center</h1>
          </div>
        </div>
        <nav className="hidden items-center gap-3 lg:flex">
          <button className="rounded-lg border border-blue-400/40 bg-blue-600/20 px-4 py-2 text-sm text-blue-100">Command Center</button>
          <button className="px-4 py-2 text-sm text-slate-400">Voice Analytics</button>
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

      <section className="grid gap-6 p-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
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

        <aside className="space-y-4">
          <FeedbackUploadCard />
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
            <p className="mt-3 text-sm text-slate-600">4 active · 2 require immediate action</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

interface UploadResult {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  insertedRows: number;
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
