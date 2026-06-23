import { Award, SmilePlus, TrendingUp, UsersRound, AlertTriangle } from "lucide-react";

type Accent = "blue" | "teal" | "green" | "amber" | "danger";

const accentStyles: Record<Accent, { border: string; icon: string; progress: string }> = {
  blue: { border: "border-l-blue-600", icon: "bg-blue-100 text-blue-600", progress: "bg-blue-600" },
  teal: { border: "border-l-cyan-600", icon: "bg-cyan-100 text-cyan-600", progress: "bg-cyan-600" },
  green: { border: "border-l-emerald-600", icon: "bg-emerald-100 text-emerald-600", progress: "bg-emerald-600" },
  amber: { border: "border-l-amber-600", icon: "bg-amber-100 text-amber-600", progress: "bg-amber-600" },
  danger: { border: "border-l-red-600", icon: "bg-red-100 text-red-600", progress: "bg-red-600" }
};

const icons = {
  blue: Award,
  teal: TrendingUp,
  green: SmilePlus,
  amber: UsersRound,
  danger: AlertTriangle
};

interface MetricCardProps {
  label: string;
  value: string;
  suffix: string;
  accent: Accent;
  trend: string;
}

export function MetricCard({ label, value, suffix, accent, trend }: MetricCardProps) {
  const styles = accentStyles[accent];
  const Icon = icons[accent];

  return (
    <article className={`rounded-2xl border-l-4 ${styles.border} bg-white p-5 shadow-card`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon size={20} />
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">{trend}</span>
      </div>
      <div className="flex items-end gap-1">
        <strong className="text-3xl font-black tracking-tight text-slate-950">{value}</strong>
        <span className="pb-1 text-sm text-slate-500">{suffix}</span>
      </div>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <div className="mt-4 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 w-4/5 rounded-full ${styles.progress}`} />
      </div>
    </article>
  );
}

