import { NextRequest, NextResponse } from "next/server";
import { getCachedAnalytics, loadAnalyticsSnapshot, resolveAnalyticsAccess, setCachedAnalytics } from "@/lib/company-analytics";

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

  const cacheKey = `company-analytics:burndown:${companyId}`;
  const cached = getCachedAnalytics<{ burndown: Array<{ label: string; planned: number; actual: number }> }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const snapshot = await loadAnalyticsSnapshot(companyId);
  if (!snapshot) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const totalTasks = snapshot.tasks.length;
  const completedTasks = snapshot.tasks.filter((task: any) => task.status === "completed");
  const weeks = 8;
  const today = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const burndown = Array.from({ length: weeks }, (_, index) => {
    const weekEnd = today - (weeks - index - 1) * weekMs;
    const actualRemaining = totalTasks - completedTasks.filter((task: any) => {
      const completedAt = task.completed_at ? new Date(task.completed_at).getTime() : task.updated_at ? new Date(task.updated_at).getTime() : 0;
      return completedAt && completedAt <= weekEnd;
    }).length;
    const plannedRemaining = Math.max(0, Math.round(totalTasks - (totalTasks / Math.max(weeks - 1, 1)) * index));

    return {
      label: `W${index + 1}`,
      planned: plannedRemaining,
      actual: Math.max(0, actualRemaining),
    };
  });

  const payload = { burndown };
  setCachedAnalytics(cacheKey, payload, 20_000);
  return NextResponse.json(payload, { status: 200 });
}