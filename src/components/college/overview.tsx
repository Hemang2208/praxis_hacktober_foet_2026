"use client";

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
  Brain,
  Award,
  Clock,
  Users,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppSelector, useProfileCompletion } from "@/redux/hooks";
import { toast } from "react-hot-toast";
import { useAppDispatch } from "@/redux/hooks";
import { fetchUserProfile } from "@/redux/slice/user.slice";
import { useEffect } from "react";
import Link from "next/link";
import { useRecentTasks } from "@/hooks/useRecentTasks";
import { useActiveProjects } from "@/hooks/useActiveProjects";
import { useSummaryStats } from "@/hooks/useSummaryStats";

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
    return Number.isNaN(value.getTime()) ? null : value.toLocaleDateString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  }

  if (value && typeof value === "object" && "$date" in value) {
    const nested = (value as { $date?: string | number | Date | null }).$date;

    if (nested instanceof Date) {
      return Number.isNaN(nested.getTime())
        ? null
        : nested.toLocaleDateString();
    }

    if (typeof nested === "string" || typeof nested === "number") {
      const parsed = new Date(nested);
      return Number.isNaN(parsed.getTime())
        ? null
        : parsed.toLocaleDateString();
    }
  }

  return null;
};

export function DashboardOverview() {
  const dispatch = useAppDispatch();
  // Use Redux selectors for userProfile, loading, error, isAuthenticated
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const loading = useAppSelector((state) => state.user.loading);
  const error = useAppSelector((state) => state.user.error);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const profileCompleted = useProfileCompletion();
  const {
    tasks: recentTasks,
    loading: tasksLoading,
    error: tasksError,
  } = useRecentTasks(3);
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
  const hasSummaryStats = Boolean(summaryStats);

  // Create summary cards from dynamic stats
  const summaryCards = [
    {
      title: "Task Completion Rate",
      value: hasSummaryStats
        ? `${summaryValues.taskCompletionRate}%`
        : statsLoading
          ? "..."
          : "0%",
      description:
        hasSummaryStats && summaryValues.taskCompletionRate > 0
          ? `${summaryValues.taskCompletionRate}% tasks completed`
          : "No tasks yet",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "GitHub Commits",
      value: hasSummaryStats
        ? summaryValues.gitHubCommits.toString()
        : statsLoading
          ? "..."
          : "0",
      description: "Total commits made",
      icon: GitCommit,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "AI Feedback Score",
      value: hasSummaryStats
        ? summaryValues.aiFeedbackScore.toString()
        : statsLoading
          ? "..."
          : "0",
      description:
        hasSummaryStats && summaryValues.aiFeedbackScore > 0
          ? "Excellent performance"
          : "No feedback yet",
      icon: Brain,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Certificates Earned",
      value: hasSummaryStats
        ? summaryValues.certificatesEarned.toString()
        : statsLoading
          ? "..."
          : "0",
      description:
        hasSummaryStats && summaryValues.certificatesEarned > 0
          ? `${summaryValues.certificatesEarned} earned`
          : "No certificates yet",
      icon: Award,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  useEffect(() => {
    if (!userProfile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, userProfile]);

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
              Welcome back, {userProfile.full_name.split(" ")[0]} 👋
            </h1>
            <p className="text-slate-600 mt-1">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <Link href="/user/projects">
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Tasks
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          ? `Due: ${new Date(task.due_date).toLocaleDateString()}`
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

        {/* AI Feedback */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5 text-purple-600" />
                AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
                <h4 className="font-medium text-slate-900 mb-2">
                  Code Quality Improvement
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  Your recent commits show great progress! Consider improving
                  variable naming conventions in your React components.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  View Details
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                <h4 className="font-medium text-slate-900 mb-2">
                  Performance Milestone
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  Excellent work on the authentication system! Your code follows
                  best practices.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  View Certificate
                </Button>
              </div>
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
                          {project.progress}%
                        </span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
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
