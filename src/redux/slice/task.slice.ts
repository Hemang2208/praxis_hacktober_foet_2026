import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch } from "@/lib/queueAwareFetch";
import { updateExternalTaskProgress } from "@/lib/externalProgress";
import {
  invalidateDetailItemCache,
  invalidatePageCache,
} from "@/redux/slice/cache.slice";

const coerceProjectStatus = (
  status: unknown,
):
  | "planning"
  | "in-progress"
  | "completed"
  | "on-hold"
  | "deleted"
  | undefined => {
  if (typeof status !== "string") return undefined;
  if (
    status === "planning" ||
    status === "in-progress" ||
    status === "completed" ||
    status === "on-hold" ||
    status === "deleted"
  ) {
    return status;
  }
  return undefined;
};

// Task Types
export interface Task {
  _id: string;
  id: string; // Legacy ID for backward compatibility with components expecting LegacyTask (REQUIRED)
  title: string;
  description: string;
  status: "todo" | "in-progress" | "submitted" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  project_id: string;
  assigned_to?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  due_date?: Date | string;
  tags: string[];
  sub_tasks: Array<{
    id: string;
    _id?: string;
    title: string;
    completed: boolean;
    created_at: string;
    description?: string;
    is_deleted?: boolean;
    estimated_hours?: number;
  }>;
  comments: Array<{
    _id: string;
    user_id: string;
    message: string;
    created_at: Date | string;
  }>;
  attachments: Array<{
    _id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  time_tracking: {
    estimated: number; // in hours
    logged: number; // in hours
    remaining: number; // in hours
  };
  dependencies: string[]; // IDs of tasks this task depends on
  completed_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  is_deleted?: boolean;
  ai_feedback?: {
    _id: string;
    review?: string;
    summary?: string;
    assessment?: {
      codeQuality?: number;
      documentation?: number;
      testCoverage?: number;
      performance?: number;
      security?: number;
      bestPractices?: number;
      overall?: number;
    };
    comments?: Array<{
      _id?: string;
      line?: number;
      column?: number;
      fileName?: string;
      message?: string;
      severity?: string;
      category?: string;
      suggestion?: string;
      example?: string;
    }>;
    strengths?: string[];
    improvements?: string[];
    recommendations?: string[];
    pull_request_url?: string;
    repository_url?: string;
    branch_name?: string;
    commitHash?: string;
    ai_model?: string;
    processing_time?: number;
    status?: string;
    analysisDate?: string | Date;
    created_at?: string | Date;
    updated_at?: string | Date;
  } | null;
  // Notes array (REQUIRED for LegacyTask compatibility)
  notes: Array<{
    id: string;
    _id?: string;
    content: string;
    created_at: string;
    updated_at?: string;
    parent_id?: string | null;
    is_deleted?: boolean;
    is_edited?: boolean;
    isDeletedNote?: boolean;
    author: {
      id: string;
      name: string;
      avatar: string;
      role?: string;
    };
  }>;
  // Activity array (REQUIRED for LegacyTask compatibility)
  activity: Array<{
    id: string;
    type: "created" | "moved" | "commented" | "updated" | "completed";
    description: string;
    created_at: string;
    author: {
      id: string;
      name: string;
      avatar: string;
    };
    metadata?: Record<string, unknown>;
  }>;
  linked_pr_id?: string | null;
  linked_pull_request?: {
    _id: string;
    user_id?:
      | string
      | { full_name?: string; email?: string; profile_picture?: string };
    task_id?: string;
    pull_request: {
      url: string;
      branch: string;
      status: string;
      title?: string;
      description?: string;
    };
    submitted_at: string;
    status: string;
  } | null;
  feedback_status?: "pending" | "ready" | "reviewed";
}

export interface TaskAssignment {
  task_id: string;
  user_id: string;
  notes?: string;
}

export interface TaskState {
  tasks: Task[];
  currentTask: Task | null;

  // Loading States
  loading: {
    fetchTasks: boolean;
    createTask: boolean;
    updateTask: boolean;
    deleteTask: boolean;
    fetchTasksByProject: boolean;
    assignUserToTask: boolean;
    fetchAssignedTasks: boolean;
  };

  // Error States
  error: {
    fetchTasks: string | null;
    createTask: string | null;
    updateTask: string | null;
    deleteTask: string | null;
    fetchTasksByProject: string | null;
    assignUserToTask: string | null;
    fetchAssignedTasks: string | null;
  };

  // UI States
  ui: {
    selected_task_id: string | null;
    filter_status: string | null;
    filter_priority: string | null;
    filter_project: string | null;
    search_query: string;
    sort_by: "title" | "due_date" | "priority" | "status" | "created_at";
    sort_order: "asc" | "desc";
    view_mode: "list" | "kanban" | "calendar";
  };

  /** Tracks recent local subtask edits so refetches don't overwrite optimistic state. */
  localMutationsAt: Record<string, number>;
}

const normalizeUiSubTasks = (t: any): Task["sub_tasks"] => {
  const raw = Array.isArray(t?.sub_tasks) ? t.sub_tasks : [];

  const task_id = String(t?._id ?? t?.id ?? "task");
  return raw.map((s: any, idx: number) => {
    const sId = String(s?.id || s?._id || `${task_id}-st-${idx}`);
    const rawEstimated = s?.estimated_hours ?? s?.estimated_hours;
    const estimatedNum =
      typeof rawEstimated === "number" ? rawEstimated : Number(rawEstimated);
    const estimated_hours =
      Number.isFinite(estimatedNum) && estimatedNum > 0
        ? estimatedNum
        : undefined;
    return {
      id: sId,
      _id: sId,
      title: String(s?.title || s?.name || "Subtask"),
      description: String(s?.description || ""),
      completed: Boolean(s?.completed ?? s?.status === "completed"),
      created_at: String(s?.created_at || new Date().toISOString()),
      is_deleted: Boolean(s?.is_deleted ?? s?.isDeleted ?? s?.deleted ?? false),
      estimated_hours,
    };
  });
};

// Initial state
const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: {
    fetchTasks: false,
    createTask: false,
    updateTask: false,
    deleteTask: false,
    fetchTasksByProject: false,
    assignUserToTask: false,
    fetchAssignedTasks: false,
  },
  error: {
    fetchTasks: null,
    createTask: null,
    updateTask: null,
    deleteTask: null,
    fetchTasksByProject: null,
    assignUserToTask: null,
    fetchAssignedTasks: null,
  },
  ui: {
    selected_task_id: null,
    filter_status: null,
    filter_priority: null,
    filter_project: null,
    search_query: "",
    sort_by: "due_date",
    sort_order: "asc",
    view_mode: "kanban",
  },
  localMutationsAt: {},
};

