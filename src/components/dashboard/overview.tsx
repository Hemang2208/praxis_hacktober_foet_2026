"use client";

import CompanyDashboard from "@/components/company/CompanyDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  GitCommit,
  Clock,
  Users,
  ArrowRight,
  AlertTriangle,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppSelector, useProfileCompletion } from "@/redux/hooks";
import { toast } from "react-hot-toast";
import { useAppDispatch } from "@/redux/hooks";
import { fetchUserProfile } from "@/redux/slice/user.slice";
import { fetchGitHubData } from "@/redux/slice/github.slice";
import { fetchProjects } from "@/redux/slice/project.slice";
import { useEffect } from "react";
import Link from "next/link";
import { useRecentTasks } from "@/hooks/useRecentTasks";
import { useActiveProjects } from "@/hooks/useActiveProjects";
import { useSummaryStats } from "@/hooks/useSummaryStats";
import { formatDateWithDay } from "@/lib/formatDate";
import { getProjectCompanyId } from "@/lib/project-ownership";
import { CompanySubrole, normalizeCompanySubrole } from "@/lib/company-rbac";

type ProjectDateInput =
  | string
  | number
  | Date
  | { $date?: string | number | Date | null }
  | null
  | undefined;

// Normalizes MongoDB-style date values before rendering them.
const formatProjectDate = (value: ProjectDateInput) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatDateWithDay(value);
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : formatDateWithDay(parsed);
  }

  if (value && typeof value === "object" && "$date" in value) {
    const nested = (value as { $date?: string | number | Date | null }).$date;

    if (nested instanceof Date) {
      return Number.isNaN(nested.getTime()) ? null : formatDateWithDay(nested);
    }

    if (typeof nested === "string" || typeof nested === "number") {
      const parsed = new Date(nested);
      return Number.isNaN(parsed.getTime()) ? null : formatDateWithDay(parsed);
    }
  }

  return null;
};

