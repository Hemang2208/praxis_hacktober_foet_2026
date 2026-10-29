"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  FolderKanban,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Github,
  Sparkles,
  Monitor,
  Globe,
  Smartphone,
  Calendar,
  Users,
  ChevronDown,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCachedProjects } from "@/hooks/useCachedResources";
import { useUserJoinedProjects } from "@/hooks/useUserJoinedProjects";
import useUserProfile from "@/hooks/useUserProfile";
import {
  canManageCompanyProjects,
  canManageCompanyTaskStatus,
  formatCompanySubroleLabel,
  getViewerCompanySubrole,
} from "@/lib/company-rbac";
import { getProjectCompanyId } from "@/lib/project-ownership";
import NewProjectDialog from "@/components/dashboard/newProject";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import toast from "react-hot-toast";

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

// Skeleton Loader Component
function ProjectsGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-[300px] animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const getProjectIcon = (title: string) => {
  const t = (title || "").toLowerCase();
  if (t.includes("github") || t.includes("git")) {
    return <Github className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />;
  }
  if (t.includes("ai") || t.includes("agent") || t.includes("spark") || t.includes("bot")) {
    return <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  }
  if (t.includes("dashboard") || t.includes("student") || t.includes("admin") || t.includes("portal")) {
    return <Monitor className="h-4 w-4 text-blue-650 dark:text-blue-400" />;
  }
  if (t.includes("website") || t.includes("web") || t.includes("redesign")) {
    return <Globe className="h-4 w-4 text-teal-650 dark:text-teal-400" />;
  }
  if (t.includes("mobile") || t.includes("app") || t.includes("ios") || t.includes("android")) {
    return <Smartphone className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
  }
  return <FolderKanban className="h-4 w-4 text-zinc-550 dark:text-zinc-400" />;
};