// Async Thunks
export const fetchTasks = createAsyncThunk<
  { tasks: Task[] },
  void,
  { rejectValue: string }
>("task/fetchTasks", async (_, { rejectWithValue }) => {
  try {
    const response = await fetchWithRetry(`${TASK_MGMT_AGENT_URL}/tasks`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to fetch tasks",
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch tasks",
    );
  }
});

export const fetchTasksByProject = createAsyncThunk<
  { tasks: Task[] },
  string,
  { rejectValue: string }
>("task/fetchTasksByProject", async (project_id, { rejectWithValue }) => {
  try {
    const response = await fetchWithRetry(
      `${TASK_MGMT_AGENT_URL}/projects/${project_id}/tasks`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to fetch project tasks",
      );
    }

    const data = await response.json().catch(() => null);

    // Backend may return either `{ tasks: [...] }` or a bare `[...]`.
    if (Array.isArray(data)) {
      return { tasks: data as Task[] };
    }
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      const tasks = Array.isArray(rec.tasks) ? (rec.tasks as Task[]) : [];
      return { tasks };
    }
    return { tasks: [] };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch project tasks",
    );
  }
});

export const createTask = createAsyncThunk<
  { task: Task },
  Omit<
    Task,
    | "_id"
    | "id"
    | "created_at"
    | "updated_at"
    | "comments"
    | "attachments"
    | "completed_at"
    | "notes"
    | "activity"
    | "sub_tasks"
  > & {
    // Make sub_tasks optional for creation (can be empty array)
    sub_tasks?: Task["sub_tasks"];
  },
  { rejectValue: string }
>(
  "task/createTask",
  async (taskData, { rejectWithValue, dispatch }) => {
  try {
    const projectId = taskData.project_id;
    const response = await queueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(projectId)}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      },
    );
    if (!response.ok) {
      // Try to parse JSON error body, otherwise fallback to text
      let errorText = "Failed to create task";
      try {
        const errorData = await response.json();
        if (errorData) {
          errorText =
            errorData.error || errorData.message || JSON.stringify(errorData);
        }
      } catch {
        try {
          const text = await response.text();
          if (text) errorText = text;
        } catch {
          /* ignore */
        }
      }

      return rejectWithValue(errorText);
    }

    const data = await response.json();

    console.log("[createTask] THUNK_RESOLVED", data);

    // Invalidate caches so lists refetch fresh data
    dispatch(invalidatePageCache({ resource: "tasks" }));
    dispatch(invalidatePageCache({ resource: "projects" }));

    // Invalidate dashboard so overview re-fetches fresh aggregated data
    dispatch({ type: "dashboard/forceReinitialization" });

    console.log("[createTask] REDUX_UPDATED");

    // Invalidate SWR caches
    try {
      const { mutate } = await import("swr");
      await Promise.allSettled([
        mutate((key) => typeof key === "string" && key.includes("task")),
        mutate((key) => typeof key === "string" && key.includes("project")),
      ]);
      console.log("[createTask] SWR_INVALIDATED");
    } catch {
      // SWR might not be installed or available
    }

    return data;
  } catch (error) {
    console.error("[createTask] THUNK_REJECTED", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create task",
    );
  }
});

export const updateTask = createAsyncThunk<
  { task: Task },
  { id: string; updates: Partial<Task> },
  { rejectValue: string }
>("task/updateTask", async ({ id, updates }, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetchWithRetry(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      },
      2
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to update task",
      );
    }

    const data = await response.json();

    // Handle queue-based responses from the backend.
    // When the queue system is enabled, the backend may return
    // {"status": "processing"|"completed"|..., "request_id": "...", ...} with HTTP 200.
    // This means the update has been accepted/queued — treat it as success.
    if (
      data &&
      typeof data === "object" &&
      (data as any).request_id &&
      !(data as any).task
    ) {
      console.log("[updateTask] Queue response (status=" + (data as any).status + "), treating as success for task:", id);
      // Invalidate caches so subsequent fetches pick up the update once processed
      dispatch(invalidateDetailItemCache({ resource: "tasks", id }));
      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "projects" }));
      dispatch({ type: "dashboard/forceReinitialization" });

      // Return a synthetic success payload with the updates we sent
      return { task: { _id: id, ...updates } as unknown as Task };
    }

    // Best-effort: notify the external task management agent about progress/status
    // and immediately patch project progress/status in Redux if returned.
    let project_id: string | undefined;
    try {
      const taskFromServer: Task = data.task;
      if (!taskFromServer) {
        // Unexpected response shape — still treat as success since response.ok was true
        console.warn("[updateTask] No task in response, skipping agent notification");
        dispatch(invalidateDetailItemCache({ resource: "tasks", id }));
        dispatch(invalidatePageCache({ resource: "tasks" }));
        dispatch(invalidatePageCache({ resource: "projects" }));
        dispatch({ type: "dashboard/forceReinitialization" });
        return { task: { _id: id, ...updates } as unknown as Task };
      }
      const agentResult = await updateExternalTaskProgress(
        taskFromServer._id,
        0,
        {
          status: taskFromServer.status,
        },
      );

      const projectFromAgent = agentResult?.project;
      if (projectFromAgent) {
        project_id =
          projectFromAgent.project_id ||
          // common task schemas
          (
            taskFromServer as unknown as {
              project_id?: string;
              project?: string;
            }
          ).project_id ||
          (
            taskFromServer as unknown as {
              project_id?: string;
              project?: string;
            }
          ).project ||
          "";

        if (project_id) {
          dispatch({
            type: "project/patchProjectProgressStatus",
            payload: {
              project_id,
              progress:
                typeof projectFromAgent.progress === "number"
                  ? projectFromAgent.progress
                  : undefined,
              status: coerceProjectStatus(projectFromAgent.status),
            },
          } as any);
        }
      }
    } catch (e) {
      // ignore agent errors
      console.warn("Agent progress notification skipped:", e);
    }

    // Invalidate caches so dashboard/project views refetch fresh data
    dispatch(invalidateDetailItemCache({ resource: "tasks", id: data.task ? (data.task as Task)._id : id }));
    dispatch(invalidatePageCache({ resource: "tasks" }));
    dispatch(invalidatePageCache({ resource: "projects" }));

    // Invalidate dashboard so overview re-fetches fresh aggregated data
    dispatch({ type: "dashboard/forceReinitialization" });

    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update task",
    );
  }
});

