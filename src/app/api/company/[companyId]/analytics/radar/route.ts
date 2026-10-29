import { NextRequest, NextResponse } from "next/server";
import { clampScore, getCachedAnalytics, loadAnalyticsSnapshot, resolveAnalyticsAccess, setCachedAnalytics, toNumber } from "@/lib/company-analytics";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  const { companyId } = await context.params;

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  const access = await resolveAnalyticsAccess(req, companyId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!access.canViewAnalytics) {
    return NextResponse.json({ error: "Analytics locked", locked: true }, { status: 403 });
  }

  const cacheKey = `company-analytics:radar:${companyId}`;
  const cached = getCachedAnalytics<{ radar: Array<{ skill: string; score: number }> }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const snapshot = await loadAnalyticsSnapshot(companyId);
  if (!snapshot) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { projects, tasks } = snapshot;
  const totalTasks = tasks.length || 1;
  const completedTasks = tasks.filter((task: any) => task.status === "completed").length;
  const blockedTasks = tasks.filter((task: any) => task.status === "blocked").length;
  const averageProgress = projects.length
    ? projects.reduce((sum: number, project: any) => sum + toNumber(project.progress, 0), 0) / projects.length
    : 0;

  const velocitySamples = tasks
    .filter((task: any) => task.status === "completed")
    .map((task: any) => {
      const createdAt = task.created_at ? new Date(task.created_at).getTime() : null;
      const completedAt = task.completed_at ? new Date(task.completed_at).getTime() : task.updated_at ? new Date(task.updated_at).getTime() : null;
      if (!createdAt || !completedAt || completedAt <= createdAt) return null;
      return (completedAt - createdAt) / (1000 * 60 * 60 * 24);
    })
    .filter((value): value is number => typeof value === "number");
  const velocityDays = velocitySamples.length ? velocitySamples.reduce((sum, value) => sum + value, 0) / velocitySamples.length : 0;

  const radar = [
    { skill: "Delivery", score: clampScore((completedTasks / totalTasks) * 100) },
    { skill: "Velocity", score: clampScore(100 - velocityDays * 12) },
    { skill: "Stability", score: clampScore(100 - blockedTasks * 18) },
    { skill: "Planning", score: clampScore(averageProgress) },
    { skill: "Resilience", score: clampScore(100 - Math.min(blockedTasks * 10, 60)) },
    { skill: "Execution", score: clampScore(((completedTasks + averageProgress / 2) / totalTasks) * 100) },
  ];

  const payload = { radar };
  setCachedAnalytics(cacheKey, payload, 20_000);
  return NextResponse.json(payload, { status: 200 });
}