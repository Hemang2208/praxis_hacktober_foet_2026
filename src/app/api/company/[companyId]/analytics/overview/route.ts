import { NextRequest, NextResponse } from "next/server";
import {
  anonymizeLabel,
  canUnlockTalent,
  clampScore,
  getCachedAnalytics,
  loadAnalyticsSnapshot,
  resolveAnalyticsAccess,
  setCachedAnalytics,
  toNumber,
  uniqueValues,
} from "@/lib/company-analytics";

type OverviewResponse = {
  analytics: {
    updatedAt: string;
    locked: boolean;
    kpis: {
      hireabilityIndex: number;
      skillGap: number;
      velocityDays: number;
      roi: number;
    };
    summary: {
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
    talentLeaderboard: Array<{
      label: string;
      score: number;
      completedTasks: number;
      activeTasks: number;
      blockedTasks: number;
      completionRate: number;
      focus: string;
    }>;
    talentAccess: "full" | "masked";
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
  };
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getProjectMemberLabel(member: { name?: string; email?: string }, index: number) {
  return member.name || member.email || `Member ${index + 1}`;
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
    return NextResponse.json(
      { error: "Analytics locked", locked: true },
      { status: 403 },
    );
  }

  const cacheKey = `company-analytics:overview:${companyId}`;
  const cached = getCachedAnalytics<OverviewResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  const snapshot = await loadAnalyticsSnapshot(companyId);
  if (!snapshot) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const { company, projects, tasks } = snapshot;
  const talentUnlocked = canUnlockTalent(access.viewerMembership);
  const totalProjects = projects.length;
  const completedProjects = projects.filter((project: any) => project.status === "completed").length;
  const activeProjects = projects.filter((project: any) =>
    ["planning", "in-progress", "review"].includes(project.status),
  ).length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: any) => task.status === "completed").length;
  const blockedTasks = tasks.filter((task: any) => task.status === "blocked").length;
  const inProgressTasks = tasks.filter((task: any) => task.status === "in-progress").length;
  const todoTasks = tasks.filter((task: any) => task.status === "todo").length;

  const completionRate = totalTasks ? completedTasks / totalTasks : 0;
  const averageProjectProgress = average(projects.map((project: any) => toNumber(project.progress, 0)));
  const velocitySamples = tasks
    .filter((task: any) => task.status === "completed")
    .map((task: any) => {
      const createdAt = task.created_at ? new Date(task.created_at).getTime() : null;
      const completedAt = task.completed_at ? new Date(task.completed_at).getTime() : task.updated_at ? new Date(task.updated_at).getTime() : null;
      if (!createdAt || !completedAt || completedAt <= createdAt) return null;
      return (completedAt - createdAt) / (1000 * 60 * 60 * 24);
    })
    .filter((value): value is number => typeof value === "number");
  const velocityDays = velocitySamples.length ? average(velocitySamples) : 0;

  const roleCoverage = uniqueValues([
    ...(company.hiringRolesOffered || []),
    ...tasks.flatMap((task: any) => task.tags || []),
    ...projects.flatMap((project: any) => project.tags || []),
  ]).length;
  const desiredRoles = (company.hiringRolesOffered || []).length || 1;
  const skillGap = clampScore(((desiredRoles - Math.min(roleCoverage, desiredRoles)) / desiredRoles) * 100);
  const velocityScore = clampScore(100 - velocityDays * 12);
  const healthScore = clampScore(averageProjectProgress);
  const hireabilityIndex = clampScore(
    completionRate * 35 + velocityScore * 0.25 + (100 - skillGap) * 0.2 + healthScore * 0.2,
  );
  const roi = clampScore(
    ((completedProjects * 1.8) + (activeProjects * 0.9) + (company.internshipAvailable ? 10 : 0)) *
      (1 + completionRate),
  );

  const projectHealth = projects.map((project: any) => {
    const projectTasks = tasks.filter((task: any) => String(task.project || task.project_id) === String(project._id));
    const projectCompleted = projectTasks.filter((task: any) => task.status === "completed").length;
    const projectBlocked = projectTasks.filter((task: any) => task.status === "blocked").length;
    const projectOverdue = projectTasks.filter((task: any) => {
      if (!task.due_date || task.status === "completed") return false;
      return new Date(task.due_date).getTime() < Date.now();
    }).length;
    const projectCompletionRate = projectTasks.length ? projectCompleted / projectTasks.length : 0;
    const health = clampScore(
      toNumber(project.progress, 0) * 0.45 + projectCompletionRate * 100 * 0.35 + (100 - (projectBlocked * 15 + projectOverdue * 12)) * 0.2,
    );

    return {
      label: project.title,
      health,
      progress: toNumber(project.progress, 0),
      blockedTasks: projectBlocked,
      overdueTasks: projectOverdue,
      status: project.status,
    };
  });

  const members = projects.flatMap((project: any) => project.team_members || project.team || []);
  const talentLeaderboard = (members.length
    ? members.map((member: any, index: number) => {
        const realLabel = getProjectMemberLabel(member, index);
        const label = talentUnlocked ? realLabel : anonymizeLabel(realLabel, index);
        const identifiers = [realLabel, member.email, member.name].filter(Boolean);
        const memberTasks = tasks.filter((task: any) => identifiers.includes(task.assigned_to));
        const completed = memberTasks.filter((task: any) => task.status === "completed").length;
        const active = memberTasks.filter((task: any) => task.status === "in-progress").length;
        const blocked = memberTasks.filter((task: any) => task.status === "blocked").length;
        const score = clampScore(completed * 18 + active * 9 - blocked * 8 + memberTasks.length * 2);
        return {
          label,
          score,
          completedTasks: completed,
          activeTasks: active,
          blockedTasks: blocked,
          completionRate: memberTasks.length ? Math.round((completed / memberTasks.length) * 100) : 0,
          focus: completed >= active ? "Execution" : "Delivery",
        };
      })
    : Array.from(
        tasks.reduce<Map<string, any[]>>((acc, task: any) => {
          const key = task.assigned_to || "Unassigned";
          acc.set(key, [...(acc.get(key) || []), task]);
          return acc;
        }, new Map()).entries(),
      ).map(([label, assignedTasks]: any) => {
        const completed = assignedTasks.filter((task: any) => task.status === "completed").length;
        const active = assignedTasks.filter((task: any) => task.status === "in-progress").length;
        const blocked = assignedTasks.filter((task: any) => task.status === "blocked").length;
        const score = clampScore(completed * 18 + active * 9 - blocked * 8 + assignedTasks.length * 2);
        return {
          label,
          score,
          completedTasks: completed,
          activeTasks: active,
          blockedTasks: blocked,
          completionRate: assignedTasks.length ? Math.round((completed / assignedTasks.length) * 100) : 0,
          focus: completed >= active ? "Execution" : "Delivery",
        };
      }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const alerts = [
    blockedTasks > 0
      ? {
          label: "Blocked work",
          severity: "warning" as const,
          message: `${blockedTasks} task${blockedTasks === 1 ? " is" : "s are"} currently blocked.`,
        }
      : {
          label: "Blocked work",
          severity: "success" as const,
          message: "No blocked tasks detected in the active company portfolio.",
        },
    {
      label: "Execution tempo",
      severity: velocityDays > 7 ? ("warning" as const) : ("info" as const),
      message: velocityDays > 0 ? `Average task cycle time is ${Math.round(velocityDays)} days.` : "Not enough closed tasks to measure cycle time.",
    },
    {
      label: "Coverage",
      severity: skillGap > 40 ? ("danger" as const) : ("success" as const),
      message: `${skillGap}% of targeted role coverage is still open.`,
    },
  ];

  const response: OverviewResponse = {
    analytics: {
      updatedAt: new Date().toISOString(),
      locked: false,
      kpis: {
        hireabilityIndex,
        skillGap,
        velocityDays: Math.round(velocityDays),
        roi,
      },
      summary: {
        activeProjects,
        completedProjects,
        totalProjects,
        totalTasks,
        completedTasks,
        blockedTasks,
        inProgressTasks,
        todoTasks,
        activeTeamMembers: members.length,
        progressAverage: Math.round(averageProjectProgress),
      },
      talentLeaderboard,
      projectHealth,
      alerts,
      talentAccess: talentUnlocked ? "full" : "masked",
    },
  };

  setCachedAnalytics(cacheKey, response, 20_000);

  return NextResponse.json(response, { status: 200 });
}