export const deleteTask = createAsyncThunk<
  { id: string },
  string,
  { rejectValue: string }
>("task/deleteTask", async (id, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetchWithRetry(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to delete task",
      );
    }

    // Invalidate caches so lists and details refetch fresh data
    dispatch(invalidatePageCache({ resource: "tasks" }));
    dispatch(invalidateDetailItemCache({ resource: "tasks", id }));
    dispatch(invalidatePageCache({ resource: "projects" }));

    // Invalidate dashboard so overview re-fetches fresh aggregated data
    dispatch({ type: "dashboard/forceReinitialization" });

    return { id };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete task",
    );
  }
});

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  queueOptions?: import("@/lib/queueAwareFetch").QueueAwareFetchOptions
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const isWriteOp = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = isWriteOp
        ? await queueAwareFetch(url, options, queueOptions)
        : await fetch(url, options);
      if (res.ok || attempt >= retries) return res;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

export const fetchTaskById = createAsyncThunk<
  { task: Task },
  string,
  { rejectValue: string }
>("task/fetchTaskById", async (id, { rejectWithValue }) => {
  try {
    const response = await fetchWithRetry(
      `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to fetch task",
      );
    }

    const task = await response.json();
    const data = { task };

    // Best-effort: try to fetch the agent's copy of the task and merge useful fields
    try {
      const agentRes = await fetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(id)}?t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
      if (agentRes.ok) {
        const agentData = await agentRes.json().catch(() => null);
        if (agentData && typeof agentData === "object") {
          // If agent returns a task object, merge into our response.task
          const agentTask = (agentData.task ||
            agentData) as Partial<Task> | null;
          if (agentTask) {
            // Preserve sub_tasks from main endpoint — agent may not return them
            const preservedSubTasks = data.task?.sub_tasks;
            data.task = { ...(data.task || {}), ...agentTask };
            // Restore sub_tasks if the agent response lacks them, returns empty, or has fewer subtasks than main
            if (
              preservedSubTasks &&
              (!data.task.sub_tasks || data.task.sub_tasks.length < preservedSubTasks.length)
            ) {
              data.task.sub_tasks = preservedSubTasks;
            }
          }
        }
      }
    } catch (e) {
      // ignore agent fetch errors
      console.warn("Failed to fetch agent task for view:", e);
    }

    // Best-effort: hydrate the persisted AI feedback so the UI can render the
    // saved review text on reload instead of falling back to the generic summary.
    try {
      const feedbackRes = await fetch(
        `/api/ai-feedback?task_id=${encodeURIComponent(id)}&limit=1`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      if (feedbackRes.ok) {
        const feedbackJson = await feedbackRes.json().catch(() => null);
        const feedback =
          feedbackJson && typeof feedbackJson === "object"
            ? (feedbackJson as { feedback?: unknown; feedbacks?: unknown[] })
                .feedback ||
              ((feedbackJson as { feedbacks?: unknown[] }).feedbacks?.[0] ??
                null)
            : null;

        if (feedback && typeof feedback === "object") {
          data.task = {
            ...(data.task || {}),
            ai_feedback: feedback as Task["ai_feedback"],
          };
        }
      }
    } catch (e) {
      console.warn("Failed to fetch persisted AI feedback for view:", e);
    }

    const coerceDateLike = (value: unknown): string | undefined => {
      if (value == null) return undefined;
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
      }
      if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (typeof value === "string") {
        const s = value.trim();
        if (!s) return undefined;
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      // Handle Mongo-style objects like { $date: ... }
      if (typeof value === "object") {
        const rec = value as Record<string, unknown>;
        const inner = rec["$date"];
        if (inner) return coerceDateLike(inner);
      }
      return undefined;
    };

    // Normalize date field names from various backends
    try {
      const tAny = data.task as unknown as Record<string, unknown>;
      const existing = tAny["due_date"];
      const candidate =
        existing ??
        tAny["due_date"] ??
        tAny["due"] ??
        tAny["deadline"] ??
        tAny["dueAt"] ??
        tAny["due_at"];

      const normalizedDue =
        coerceDateLike(existing) ?? coerceDateLike(candidate);
      if (normalizedDue) (data.task as any).due_date = normalizedDue;

      const createdCandidate =
        tAny["created_at"] ??
        tAny["created_at"] ??
        tAny["created"] ??
        tAny["createdOn"];
      const updatedCandidate =
        tAny["updated_at"] ??
        tAny["updated_at"] ??
        tAny["updated"] ??
        tAny["updatedOn"];
      const completedCandidate =
        tAny["completed_at"] ?? tAny["completed_at"] ?? tAny["completed"];

      const normalizedCreated =
        coerceDateLike(tAny["created_at"]) ?? coerceDateLike(createdCandidate);
      const normalizedUpdated =
        coerceDateLike(tAny["updated_at"]) ?? coerceDateLike(updatedCandidate);
      const normalizedCompleted =
        coerceDateLike(tAny["completed_at"]) ??
        coerceDateLike(completedCandidate);

      if (normalizedCreated) (data.task as any).created_at = normalizedCreated;
      if (normalizedUpdated) (data.task as any).updated_at = normalizedUpdated;
      if (normalizedCompleted)
        (data.task as any).completed_at = normalizedCompleted;
    } catch {
      // ignore normalization errors
    }

    // Best-effort: load discussion notes from our app DB API (supports replies)
    try {
      const notesRes = await fetch(
        `/api/task/${encodeURIComponent(id)}/notes`,
        { method: "GET" },
      );
      if (notesRes.ok) {
        const notesJson = await notesRes.json().catch(() => null);
        const notes =
          notesJson &&
          typeof notesJson === "object" &&
          Array.isArray((notesJson as any).notes)
            ? ((notesJson as any).notes as Task["notes"])
            : null;
        if (notes) {
          data.task = { ...(data.task || {}), notes } as Task;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch internal notes:", e);
    }

    // Best-effort: merge sub_tasks from our app DB so user-added sub_tasks survive refresh
    try {
      const stRes = await fetch(`/api/task/${encodeURIComponent(id)}/subtask`, {
        method: "GET",
      });
      if (stRes.ok) {
        const stJson = await stRes.json().catch(() => null);
        const dbSubtasks =
          stJson &&
          typeof stJson === "object" &&
          Array.isArray((stJson as any).sub_tasks)
            ? ((stJson as any).sub_tasks as Array<any>)
            : [];

        const agentSubtasksRaw =
          (Array.isArray((data.task as any)?.sub_tasks) &&
            (data.task as any).sub_tasks) ||
          (Array.isArray((data.task as any)?.sub_tasks) &&
            (data.task as any).sub_tasks) ||
          [];

        const normalizeKey = (st: any) =>
          `${String(st?.title ?? "")
            .trim()
            .toLowerCase()}|${String(st?.description ?? st?.desc ?? "")
            .trim()
            .toLowerCase()}`;

        const seen = new Set(agentSubtasksRaw.map(normalizeKey));
        const merged = [...agentSubtasksRaw];

        for (const st of dbSubtasks) {
          const key = normalizeKey(st);
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push({
            _id: st.id,
            title: st.title,
            description: st.description,
            completed: st.completed,
            created_at: st.created_at,
          });
        }

        (data.task as any).sub_tasks = merged;
      }
    } catch (e) {
      console.warn("Failed to fetch internal sub_tasks:", e);
    }

    return data;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch task",
    );
  }
});

// Notify agent about task progress/status (best-effort). Can be dispatched from UI
export const notifyTaskProgress = createAsyncThunk<
  void,
  { id: string; status?: Task["status"]; progress?: number },
  { rejectValue: string }
>(
  "task/notifyTaskProgress",
  async ({ id, status, progress }, { rejectWithValue, getState, dispatch }) => {
    try {
      let computedProgress = progress;
      // If progress not supplied, try to compute from current state sub_tasks
      if (typeof computedProgress === "undefined") {
        try {
          const state = getState() as { task: TaskState };
          const t =
            state.task.tasks.find((x) => x._id === id) ||
            state.task.currentTask;
          if (t) {
            if (Array.isArray(t.sub_tasks) && t.sub_tasks.length) {
              const total = t.sub_tasks.length;
              const completed = t.sub_tasks.filter((s) => !!s.completed).length;
              computedProgress = Math.round((completed / total) * 100);
            } else {
              computedProgress = t.status === "completed" ? 100 : 0;
            }
            if (!status) status = t.status;
          }
        } catch {
          computedProgress = computedProgress ?? 0;
        }
      }

      // Pydantic model requires a status string
      status = status ?? "todo";

      const agentResult = await updateExternalTaskProgress(id, 0, {
        status,
      });

      const projectFromAgent = agentResult?.project;
      if (projectFromAgent?.project_id) {
        dispatch({
          type: "project/patchProjectProgressStatus",
          payload: {
            project_id: projectFromAgent.project_id,
            progress:
              typeof projectFromAgent.progress === "number"
                ? projectFromAgent.progress
                : undefined,
            status: coerceProjectStatus(projectFromAgent.status),
          },
        } as any);
      }
      return;
    } catch (error) {
      // non-fatal
      console.warn("notifyTaskProgress failed:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to notify agent",
      );
    }
  },
);

// Note Management Async Thunks
export const addTaskNote = createAsyncThunk<
  { note: Task["notes"][0] },
  { task_id: string; content: string; parent_id?: string | null },
  { rejectValue: string }
>(
  "task/addNote",
  async ({ task_id, content, parent_id }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(
        `/api/task/${encodeURIComponent(task_id)}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, parent_id: parent_id ?? null }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.error || errorData.message || "Failed to add note",
        );
      }

      const data = await response.json();

      dispatch(invalidateDetailItemCache({ resource: "tasks", id: task_id }));
      dispatch(invalidatePageCache({ resource: "tasks" }));

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to add note",
      );
    }
  },
);

