"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { IProject } from "@/models/Project";
import {
  Calendar,
  Users,
  GitBranch,
  BarChart3,
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  // Clock,
  AlertCircle,
  FolderKanban,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import { PLANNER_AGENT_URL } from "@/utils/API_URL";
import useUserProfile from "@/hooks/useUserProfile";

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in-progress":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "planning":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "on-hold":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case "milestone":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "review":
      return <BarChart3 className="h-4 w-4 text-sky-600" />;
    case "assessment":
      return <AlertCircle className="h-4 w-4 text-violet-600" />;
    default:
      return <Activity className="h-4 w-4 text-slate-600" />;
  }
};

export default function ProjectDetailPage() {
  const params = useParams();
  const project_id = params.project_id as string;
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);
  const { mongoUser } = useUserProfile();
  const canManageProjectActions =
    String((mongoUser as any)?.role ?? "").toLowerCase() === "college";

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await axios.get(
          `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}`,
        );
        setProject(res.data?.project || res.data);
      } catch (error) {
        console.error("Failed to fetch project:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [project_id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-slate-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Project not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            The project you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/college/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  // from here, continue using project object like before (already updated in the canvas)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {project?.title}
            </h1>
            <Badge
              variant="outline"
              className={getStatusColor(project?.status)}
            >
              {project?.status?.replace("-", " ")}
            </Badge>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {project?.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/college/projects/${project_id}/board`}>
              <FolderKanban className="mr-2 h-4 w-4" />
              Open Board
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Repository
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/college/analytics?project=${project_id}`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </DropdownMenuItem>
              {canManageProjectActions && (
                <DropdownMenuItem>Edit Project</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        {[
          {
            title: "Progress",
            value: `${
              project?.tasks
                ? Math.round(
                    (project.tasks.filter(
                      (t) =>
                        typeof t === "object" &&
                        "status" in t &&
                        t.status === "completed",
                    ).length /
                      project.tasks.length) *
                      100,
                  )
                : 0
            }%`,
            description: `${
              project?.tasks?.filter(
                (task) =>
                  typeof task === "object" &&
                  "status" in task &&
                  task.status === "completed",
              ).length || 0
            }/${project?.tasks?.length || 0} tasks completed`,
            icon: BarChart3,
            color: "text-sky-600",
            bgColor: "bg-sky-100",
          },
          {
            title: "Team Members",
            value: project?.resources?.length.toString(),
            description: "Active contributors",
            icon: Users,
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
          },
          {
            title: "Days Remaining",
            value: Math.max(
              0,
              Math.ceil(
                (new Date(project?.deadline).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            ).toString(),
            description: `Due ${new Date(
              project?.deadline,
            ).toLocaleDateString()}`,
            icon: Calendar,
            color: project?.tasks?.some(
              (task) =>
                typeof task === "object" &&
                "due_date" in task &&
                "status" in task &&
                task.status !== "completed" &&
                new Date(task.due_date as string) < new Date(),
            )
              ? "text-red-600"
              : "text-slate-600",
            bgColor: project?.tasks?.some(
              (task) =>
                typeof task === "object" &&
                "due_date" in task &&
                "status" in task &&
                task.status !== "completed" &&
                new Date(task.due_date as string) < new Date(),
            )
              ? "bg-red-100"
              : "bg-slate-100",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Project Overview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Description
                </h4>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{project?.description}</ReactMarkdown>
                </div>
              </div>

              {/* Technologies */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project?.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-slate-100 text-slate-700"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sprint Progress */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Sprint Progress
                </h4>
                <div className="space-y-3">
                  {project?.sprints?.map((sprint, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {sprint.name}
                          </span>
                          <span className="text-sm text-slate-500">
                            {sprint.progress}%
                          </span>
                        </div>
                        <Progress value={sprint.progress} className="h-2" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-3 ${
                          sprint.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : sprint.status === "in-progress"
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {sprint.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                  Quick Actions
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/college/projects/${project_id}/board`}>
                      <FolderKanban className="mr-2 h-3 w-3" />
                      Open Board
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/college/github?project=${project_id}`}>
                      <GitBranch className="mr-2 h-3 w-3" />
                      View Repository
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/college/analytics?project=${project_id}`}>
                      <BarChart3 className="mr-2 h-3 w-3" />
                      Analytics
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="space-y-6"
        >
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project?.resources?.map((member, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={member.avatar || "https://placehold.co/30/svg"}
                        alt={member?.username || "User avatar"}
                      />
                      <AvatarFallback>
                        {member?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {member?.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project?.timeline?.map((event, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {event.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {event.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
