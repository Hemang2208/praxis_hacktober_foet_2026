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

  const cacheKey = `company-analytics:funnel:${companyId}`;
  const cached = getCachedAnalytics<{ funnel: Array<{ name: string; value: number; fill: string }> }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const snapshot = await loadAnalyticsSnapshot(companyId);
  if (!snapshot) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const taskStatuses = snapshot.tasks.reduce<Record<string, number>>((acc, task: any) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const projectStatuses = snapshot.projects.reduce<Record<string, number>>((acc, project: any) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  const funnel = [
    { name: "Open", value: taskStatuses.todo || 0, fill: "#60a5fa" },
    { name: "Building", value: taskStatuses["in-progress"] || 0, fill: "#f59e0b" },
    { name: "Blocked", value: taskStatuses.blocked || 0, fill: "#ef4444" },
    { name: "Shipped", value: taskStatuses.completed || 0, fill: "#22c55e" },
  ];

  const payload = {
    funnel,
    projects: projectStatuses,
  };

  setCachedAnalytics(cacheKey, payload, 20_000);
  return NextResponse.json(payload, { status: 200 });
}