export const updateTaskNote = createAsyncThunk<
  { note: Task["notes"][0] },
  { task_id: string; noteId: string; content: string },
  { rejectValue: string }
>(
  "task/updateNote",
  async ({ task_id, noteId, content }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(
        `/api/task/${encodeURIComponent(task_id)}/notes`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ noteId, content }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.error || errorData.message || "Failed to update note",
        );
      }

      const data = await response.json();

      dispatch(invalidateDetailItemCache({ resource: "tasks", id: task_id }));
      dispatch(invalidatePageCache({ resource: "tasks" }));

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update note",
      );
    }
  },
);

export const deleteTaskNote = createAsyncThunk<
  { noteId: string },
  { task_id: string; noteId: string },
  { rejectValue: string }
>("task/deleteNote", async ({ task_id, noteId }, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetch(
      `/api/task/${encodeURIComponent(task_id)}/notes?noteId=${encodeURIComponent(noteId)}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.error || errorData.message || "Failed to delete note",
      );
    }

    dispatch(invalidateDetailItemCache({ resource: "tasks", id: task_id }));
    dispatch(invalidatePageCache({ resource: "tasks" }));

    return { noteId };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete note",
    );
  }
});

export const assignUserToTask = createAsyncThunk<
  {
    message: string;
    task_id: string;
    assigned_to: string;
    project_id?: string;
    multipleuser_ids?: string[];
    status?: Task["status"];
  },
  {
    task_id: string;
    user_id: string;
    notes?: string;
    multipleuser_ids?: string[];
  },
  { rejectValue: string }
>(
  "task/assignUserToTask",
  async (
    { task_id, user_id, notes, multipleuser_ids },
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(task_id)}/assign/${encodeURIComponent(user_id)}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          body: JSON.stringify({ notes }),
        },
      );

      if (!response.ok) {
        // Check if response is JSON or HTML
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          return rejectWithValue(
            errorData.detail ||
              errorData.error ||
              errorData.message ||
              "Failed to assign user to task",
          );
        } else {
          // Handle HTML error response (like redirect to login)
          if (response.status === 401 || response.status === 403) {
            return rejectWithValue(
              "Authentication required. Please log in and try again.",
            );
          }
          return rejectWithValue(
            `Server error (${response.status}). Please check if you're logged in.`,
          );
        }
      }

      const data = await response.json();

      // Attempt to enrich the returned assignment with assignee profile info
      try {
        // Try to find project_id from current tasks in state
        const rootState = getState() as unknown as { task: TaskState };
        let project_id: string | undefined;
        const currentTasks = (rootState.task && rootState.task.tasks) || [];
        const foundTask = currentTasks.find(
          (t) =>
            t._id === task_id ||
            (t as unknown as Record<string, unknown>)["id"] === task_id,
        );
        if (foundTask)
          project_id =
            ((foundTask as unknown as Record<string, unknown>)[
              "project_id"
            ] as string) ||
            ((foundTask as unknown as Record<string, unknown>)[
              "project"
            ] as string) ||
            ((foundTask as unknown as Record<string, unknown>)[
              "project_id"
            ] as string);

        if (project_id) {
          try {
            const projRes = await fetch(`/api/project/${project_id}`);
            if (projRes.ok) {
              const projJson = await projRes.json().catch(() => null);
              const project = projJson?.project || projJson;
              if (project && Array.isArray(project.team_members)) {
                const member = project.team_members.find(
                  (m: Record<string, unknown>) =>
                    String(m["user"] || m["_id"]) === String(user_id),
                );
                if (member) {
                  (data as Record<string, unknown>)["assignee"] = {
                    id: String(
                      (member["user"] as string) || (member["_id"] as string),
                    ),
                    name:
                      (member["name"] as string) ||
                      (member["full_name"] as string) ||
                      "",
                    email: (member["email"] as string) || "",
                    avatar:
                      (member["avatar"] as string) ||
                      (member["profile_picture"] as string) ||
                      (member["image_url"] as string) ||
                      undefined,
                  };
                }
              }
            }
          } catch (e) {
            console.warn("Failed to fetch project for assignee enrichment:", e);
          }
        }
      } catch (e) {
        // Non-fatal
        console.warn("Assignee enrichment skipped:", e);
      }

      // Invalidate task/project caches so list views, boards, and kanban reflect the change
      dispatch(invalidateDetailItemCache({ resource: "tasks", id: task_id }));
      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "projects" }));

      // If we have multiple user IDs, override the assigned_to with the full list
      if (multipleuser_ids && multipleuser_ids.length > 1) {
        // Invalidate dashboard so overview re-fetches fresh aggregated data
        dispatch({ type: "dashboard/forceReinitialization" });

        return {
          ...data,
          assigned_to: multipleuser_ids.join(","),
          multipleuser_ids,
        };
      }

      // Note: agent assign notifications are sent from the server-side
      // forwarder to avoid duplicate POSTs to the external task backend.
      // Client no longer notifies the agent directly here (keeps single writer semantic).

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });

      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Unexpected token")) {
          return rejectWithValue(
            "Authentication required. Please refresh the page and try again.",
          );
        }
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Failed to assign user to task");
    }
  },
);

