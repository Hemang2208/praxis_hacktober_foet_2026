"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  MoreHorizontal,
  FolderKanban,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/formatDate";
import NewProjectDialog from "@/components/dashboard/newProject";
import { useCachedProjects } from "@/hooks/useCachedResources";
import { useCompanyProjects } from "@/hooks/useCompanyProjects";
import { useTasks } from "@/hooks/useTasks";
import { useAppDispatch } from "@/redux/hooks";
import useUserProfile from "@/hooks/useUserProfile";
import Link from "next/link";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { canManageCompanyProjects } from "@/lib/company-rbac";
import { deleteProject } from "@/redux/slice/project.slice";

const statusColors = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "in-progress":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "on-hold": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusIcons = {
  planning: Clock,
  "in-progress": TrendingUp,
  completed: CheckCircle,
  "on-hold": AlertTriangle,
};

export default function ProjectsPage() {
  const dispatch = useAppDispatch();
  const { projects, loading, error, isCached } = useCachedProjects();
  const { companyProjects, projectStats: companyStats } = useCompanyProjects();
  const { mongoUser } = useUserProfile();

  const { taskStats, getTasksForProject, tasks } = useTasks();

  const canManageProjects = React.useMemo(() => {
    const role = String((mongoUser as any)?.role ?? "").toLowerCase();
    if (role === "college") return true;
    return canManageCompanyProjects(mongoUser as any);
  }, [mongoUser]);

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] =
    React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<
    "title" | "deadline" | "progress" | "status"
  >("title");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const [projectStatisticsById, setProjectStatisticsById] = React.useState<
    Record<
      string,
      {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        blockedTasks: number;
        completionPercentage: number;
      }
    >
  >({});

  const fetchedTaskproject_idsRef = React.useRef<Set<string>>(new Set());
  const fetchedStatisticsproject_idsRef = React.useRef<Set<string>>(new Set());

  const coerceProgressValue = React.useCallback((value: unknown): number => {
    if (value == null) return 0;

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const wrapped =
        record.$numberDouble ??
        record.$numberDecimal ??
        record.$numberInt ??
        record.$numberLong;
      if (wrapped !== undefined) return coerceProgressValue(wrapped);
    }

    const n =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number.parseFloat(value)
          : Number.NaN;

    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }, []);

  const roundProgress = React.useCallback(
    (value: unknown): number => {
      return Math.round(coerceProgressValue(value));
    },
    [coerceProgressValue],
  );

  const deriveStatusFromTasks = (
    projectTasks: Array<{ status?: string }>,
  ): keyof typeof statusIcons => {
    if (projectTasks.length === 0) return "planning";

    const completed = projectTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const inProgress = projectTasks.filter(
      (t) => t.status === "in-progress",
    ).length;
    const blocked = projectTasks.filter((t) => t.status === "blocked").length;

    if (completed === projectTasks.length) return "completed";
    if (inProgress > 0 || completed > 0) return "in-progress";
    if (blocked > 0) return "on-hold";
    return "planning";
  };

  const deriveStatusFromStatistics = (stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
  }): keyof typeof statusIcons => {
    const total = Math.max(0, stats.totalTasks);
    const completed = Math.max(0, Math.min(stats.completedTasks, total));
    const inProgress = Math.max(0, stats.inProgressTasks);
    const blocked = Math.max(0, stats.blockedTasks);

    if (total === 0) return "planning";
    if (completed >= total) return "completed";
    if (inProgress > 0 || completed > 0) return "in-progress";
    if (blocked > 0) return "on-hold";
    return "planning";
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusFilter = (status: string | null) => {
    setFilterStatus(status);
  };

  const handleSortChange = (
    sort_by: "title" | "deadline" | "progress" | "status",
  ) => {
    const newOrder = sortBy === sort_by && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(sort_by);
    setSortOrder(newOrder);
  };

  const handleDelete = async (project_id: string) => {
    try {
      await dispatch(deleteProject(project_id)).unwrap();
      console.log("Deleted project", project_id);
    } catch (err) {
      console.error(err);
    }
  };

  // Apply filters and sorting to company projects
  const filteredCompanyProjects = React.useMemo(() => {
    let filtered = companyProjects.filter(
      (project) => project.status !== "deleted",
    );

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((project) => project.status === filterStatus);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      const getProgressForProject = (project: any): number => {
        const project_id = project?._id as string | undefined;
        const stats = project_id
          ? projectStatisticsById[project_id]
          : undefined;

        // Trust task-mgmt-agent statistics even when totalTasks is 0 (this is
        // how we correctly reset progress after all tasks are deleted).
        if (stats) {
          return roundProgress(stats.completionPercentage);
        }

        const projectTasks = project_id ? getTasksForProject(project_id) : [];
        if (Array.isArray(projectTasks) && projectTasks.length > 0) {
          const completed = projectTasks.filter(
            (t: any) => t && typeof t === "object" && t.status === "completed",
          ).length;
          return Math.round((completed / projectTasks.length) * 100);
        }

        return roundProgress(project?.progress);
      };

      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "deadline":
          comparison =
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case "progress":
          comparison = getProgressForProject(a) - getProgressForProject(b);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    companyProjects,
    filterStatus,
    searchQuery,
    sortBy,
    sortOrder,
    getTasksForProject,
    projectStatisticsById,
    roundProgress,
  ]);

  React.useEffect(() => {
    // If the project list API returns stale/zero progress, fetch tasks and derive progress client-side.
    for (const project of filteredCompanyProjects) {
      const project_id = project._id;
      if (!project_id) continue;

      const storedProgress = coerceProgressValue(project.progress as unknown);
      if (storedProgress > 0) continue;
      if (fetchedTaskproject_idsRef.current.has(project_id)) continue;

      // If tasks for this project already exist in Redux, don't refetch.
      if (tasks.some((t) => t.project_id === project_id)) {
        fetchedTaskproject_idsRef.current.add(project_id);
        continue;
      }

      fetchedTaskproject_idsRef.current.add(project_id);
    }
  }, [filteredCompanyProjects, tasks, coerceProgressValue]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const project_ids = filteredCompanyProjects
      .map((p) => p._id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const toFetch = project_ids.filter(
      (id) => !fetchedStatisticsproject_idsRef.current.has(id),
    );

    if (toFetch.length === 0) return;

    toFetch.forEach((id) => fetchedStatisticsproject_idsRef.current.add(id));

    async function loadStatistics() {
      const results = await Promise.all(
        toFetch.map(async (project_id) => {
          try {
            const res = await fetch(
              `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/statistics`,
              { signal: controller.signal },
            );

            if (!res.ok) throw new Error(`Failed statistics: ${res.status}`);

            const data = (await res.json().catch(() => null)) as any;

            const completionPercentage = coerceProgressValue(
              data?.completion_percentage ?? data?.completionPercentage,
            );

            const totalTasks =
              typeof data?.total_tasks === "number"
                ? data.total_tasks
                : typeof data?.totalTasks === "number"
                  ? data.totalTasks
                  : 0;
            const completedTasks =
              typeof data?.completed_tasks === "number"
                ? data.completed_tasks
                : typeof data?.completedTasks === "number"
                  ? data.completedTasks
                  : 0;

            const inProgressTasks =
              typeof data?.in_progress_tasks === "number"
                ? data.in_progress_tasks
                : typeof data?.inProgressTasks === "number"
                  ? data.inProgressTasks
                  : 0;

            const blockedTasks =
              typeof data?.blocked_tasks === "number"
                ? data.blocked_tasks
                : typeof data?.blockedTasks === "number"
                  ? data.blockedTasks
                  : 0;

            return {
              project_id,
              stats: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                blockedTasks,
                completionPercentage,
              },
            };
          } catch (err) {
            fetchedStatisticsproject_idsRef.current.delete(project_id);
            console.warn("Dashboard projects: failed to fetch statistics", {
              project_id,
              err,
            });
            return null;
          }
        }),
      );

      if (cancelled) return;

      setProjectStatisticsById((prev) => {
        const next = { ...prev };
        for (const entry of results) {
          if (!entry) continue;
          next[entry.project_id] = entry.stats;
        }
        return next;
      });
    }

    void loadStatistics();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filteredCompanyProjects, coerceProgressValue]);

  // Calculate task statistics for filtered projects only
  const filteredTaskStats = React.useMemo(() => {
    // Get all tasks that belong to the filtered projects
    const filteredproject_ids = filteredCompanyProjects.map(
      (project) => project._id,
    );
    const filteredTasks = tasks.filter((task) =>
      filteredproject_ids.includes(task.project_id),
    );

    const total = filteredTasks.length;
    const completed = filteredTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const inProgress = filteredTasks.filter(
      (t) => t.status === "in-progress",
    ).length;

    // Overdue tasks from filtered projects
    const now = new Date();
    const overdue = filteredTasks.filter(
      (t) =>
        t.due_date && new Date(t.due_date) < now && t.status !== "completed",
    ).length;

    return {
      total,
      completed,
      inProgress,
      overdue,
    };
  }, [filteredCompanyProjects, tasks]);

  if (loading && !isCached) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          Error Loading Projects
        </h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <p className="text-xs text-zinc-500 mt-1 leading-normal">
            Manage and track your company projects, cohorts, and developer assignments.
          </p>
        </div>
        {canManageProjects ? (
          <Button
            onClick={() => setIsNewProjectDialogOpen(true)}
            className="w-full sm:w-auto bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Button>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-md font-medium tracking-wide">
            Read-only Access
          </Badge>
        )}
      </motion.div>

      {/* ── STATISTICS OVERVIEW ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Total Projects</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{companyStats.total}</div>
            </div>
            <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Across all workspaces</p>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">In Progress</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{companyStats.inProgress}</div>
            </div>
            <div className="h-7 w-7 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Active projects</p>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">Completed</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{companyStats.completed}</div>
            </div>
            <div className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:emerald-400 flex items-center justify-center">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Finished projects</p>
        </Card>

        <Card className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider">On Hold</span>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">{companyStats.onHold}</div>
            </div>
            <div className="h-7 w-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-medium mt-1">Paused projects</p>
        </Card>
      </motion.div>

      {/* ── SEARCH & FILTERS ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 rounded-xl border border-zinc-200/60 bg-white text-xs h-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl border border-zinc-200/60 hover:bg-zinc-50 text-xs font-semibold h-9 px-3.5 cursor-pointer">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-zinc-500" />
              Status: {filterStatus ? filterStatus.replace("-", " ") : "All"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-zinc-900 border border-zinc-250/60 rounded-xl shadow-md p-1 min-w-44">
            <DropdownMenuLabel className="text-xs text-zinc-400">Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuCheckboxItem
              checked={filterStatus === null}
              onCheckedChange={() => handleStatusFilter(null)}
              className="text-xs rounded-lg cursor-pointer"
            >
              All Projects
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "planning"}
              onCheckedChange={() => handleStatusFilter("planning")}
              className="text-xs rounded-lg cursor-pointer"
            >
              Planning
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "in-progress"}
              onCheckedChange={() => handleStatusFilter("in-progress")}
              className="text-xs rounded-lg cursor-pointer"
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "completed"}
              onCheckedChange={() => handleStatusFilter("completed")}
              className="text-xs rounded-lg cursor-pointer"
            >
              Completed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "on-hold"}
              onCheckedChange={() => handleStatusFilter("on-hold")}
              className="text-xs rounded-lg cursor-pointer"
            >
              On Hold
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl border border-zinc-200/60 hover:bg-zinc-50 text-xs font-semibold h-9 px-3.5 cursor-pointer">
              Sort: {sortBy} {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-zinc-250/60 rounded-xl shadow-md p-1 min-w-44">
            <DropdownMenuLabel className="text-xs text-zinc-400">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100" />
            <DropdownMenuItem onClick={() => handleSortChange("title")} className="text-xs rounded-lg cursor-pointer">
              Project Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("deadline")} className="text-xs rounded-lg cursor-pointer">
              Deadline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("progress")} className="text-xs rounded-lg cursor-pointer">
              Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("status")} className="text-xs rounded-lg cursor-pointer">
              Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* ── PROJECTS GRID ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredCompanyProjects.map((project, index) => {
          const projectTasks = getTasksForProject(project._id);
          const storedStatus = (project.status || "planning") as keyof typeof statusIcons;
          const stats = projectStatisticsById[project._id];
          const projectStatus = stats
            ? deriveStatusFromStatistics(stats)
            : projectTasks.length > 0
              ? deriveStatusFromTasks(projectTasks)
              : storedStatus;

          const StatusIcon = statusIcons[projectStatus] || Clock;
          const storedProgressValue = coerceProgressValue(project.progress as unknown);
          const progressValue = stats
            ? roundProgress(stats.completionPercentage)
            : projectTasks.length > 0
              ? Math.round(
                  (projectTasks.filter((t) => t.status === "completed").length /
                    projectTasks.length) *
                    100,
                )
              : roundProgress(storedProgressValue);

          return (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="w-full flex flex-col"
            >
              <Card className="group rounded-2xl border border-zinc-200/60 bg-white dark:bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col p-5 hover:border-zinc-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] transition-all duration-300 min-h-[250px] relative select-none w-full">
                <div className="flex items-center justify-between gap-3 mb-3">
                  {/* Icon square */}
                  <div className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 flex-shrink-0">
                    <Briefcase className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide uppercase ${
                        statusColors[projectStatus] || statusColors.planning
                      }`}
                    >
                      {projectStatus.replace("-", " ")}
                    </Badge>
                    {canManageProjects && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border border-zinc-250/60 rounded-xl shadow-md p-1 min-w-44">
                          <DropdownMenuItem asChild className="text-xs rounded-lg cursor-pointer flex items-center py-2">
                            <Link href={`/dashboard/projects/${project._id}`}>
                              <Eye className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="text-xs rounded-lg cursor-pointer flex items-center py-2">
                            <Link href={`/dashboard/projects/${project._id}`}>
                              <Edit className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                              Edit Project
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-100" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(project._id)}
                            className="text-xs rounded-lg cursor-pointer text-red-650 flex items-center py-2 hover:bg-red-50 hover:text-red-750"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 flex-1 flex flex-col">
                  <Link href={`/dashboard/projects/${project._id}`} className="block">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-650 transition-colors line-clamp-1 truncate leading-snug">
                      {project.title}
                    </h3>
                  </Link>
                  <p className="text-[11px] text-zinc-450 leading-relaxed line-clamp-2 h-8 overflow-hidden break-words">
                    {project.description}
                  </p>

                  {/* Progress section inline */}
                  <div className="flex items-center gap-3 pt-3 pb-2">
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-zinc-950 dark:bg-zinc-50 h-full rounded-full transition-all duration-300" style={{ width: `${progressValue}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-550 flex-shrink-0">{progressValue}%</span>
                  </div>

                  {/* Footer members and due date */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-medium py-2 border-t border-zinc-100 dark:border-zinc-800/30 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{project.team_members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {project.deadline
                          ? `Due ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "No deadline"}
                      </span>
                    </div>
                  </div>

                  {/* Tags list */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-50 dark:border-zinc-800/20">
                    {project.tags && project.tags.length > 0 ? (
                      project.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[9px] px-2 py-0.5 rounded-lg border-zinc-200 text-zinc-500 bg-white dark:bg-zinc-950 dark:border-zinc-850"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : null}
                    {project.tags && project.tags.length > 3 && (
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 rounded-lg border-zinc-200 text-zinc-450 bg-white dark:bg-zinc-950 dark:border-zinc-850">
                        +{project.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── EMPTY STATE ──────────────────────────────────────────────── */}
      {filteredCompanyProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center py-16 border border-dashed border-zinc-200 rounded-2xl max-w-md mx-auto"
        >
          <FolderKanban className="mx-auto h-12 w-12 text-zinc-350 mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            {searchQuery || filterStatus ? "No projects found" : "No projects yet"}
          </h3>
          <p className="text-xs text-zinc-450 mb-4 max-w-xs mx-auto leading-normal">
            {searchQuery || filterStatus
              ? "Try adjusting your search query or choosing a different filter status."
              : "Create your first project to organize developer cohorts, customize assessment tests, and track progress boards."}
          </p>
          {!searchQuery && !filterStatus && canManageProjects && (
            <Button
              onClick={() => setIsNewProjectDialogOpen(true)}
              className="bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Your First Project
            </Button>
          )}
        </motion.div>
      )}

      {/* New Project Dialog */}
      {canManageProjects && (
        <NewProjectDialog
          isNewProjectOpen={isNewProjectDialogOpen}
          setIsNewProjectOpen={setIsNewProjectDialogOpen}
        />
      )}
    </div>
  );
}
