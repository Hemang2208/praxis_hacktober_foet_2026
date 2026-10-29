"use client";

import { useParams, useRouter } from "next/navigation";
import { useCachedTask } from "@/hooks/useCachedResources";
import {
  ArrowLeft,
  Calendar,
  Flag,
  User,
  MessageSquare,
  CheckSquare,
  Github,
  GitPullRequest,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AssignedUser } from "@/components/tasks/AssignedUser";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDetailsTab } from "@/components/tasks/task-details-tab";
import { TaskNotesTab } from "@/components/tasks/task-notes-tab";
import { TaskSubTasksTab } from "@/components/tasks/task-sub_tasks-tab";
import { TaskPRTab } from "@/components/tasks/task-pr-tab";
import { formatDate } from "@/lib/formatDate";
import React from "react";
import useUserProfile from "@/hooks/useUserProfile";
import { getViewerCompanySubrole } from "@/lib/company-rbac";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 text-red-700 bg-red-50";
    case "medium":
      return "border-yellow-200 text-yellow-700 bg-yellow-50";
    case "low":
      return "border-green-200 text-green-700 bg-green-50";
    default:
      return "border-slate-200 text-slate-700 bg-slate-50";
  }
};

// Skeleton Loading Component
function TaskDetailSkeleton() {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex flex-col">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-6 md:px-8">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-10 w-2/3" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 px-6 py-8 md:px-8 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const task_id = params.task_id as string;
  const { task, loading, isCached } = useCachedTask(task_id);
  const { mongoUser } = useUserProfile();
  const viewerRole = String((mongoUser as any)?.role ?? "").toLowerCase();
  const viewerCompanySubrole = React.useMemo(
    () => getViewerCompanySubrole(mongoUser as any),
    [mongoUser],
  );
  const taskUserRole =
    viewerRole === "college" ? "college" : viewerCompanySubrole;
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/college/tasks");
  };

  // Show skeleton while loading, unless we have cached data
  if (loading && !isCached) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Task not found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The task you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5rem)] overflow-y-auto bg-white dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-6 md:px-8">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <Button
              variant="ghost"
              className="-ml-2 mb-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
              {task.title}
            </h1>
            {/* Show linked PR if exists */}
            {task.linked_pull_request && (
              <div className="mt-2 mb-4 p-2 border rounded bg-slate-50">
                <span className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Linked Pull Request
                </span>
                <a
                  href={task.linked_pull_request.pull_request.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-indigo-700 font-medium hover:underline mt-1"
                >
                  {/* Show PR title if available, else fallback to URL */}
                  {task.linked_pull_request.pull_request.title
                    ? task.linked_pull_request.pull_request.title
                    : task.linked_pull_request.pull_request.url}
                </a>
                <div className="text-xs text-slate-500 mt-1">
                  {task.linked_pull_request.status} •{" "}
                  {task.linked_pull_request.submitted_at
                    ? new Date(
                        task.linked_pull_request.submitted_at,
                      ).toLocaleDateString()
                    : ""}
                </div>
                {/* Show PR author */}
                {task.linked_pull_request.user_id != null && (
                  <div className="text-xs text-slate-700 mt-1">
                    Linked by:{" "}
                    {typeof task.linked_pull_request.user_id === "object" &&
                    task.linked_pull_request.user_id &&
                    (task.linked_pull_request.user_id as { full_name?: string })
                      .full_name
                      ? (
                          task.linked_pull_request.user_id as {
                            full_name?: string;
                          }
                        ).full_name
                      : typeof task.linked_pull_request.user_id === "string"
                        ? task.linked_pull_request.user_id
                        : "Unknown"}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getPriorityColor(task.priority)}
              >
                <Flag className="mr-1 h-3 w-3" />
                {task.priority}
              </Badge>
              {task.due_date && (
                <div className="flex items-center text-sm text-slate-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  Due {formatDate(task.due_date)}
                </div>
              )}
              {(task.assigned_to || task.assignee) && (
                <AssignedUser task_id={task_id} fallback={task.assignee} size="sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1">
        <Tabs defaultValue="details" className="flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-700 px-6">
            <TabsList className="w-full grid grid-flow-col auto-cols-fr gap-2">
              <TabsTrigger
                value="details"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <MessageSquare className="h-4 w-4" />
                Notes ({task.notes?.filter((n) => !n.is_deleted).length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="sub_tasks"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <CheckSquare className="h-4 w-4" />
                Sub-Tasks (
                {task.sub_tasks?.filter((st) => !st.is_deleted).length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="pull_requests"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <GitPullRequest className="h-4 w-4" />
                PR
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1">
            <TabsContent value="details" className="m-0">
              <TaskDetailsTab task={task} />
            </TabsContent>
            <TabsContent value="notes" className="m-0">
              <TaskNotesTab task={task} />
            </TabsContent>
            <TabsContent value="sub_tasks" className="m-0">
              <TaskSubTasksTab task={task} userRole={taskUserRole} />
            </TabsContent>
            <TabsContent value="pull_requests" className="m-0">
              <TaskPRTab task_id={task_id} project_id={task.project_id || ""} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
