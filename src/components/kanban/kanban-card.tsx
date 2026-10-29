"use client";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Flag,
  MoreHorizontal,
  GripVertical,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  updateTaskStatusInBoard,
  deleteTaskFromBoard,
} from "@/redux/slice/project.slice";
import {
  addTaskNote,
  fetchTasksByProject,
  updateTask,
  fetchTaskById,
} from "@/redux/slice/task.slice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task } from "../../lib/store";
import dynamic from "next/dynamic";

const TaskAssignmentDialog = dynamic(
  () =>
    import("@/components/tasks/TaskAssignmentDialog").then(
      (mod) => mod.TaskAssignmentDialog,
    ),
  { ssr: false },
);

const TaskUpdateDialog = dynamic(
  () =>
    import("@/components/tasks/TaskUpdateDialog").then(
      (mod) => mod.TaskUpdateDialog,
    ),
  { ssr: false },
);
import {
  AssignedMembersAvatars,
  parseAssignedMembers,
} from "@/components/tasks/AssignedMembersAvatars";
import { useAssignedUser } from "@/hooks/useAssignedUser";
import { canSubmitTaskForReview } from "@/lib/taskWorkflow";

interface KanbanCardProps {
  task: Task;
  project_id: string;
  isStudent?: boolean;
  basePath?: string; // e.g., 'student', 'dashboard', 'college'
  canManageTaskActions?: boolean;
  canUpdateTaskStatus?: boolean;
  canDragTask?: boolean;
  traineeReviewOnly?: boolean;
  isAdminOrOwner?: boolean;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "border-red-200 text-red-700 bg-red-50";
    case "medium":
      return "border-yellow-200 text-yellow-700 bg-yellow-50";
    case "low":
      return "border-green-200 text-green-700 bg-green-50";
    default:
      return "border-zinc-200 text-zinc-700 bg-zinc-50";
  }
};

