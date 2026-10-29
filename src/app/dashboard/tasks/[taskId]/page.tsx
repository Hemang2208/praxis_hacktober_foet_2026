"use client";

import { useParams, useRouter } from "next/navigation";
import { useTaskById } from "@/hooks/useTaskById";
import useUserProfile from "@/hooks/useUserProfile";
import { getViewerCompanySubrole } from "@/lib/company-rbac";
import {
  ArrowLeft,
  Calendar,
  Flag,
  User,
  MessageSquare,
  CheckSquare,
  Code2,
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
import { TaskCodeReviewTab } from "@/components/tasks/task-code-review-tab";
import { formatDate } from "@/lib/formatDate";
import { useAppDispatch } from "@/redux/hooks";
import { updateTask, addTaskNote, fetchTaskById, fetchTasksByProject } from "@/redux/slice/task.slice";
import { fetchProjectBoard } from "@/redux/slice/project.slice";
import { DynamicBreadcrumbs } from "@/components/layout/DynamicBreadcrumbs";
import toast from "react-hot-toast";
import React, { useState, useMemo } from "react";

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
  const dispatch = useAppDispatch();
  const task_id = (params.taskId ?? params.task_id) as string;
  const { task, loading, isCached } = useTaskById(task_id);
  const { mongoUser } = useUserProfile();

  // Role determination
  const viewerRole = String((mongoUser as any)?.role ?? "").toLowerCase();
  const companySubrole = useMemo(
    () => getViewerCompanySubrole(mongoUser as any),
    [mongoUser],
  );
  const isAdminOrOwner =
    viewerRole === "college" ||
    (viewerRole === "company" &&
      (companySubrole === "owner" || companySubrole === "admin" || companySubrole === "manager"));

  // Extract linked PR info - check both linked_pr_id and linked_pull_request
  const linkedPrUrl =
    task?.linked_pull_request?.pull_request?.url || task?.linked_pr_id;
  const linkedPrTitle = task?.linked_pull_request?.pull_request?.title;
  const hasLinkedPr = linkedPrUrl || task?.linked_pull_request;

  const linkedBy = task?.assignee?.name || null;

  // Accept/Reject state
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard/tasks");
  };

  const handleAcceptPR = async () => {
    if (!task) return;
    setIsProcessing(true);
    try {
      await dispatch(
        updateTask({
          id: task.id,
          updates: { status: "completed" },
        }),
      ).unwrap();

      await dispatch(fetchTaskById(task.id));
      if (task.project_id) {
        void dispatch(fetchTasksByProject(task.project_id));
        void dispatch(fetchProjectBoard(task.project_id));
      }
      toast.success("Pull request accepted! Task moved to completed.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      toast.error(`Failed to accept PR. ${msg}`);
      console.error("Error accepting PR:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPR = async () => {
    if (!task) return;

    const reason = window.prompt(
      "Enter a rejection reason so the team member knows what to improve.",
    );

    if (!reason) return;

    setIsProcessing(true);
    try {
      await dispatch(
        updateTask({
          id: task.id,
          updates: { status: "in-progress", feedback_status: "pending" as any },
        }),
      ).unwrap();

      const trimmedReason = reason.trim();
      if (trimmedReason) {
        await dispatch(
          addTaskNote({
            task_id: task.id,
            content: `PR Review rejected: ${trimmedReason}`,
          }),
        ).unwrap();
      }

      await dispatch(fetchTaskById(task.id));
      if (task.project_id) {
        void dispatch(fetchTasksByProject(task.project_id));
        void dispatch(fetchProjectBoard(task.project_id));
      }
      toast.success("Pull request rejected. Task moved back to in-progress.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      toast.error(`Failed to reject PR. ${msg}`);
      console.error("Error rejecting PR:", error);
    } finally {
      setIsProcessing(false);
    }
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
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
              {task.title}
            </h1>
            {/* Show linked PR if exists with Approve/Reject buttons */}
            {hasLinkedPr && (
              <div className="mt-2 mb-4 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckSquare className="h-4 w-4 text-green-700 dark:text-green-400" />
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        Linked Pull Request
                      </span>
                    </div>
                    {linkedPrUrl ? (
                      <a
                        href={linkedPrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-indigo-700 dark:text-indigo-400 font-medium hover:underline mt-1"
                      >
                        {linkedPrTitle || linkedPrUrl}
                      </a>
                    ) : (
                      <div className="block text-slate-600 dark:text-slate-300 font-medium mt-1">
                        {linkedPrTitle || "Pull request linked"}
                      </div>
                    )}
                    {/* PR Metadata - Always show if we have linked PR */}
                    {hasLinkedPr && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {linkedBy && (
                          <span>
                            By {linkedBy}
                            {task?.linked_pull_request?.pull_request
                              ?.status && (
                              <>
                                {" "}
                                •{" "}
                                <span className="capitalize">
                                  {task.linked_pull_request.pull_request.status}
                                </span>
                              </>
                            )}
                            {task?.linked_pull_request?.submitted_at && (
                              <>
                                {" "}
                                •{" "}
                                {formatDate(
                                  task.linked_pull_request.submitted_at,
                                )}
                              </>
                            )}
                          </span>
                        )}
                        {!linkedBy && <span>PR linked</span>}
                      </div>
                    )}
                  </div>
                  {isAdminOrOwner && task.status === "submitted" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAcceptPR}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? "Processing..." : "Accept"}
                      </Button>
                      <Button
                        onClick={handleRejectPR}
                        disabled={isProcessing}
                        size="sm"
                        variant="destructive"
                      >
                        {isProcessing ? "Processing..." : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
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
                value="code_review"
                className="flex items-center gap-2 w-full justify-center px-3"
              >
                <Code2 className="h-4 w-4" />
                Code Review
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
              <TaskSubTasksTab
                task={task}
                userRole={viewerRole === "college" ? "college" : companySubrole}
              />
            </TabsContent>
            <TabsContent value="code_review" className="m-0">
              <TaskCodeReviewTab task={task} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
