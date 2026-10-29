"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

type OverviewData = {
  talentLeaderboard: Array<{
    label: string;
    score: number;
    completedTasks: number;
    activeTasks: number;
    blockedTasks: number;
    completionRate: number;
    focus: string;
  }>;
  projectHealth: Array<{
    label: string;
    health: number;
    progress: number;
    blockedTasks: number;
    overdueTasks: number;
    status: string;
  }>;
  alerts: Array<{
    label: string;
    severity: "info" | "warning" | "success" | "danger";
    message: string;
  }>;
  talentAccess: "full" | "masked";
};

type FunnelPoint = { name: string; value: number; fill: string };
type RadarPoint = { skill: string; score: number };
type BurndownPoint = { label: string; planned: number; actual: number };

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
    case "in-progress":
      return "bg-cyan-500/15 text-cyan-200 border-cyan-500/20";
    case "blocked":
      return "bg-red-500/15 text-red-200 border-red-500/20";
    default:
      return "bg-slate-500/15 text-slate-200 border-slate-500/20";
  }
}

export function CompanyAnalyticsPanels({
  overview,
  funnel,
  radar,
  burndown,
}: {
  overview: OverviewData | null;
  funnel: FunnelPoint[];
  radar: RadarPoint[];
  burndown: BurndownPoint[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Talent Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {overview?.talentAccess === "masked" && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Preview mode is active. Talent identities are masked until the dashboard is unlocked.
              </div>
            )}
            {(overview?.talentLeaderboard || []).length === 0 ? (
              <p className="text-sm text-slate-400">No talent signals available yet.</p>
            ) : (
              overview?.talentLeaderboard.map((member) => (
                <div key={member.label} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{member.label}</p>
                      <p className="text-xs text-slate-400">{member.focus}</p>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-500/20">
                      {member.score}/100
                    </Badge>
                  </div>
                  <Progress value={member.score} className="h-2 bg-slate-800" />
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    <span>{member.completedTasks} completed</span>
                    <span>{member.activeTasks} active</span>
                    <span>{member.blockedTasks} blocked</span>
                    <span>{member.completionRate}% completion</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Project Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {(overview?.projectHealth || []).length === 0 ? (
              <p className="text-sm text-slate-400">No project health signals available yet.</p>
            ) : (
              overview?.projectHealth.map((project) => (
                <div key={project.label} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{project.label}</p>
                      <p className="text-xs text-slate-400">{project.blockedTasks} blocked · {project.overdueTasks} overdue</p>
                    </div>
                    <Badge className={statusTone(project.status)}>{project.status}</Badge>
                  </div>
                  <Progress value={project.health} className="h-2 bg-slate-800" />
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{project.health}% health</span>
                    <span>{project.progress}% progress</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Operational Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {(overview?.alerts || []).map((alert) => (
              <div
                key={alert.label}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  alert.severity === "danger"
                    ? "border-red-500/20 bg-red-500/10 text-red-100"
                    : alert.severity === "warning"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                      : alert.severity === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                        : "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
                }`}
              >
                <p className="font-medium">{alert.label}</p>
                <p className="mt-1 text-sm opacity-80">{alert.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Delivery Funnel</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer
              config={{
                value: { label: "Tasks", color: "#38bdf8" },
              }}
              className="h-[260px]"
            >
              <BarChart data={funnel} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {funnel.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Capability Radar</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer
              config={{
                score: { label: "Capability score", color: "#22c55e" },
              }}
              className="h-[300px]"
            >
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.28} stroke="var(--color-score)" />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/90 text-slate-50 shadow-2xl shadow-slate-950/20">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-slate-50">Burn-down</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer
              config={{
                planned: { label: "Planned", color: "#94a3b8" },
                actual: { label: "Actual", color: "#38bdf8" },
              }}
              className="h-[280px]"
            >
              <AreaChart data={burndown} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="planned" stroke="var(--color-planned)" fill="var(--color-planned)" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="actual" stroke="var(--color-actual)" fill="var(--color-actual)" fillOpacity={0.18} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}