export const fetchAssignedTasks = createAsyncThunk<
  { tasks: Task[] },
  string,
  { rejectValue: string }
>("task/fetchAssignedTasks", async (user_id, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `${TASK_MGMT_AGENT_URL}/tasks/assigned/${encodeURIComponent(user_id)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.detail ||
          errorData.error ||
          errorData.message ||
          "Failed to fetch assigned tasks",
      );
    }

    const data = await response.json();
    return { tasks: data.tasks || [] };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch assigned tasks",
    );
  }
});

const countCompletedSubtasks = (subtasks: Task["sub_tasks"] | undefined) =>
  (subtasks ?? []).filter((st) => !st.is_deleted && st.completed).length;

const touchLocalTaskMutation = (state: TaskState, task_id: string) => {
  state.localMutationsAt[task_id] = Date.now();
};

// Task Slice
const taskSlice = createSlice({
  name: "task",
  initialState,
  reducers: {
    // UI Actions
    setSelectedTask: (state, action: PayloadAction<string | null>) => {
      state.ui.selected_task_id = action.payload;
      state.currentTask =
        state.tasks.find((t) => t._id === action.payload) || null;
    },

    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },

    setFilterStatus: (state, action: PayloadAction<string | null>) => {
      state.ui.filter_status = action.payload;
    },

    setFilterPriority: (state, action: PayloadAction<string | null>) => {
      state.ui.filter_priority = action.payload;
    },

    setFilterProject: (state, action: PayloadAction<string | null>) => {
      state.ui.filter_project = action.payload;
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.ui.search_query = action.payload;
    },

    setSortBy: (
      state,
      action: PayloadAction<{
        sort_by: TaskState["ui"]["sort_by"];
        sort_order: TaskState["ui"]["sort_order"];
      }>,
    ) => {
      state.ui.sort_by = action.payload.sort_by;
      state.ui.sort_order = action.payload.sort_order;
    },

    setViewMode: (
      state,
      action: PayloadAction<TaskState["ui"]["view_mode"]>,
    ) => {
      state.ui.view_mode = action.payload;
    },

    // Task Status Quick Updates
    updateTaskStatus: (
      state,
      action: PayloadAction<{ id: string; status: Task["status"] }>,
    ) => {
      const task = state.tasks.find((t) => t._id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        task.updated_at = new Date().toISOString();
      }
      if (state.currentTask?._id === action.payload.id) {
        state.currentTask.status = action.payload.status;
        state.currentTask.updated_at = new Date().toISOString();
      }
    },

    // Subtask Management
    addSubtask: (
      state,
      action: PayloadAction<{
        task_id: string;
        sub_task: Omit<Task["sub_tasks"][0], "_id">;
      }>,
    ) => {
      const task = state.tasks.find((t) => t._id === action.payload.task_id);
      if (task) {
        const newSubTask = {
          ...action.payload.sub_task,
          _id: action.payload.sub_task.id || Date.now().toString(),
        };
        task.sub_tasks.push(newSubTask);
      }
      if (state.currentTask?._id === action.payload.task_id) {
        const newSubTask = {
          ...action.payload.sub_task,
          _id: action.payload.sub_task.id || Date.now().toString(),
        };
        state.currentTask.sub_tasks.push(newSubTask);
      }
      touchLocalTaskMutation(state, action.payload.task_id);
    },

    updateSubtask: (
      state,
      action: PayloadAction<{
        task_id: string;
        subtask_id: string;
        updates: Partial<Task["sub_tasks"][0]>;
      }>,
    ) => {
      const task = state.tasks.find((t) => t._id === action.payload.task_id);
      if (task) {
        const sub_task = task.sub_tasks.find(
          (s) => s._id === action.payload.subtask_id || s.id === action.payload.subtask_id,
        );
        if (sub_task) {
          Object.assign(sub_task, action.payload.updates);
        }
      }
      if (state.currentTask?._id === action.payload.task_id) {
        const sub_task = state.currentTask.sub_tasks.find(
          (s) => s._id === action.payload.subtask_id || s.id === action.payload.subtask_id,
        );
        if (sub_task) {
          Object.assign(sub_task, action.payload.updates);
        }
      }
      touchLocalTaskMutation(state, action.payload.task_id);
    },

    removeSubtask: (
      state,
      action: PayloadAction<{ task_id: string; subtask_id: string }>,
    ) => {
      const task = state.tasks.find((t) => t._id === action.payload.task_id);
      if (task) {
        task.sub_tasks = task.sub_tasks.filter(
          (s) => s._id !== action.payload.subtask_id && s.id !== action.payload.subtask_id,
        );
      }
      if (state.currentTask?._id === action.payload.task_id) {
        state.currentTask.sub_tasks = state.currentTask.sub_tasks.filter(
          (s) => s._id !== action.payload.subtask_id && s.id !== action.payload.subtask_id,
        );
      }
      touchLocalTaskMutation(state, action.payload.task_id);
    },

    clearTaskLocalMutation: (state, action: PayloadAction<string>) => {
      delete state.localMutationsAt[action.payload];
    },

    clearTaskError: (
      state,
      action: PayloadAction<keyof TaskState["error"]>,
    ) => {
      state.error[action.payload] = null;
    },

    clearAllTaskErrors: (state) => {
      Object.keys(state.error).forEach((key) => {
        state.error[key as keyof TaskState["error"]] = null;
      });
    },

    resetTaskState: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch Tasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading.fetchTasks = true;
        state.error.fetchTasks = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading.fetchTasks = false;
        // Normalize sub_tasks into UI-friendly `sub_tasks` (include description)
        state.tasks = (action.payload.tasks || []).map((t: Task) => {
          const uiSubTasks = normalizeUiSubTasks(t);

          return {
            ...t,
            id: t._id,
            sub_tasks: uiSubTasks,
            activity: t.activity || [],
          } as Task;
        });
        state.error.fetchTasks = null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading.fetchTasks = false;
        state.error.fetchTasks = action.payload || "Failed to fetch tasks";
      });

    // Fetch Tasks By Project
    builder
      .addCase(fetchTasksByProject.pending, (state) => {
        state.loading.fetchTasksByProject = true;
        state.error.fetchTasksByProject = null;
      })
      .addCase(fetchTasksByProject.fulfilled, (state, action) => {
        state.loading.fetchTasksByProject = false;
        // Replace tasks for the specific project
        const projectTasks = (action.payload.tasks || []).map((t: Task) => {
          const uiSubTasks = normalizeUiSubTasks(t);

          const tAny = t as unknown as Record<string, unknown>;
          const project_id =
            (typeof (t as any).project_id === "string" &&
              (t as any).project_id) ||
            (typeof tAny["project_id"] === "string" &&
              (tAny["project_id"] as string)) ||
            (typeof tAny["project"] === "string" &&
              (tAny["project"] as string)) ||
            "";

          const due_date =
            (t as any).due_date ??
            (t as any).due_date ??
            tAny["due_date"] ??
            tAny["due"] ??
            tAny["deadline"];

          return {
            ...t,
            id: t._id,
            project_id: project_id || (t as any).project_id,
            due_date:
              (t as any).due_date ?? (t as any).due_date ?? (due_date as any),
            sub_tasks: uiSubTasks,
            activity: t.activity || [],
          } as Task;
        });

        // IMPORTANT:
        // This thunk is scoped to a specific project, so we must remove any previously
        // cached tasks for that project; otherwise deleted/removed tasks can linger and
        // appear as "stale" in views like Timeline.
        const targetproject_id = String(action.meta.arg);
        const incomingIds = new Set(projectTasks.map((t) => String(t._id)));

        const getTaskproject_id = (task: any): string => {
          const raw = task?.project_id ?? task?.project_id ?? task?.project;
          if (typeof raw === "string") return raw;
          if (raw == null) return "";
          return String(raw);
        };

        const otherTasks = state.tasks.filter((task) => {
          // Drop tasks that belong to the project we're replacing
          const pid = getTaskproject_id(task);
          if (pid && pid === targetproject_id) return false;

          // Also drop any duplicated ids, even if the project id is malformed.
          if (incomingIds.has(String((task as any)?._id))) return false;

          return true;
        });

        state.tasks = [...otherTasks, ...projectTasks];
        state.error.fetchTasksByProject = null;
      })
      .addCase(fetchTasksByProject.rejected, (state, action) => {
        state.loading.fetchTasksByProject = false;
        state.error.fetchTasksByProject =
          action.payload || "Failed to fetch project tasks";
      });

    // Create Task
    builder
      .addCase(createTask.pending, (state) => {
        state.loading.createTask = true;
        state.error.createTask = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading.createTask = false;
        console.log("[createTask] REDUX_FULFILLED", { task: action.payload?.task?._id });
        // Normalize created task sub_tasks into UI-friendly sub_tasks with description
        const t = action.payload.task as Task;
        const uiSubTasks = normalizeUiSubTasks(t);

        const normalizedTask = {
          ...t,
          id: t._id,
          sub_tasks: uiSubTasks,
          notes: t.notes || [],
          activity: t.activity || [],
        } as Task;
        state.tasks.push(normalizedTask);
        state.error.createTask = null;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading.createTask = false;
        state.error.createTask = action.payload || "Failed to create task";
        console.error("[createTask] REDUX_REJECTED", action.payload || action.error);
      });

    // Update Task
    builder
      .addCase(updateTask.pending, (state) => {
        state.loading.updateTask = true;
        state.error.updateTask = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading.updateTask = false;
        const updatedTask = action.payload.task;
        const normalizedTask = {
          ...updatedTask,
          id: updatedTask.id || updatedTask._id,
          notes: updatedTask.notes || [],
          activity: updatedTask.activity || [],
          sub_tasks: normalizeUiSubTasks(updatedTask),
        } as Task;
        const index = state.tasks.findIndex(
          (t) => t._id === normalizedTask._id,
        );
        if (index !== -1) {
          state.tasks[index] = normalizedTask;
        }
        if (state.currentTask?._id === normalizedTask._id) {
          state.currentTask = normalizedTask;
        }
        state.error.updateTask = null;
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading.updateTask = false;
        state.error.updateTask = action.payload || "Failed to update task";
      });

    // Delete Task
    builder
      .addCase(deleteTask.pending, (state) => {
        state.loading.deleteTask = true;
        state.error.deleteTask = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading.deleteTask = false;
        state.tasks = state.tasks.filter((t) => t._id !== action.payload.id);
        if (state.currentTask?._id === action.payload.id) {
          state.currentTask = null;
          state.ui.selected_task_id = null;
        }
        state.error.deleteTask = null;
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading.deleteTask = false;
        state.error.deleteTask = action.payload || "Failed to delete task";
      });

    // Fetch Task By ID
    builder
      .addCase(fetchTaskById.pending, (state) => {
        state.loading.fetchTasks = true;
        state.error.fetchTasks = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading.fetchTasks = false;
        // Normalize current task to include camelCase sub_tasks and notes for UI
        const t = action.payload.task;

        const coerceIso = (value: unknown): string | undefined => {
          if (value == null) return undefined;
          if (value instanceof Date) {
            return Number.isNaN(value.getTime())
              ? undefined
              : value.toISOString();
          }
          if (typeof value === "number") {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
          }
          if (typeof value === "string") {
            let raw = value.trim();
            if (!raw) return undefined;
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(raw)) {
              raw += "Z";
            }
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
          }
          if (typeof value === "object" && value !== null) {
            const rec = value as Record<string, unknown>;
            if ("$date" in rec) return coerceIso(rec["$date"]);
          }
          return undefined;
        };

        const tAny = t as unknown as Record<string, unknown>;
        const created_at =
          coerceIso(tAny["created_at"]) ?? coerceIso(tAny["created"]);
        const updated_at =
          coerceIso(tAny["updated_at"]) ??
          coerceIso(tAny["updated_at"]) ??
          coerceIso(tAny["updated"]);
        const due_date =
          coerceIso(tAny["due_date"]) ??
          coerceIso(tAny["due_date"]) ??
          coerceIso(tAny["deadline"]) ??
          coerceIso(tAny["due"]);
        const completed_at =
          coerceIso(tAny["completed_at"]) ?? coerceIso(tAny["completed_at"]);

        // Normalize sub_tasks
        const normalizedSubTasks = normalizeUiSubTasks(t);

        // Normalize notes
        const normalizedNotes = Array.isArray(t.notes)
          ? t.notes.map((note) => {
              const n = note as unknown as Record<string, unknown>;
              const author = n.author as Record<string, unknown> | undefined;
              return {
                id: String(
                  n._id || n.id || `note-${Date.now()}-${Math.random()}`,
                ),
                _id: String(n._id || n.id || ""),
                content: String(n.content || n.text || ""),
                created_at:
                  coerceIso(n.created_at ?? n.createdAt) ??
                  new Date().toISOString(),
                updated_at:
                  coerceIso(n.updated_at ?? n.updatedAt) ??
                  (n.updated_at || n.updatedAt
                    ? new Date().toISOString()
                    : undefined),
                parent_id:
                  (n.parent_id as string | null | undefined) ??
                  (n.parent_id as string | null | undefined) ??
                  null,
                is_deleted: Boolean(
                  n.is_deleted || n.isDeleted || n.deleted || false,
                ),
                is_edited: Boolean(n.is_edited || n.isEdited || false),
                isDeletedNote: Boolean(
                  n.isDeletedNote ||
                  n.is_deleted ||
                  n.isDeleted ||
                  n.deleted ||
                  false,
                ),
                author: {
                  id: String(author?.id || author?._id || "unknown"),
                  name: String(author?.name || "Unknown"),
                  avatar: String(author?.avatar || ""),
                  role: String(author?.role || author?.subrole || ""),
                },
              };
            })
          : [];

        const normalized: Task = {
          ...t,
          id: t._id,
          created_at: created_at ?? (t as any).created_at,
          updated_at: updated_at ?? (t as any).updated_at,
          due_date: due_date ?? (t as any).due_date ?? (t as any).due_date,
          completed_at:
            completed_at ?? (t as any).completed_at ?? (t as any).completed_at,
          sub_tasks: normalizedSubTasks,
          notes: normalizedNotes,
          activity: t.activity || [],
        };

        const taskId = t._id;
        const localMutationAt = state.localMutationsAt[taskId];
        const existing =
          state.currentTask?._id === taskId
            ? state.currentTask
            : state.tasks.find((tt) => tt._id === taskId);

        if (
          existing &&
          localMutationAt &&
          Date.now() - localMutationAt < 5 * 60 * 1000
        ) {
          const existingCompleted = countCompletedSubtasks(existing.sub_tasks);
          const incomingCompleted = countCompletedSubtasks(normalizedSubTasks);
          if (
            existingCompleted > incomingCompleted ||
            (existing.sub_tasks?.length ?? 0) > normalizedSubTasks.length
          ) {
            normalized.sub_tasks = existing.sub_tasks;
          }
        }

        state.currentTask = normalized;
        // Update the task in the tasks array if it exists
        const index = state.tasks.findIndex((tt) => tt._id === t._id);
        if (index !== -1) {
          state.tasks[index] = normalized;
        } else {
          state.tasks.push(normalized);
        }
        state.error.fetchTasks = null;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading.fetchTasks = false;
        state.error.fetchTasks = action.payload || "Failed to fetch task";
      });

    // Assign User to Task
    builder
      .addCase(assignUserToTask.pending, (state) => {
        state.loading.assignUserToTask = true;
        state.error.assignUserToTask = null;
      })
      .addCase(assignUserToTask.fulfilled, (state, action) => {
        state.loading.assignUserToTask = false;
        // Update the assigned task in the tasks array (replaces any existing assignment)
        const taskIndex = state.tasks.findIndex(
          (task) => task._id === action.payload.task_id,
        );
        if (taskIndex !== -1) {
          // Update assigned_to and assignee when available
          const payload = action.payload as unknown as Record<string, unknown>;
          state.tasks[taskIndex].assigned_to =
            typeof payload.assigned_to === "string" && payload.assigned_to
              ? payload.assigned_to
              : typeof payload.user_id === "string" && payload.user_id
                ? payload.user_id
                : String(payload.assigned_to ?? payload.user_id ?? "");
          if (typeof payload.status === "string") {
            state.tasks[taskIndex].status = payload.status as Task["status"];
          }
          if (payload.assignee && typeof payload.assignee === "object") {
            state.tasks[taskIndex].assignee =
              payload.assignee as unknown as Task["assignee"];
          } else {
            state.tasks[taskIndex].assignee = undefined;
          }
          state.tasks[taskIndex].updated_at = new Date().toISOString();
        }
        // Update current task if it matches
        if (
          state.currentTask &&
          state.currentTask._id === action.payload.task_id
        ) {
          // Update current task assigned_to and assignee when available
          const payload = action.payload as unknown as Record<string, unknown>;
          state.currentTask.assigned_to =
            typeof payload.assigned_to === "string" && payload.assigned_to
              ? payload.assigned_to
              : typeof payload.user_id === "string" && payload.user_id
                ? payload.user_id
                : String(payload.assigned_to ?? payload.user_id ?? "");
          if (typeof payload.status === "string") {
            state.currentTask.status = payload.status as Task["status"];
          }
          if (payload.assignee && typeof payload.assignee === "object") {
            state.currentTask.assignee =
              payload.assignee as unknown as Task["assignee"];
          } else {
            state.currentTask.assignee = undefined;
          }
          state.currentTask.updated_at = new Date().toISOString();
        }
        state.error.assignUserToTask = null;
      })
      .addCase(assignUserToTask.rejected, (state, action) => {
        state.loading.assignUserToTask = false;
        state.error.assignUserToTask =
          action.payload || "Failed to assign user to task";
      });

    // Fetch Assigned Tasks
    builder
      .addCase(fetchAssignedTasks.pending, (state) => {
        state.loading.fetchAssignedTasks = true;
        state.error.fetchAssignedTasks = null;
      })
      .addCase(fetchAssignedTasks.fulfilled, (state, action) => {
        state.loading.fetchAssignedTasks = false;
        // Normalize sub_tasks like in other fetch operations
        const assignedTasks = (action.payload.tasks || []).map((t: Task) => {
          const uiSubTasks = normalizeUiSubTasks(t);

          return {
            ...t,
            id: t._id,
            sub_tasks: uiSubTasks,
            notes: t.notes || [],
            activity: t.activity || [],
          } as Task;
        });

        // Replace tasks with assigned tasks or merge them
        state.tasks = assignedTasks;
        state.error.fetchAssignedTasks = null;
      })
      .addCase(fetchAssignedTasks.rejected, (state, action) => {
        state.loading.fetchAssignedTasks = false;
        state.error.fetchAssignedTasks =
          action.payload || "Failed to fetch assigned tasks";
      });

    // Add Note
    builder
      .addCase(addTaskNote.pending, (state) => {
        state.loading.updateTask = true;
      })
      .addCase(addTaskNote.fulfilled, (state, action) => {
        state.loading.updateTask = false;
        const note = action.payload.note;

        // Update task in tasks array
        const taskIndex = state.tasks.findIndex(
          (t) => t._id === action.meta.arg.task_id,
        );
        if (taskIndex !== -1) {
          if (!state.tasks[taskIndex].notes) {
            state.tasks[taskIndex].notes = [];
          }
          state.tasks[taskIndex].notes!.push(note);
        }

        // Update current task
        if (state.currentTask?._id === action.meta.arg.task_id) {
          if (!state.currentTask.notes) {
            state.currentTask.notes = [];
          }
          state.currentTask.notes.push(note);
        }
      })
      .addCase(addTaskNote.rejected, (state) => {
        state.loading.updateTask = false;
      });

    // Update Note
    builder
      .addCase(updateTaskNote.pending, (state) => {
        state.loading.updateTask = true;
      })
      .addCase(updateTaskNote.fulfilled, (state, action) => {
        state.loading.updateTask = false;
        const { noteId, content } = action.meta.arg;
        const task_id = action.meta.arg.task_id;

        // Update task in tasks array
        const taskIndex = state.tasks.findIndex((t) => t._id === task_id);
        if (taskIndex !== -1 && state.tasks[taskIndex].notes) {
          const noteIndex = state.tasks[taskIndex].notes!.findIndex(
            (n) => n.id === noteId || n._id === noteId,
          );
          if (noteIndex !== -1) {
            state.tasks[taskIndex].notes![noteIndex].content = content;
            state.tasks[taskIndex].notes![noteIndex].updated_at =
              action.payload?.note?.updated_at ||
              (action.payload as any)?.updated_at ||
              new Date().toISOString();
            state.tasks[taskIndex].notes![noteIndex].is_edited = true;
          }
        }

        // Update current task
        if (state.currentTask?._id === task_id && state.currentTask.notes) {
          const noteIndex = state.currentTask.notes.findIndex(
            (n) => n.id === noteId || n._id === noteId,
          );
          if (noteIndex !== -1) {
            state.currentTask.notes[noteIndex].content = content;
            state.currentTask.notes[noteIndex].updated_at =
              action.payload?.note?.updated_at ||
              (action.payload as any)?.updated_at ||
              new Date().toISOString();
            state.currentTask.notes[noteIndex].is_edited = true;
          }
        }
      })
      .addCase(updateTaskNote.rejected, (state) => {
        state.loading.updateTask = false;
      });

    // Delete Note
    builder
      .addCase(deleteTaskNote.pending, (state) => {
        state.loading.updateTask = true;
      })
      .addCase(deleteTaskNote.fulfilled, (state, action) => {
        state.loading.updateTask = false;
        const { noteId } = action.payload;
        const task_id = action.meta.arg.task_id;

        // Update task in tasks array
        const taskIndex = state.tasks.findIndex((t) => t._id === task_id);
        if (taskIndex !== -1 && state.tasks[taskIndex].notes) {
          const note = state.tasks[taskIndex].notes!.find(
            (n) => n.id === noteId || n._id === noteId,
          );
          if (note) {
            note.is_deleted = true;
            note.isDeletedNote = true;
          }
        }

        // Update current task
        if (state.currentTask?._id === task_id && state.currentTask.notes) {
          const note = state.currentTask.notes.find(
            (n) => n.id === noteId || n._id === noteId,
          );
          if (note) {
            note.is_deleted = true;
            note.isDeletedNote = true;
          }
        }
      })
      .addCase(deleteTaskNote.rejected, (state) => {
        state.loading.updateTask = false;
      });
  },
});

export const {
  setSelectedTask,
  setTasks,
  setFilterStatus,
  setFilterPriority,
  setFilterProject,
  setSearchQuery,
  setSortBy,
  setViewMode,
  updateTaskStatus,
  addSubtask,
  updateSubtask,
  removeSubtask,
  clearTaskLocalMutation,
  clearTaskError,
  clearAllTaskErrors,
  resetTaskState,
} = taskSlice.actions;

export default taskSlice.reducer;
