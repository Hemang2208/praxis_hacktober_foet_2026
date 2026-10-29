import { Banknote, ShieldCheck, TimerReset, TrendingUp } from "lucide-react";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type CompanyKpis = {
  hireabilityIndex: number;
  skillGap: number;
  velocityDays: number;
  roi: number;
};

type CompanySummary = {
  activeProjects: number;
  completedProjects: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  activeTeamMembers: number;
  progressAverage: number;
};

function KpiCard({
  label,
  value,
  detail,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/80 text-slate-50 shadow-lg shadow-slate-950/20 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </div>
          <div className={`rounded-xl border border-white/10 p-2 ${accent}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-300">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function CompanyKpiRibbon({
  kpis,
  summary,
  updatedAt,
}: {
  kpis: CompanyKpis;
  summary: CompanySummary;
  updatedAt: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Hireability Index"
          value={`${kpis.hireabilityIndex}/100`}
          detail={`${summary.completedTasks} tasks completed across ${summary.totalProjects} projects.`}
          accent="bg-emerald-500/15"
          Icon={ShieldCheck}
        />
        <KpiCard
          label="Skill Gap"
          value={`${kpis.skillGap}%`}
          detail={`${summary.activeTeamMembers} active team members are covering the current workload.`}
          accent="bg-amber-500/15"
          Icon={TrendingUp}
        />
        <KpiCard
          label="Velocity"
          value={`${kpis.velocityDays}d`}
          detail={`${summary.inProgressTasks} tasks are currently moving through the pipeline.`}
          accent="bg-cyan-500/15"
          Icon={TimerReset}
        />
        <KpiCard
          label="ROI Signal"
          value={`${kpis.roi}/100`}
          detail={`${summary.activeProjects} active projects and ${summary.progressAverage}% average progress.`}
          accent="bg-fuchsia-500/15"
          Icon={Banknote}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Live analytics cache refreshed
          </span>
          <span>{summary.blockedTasks} blocked tasks</span>
          <span>{summary.todoTasks} queued tasks</span>
        </div>
        <span className="text-xs text-slate-400">Updated {new Date(updatedAt).toLocaleString()}</span>
      </div>
      <Progress value={kpis.hireabilityIndex} className="h-2 bg-slate-800" />
    </div>
  );
}