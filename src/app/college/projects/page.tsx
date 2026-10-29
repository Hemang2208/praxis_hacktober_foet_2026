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
import NewProjectDialog from "@/components/college/newProject";
import { useCachedProjects } from "@/hooks/useCachedResources";
import { useAppDispatch } from "@/redux/hooks";
import useUserProfile from "@/hooks/useUserProfile";
import Link from "next/link";
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

export default function ProjectsPage() {
  // Use cached projects - only fetches if not cached, prevents redundant API calls
  const dispatch = useAppDispatch();
  const { projects, loading, error, isCached } = useCachedProjects();
  const { mongoUser } = useUserProfile();

  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] =
    React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<
    "title" | "deadline" | "progress" | "status"
  >("title");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const canManageProjects =
    String((mongoUser as any)?.role ?? "").toLowerCase() === "college";

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

  // Local filtering and sorting (no Redux dispatch required)
  const filteredProjects = React.useMemo(() => {
    const result = projects
      .filter((p) => p.status !== "deleted")
      .filter((p) => {
        const matchesSearch =
          !searchQuery ||
          p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = !filterStatus || p.status === filterStatus;

        return matchesSearch && matchesStatus;
      });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "deadline") {
        comparison =
          new Date(a.deadline || 0).getTime() -
          new Date(b.deadline || 0).getTime();
      } else if (sortBy === "progress") {
        const aVal = coerceProgressValue(a.progress);
        const bVal = coerceProgressValue(b.progress);
        comparison = aVal - bVal;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    projects,
    searchQuery,
    filterStatus,
    sortBy,
    sortOrder,
    coerceProgressValue,
  ]);

  // Calculate stats from cached projects
  const projectStats = React.useMemo(() => {
    const activeProjects = projects.filter((p) => p.status !== "deleted");
    return {
      total: activeProjects.length,
      inProgress: activeProjects.filter((p) => p.status === "in-progress")
        .length,
      completed: activeProjects.filter((p) => p.status === "completed").length,
      completionRate: activeProjects.length
        ? Math.round(
            (activeProjects.filter((p) => p.status === "completed").length /
              activeProjects.length) *
              100,
          )
        : 0,
    };
  }, [projects]);

  const taskStats = React.useMemo(() => {
    const allTasks: any[] = [];
    return {
      total: allTasks.length,
      completed: allTasks.filter((t: any) => t.status === "completed").length,
      inProgress: allTasks.filter((t: any) => t.status === "in-progress")
        .length,
      overdue: allTasks.filter(
        (t: any) => !t.completed_at && new Date(t.due_date) < new Date(),
      ).length,
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusFilter = (status: string | null) => {
    setFilterStatus(status);
  };

  const handleSortChange = (
    sort: "title" | "deadline" | "progress" | "status",
  ) => {
    const newOrder = sortBy === sort && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(sort);
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

  if (loading && !isCached) {
    return <ProjectsGridSkeleton />;
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your projects across different domains
          </p>
        </div>
        {!canManageProjects && (
          <Badge variant="secondary" className="w-full sm:w-auto px-3 py-2">
            Read-only access
          </Badge>
        )}
      </motion.div>

      {/* Statistics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {projectStats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in development
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {projectStats.completed}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {projectStats.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Project completion rate
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {taskStats.total}
                </div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {taskStats.completed}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tasks Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {taskStats.inProgress}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {taskStats.overdue}
                </div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center gap-4 flex-wrap"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Status: {filterStatus || "All"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterStatus === null}
              onCheckedChange={() => handleStatusFilter(null)}
            >
              All Projects
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "planning"}
              onCheckedChange={() => handleStatusFilter("planning")}
            >
              Planning
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "in-progress"}
              onCheckedChange={() => handleStatusFilter("in-progress")}
            >
              In Progress
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "completed"}
              onCheckedChange={() => handleStatusFilter("completed")}
            >
              Completed
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filterStatus === "on-hold"}
              onCheckedChange={() => handleStatusFilter("on-hold")}
            >
              On Hold
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {sortBy} {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSortChange("title")}>
              Project Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("deadline")}>
              Deadline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("progress")}>
              Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange("status")}>
              Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Projects Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredProjects.map((project, index) => {
          const projectStatus = (project.status ||
            "planning") as keyof typeof statusIcons;
          const StatusIcon = statusIcons[projectStatus] || Clock;
          const progressValue = coerceProgressValue(
            project.progress as unknown,
          );

          return (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 min-h-[260px] flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/college/projects/${project._id}`}>
                        <CardTitle className="text-lg leading-snug line-clamp-2 break-words group-hover:text-blue-600 transition-colors">
                          {project.title}
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1 text-sm min-h-[36px] max-h-[36px] overflow-hidden line-clamp-2">
                        {project.description}
                      </CardDescription>
                    </div>
                    {canManageProjects && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/college/projects/${project._id}`}>
                              <div className="flex items-center">
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </div>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Project
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDelete(project._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 flex-1 flex flex-col">
                  <div className="space-y-2">
                    {/* Status and Progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className="h-4 w-4" />
                        <Badge
                          variant="secondary"
                          className={
                            statusColors[projectStatus] || statusColors.planning
                          }
                        >
                          {projectStatus.charAt(0).toUpperCase() +
                            projectStatus.slice(1).replace("-", " ")}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium">
                        {progressValue}%
                      </div>
                    </div>

                    <Progress value={progressValue} className="h-2" />

                    {/* Project Details */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          <span>Due: {formatDate(project.deadline)}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="mr-1 h-3 w-3" />
                          <span>
                            {project.team_members?.length || 0} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    {/* Team Members */}
                    <div className="min-h-[24px] flex items-center">
                      {project.team_members &&
                      project.team_members.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          <div className="flex -space-x-2">
                            {project.team_members
                              .slice(0, 3)
                              .map((member, i) => (
                                <Avatar
                                  key={i}
                                  className="h-6 w-6 border-2 border-white"
                                >
                                  <AvatarImage
                                    src={member.avatar}
                                    alt={member.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {member.name
                                      ? member.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                      : "U"}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            {project.team_members.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  +{project.team_members.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Tags */}
                    <div className="min-h-[24px]">
                      {project.tags && project.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {project.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{project.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center py-12"
        >
          <FolderKanban className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery || filterStatus
              ? "No projects found"
              : "No projects yet"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {searchQuery || filterStatus
              ? "Try adjusting your search criteria or filters to find what you're looking for."
              : "Get started by creating your first project. You can track progress, manage tasks, and collaborate with your team."}
          </p>
          {!searchQuery && !filterStatus && canManageProjects && (
            <Button
              onClick={() => setIsNewProjectDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
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
