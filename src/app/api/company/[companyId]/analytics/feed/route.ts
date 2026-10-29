import { NextRequest, NextResponse } from "next/server";
import { anonymizeLabel, canUnlockTalent, getCachedAnalytics, loadAnalyticsSnapshot, resolveAnalyticsAccess, setCachedAnalytics } from "@/lib/company-analytics";

type FeedItem = {
  id: string;
  agent: string;
  type: "REJECTED" | "INFO" | "SUCCESS" | "WARNING";
  message: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean | null>;
};

function eventTypeForTask(status: string) {
  switch (status) {
    case "completed":
      return "SUCCESS" as const;
    case "blocked":
      return "REJECTED" as const;
    case "in-progress":
      return "INFO" as const;
    default:
      return "WARNING" as const;
  }
}

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

  const cacheKey = `company-analytics:feed:${companyId}`;
  const cached = getCachedAnalytics<{ feed: FeedItem[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const snapshot = await loadAnalyticsSnapshot(companyId);
  if (!snapshot) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const talentUnlocked = canUnlockTalent(access.viewerMembership);

  const feed: FeedItem[] = [];

  snapshot.tasks.slice(0, 20).forEach((task: any, index: number) => {
    const timestamp = task.completed_at || task.updated_at || task.created_at || new Date();
    const type = eventTypeForTask(task.status);
    const assignee = task.assigned_to ? (talentUnlocked ? task.assigned_to : anonymizeLabel(task.assigned_to, index)) : "Unassigned";
    const agent =
      type === "SUCCESS"
        ? "AssessmentAgent"
        : type === "REJECTED"
          ? "CodeReviewAgent"
          : type === "WARNING"
            ? "SupportAgent"
            : "ProjectPlannerAgent";

    feed.push({
      id: `task-${task._id?.toString?.() || index}`,
      agent,
      type,
      message: `${task.title} moved to ${task.status.replace(/-/g, " ")}.`,
      timestamp: new Date(timestamp).toISOString(),
      metadata: {
        status: task.status,
        priority: task.priority || "medium",
        projectId: String(task.project || task.project_id || ""),
        assignee,
      },
    });
  });

  snapshot.projects.slice(0, 10).forEach((project: any, index: number) => {
    const timestamp = project.lastCommitSync || project.updated_at || project.created_at || new Date();
    feed.push({
      id: `project-${project._id?.toString?.() || index}`,
      agent: "ProjectPlannerAgent",
      type: project.status === "completed" ? "SUCCESS" : "INFO",
      message: `${project.title} is ${project.status} with ${project.progress || 0}% progress.`,
      timestamp: new Date(timestamp).toISOString(),
      metadata: {
        status: project.status,
        progress: project.progress || 0,
      },
    });
  });

  feed.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  const payload = { feed: feed.slice(0, 24) };
  setCachedAnalytics(cacheKey, payload, 12_000);
  return NextResponse.json(payload, { status: 200 });
}