const formatShortDueDate = (value?: string | Date): string => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Example: "10 Mar"
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const SegmentedSubtaskProgress = ({
  total,
  completed,
  animateFill,
}: {
  total: number;
  completed: number;
  animateFill?: boolean;
}) => {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal));

  const segments = safeTotal;
  const filled = animateFill ? safeCompleted : 0;

  // Make the fill clearly step-by-step (segment 1, then 2, then 3...).
  const perSegmentDelaySec = 0.18;
  const fillDurationSec = 0.22;

  if (segments === 0) return null;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Subtasks completed: ${safeCompleted} of ${safeTotal}`}
      title={`Subtasks: ${safeCompleted}/${safeTotal}`}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const shouldFill = i < filled;
        return (
          <div
            key={i}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <motion.div
              className="h-full w-full origin-left bg-primary"
              initial={false}
              animate={{ scaleX: shouldFill ? 1 : 0 }}
              transition={
                shouldFill
                  ? {
                      duration: fillDurationSec,
                      ease: "easeOut",
                      delay: i * perSegmentDelaySec,
                    }
                  : { duration: 0.12, ease: "easeOut", delay: 0 }
              }
            />
          </div>
        );
      })}
    </div>
  );
};

export function KanbanCard({
  task,
  project_id,
  isStudent = false,
  basePath,
  canManageTaskActions,
  canUpdateTaskStatus,
  canDragTask = true,
  traineeReviewOnly = false,
  isAdminOrOwner = false,
}: KanbanCardProps) {
  const isOptimistic = typeof task.id === "string" && task.id.startsWith("temp-");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canDragTask || isOptimistic,
  });

  const clampedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(clampedTransform),
    transition,
  };

  // Determine the base path for routing
  const resolvedBasePath = basePath || (isStudent ? "student" : "dashboard");
  const detailsPath = `/${resolvedBasePath}/projects/${project_id}/board/tasks/${task.id}`;

  const dispatch = useAppDispatch();
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  // Clean up hover timer on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  }, [hoverTimer]);
  const allowTaskActions = canManageTaskActions ?? !isStudent;
  const allowStatusUpdates = canUpdateTaskStatus === true;
  const showStatusControls = allowStatusUpdates || traineeReviewOnly;

  // Get current project to access members
  const currentProject = useAppSelector((state) =>
    state.project.projects.find((p) => p._id === project_id),
  );

  // Check if this task already has its detailed content loaded in the Redux store cache
  const isTaskCached = useAppSelector((state) => {
    if (state.task.currentTask?._id === task.id) return true;
    const t = state.task.tasks.find((tt) => tt._id === task.id);
    if (!t) return false;
    // Check if comments, notes, or ai_feedback has been populated in memory
    return Boolean(
      t.comments !== undefined ||
        t.notes !== undefined ||
        t.ai_feedback !== undefined,
    );
  });

  // Get assigned user details from project members
  const assignedMembers = useMemo(() => {
    if (!currentProject) return [];

    // Get the assigned_to string (comma-separated user IDs)
    let assignedString = "";
    if (task.assigned_to) {
      assignedString = task.assigned_to;
    } else if (task.assignee) {
      // Fallback to assignee for backward compatibility
      if (typeof task.assignee === "string") {
        assignedString = task.assignee;
      } else if (task.assignee?.id) {
        assignedString = task.assignee.id;
      }
    }

    // If the task has an `assignee` object (enriched by assignment), prefer that
    if (task.assignee && typeof task.assignee === "object") {
      const a = task.assignee as {
        id?: string;
        name?: string;
        email?: string;
        avatar?: string;
      } | null;
      if (a && a.id) {
        return [
          {
            id: a.id,
            name: a.name || "Assignee",
            email: a.email || "",
            avatar: a.avatar || undefined,
          },
        ];
      }
    }

    // Parse the assigned members from the string using project members as lookup
    const projectMembers = [
      ...(currentProject.team_members || []),
      ...(currentProject.resources || []),
    ];

    return parseAssignedMembers(assignedString, projectMembers);
  }, [task.assigned_to, task.assignee, currentProject]);

  // Try to fetch assigned user from agent endpoint. If returned, use it as primary display.
  const { user: apiAssignedUser } = useAssignedUser(task.id);

  const safeName = (name: unknown): string => {
    if (typeof name === "string") return name;
    return "";
  };

  const displayMembers = apiAssignedUser
    ? [
        {
          id:
            safeName(apiAssignedUser.id) ||
            safeName(task.assigned_to) ||
            (typeof task.assignee === "string"
              ? task.assignee
              : safeName(task.assignee?.id)),
          name:
            safeName(apiAssignedUser.name) ||
            safeName(task.assignee?.name) ||
            safeName(apiAssignedUser.id) ||
            safeName(task.assigned_to) ||
            (typeof task.assignee === "string" ? task.assignee : safeName(task.assignee?.id)),
          email: safeName(apiAssignedUser.email),
          avatar:
            safeName(apiAssignedUser.avatar) ||
            safeName(apiAssignedUser.image_url) ||
            safeName(apiAssignedUser.profile_picture),
          image_url: safeName(apiAssignedUser.image_url),
          profile_picture: safeName(apiAssignedUser.profile_picture),
        },
      ]
    : assignedMembers;

  const isBlocked = task.status === "blocked";

  const comments_count =
    typeof task.comments_count === "number" ? task.comments_count : 0;
  const attachments_count =
    typeof task.attachments_count === "number" ? task.attachments_count : 0;

  const safeSubTasks = Array.isArray(task.sub_tasks)
    ? task.sub_tasks
    : Array.isArray((task as any).sub_tasks)
      ? (task as any).sub_tasks
      : [];
  const subtaskTotal = safeSubTasks.length;
  const subtaskCompleted = safeSubTasks.filter(
    (st: any) => st.completed,
  ).length;
  const canSubmitForReview = canSubmitTaskForReview(task);
  const hasPrLinked = Boolean((task as any).linked_pr_id);

  const getSubmitReviewDisabledReason = (): string | null => {
    if (task.status === "submitted" || task.status === "completed") {
      return null;
    }
    if (subtaskCompleted < subtaskTotal) {
      return "All subtasks must be completed";
    }
    if (!isAdminOrOwner && !hasPrLinked) {
      return "PR link is required";
    }
    return null;
  };

  const handleSendToStatus = (
    newStatus: "todo" | "in-progress" | "submitted" | "completed" | "blocked",
  ) => {
    dispatch(
      updateTaskStatusInBoard({
        project_id: task.project_id,
        task_id: task.id,
        newStatus,
      }),
    )
      .unwrap()
      .then(() =>
        dispatch(
          updateTask({
            id: task.id,
            updates: { status: newStatus },
          }),
        ).unwrap(),
      )
      .then(() => {
        toast.success(
          newStatus === "completed"
            ? "Task approved and completed!"
            : `Task moved to ${newStatus.replace("-", " ")}`,
        );
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to update task status",
        );
      });
  };

  const handleRejectReview = async () => {
    const reason = window.prompt(
      "Enter a rejection reason so the trainee knows what to improve.",
    );

    dispatch(
      updateTaskStatusInBoard({
        project_id: task.project_id,
        task_id: task.id,
        newStatus: "in-progress",
      }),
    )
      .unwrap()
      .then(() =>
        dispatch(
          updateTask({
            id: task.id,
            updates: { status: "in-progress", feedback_status: "pending" as any },
          }),
        ).unwrap(),
      )
      .then(() => {
        const trimmedReason = reason?.trim();
        if (trimmedReason) {
          dispatch(
            addTaskNote({
              task_id: task.id,
              content: `Review rejected: ${trimmedReason}`,
            }),
          );
        }
        toast.success("Task rejected and moved back to In Progress");
      })
      .catch((err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to update task status",
        );
      });
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-50" : ""}`}
    >
      <Card
        className={`group relative hover:shadow-md transition-shadow duration-200 cursor-pointer ${isOptimistic ? "opacity-60 cursor-not-allowed select-none" : ""}`}
        onMouseEnter={() => {
          if (!isOptimistic) {
            setHovered(true);
            if (!isTaskCached) {
              const timer = setTimeout(() => {
                if (task.id) {
                  dispatch(fetchTaskById(task.id));
                }
              }, 80);
              setHoverTimer(timer);
            }
          }
        }}
        onMouseLeave={() => {
          if (!isOptimistic) {
            setHovered(false);
            if (hoverTimer) {
              clearTimeout(hoverTimer);
              setHoverTimer(null);
            }
          }
        }}
      >
        <CardContent className="px-2 py-1.5 space-y-1">
          <div className="flex items-start justify-between gap-1.5 mb-0.5">
            <div className="flex-1 min-w-0">
              {isOptimistic ? (
                <div className="block cursor-not-allowed">
                  <h4 className="font-medium text-zinc-500 dark:text-zinc-500 text-[14px] leading-snug truncate">
                    {task.title}
                  </h4>
                </div>
              ) : (
                <Link href={detailsPath} className="block">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-[14px] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {task.title}
                  </h4>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1">
              {canDragTask && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <GripVertical className="h-3 w-3 text-zinc-400" />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isOptimistic}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={detailsPath}>View Details</Link>
                  </DropdownMenuItem>
                  {showStatusControls && (
                    <>
                      {task.status === "submitted" &&
                      !isStudent &&
                      allowStatusUpdates ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleSendToStatus("completed")}
                          >
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleRejectReview}>
                            Reject
                          </DropdownMenuItem>
                        </>
                      ) : null}

                      {!isStudent && allowStatusUpdates ? (
                        <>
                          {[
                            { status: "todo", label: "Send to Todo" },
                            {
                              status: "in-progress",
                              label: "Send to In Progress",
                            },
                            { status: "submitted", label: "Send to Submitted" },
                            { status: "completed", label: "Send to Completed" },
                            { status: "blocked", label: "Send to Blocked" },
                          ].map((option) => {
                            if (option.status === task.status) return null;
                            return (
                              <DropdownMenuItem
                                key={option.status}
                                disabled={
                                  option.status === "submitted" &&
                                  task.status === "completed"
                                }
                                onClick={() =>
                                  handleSendToStatus(
                                    option.status as
                                      | "todo"
                                      | "in-progress"
                                      | "submitted"
                                      | "completed"
                                      | "blocked",
                                  )
                                }
                              >
                                {option.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </>
                      ) : null}

                      {traineeReviewOnly ? (
                        <DropdownMenuItem
                          disabled={
                            (isAdminOrOwner ? false : !canSubmitForReview) ||
                            task.status === "submitted" ||
                            task.status === "completed"
                          }
                          onClick={() => {
                            const reason = getSubmitReviewDisabledReason();
                            if (reason) {
                              toast.error(reason);
                              return;
                            }
                            handleSendToStatus("submitted");
                          }}
                          title={
                            getSubmitReviewDisabledReason() ||
                            "Submit for review"
                          }
                        >
                          Submit for Review
                        </DropdownMenuItem>
                      ) : null}
                    </>
                  )}
                  {allowTaskActions && !isStudent && (
                    <DropdownMenuItem
                      onClick={() => setAssignmentDialogOpen(true)}
                    >
                      Assign Task
                    </DropdownMenuItem>
                  )}
                  {allowTaskActions && !isStudent && (
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      Edit Task
                    </DropdownMenuItem>
                  )}
                  {allowTaskActions && !isStudent && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={async () => {
                        const ok = window.confirm(
                          "Delete this task? This will remove it from the project and the database.",
                        );
                        if (!ok) return;

                        const loading = toast.loading("Deleting task...");
                        try {
                          await dispatch(
                            deleteTaskFromBoard({
                              project_id,
                              task_id: task.id,
                            }),
                          ).unwrap();
                          toast.success("Task deleted", { id: loading });
                        } catch (err) {
                          console.error("Failed to delete task", err);
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Failed to delete task",
                            { id: loading },
                          );
                        }
                      }}
                    >
                      Delete Task
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-tight">
            {task.description}
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{comments_count}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{attachments_count}</span>
            </div>
          </div>

          {/* Subtask progress bar (segmented: 1 segment per subtask) */}
          <div className="mt-1 h-5">
            {subtaskTotal > 0 ? (
              <>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>Progress</span>
                  <span>
                    {subtaskCompleted}/{subtaskTotal}
                  </span>
                </div>
                <div
                  className="relative overflow-hidden"
                  aria-label={`Subtasks completed: ${subtaskCompleted} of ${subtaskTotal}`}
                  title={`Subtasks: ${subtaskCompleted}/${subtaskTotal}`}
                >
                  <SegmentedSubtaskProgress
                    total={subtaskTotal}
                    completed={subtaskCompleted}
                    animateFill={true}
                  />
                </div>
              </>
            ) : (
              <div className="h-full" aria-hidden="true" />
            )}
          </div>

          <div className="pt-1 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
            <AssignedMembersAvatars
              assignedMembers={displayMembers}
              size="sm"
              maxVisible={3}
            />

            <div className="flex items-center gap-1">
              {isOptimistic && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50 animate-pulse font-medium"
                >
                  Saving...
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[11px] px-1.5 py-0 ${getPriorityColor(
                  task.priority,
                )}`}
              >
                <Flag className="mr-1 h-2.5 w-2.5" />
                {task.priority}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" />
                {formatShortDueDate(task.due_date || (task as any).due_date)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Assignment Dialog */}
      {assignmentDialogOpen && (
        <TaskAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          task_id={task.id}
          taskTitle={task.title}
          project_id={project_id}
          currentAssignee={
            // Only use local task data if API hasn't loaded yet, or if API confirms there's an assigned user
            apiAssignedUser?.id ||
            (apiAssignedUser === null
              ? undefined
              : task.assigned_to ||
                (typeof task.assignee === "string"
                  ? task.assignee
                  : task.assignee?.id))
          }
        />
      )}

      {/* Task Update Dialog */}
      {editDialogOpen && (
        <TaskUpdateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          task={task}
        />
      )}
    </motion.div>
  );
}
