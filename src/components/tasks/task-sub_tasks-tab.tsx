"use client";

import * as React from "react";
import { Plus, Edit, Trash2, Check, CheckSquare, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type Task } from "@/lib/store";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import toast from "react-hot-toast";
import { useAppDispatch, useUser } from "@/redux/hooks";
import useUserProfile from "@/hooks/useUserProfile";
import {
  notifyTaskProgress,
  addSubtask,
  removeSubtask,
  updateSubtask,
  clearTaskLocalMutation,
  fetchTaskById,
} from "@/redux/slice/task.slice";
import { updateTaskInBoardState } from "@/redux/slice/project.slice";
import { markDetailItemFetched } from "@/redux/slice/cache.slice";

interface TaskSubTasksTabProps {
  task: Task;
  showGenerateBreakdown?: boolean;
  userRole?: "owner" | "admin" | "manager" | "trainee" | "college" | null;
}

export function TaskSubTasksTab({
  task,
  showGenerateBreakdown = true,
  userRole = null,
}: TaskSubTasksTabProps) {
  const dispatch = useAppDispatch();

  // Check if PR is linked and if user can edit
  const isPRLinked = !!(task?.linked_pr_id || task?.linked_pull_request);
  const normalizedUserRole = String(userRole ?? "")
    .trim()
    .toLowerCase();
  const hasSubtaskPermissions =
    normalizedUserRole === "owner" ||
    normalizedUserRole === "admin" ||
    normalizedUserRole === "manager" ||
    normalizedUserRole === "college";
  const canEditSubtasks = !isPRLinked && hasSubtaskPermissions;

  const { user: reduxUser } = useUser();
  const { mongoUser } = useUserProfile();
  const user = reduxUser ?? mongoUser;
  const userId = user?._id
    ? String(user._id)
    : (user as any)?.id
      ? String((user as any).id)
      : null;
  const isAssignee =
    !!userId &&
    (String(task?.assigned_to || "")
      .trim()
      .toLowerCase() === userId.trim().toLowerCase() ||
      String(task?.assignee?.id || "")
        .trim()
        .toLowerCase() === userId.trim().toLowerCase());

  const isTrainee =
    normalizedUserRole === "trainee" ||
    normalizedUserRole === "student" ||
    isAssignee ||
    user?.role === "student" ||
    (user as any)?.role === "trainee";

  // Trainees can toggle completion checkboxes on their assigned tasks
  // but cannot add/edit/delete subtasks
  const canToggleSubtasks = canEditSubtasks || (!isPRLinked && isTrainee);

  const getSubTasks = React.useCallback((t: any) => {
    const raw = Array.isArray(t?.sub_tasks) ? t.sub_tasks : [];
    return raw.map((st: any) => {
      const sId = String(st?.id || st?._id || "");
      return {
        ...st,
        id: sId,
        _id: sId,
      };
    });
  }, []);
  // Keep a local copy of task so edits in the modal update the UI immediately
  const [localTask, setLocalTask] = React.useState<Task>({
    ...task,
    sub_tasks: getSubTasks(task),
  } as Task);
  const manualUpdateRef = React.useRef(0);
  React.useEffect(() => {
    if (Date.now() - manualUpdateRef.current < 2000) return;
    setLocalTask({ ...task, sub_tasks: getSubTasks(task) } as Task);
  }, [task, getSubTasks]);
  const [newSubTaskTitle, setNewSubTaskTitle] = React.useState("");
  const [generatingBreakdown, setGeneratingBreakdown] = React.useState(false);
  const [generateSubtaskCount, setGenerateSubtaskCount] = React.useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(sessionStorage.getItem(`gen_subtask_count_${task.id}`) || 0);
  });
  const [editingSubtask_id, setEditingSubtask_id] = React.useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [editingDescription, setEditingDescription] = React.useState("");

  const task_idForApi = String((task as any)?._id || task.id || "");

  const formatCreatedAt = (value: unknown): string => {
    if (!value) return "Created At : Unknown";
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "Created At : Unknown";

    const day = date.getDate();
    const dayMod = day % 100;
    const suffix =
      dayMod >= 11 && dayMod <= 13
        ? "th"
        : day % 10 === 1
          ? "st"
          : day % 10 === 2
            ? "nd"
            : day % 10 === 3
              ? "rd"
              : "th";

    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(date);
    const month = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(date);
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const time = `${hours}:${minutes}`;

    return `Created At : ${weekday} , ${day}${suffix} ${month} , ${year} on ${time}`;
  };

  const formatEstimatedHours = (
    subTask: Task["sub_tasks"][0],
  ): string | null => {
    const raw = (subTask as unknown as Record<string, unknown>).estimated_hours;
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    const display = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return `${display} Hours`;
  };

  const isSubTaskDeleted = (subTask: Task["sub_tasks"][0]) =>
    Boolean(
      (subTask as unknown as Record<string, unknown>).is_deleted ??
      (subTask as unknown as Record<string, unknown>).isDeleted ??
      (subTask as unknown as Record<string, unknown>).deleted ??
      false,
    );

  const visibleSubTasks = React.useMemo(
    () => (localTask?.sub_tasks ?? []).filter((st) => !isSubTaskDeleted(st)),
    [localTask],
  );

  const toIsoDateString = (value: unknown): string => {
    const date = value instanceof Date ? value : new Date(String(value ?? ""));
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  };

  const syncBoardCache = React.useCallback(
    (subTasks: Task["sub_tasks"] = localTask?.sub_tasks || []) => {
      if (!task.project_id) return;

      const visibleBoardSubTasks = (subTasks || [])
        .filter((st) => !isSubTaskDeleted(st))
        .map((st) => ({
          title: String((st as any)?.title ?? "Subtask"),
          completed: Boolean((st as any)?.completed ?? false),
          description:
            typeof (st as any)?.description === "string"
              ? (st as any).description
              : undefined,
        }));

      const taskRecord = task as unknown as Record<string, unknown>;
      const tags = Array.isArray(taskRecord.tags)
        ? taskRecord.tags
            .filter((tag) => typeof tag === "string" && tag.trim())
            .map((tag) => String(tag).trim())
        : [];
      const commentsCountRaw = taskRecord.comments_count;
      const attachmentsCountRaw = taskRecord.attachments_count;
      const timeTrackingRaw = taskRecord.time_tracking;
      const normalizedTimeTracking = (() => {
        const record =
          timeTrackingRaw && typeof timeTrackingRaw === "object"
            ? (timeTrackingRaw as Record<string, unknown>)
            : null;

        const toNumber = (value: unknown): number => {
          const num = typeof value === "number" ? value : Number(value);
          return Number.isFinite(num) ? num : 0;
        };

        return {
          estimated: toNumber(record?.estimated),
          logged: toNumber(record?.logged),
          remaining: toNumber(record?.remaining),
        };
      })();

      dispatch(
        updateTaskInBoardState({
          id: task_idForApi,
          title: String(task.title ?? ""),
          description: String(task.description ?? ""),
          status: String(task.status ?? "todo"),
          priority: String(task.priority ?? "medium"),
          assigned_to:
            typeof taskRecord.assigned_to === "string"
              ? String(taskRecord.assigned_to)
              : undefined,
          due_date:
            task.due_date instanceof Date
              ? task.due_date.toISOString()
              : typeof task.due_date === "string"
                ? task.due_date
                : undefined,
          tags,
          comments_count:
            typeof commentsCountRaw === "number"
              ? commentsCountRaw
              : Array.isArray(taskRecord.notes)
                ? taskRecord.notes.filter((note: any) => !note?.is_deleted)
                    .length
                : 0,
          attachments_count:
            typeof attachmentsCountRaw === "number"
              ? attachmentsCountRaw
              : Array.isArray(taskRecord.attachments)
                ? taskRecord.attachments.length
                : 0,
          linked_pr_id:
            typeof taskRecord.linked_pr_id === "string"
              ? String(taskRecord.linked_pr_id)
              : null,
          sub_tasks: visibleBoardSubTasks,
          time_tracking: normalizedTimeTracking,
          created_at: toIsoDateString(task.created_at),
          updated_at: new Date().toISOString(),
          project_id: String(task.project_id ?? ""),
        }),
      );

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });
    },
    [dispatch, localTask?.sub_tasks, task, task_idForApi],
  );

  const markTaskCacheFresh = React.useCallback(() => {
    if (!task_idForApi) return;
    dispatch(clearTaskLocalMutation(task_idForApi));
    dispatch(markDetailItemFetched({ resource: "tasks", id: task_idForApi }));
  }, [dispatch, task_idForApi]);

  const persistSubTasks = React.useCallback(
    async (sub_tasks: Task["sub_tasks"]) => {
      if (!task_idForApi) return;

      const payloadSubTasks = (sub_tasks || []).map((st) => {
        const rec = st as unknown as Record<string, unknown>;
        const completed = Boolean(
          (rec.completed as boolean | undefined) ?? false,
        );
        const rawEstimated = rec.estimated_hours;
        const estimatedNum =
          typeof rawEstimated === "number"
            ? rawEstimated
            : Number(rawEstimated);
        const estimated_hours =
          Number.isFinite(estimatedNum) && estimatedNum > 0 ? estimatedNum : 1;
        return {
          id: String(rec.id ?? ""),
          title: String(rec.title ?? "Subtask"),
          description:
            typeof rec.description === "string" ? rec.description : "",
          estimated_hours,
          status: completed ? "completed" : "pending",
          completed,
          is_deleted: Boolean(
            rec.is_deleted ?? rec.isDeleted ?? rec.deleted ?? false,
          ),
          created_at:
            typeof rec.created_at === "string"
              ? rec.created_at
              : new Date().toISOString(),
        };
      });

      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_idForApi)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub_tasks: payloadSubTasks }),
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          txt
            ? `Failed to persist sub_tasks: ${txt}`
            : "Failed to persist sub_tasks",
        );
      }

      markTaskCacheFresh();
    },
    [task_idForApi, markTaskCacheFresh],
  );

  const handleGenerateBreakdown = React.useCallback(async () => {
    if (!task_idForApi) return;
    setGeneratingBreakdown(true);
    const loadingToast = toast.loading("Generating sub-tasks...");
    try {
      const token = await fastAPIAuthService.getAccessToken();
      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_idForApi)}/breakdown`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
        { maxPollAttempts: 45, pollIntervalMs: 2000 },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data?.detail || data?.message || "Failed to generate sub-tasks";
        throw new Error(msg);
      }

      // If polling timed out and we got queue metadata back, generation is still running
      if (isQueueResponse(data)) {
        toast.success("Sub-task generation is in progress. Please wait a moment and refresh.", { id: loadingToast });
        return;
      }

      const updatedTask =
        data?.task && typeof data.task === "object" ? data.task : null;
      const updatedSubTasks = getSubTasks(updatedTask);
      if (updatedTask) {
        setLocalTask({
          ...(updatedTask as Task),
          sub_tasks: updatedSubTasks,
        } as Task);
        syncBoardCache(updatedSubTasks);
        // Save generated subtasks to backend first, then sync Redux
        await persistSubTasks(updatedSubTasks);
        manualUpdateRef.current = Date.now();
        await dispatch(fetchTaskById(task_idForApi)).catch(() => {});
      }

      const addedCount =
        typeof data?.added_count === "number"
          ? data.added_count
          : updatedSubTasks.length;
      toast.success(
        addedCount > 0
          ? `Generated ${addedCount} sub-tasks`
          : "Sub-tasks are already up to date",
        { id: loadingToast },
      );

      if (addedCount > 0) {
        const newCount = generateSubtaskCount + 1;
        setGenerateSubtaskCount(newCount);
        try { sessionStorage.setItem(`gen_subtask_count_${task_idForApi}`, String(newCount)); } catch {}
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to generate sub-tasks";
      toast.error(msg, { id: loadingToast });
    } finally {
      setGeneratingBreakdown(false);
    }
  }, [
    task_idForApi,
    getSubTasks,
    syncBoardCache,
    persistSubTasks,
    dispatch,
    generateSubtaskCount,
  ]);

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefreshSubTasks = React.useCallback(async () => {
    if (!task_idForApi) return;
    setRefreshing(true);
    const loadingToast = toast.loading("Refreshing sub-tasks...");
    try {
      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_idForApi)}?t=${Date.now()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch fresh task details");
      }
      const data = await res.json();
      const updatedSubTasks = getSubTasks(data);

      setLocalTask({
        ...(data as Task),
        sub_tasks: updatedSubTasks,
      } as Task);

      syncBoardCache(updatedSubTasks);

      // Clear task local mutations so Redux is forced fresh too
      dispatch(clearTaskLocalMutation(task_idForApi));
      dispatch(markDetailItemFetched({ resource: "tasks", id: task_idForApi }));

      await dispatch(fetchTaskById(task_idForApi)).unwrap().catch(() => {});

      toast.success("Sub-tasks refreshed", { id: loadingToast });
    } catch (e) {
      console.error("Error refreshing subtasks:", e);
      toast.error(e instanceof Error ? e.message : "Failed to refresh sub-tasks", {
        id: loadingToast,
      });
    } finally {
      setRefreshing(false);
    }
  }, [task_idForApi, getSubTasks, syncBoardCache, dispatch]);

  const createSubTask = React.useCallback(
    async (subTask: Task["sub_tasks"][0]) => {
      if (!task_idForApi) return;

      const rawEstimated = (subTask as unknown as Record<string, unknown>)
        .estimated_hours;
      const estimatedNum =
        typeof rawEstimated === "number" ? rawEstimated : Number(rawEstimated);
      const estimated_hours =
        Number.isFinite(estimatedNum) && estimatedNum > 0 ? estimatedNum : 1;

      const payload = {
        id: String((subTask as any).id ?? ""),
        title: String((subTask as any).title ?? "Subtask"),
        description:
          typeof (subTask as any).description === "string"
            ? (subTask as any).description
            : "",
        estimated_hours,
        completed: Boolean((subTask as any).completed ?? false),
        status: Boolean((subTask as any).completed ?? false)
          ? "completed"
          : "pending",
        created_at:
          typeof (subTask as any).created_at === "string"
            ? (subTask as any).created_at
            : new Date().toISOString(),
      };

      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_idForApi)}/sub_tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          txt ? `Failed to create subtask: ${txt}` : "Failed to create subtask",
        );
      }
    },
    [task_idForApi],
  );

  const syncTaskState = React.useCallback(
    async (subTasks: Task["sub_tasks"] = localTask?.sub_tasks || []) => {
      if (!task_idForApi) return;

      const progressStatus: "completed" | "todo" | "in-progress" | "blocked" =
        task.status === "completed" ||
        task.status === "todo" ||
        task.status === "in-progress" ||
        task.status === "blocked"
          ? task.status
          : "todo";

      try {
        await dispatch(
          notifyTaskProgress({ id: task_idForApi, status: progressStatus }),
        ).unwrap();
      } catch (error) {
        console.warn(
          "Failed to sync task progress after sub-task update",
          error,
        );
      }

      syncBoardCache(subTasks);
    },
    [
      dispatch,
      localTask?.sub_tasks,
      syncBoardCache,
      task.status,
      task_idForApi,
    ],
  );

  const buildClientSubtask_id = () => {
    const anyCrypto = globalThis.crypto as unknown as
      | { randomUUID?: () => string }
      | undefined;
    if (anyCrypto?.randomUUID) return `client-${anyCrypto.randomUUID()}`;
    return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const handleAddSubTask = async () => {
    manualUpdateRef.current = Date.now();
    if (!newSubTaskTitle.trim()) return;

    // Prevent adding subtasks if PR is linked or user is trainee
    if (!canEditSubtasks) {
      toast.error(
        isPRLinked
          ? "Cannot add subtasks after a PR has been linked"
          : "You don't have permission to add subtasks",
      );
      return;
    }

    const title = newSubTaskTitle.trim();
    setNewSubTaskTitle("");

    const subTaskId = buildClientSubtask_id();
    const newSubTask = {
      id: subTaskId,
      _id: subTaskId,
      title,
      description: "",
      completed: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
    } as Task["sub_tasks"][0];

    const base = (localTask || task) as Task;
    const next = [...((base.sub_tasks || []) as Task["sub_tasks"]), newSubTask];
    setLocalTask({ ...base, sub_tasks: next } as Task);

    const loadingToast = toast.loading("Adding subtask...");
    try {
      dispatch(
        addSubtask({
          task_id: task.id,
          sub_task: newSubTask as Omit<Task["sub_tasks"][0], "_id">,
        }),
      );
      syncBoardCache(next);
      await createSubTask(newSubTask);
      markTaskCacheFresh();
      toast.success("Subtask added", { id: loadingToast });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to add subtask", {
        id: loadingToast,
      });
      try {
        await persistSubTasks(next);
      } catch (e2) {
        console.error(e2);
      }
    }
  };

  const handleToggleSubTask = async (
    subtask_id: string,
    completed: boolean,
  ) => {
    // Prevent changes if PR is linked or the user lacks toggle permissions
    if (!canToggleSubtasks) {
      toast.error(
        isPRLinked
          ? "Cannot modify subtasks after a PR has been linked"
          : "You don't have permission to modify subtasks",
      );
      return;
    }

    // Optimistic update
    const next = (localTask?.sub_tasks || []).map((st) =>
      st.id === subtask_id ? { ...st, completed } : st,
    ) as Task["sub_tasks"];
    setLocalTask((t) => {
      if (!t) return t;
      return {
        ...t,
        sub_tasks: next,
      } as Task;
    });
    try {
      dispatch(
        updateSubtask({
          task_id: task.id,
          subtask_id,
          updates: { completed },
        }),
      );
      syncBoardCache(next);
      await persistSubTasks(next);
      await syncTaskState(next);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update subtask");
    }
  };

  const handleEditSubTask = (
    subtask_id: string,
    title: string,
    description?: string,
  ) => {
    setEditingSubtask_id(subtask_id);
    setEditingTitle(title);
    setEditingDescription(description || "");
  };

  const handleSaveEdit = async () => {
    manualUpdateRef.current = Date.now();
    if (!editingSubtask_id || !editingTitle.trim()) return;
    const next = (localTask?.sub_tasks || []).map((st) =>
      st.id === editingSubtask_id
        ? { ...st, title: editingTitle, description: editingDescription }
        : st,
    ) as Task["sub_tasks"];
    setLocalTask((t) => {
      if (!t) return t;
      return {
        ...t,
        sub_tasks: next,
      } as Task;
    });

    try {
      dispatch(
        updateSubtask({
          task_id: task.id,
          subtask_id: editingSubtask_id,
          updates: {
            title: editingTitle,
            description: editingDescription,
          },
        }),
      );
      syncBoardCache(next);
      await persistSubTasks(next);
      await syncTaskState(next);
      toast.success("Subtask updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update subtask");
    }

    setEditingSubtask_id(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  const handleCancelEdit = () => {
    setEditingSubtask_id(null);
    setEditingTitle("");
  };

  const handleDeleteSubTask = async (subtask_id: string) => {
    manualUpdateRef.current = Date.now();
    if (!canEditSubtasks) {
      toast.error(
        isPRLinked
          ? "Cannot delete subtasks after a PR has been linked"
          : "You don't have permission to delete subtasks",
      );
      return;
    }

    const next = (localTask?.sub_tasks || []).map((s) =>
      s.id === subtask_id
        ? ({
            ...s,
            is_deleted: true,
          } as Task["sub_tasks"][0])
        : s,
    ) as Task["sub_tasks"];
    setLocalTask((t) => {
      if (!t) return t;
      return { ...t, sub_tasks: next } as Task;
    });
    try {
      dispatch(
        removeSubtask({
          task_id: task.id,
          subtask_id,
        }),
      );
      syncBoardCache(next);
      await persistSubTasks(next);
      await syncTaskState(next);
      toast.success("Subtask deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete subtask");
    }
  };

  const completedCount = visibleSubTasks.filter((st) => st.completed).length;
  const totalCount = visibleSubTasks.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Progress Summary */}
      {totalCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Progress
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {completedCount}/{totalCount} completed
              </span>
            </div>
            <Progress value={completionPercentage} />
            <div className="text-center mt-2 text-sm text-slate-600 dark:text-slate-400">
              {completionPercentage}% complete
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Sub-Task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Add Sub-Task
          </h3>
          <div className="flex items-center gap-2">
            {showGenerateBreakdown ? (
              <Button
                variant="outline"
                onClick={handleGenerateBreakdown}
                disabled={
                  generatingBreakdown || !task_idForApi || !canEditSubtasks || generateSubtaskCount >= 2
                }
                title={
                  !canEditSubtasks
                    ? "Cannot modify subtasks after PR linked or as trainee"
                    : ""
                }
              >
                {generatingBreakdown ? "Generating..." : generateSubtaskCount >= 2 ? "Sub-Tasks Generated" : "Generate Sub-Tasks"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={handleRefreshSubTasks}
              disabled={refreshing || !task_idForApi}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        {!canEditSubtasks && (
          <div className="text-sm border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 p-3 rounded-md">
            {isPRLinked
              ? "Subtasks are locked after a PR has been linked to prevent unintended changes."
              : "You don't have permission to modify subtasks."}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Enter sub-task title..."
            value={newSubTaskTitle}
            onChange={(e) => setNewSubTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddSubTask()}
            disabled={!canEditSubtasks}
          />
          <Button
            onClick={handleAddSubTask}
            disabled={!newSubTaskTitle.trim() || !canEditSubtasks}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sub-Tasks List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Sub-Tasks ({totalCount})
        </h3>

        {totalCount === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No sub-tasks yet
            </h4>
            <p className="text-slate-600 dark:text-slate-400">
              Break down this task into smaller, manageable pieces.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleSubTasks.map((subTask) => (
              <Card
                key={subTask.id}
                className={subTask.completed ? "opacity-75" : ""}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={subTask.completed}
                      onCheckedChange={(checked) =>
                        handleToggleSubTask(subTask.id, checked as boolean)
                      }
                      disabled={!canToggleSubtasks}
                      title={
                        !canToggleSubtasks ? "Subtasks are locked" : undefined
                      }
                    />

                    {editingSubtask_id === subTask.id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleSaveEdit()
                          }
                          className="flex-1"
                        />
                        <Textarea
                          value={editingDescription}
                          onChange={(e) =>
                            setEditingDescription(e.target.value)
                          }
                          placeholder="Enter sub-task description..."
                          className="h-20"
                        />
                        <div className="flex items-center gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span
                            className={`block ${
                              subTask.completed
                                ? "line-through text-slate-500"
                                : "text-slate-900 dark:text-slate-100"
                            } font-medium`}
                          >
                            {subTask.title}
                          </span>
                          {subTask.description ? (
                            <p
                              className={`text-sm mt-1 ${subTask.completed ? "text-slate-400" : "text-slate-600 dark:text-slate-400"}`}
                            >
                              {subTask.description}
                            </p>
                          ) : null}
                        </div>
                        {canEditSubtasks && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                handleEditSubTask(
                                  subTask.id,
                                  subTask.title,
                                  (
                                    subTask as unknown as Record<
                                      string,
                                      unknown
                                    >
                                  ).description as string | undefined,
                                )
                              }
                              disabled={!canEditSubtasks}
                              title={
                                !canEditSubtasks
                                  ? "Cannot edit subtasks"
                                  : "Edit subtask"
                              }
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteSubTask(subTask.id)}
                              disabled={!canEditSubtasks}
                              title={
                                !canEditSubtasks
                                  ? "Cannot delete subtasks"
                                  : "Delete subtask"
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-1 ml-6 flex flex-wrap gap-x-4 gap-y-1">
                    <span>{formatCreatedAt(subTask.created_at)}</span>
                    {formatEstimatedHours(subTask) ? (
                      <span>
                        Estimated Hours to Complete :{" "}
                        {formatEstimatedHours(subTask)}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