// Show loading skeleton only on first load
export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, error, isCached } = useCachedProjects();
  const {
    joinedProjects,
    hasJoinedAny,
    isLoading: joinedProjectsLoading,
  } = useUserJoinedProjects();
  const { mongoUser: viewerProfile } = useUserProfile();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [teamSizeFilter, setTeamSizeFilter] = React.useState<
    "all" | "solo" | "small" | "medium" | "large"
  >("all");
  const [endDateSort, setEndDateSort] = React.useState<"latest" | "earliest">(
    "latest",
  );
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] =
    React.useState(false);

  // Get other data from Redux
  const dispatch = useDispatch();
  const allProjects = useSelector(
    (state: RootState) => state.project?.projects || [],
  );
  const tasks = useSelector((state: RootState) => state.task?.tasks || []);

  // Memoize project statistics by ID (for future use)
  const projectStatisticsById = React.useMemo(() => ({}), []);

  // Helper functions for task filtering and status derivation
  const getTasksForProject = (projectId: string) => {
    return tasks.filter((task: any) => task.project_id === projectId);
  };

  const deriveStatusFromStatistics = (stats: any) => {
    const { completionPercentage } = stats;
    if (completionPercentage === 100) return "completed";
    if (completionPercentage >= 50) return "in-progress";
    return "planning";
  };

  const deriveStatusFromTasks = (projectTasks: any[]) => {
    const completed = projectTasks.filter(
      (t: any) => t.status === "completed",
    ).length;
    if (completed === projectTasks.length) return "completed";
    if (completed > 0) return "in-progress";
    return "planning";
  };

  const roundProgress = (value: number) => {
    return Math.min(100, Math.max(0, Math.round(value)));
  };

  const coerceProgressValue = (value: any) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const handleProjectClick = (projectId: string) => {
    // Optional: add analytics or side effects here
  };

  const toComparableId = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) {
      const maybeObject = value as Record<string, unknown>;
      if (typeof maybeObject.$oid === "string") return maybeObject.$oid;
    }
    return String(value);
  };

  const viewerRole = String((viewerProfile as any)?.role ?? "").toLowerCase();
  const viewerSubrole = getViewerCompanySubrole(viewerProfile as any);
  const isCompanyViewer = viewerRole === "company" || Boolean(viewerSubrole);
  const canManageCompanyProjectsOnUserSide = canManageCompanyProjects(
    viewerProfile as any,
  );
  const canReviewCompanyTasksOnUserSide = canManageCompanyTaskStatus(
    viewerProfile as any,
  );
  const restrictToJoinedProjects =
    !canManageCompanyProjectsOnUserSide && hasJoinedAny;

  const baseProjects = React.useMemo(() => {
    const activeProjects = projects.filter(
      (project: any) =>
        String(project?.status ?? "").toLowerCase() !== "deleted",
    );

    const viewerCompanyId = toComparableId(
      (viewerProfile as any)?.activeCompanyMembership?.companyId ||
        (viewerRole === "company"
          ? (viewerProfile as any)?._id || (viewerProfile as any)?.id
          : ""),
    );

    const companyProjects = activeProjects.filter(
      (project: any) =>
        viewerCompanyId &&
        toComparableId(getProjectCompanyId(project)) === viewerCompanyId,
    );

    const joinedCompanyProjects = joinedProjects.filter((project: any) => {
      if (!viewerCompanyId) return true;
      return toComparableId(getProjectCompanyId(project)) === viewerCompanyId;
    });

    if (isCompanyViewer) {
      if (canManageCompanyProjectsOnUserSide) {
        return companyProjects;
      }

      // Company trainee/manager see all company projects until joined.
      // Once joined, they only see their joined projects.
      if (hasJoinedAny) {
        return joinedCompanyProjects;
      }

      return companyProjects;
    }

    if (hasJoinedAny) {
      return joinedProjects;
    }

    // Non-company users can discover only planning projects until they join.
    return activeProjects.filter(
      (project: any) =>
        String(project?.status ?? "").toLowerCase() === "planning",
    );
  }, [
    canManageCompanyProjectsOnUserSide,
    hasJoinedAny,
    isCompanyViewer,
    joinedProjects,
    projects,
    viewerRole,
    viewerProfile,
  ]);

  const filteredProjects = React.useMemo(() => {
    const filtered = baseProjects.filter((p: any) => {
      const matchesSearch =
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const teamSize =
        (Array.isArray(p.team_members) && p.team_members.length) ||
        (Array.isArray(p.team) && p.team.length) ||
        0;

      const matchesTeamSize =
        teamSizeFilter === "all" ||
        (teamSizeFilter === "solo" && teamSize <= 1) ||
        (teamSizeFilter === "small" && teamSize >= 2 && teamSize <= 4) ||
        (teamSizeFilter === "medium" && teamSize >= 5 && teamSize <= 8) ||
        (teamSizeFilter === "large" && teamSize >= 9);

      return matchesSearch && matchesTeamSize;
    });

    return filtered;
  }, [baseProjects, searchQuery, teamSizeFilter]);

  // Filter out projects where user is already a team member
  const availableProjects = React.useMemo(() => {
    return filteredProjects;
  }, [filteredProjects]);

  const orderedProjects = React.useMemo(() => {
    if (!availableProjects.length) {
      return availableProjects;
    }

    return [...availableProjects].sort((a: any, b: any) => {
      const aEndDate = new Date(a.deadline || 0).getTime();
      const bEndDate = new Date(b.deadline || 0).getTime();
      return endDateSort === "latest"
        ? bEndDate - aEndDate
        : aEndDate - bEndDate;
    });
  }, [availableProjects, endDateSort]);

  const myProject = React.useMemo(
    () => joinedProjects[0] || null,
    [joinedProjects],
  );

  const handleOpenProject = (projectId: string) => {
    const targetProjectId = toComparableId(projectId);
    if (
      restrictToJoinedProjects &&
      !joinedProjects.some(
        (project) => toComparableId(project._id) === targetProjectId,
      )
    ) {
      toast.error("You can only open the project you have joined.");
      return;
    }

    void router.push(`/user/projects/${targetProjectId}`);
  };

  const handleMyProjectClick = () => {
    if (!myProject?._id) {
      toast.error("No joined project found yet.");
      return;
    }

    router.push(`/user/projects/${myProject._id}`);
  };

  if (loading && !isCached) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-9 bg-gray-300 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
        </div>
        <ProjectsGridSkeleton />
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

  const totalProjectsCount = baseProjects.length;
  const inProgressProjectsCount = baseProjects.filter((p: any) => p.status === "in-progress").length;
  const completedProjectsCount = baseProjects.filter((p: any) => p.status === "completed").length;
  const onHoldProjectsCount = baseProjects.filter((p: any) => p.status === "on-hold").length;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
            PROJECTS
          </div>
          <h1 className="text-3xl font-bold text-zinc-950 dark:text-[#F5F5F5] tracking-tight mt-1">
            Projects
          </h1>
          <p className="text-xs text-zinc-500 dark:text-[#B3B3B8] mt-1 font-medium">
            {isCompanyViewer
              ? `Role: ${formatCompanySubroleLabel(viewerSubrole ?? "trainee")} | Company workspace access`
              : "Manage and monitor all your projects in one place."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {isCompanyViewer ? (
            <>
              {viewerRole === "company" && (
                <Link href="/dashboard/projects" className="w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto text-[11px] font-bold uppercase tracking-wider h-10 px-5 rounded-xl border border-zinc-200 dark:border-[#26272B] dark:bg-[#111214] dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] cursor-pointer"
                  >
                    Open Dashboard
                  </Button>
                </Link>
              )}
              {canManageCompanyProjectsOnUserSide && (
                <Button
                  type="button"
                  className="w-full sm:w-auto text-[11px] font-bold uppercase tracking-wider h-10 px-5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-[#16A34A] dark:hover:bg-[#22C55E] text-white border-none cursor-pointer"
                  onClick={() => setIsNewProjectDialogOpen(true)}
                >
                  + New Project
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto text-[11px] font-bold uppercase tracking-wider h-10 px-5 rounded-xl border border-zinc-200 dark:border-[#26272B] dark:bg-[#111214] dark:text-[#F5F5F5] hover:bg-zinc-50 dark:hover:bg-[#17181C] cursor-pointer"
                onClick={handleMyProjectClick}
                disabled={joinedProjectsLoading || !myProject?._id}
              >
                My Project
              </Button>
              <Link
                href="/user/projects/applications"
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto text-[11px] font-bold uppercase tracking-wider h-10 px-5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-[#16A34A] dark:hover:bg-[#22C55E] text-white border-none cursor-pointer">
                  View Applications
                </Button>
              </Link>
            </>
          )}
        </div>
      </motion.div>

      {canManageCompanyProjectsOnUserSide && (
        <NewProjectDialog
          isNewProjectOpen={isNewProjectDialogOpen}
          setIsNewProjectOpen={setIsNewProjectDialogOpen}
        />
      )}

      {/* Stats Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Projects */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#26272B] bg-white dark:bg-[#111214] shadow-sm hover:shadow-md hover:dark:bg-[#17181C] transition-all duration-200">
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-zinc-50 dark:bg-[#A855F7]/18 border border-zinc-200/80 dark:border-[#A855F7]/30 flex items-center justify-center">
                <FolderKanban className="h-4.5 w-4.5 text-zinc-900 dark:text-[#C084FC]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#7A7A80]">
                TOTAL PROJECTS
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-none tabular-nums">
                {totalProjectsCount}
              </span>
              <p className="text-[10px] text-zinc-400 dark:text-[#B3B3B8] mt-1.5 font-medium">
                Across all workspaces
              </p>
            </div>
          </div>
        </Card>

        {/* In Progress */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#26272B] bg-white dark:bg-[#111214] shadow-sm hover:shadow-md hover:dark:bg-[#17181C] transition-all duration-200">
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-zinc-50 dark:bg-[#3B82F6]/18 border border-zinc-200/80 dark:border-[#3B82F6]/30 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5 text-zinc-900 dark:text-[#60A5FA]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#7A7A80]">
                IN PROGRESS
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-none tabular-nums">
                {inProgressProjectsCount}
              </span>
              <p className="text-[10px] text-zinc-400 dark:text-[#B3B3B8] mt-1.5 font-medium">
                Active projects
              </p>
            </div>
          </div>
        </Card>

        {/* Completed */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#26272B] bg-white dark:bg-[#111214] shadow-sm hover:shadow-md hover:dark:bg-[#17181C] transition-all duration-200">
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-zinc-50 dark:bg-[#22C55E]/18 border border-zinc-200/80 dark:border-[#22C55E]/30 flex items-center justify-center">
                <CheckCircle className="h-4.5 w-4.5 text-zinc-900 dark:text-[#4ADE80]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#7A7A80]">
                COMPLETED
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-none tabular-nums">
                {completedProjectsCount}
              </span>
              <p className="text-[10px] text-zinc-400 dark:text-[#B3B3B8] mt-1.5 font-medium">
                Finished projects
              </p>
            </div>
          </div>
        </Card>

        {/* On Hold */}
        <Card className="rounded-2xl border border-zinc-200/60 dark:border-[#26272B] bg-white dark:bg-[#111214] shadow-sm hover:shadow-md hover:dark:bg-[#17181C] transition-all duration-200">
          <div className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-zinc-50 dark:bg-[#F59E0B]/18 border border-zinc-200/80 dark:border-[#F59E0B]/30 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5 text-zinc-900 dark:text-[#FBBF24]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#7A7A80]">
                ON HOLD
              </span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-zinc-950 dark:text-[#F5F5F5] leading-none tabular-nums">
                {onHoldProjectsCount}
              </span>
              <p className="text-[10px] text-zinc-400 dark:text-[#B3B3B8] mt-1.5 font-medium">
                Paused projects
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full flex-wrap"
      >
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-[#6B6B72]" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] rounded-xl text-xs placeholder-zinc-400 dark:placeholder-[#6B6B72] text-zinc-900 dark:text-[#F5F5F5] focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] rounded-xl px-3.5 text-xs font-semibold text-zinc-700 dark:text-[#B3B3B8] hover:bg-zinc-50 dark:hover:bg-[#17181C] cursor-pointer" disabled>
                <Filter className="mr-1.5 h-3.5 w-3.5 text-zinc-400 dark:text-[#7A7A80]" />
                Status: {" "}
                {isCompanyViewer
                  ? "Company"
                  : hasJoinedAny
                    ? "Joined Only"
                    : "All Active"}
                <ChevronDown className="ml-1.5 h-3 w-3 text-zinc-400 dark:text-[#7A7A80]" />
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] rounded-xl px-3.5 text-xs font-semibold text-zinc-700 dark:text-[#B3B3B8] hover:bg-zinc-50 dark:hover:bg-[#17181C] cursor-pointer"
                disabled={hasJoinedAny || isCompanyViewer}
              >
                <Users className="mr-1.5 h-3.5 w-3.5 text-zinc-400 dark:text-[#7A7A80]" />
                Team: {teamSizeFilter === "all" ? "All" : teamSizeFilter}
                <ChevronDown className="ml-1.5 h-3 w-3 text-zinc-400 dark:text-[#7A7A80]" />
              </Button>
            </DropdownMenuTrigger>
            {!hasJoinedAny && !isCompanyViewer && (
              <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-[#111214] border border-zinc-200 dark:border-[#26272B] rounded-xl p-1 shadow-md">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#7A7A80] px-2 py-1.5">People Working</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-[#202124]" />
                <DropdownMenuCheckboxItem
                  checked={teamSizeFilter === "all"}
                  onCheckedChange={() => setTeamSizeFilter("all")}
                  className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
                >
                  All
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={teamSizeFilter === "solo"}
                  onCheckedChange={() => setTeamSizeFilter("solo")}
                  className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
                >
                  Solo (0-1)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={teamSizeFilter === "small"}
                  onCheckedChange={() => setTeamSizeFilter("small")}
                  className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
                >
                  Small Team (2-4)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={teamSizeFilter === "medium"}
                  onCheckedChange={() => setTeamSizeFilter("medium")}
                  className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
                >
                  Medium Team (5-8)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={teamSizeFilter === "large"}
                  onCheckedChange={() => setTeamSizeFilter("large")}
                  className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
                >
                  Large Team (9+)
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 border border-zinc-200 dark:border-[#26272B] bg-white dark:bg-[#111214] rounded-xl px-3.5 text-xs font-semibold text-zinc-700 dark:text-[#B3B3B8] hover:bg-zinc-50 dark:hover:bg-[#17181C] cursor-pointer">
                <Layers className="mr-1.5 h-3.5 w-3.5 text-zinc-400 dark:text-[#7A7A80]" />
                Sort: {" "}
                {endDateSort === "latest" ? "Latest" : "Earliest"}
                <ChevronDown className="ml-1.5 h-3 w-3 text-zinc-400 dark:text-[#7A7A80]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-[#111214] border border-zinc-200 dark:border-[#26272B] rounded-xl p-1 shadow-md">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#7A7A80] px-2 py-1.5">End Date Completion</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-[#202124]" />
              <DropdownMenuCheckboxItem
                checked={endDateSort === "latest"}
                onCheckedChange={() => setEndDateSort("latest")}
                className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
              >
                Latest First
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={endDateSort === "earliest"}
                onCheckedChange={() => setEndDateSort("earliest")}
                className="text-xs rounded-lg cursor-pointer text-zinc-700 dark:text-[#F5F5F5]"
              >
                Earliest First
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Projects Grid */}
      {loading && !isCached ? (
        <ProjectsGridSkeleton />
      ) : availableProjects.length === 0 ? (
        <div className="col-span-full text-center py-16 border border-dashed border-zinc-200 dark:border-[#26272B] rounded-2xl bg-zinc-50/30 dark:bg-[#111214]/50">
          <FolderKanban className="h-8 w-8 text-zinc-300 dark:text-[#6B6B72] mx-auto mb-3" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-[#F5F5F5] uppercase tracking-wider mb-1">
            {isCompanyViewer
              ? "No company projects available"
              : hasJoinedAny
                ? "No joined projects"
                : "No planning projects available"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-[#B3B3B8] max-w-sm mx-auto leading-relaxed">
            {isCompanyViewer
              ? canManageCompanyProjectsOnUserSide
                ? "Create your first company project from dashboard or assign members to existing ones."
                : "Ask your owner/admin to assign you to a project to begin work."
              : hasJoinedAny
                ? "You have not been linked to any joined project yet."
                : "Only planning projects are shown here until you join one."}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {orderedProjects.map((project: any, index: number) => {
            const projectId = toComparableId(project._id);
            const isJoinedProject = joinedProjects.some(
              (joinedProject) =>
                toComparableId(joinedProject._id) === projectId,
            );
            const canOpenProject = !restrictToJoinedProjects || isJoinedProject;
            const projStatus = (project.status || "planning") as keyof typeof statusColors;

            return (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <Card
                  className={`group bg-white dark:bg-[#111214] border border-zinc-200/60 dark:border-[#26272B] rounded-2xl p-5 hover:dark:bg-[#17181C] hover:dark:border-[#38393F] transition-all duration-300 flex flex-col justify-between min-h-[220px] gap-4 ${canOpenProject ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                  onClick={() => handleOpenProject(project._id)}
                >
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Project Icon Box */}
                      <div className="h-8 w-8 border border-zinc-200 dark:border-[#26272B] rounded-xl bg-zinc-50 dark:bg-[#17181C] flex items-center justify-center flex-shrink-0 shadow-xs">
                        {getProjectIcon(project.title)}
                      </div>
                      <CardTitle className="text-sm font-bold text-zinc-950 dark:text-[#F5F5F5] tracking-tight group-hover:text-zinc-800 dark:group-hover:text-white transition-colors line-clamp-1 leading-none">
                        {project.title}
                      </CardTitle>
                    </div>

                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      projStatus === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-[#22C55E]/18 dark:text-[#4ADE80] dark:border-[#22C55E]/30"
                        : projStatus === "in-progress"
                          ? "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-[#3B82F6]/18 dark:text-[#60A5FA] dark:border-[#3B82F6]/30"
                          : projStatus === "on-hold"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-[#FBBF24]/18 dark:text-[#FBBF24] dark:border-[#FBBF24]/30"
                            : "bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-[#A855F7]/18 dark:text-[#C084FC] dark:border-[#A855F7]/30"
                    }`}>
                      {projStatus.replace("-", " ")}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 dark:text-[#B3B3B8] line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Progress Bar & Value */}
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 bg-zinc-100 dark:bg-[#232428] rounded-full overflow-hidden flex-1">
                      <div
                        className="bg-black dark:bg-[#16A34A] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((project.progress as any) || 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-950 dark:text-[#F5F5F5] min-w-8 text-right">
                      {Math.round((project.progress as any) || 0)}%
                    </span>
                  </div>

                  {/* Meta: Members + Deadline */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-[#B3B3B8]">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-zinc-400 dark:text-[#7A7A80]" />
                      <span>{project.team_members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400 dark:text-[#7A7A80]" />
                      <span>
                        {project.deadline
                          ? `Due ${new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "No deadline"}
                      </span>
                    </div>
                  </div>

                  {/* Tags Pill Badges */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] font-medium px-2.5 py-0.5 rounded-md bg-zinc-50/50 dark:bg-[#17181C] text-zinc-600 dark:text-[#B3B3B8] border border-zinc-200 dark:border-[#26272B]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