export function DashboardOverview() {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const loading = useAppSelector((state) => state.user.loading);
  const error = useAppSelector((state) => state.user.error);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const allTasks = useAppSelector((state) => state.task.tasks);
  const allProjects = useAppSelector((state) => state.project.projects);
  const profileCompleted = useProfileCompletion();
  const {
    tasks: recentTasks,
    loading: tasksLoading,
    error: tasksError,
  } = useRecentTasks();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
  } = useActiveProjects(3);
  const { stats: summaryStats, loading: statsLoading } = useSummaryStats();
  const summaryValues = summaryStats ?? {
    taskCompletionRate: 0,
    gitHubCommits: 0,
    aiFeedbackScore: 0,
    certificatesEarned: 0,
  };
  const hasSummaryStats = Boolean(summaryStats && !statsLoading);

  // Filter tasks to only include those from user's projects
  const userProjectIds = new Set(allProjects.map((p) => p._id));
  const userTasks = allTasks.filter((task) => {
    const taskProjectId = task.project_id || (task as any).project;
    return userProjectIds.has(taskProjectId);
  });

  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter(
    (task) => task.status === "completed",
  ).length;
  const blockedTasks = userTasks.filter(
    (task) => task.status === "blocked",
  ).length;
  const overdueTasks = userTasks.filter(
    (task) =>
      task.due_date &&
      task.status !== "completed" &&
      new Date(task.due_date).getTime() < Date.now(),
  ).length;

  // Filter projects by user's role
  const userRole = (userProfile as any)?.role;
  const userId = String(userProfile?._id || (userProfile as any)?.id || "");
  const userEmail = userProfile?.email || "";

  const userProjects = allProjects.filter((project) => {
    // For company/college: show projects they created
    if (userRole === "company" || userRole === "college") {
      const projectOwnerId = String(
        getProjectCompanyId(project) || (project as any).user_id || "",
      );
      return projectOwnerId === userId;
    }
    // For students: show projects they're assigned to
    const memberFound = (project.team ?? []).some((member: any) => {
      const candidate = member.user || member._id;
      return candidate === userId || member.email === userEmail;
    });
    if (memberFound) return true;

    const teamMemberFound = (project.team_members ?? []).some((member: any) => {
      const candidate = member.user || member._id;
      return candidate === userId || member.email === userEmail;
    });
    return teamMemberFound;
  });

  const activeProjects = userProjects.filter((project) =>
    ["planning", "in-progress", "on-hold"].includes(project.status),
  ).length;
  const completedProjects = userProjects.filter(
    (project) => project.status === "completed",
  ).length;
  const completionRate = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const role = (userProfile as any)?.role as "company" | "college" | undefined;
  const isCompany = role === "company";
  const companyMembers = Array.isArray((userProfile as any)?.members)
    ? ((userProfile as any).members as Array<{
        email: string;
        subrole: CompanySubrole;
        status: "invited" | "active";
      }>)
    : [];

  // Calculate team member stats
  const activeCompanyMembers = companyMembers.filter(
    (m) => m.status === "active",
  ).length;
  const invitedCompanyMembers = companyMembers.filter(
    (m) => m.status === "invited",
  ).length;

  // Calculate total unique team members across all user's projects
  const projectMembersSet = new Set<string>();
  userProjects.forEach((project) => {
    (project.team ?? []).forEach((member: any) => {
      const id = member.user || member._id || member.email;
      if (id) projectMembersSet.add(String(id));
    });
    (project.team_members ?? []).forEach((member: any) => {
      const id = member.user || member._id || member.email;
      if (id) projectMembersSet.add(String(id));
    });
  });
  const totalProjectMembers = projectMembersSet.size;

  // For display: show company members if company user, else show project members
  const membersCount = isCompany ? activeCompanyMembers : totalProjectMembers;
  const membersSubtitle = isCompany
    ? `${invitedCompanyMembers} invited to company`
    : `${totalProjectMembers} in projects`;

  const summaryCards = [
    {
      title: "Task Completion",
      value: `${completionRate}%`,
      description: `${completedTasks}/${totalTasks} tasks completed`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Team Members",
      value: membersCount.toString(),
      description: membersSubtitle,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Active Projects",
      value: activeProjects.toString(),
      description: `${completedProjects} completed projects`,
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Risk Signals",
      value: blockedTasks.toString(),
      description: `${overdueTasks} overdue tasks requiring action`,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  const companyId = isCompany ? String((userProfile as any)?._id || "") : "";
  const companyName = isCompany
    ? String(
        (userProfile as any)?.companyName ||
          (userProfile as any)?.full_name ||
          "Company",
      )
    : "";
  const viewerMembership =
    isCompany && userProfile?.email
      ? (() => {
          const member =
            companyMembers.find((entry) => entry.email === userProfile.email) ||
            null;
          return member
            ? { ...member, subrole: normalizeCompanySubrole(member.subrole) }
            : null;
        })()
      : null;

  useEffect(() => {
    if (!userProfile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, userProfile]);

  // Fetch projects and tasks on page load
  useEffect(() => {
    if (userProfile && isAuthenticated) {
      // Fetch projects first - these are needed for task fetching
      // useRecentTasks hook will then fetch tasks for each project
      void dispatch(fetchProjects());
    }
  }, [dispatch, userProfile, isAuthenticated]);

  // Show toast only once after login if profile is incomplete
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const toastKey = "profile-toast-shown";
    const hasShownToast = sessionStorage.getItem(toastKey);
    if (
      isAuthenticated &&
      userProfile &&
      profileCompleted < 100 &&
      !hasShownToast
    ) {
      toast("Complete your profile to unlock all features!", {
        icon: "⚠️",
      });
      sessionStorage.setItem(toastKey, "true");
    }
  }, [isAuthenticated, userProfile, profileCompleted]);

  // Fetch GitHub data if user has linked GitHub
  const githubUsername =
    (userProfile as any)?.github_username ||
    (userProfile as any)?.githubUsername;
  useEffect(() => {
    if (githubUsername && userProfile?.email) {
      void dispatch(fetchGitHubData(githubUsername));
    }
  }, [dispatch, userProfile?.email, githubUsername]);

  if (loading.fetchProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error.fetchProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">Error: {error.fetchProfile}</div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>No profile data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back,{" "}
              {
                (
                  (userProfile as any)?.companyName ||
                  userProfile?.full_name ||
                  "User"
                ).split(" ")[0]
              }
            </h1>
            <p className="text-slate-600 mt-1">
              Live operational snapshot powered by real data from your current
              workspace.
            </p>
          </div>
          <Link href="/dashboard/projects">
            <Button className="w-full sm:w-auto">View All Projects</Button>
          </Link>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {card.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* {isCompany && companyId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <CompanyDashboard
            companyId={companyId}
            companyName={companyName}
            viewerMembership={viewerMembership}
          />
        </motion.div>
      )} */}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Tasks
                {/* <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button> */}
              </CardTitle>
            </CardHeader>
            <CardContent
              className={`flex-1 ${recentTasks.length >= 3 ? "max-h-80 overflow-y-auto space-y-4" : "space-y-4"}`}
            >
              {tasksLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : tasksError ? (
                <div className="text-center text-red-600 p-4">{tasksError}</div>
              ) : recentTasks.length === 0 ? (
                <div className="text-center text-slate-500 p-8">
                  No tasks found. Start by creating your first task!
                </div>
              ) : (
                recentTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">
                        {task.title}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {task.due_date
                          ? `Due: ${formatDateWithDay(task.due_date)}`
                          : "No deadline"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "default"
                            : task.status === "in-progress"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          task.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : task.status === "in-progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                        }
                      >
                        {task.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          task.priority === "high"
                            ? "border-red-200 text-red-700"
                            : task.priority === "medium"
                              ? "border-yellow-200 text-yellow-700"
                              : "border-green-200 text-green-700"
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Real KPI Context */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Live KPI Context</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
                <h4 className="font-medium text-slate-900 mb-2">
                  Delivery Throughput
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  {completedTasks} tasks are completed out of {totalTasks}.
                  Current completion velocity is {completionRate}%.
                </p>
                <Progress value={completionRate} className="h-2" />
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                <h4 className="font-medium text-slate-900 mb-2">
                  Risk Monitoring
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  {blockedTasks} blocked and {overdueTasks} overdue tasks are
                  active. Focus triage on these to restore flow.
                </p>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-700"
                  >
                    Blocked: {blockedTasks}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-orange-300 text-orange-700"
                  >
                    Overdue: {overdueTasks}
                  </Badge>
                </div>
              </div>
              {/* <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100">
                <h4 className="font-medium text-slate-900 mb-2">
                  Quality Signals
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  Certificates earned: {summaryValues.certificatesEarned}.
                </p>
                <p className="text-sm text-slate-600">
                  GitHub commit volume tracked: {summaryValues.gitHubCommits}.
                </p>
              </div> */}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>
              Your current project assignments and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : projectsError ? (
              <div className="text-center text-red-600 p-4">
                {projectsError}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center text-slate-500 p-8">
                No active projects found. Start by creating your first project!
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {project.title}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {project.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {project.team?.length || 0}
                        </div>
                        <div className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {formatProjectDate(project.deadline) ?? "No deadline"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium text-slate-900">
                          {project.progress || 0}%
                        </span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
