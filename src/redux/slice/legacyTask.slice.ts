import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { invalidatePageCache } from "@/redux/slice/cache.slice";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch, isQueueResponse } from "@/lib/queueAwareFetch";

// Task Types for legacy store compatibility
export type TaskColumn = {
  id: string;
  title: string;
  color: string;
  task_ids: string[];
};

export type SubTask = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  is_deleted?: boolean;
  estimated_hours?: number;
};

export type TaskNote = {
  id: string;
  content: string;
  created_at: string;
  is_deleted?: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
};

export type TaskActivity = {
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
};

export type pull_request = {
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
};

export type LegacyTask = {
  id: string;
  _id?: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low" | "critical";
  status:
    | "todo"
    | "in-progress"
    | "submitted"
    | "completed"
    | "blocked"
    | string;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  assigned_to?: string;
  due_date?: string | Date;
  tags: string[];
  created_at: string | Date;
  completed_at?: string | Date;
  updated_at?: string | Date;
  is_deleted?: boolean;
  project_id: string;
  notes: TaskNote[];
  sub_tasks: SubTask[];
  activity: TaskActivity[];
  linked_pr_id?: string | null;
  linked_pull_request?: pull_request | null;
  comments_count?: number;
  attachments_count?: number;
  // Additional fields from Task interface for full compatibility
  comments?: Array<{
    _id: string;
    user_id: string;
    message: string;
    created_at: Date | string;
  }>;
  attachments?: Array<{
    _id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  time_tracking?: {
    estimated: number;
    logged: number;
    remaining: number;
  };
  dependencies?: string[];
};

export interface LegacyTaskState {
  tasks: LegacyTask[];
  columns: TaskColumn[];
  loading: boolean;
  error: string | null;
}

const initialState: LegacyTaskState = {
  tasks: [],
  columns: [
    { id: "pending", title: "Pending", color: "yellow", task_ids: [] },
    { id: "in-progress", title: "In Progress", color: "blue", task_ids: [] },
    { id: "submitted", title: "Submitted", color: "purple", task_ids: [] },
    { id: "completed", title: "Completed", color: "green", task_ids: [] },
  ],
  loading: false,
  error: null,
};

// Helper functions
const toString = (v: unknown) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined;

const getArray = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v as unknown[];
  }
  return [] as unknown[];
};

const normalizeSubtasks = (raw: unknown): SubTask[] => {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((st: unknown, idx: number) => {
    if (st == null) {
      return {
        id: `sub-${idx}-${Date.now()}`,
        title: "Subtask",
        completed: false,
        created_at: new Date().toISOString(),
      };
    }
    if (typeof st === "string") {
      return {
        id: `sub-${idx}-${Date.now()}`,
        title: st,
        completed: false,
        created_at: new Date().toISOString(),
      };
    }
    const s = st as Record<string, unknown>;
    const title =
      (typeof s.title === "string" && s.title) ||
      (typeof s.name === "string" && s.name) ||
      (typeof s.task_name === "string" && s.task_name) ||
      (typeof s.label === "string" && s.label) ||
      (typeof s.title_text === "string" && s.title_text) ||
      "Subtask";
    const completed = Boolean(s.completed ?? s.done ?? s.isCompleted ?? false);
    const id = toString(s._id) ?? toString(s.id) ?? `sub-${idx}-${Date.now()}`;
    const created_at =
      toString(s.created_at) ??
      toString(s.created_at) ??
      new Date().toISOString();
    const description =
      (typeof s.description === "string" && s.description) ||
      (typeof s.body === "string" && s.body) ||
      (typeof s.desc === "string" && s.desc) ||
      undefined;
    const rawEstimated = s.estimated_hours ?? s.estimated_hours;
    const estimatedNum =
      typeof rawEstimated === "number" ? rawEstimated : Number(rawEstimated);
    const estimated_hours =
      Number.isFinite(estimatedNum) && estimatedNum > 0
        ? estimatedNum
        : undefined;
    const is_deleted = Boolean(
      s.is_deleted ?? s.isDeleted ?? s.deleted ?? false,
    );
    return {
      id: String(id),
      title,
      description,
      completed,
      created_at,
      is_deleted,
      estimated_hours,
    };
  });
};

// Async thunks
export const loadTasks = createAsyncThunk(
  "legacyTask/loadTasks",
  async (project_id: string, { rejectWithValue }) => {
    try {
      const taskRes = await fetch(`/api/project/tasks/${project_id}`);
      if (!taskRes.ok) {
        return rejectWithValue("Failed to load tasks");
      }
      const fetchedTasks = (await taskRes.json()).tasks;

      const normalizedFetchedTasks = (
        Array.isArray(fetchedTasks) ? fetchedTasks : []
      ).map((task: unknown) => {
        const t = (task || {}) as Record<string, unknown>;
        const existingSub = getArray(t, "sub_tasks");
        return {
          ...t,
          sub_tasks: existingSub.length
            ? (existingSub as SubTask[])
            : normalizeSubtasks(t.sub_tasks ?? t.sub_tasks),
        } as unknown as Record<string, unknown>;
      });

      // Try to enrich tasks with external generator data
      try {
        const extListRes = await fetch(
          `${TASK_MGMT_AGENT_URL}/projects/${project_id}/tasks`,
        );
        let extList: unknown[] = [];
        if (extListRes.ok) {
          const raw = await extListRes.json().catch(() => [] as unknown);
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const rec = raw as Record<string, unknown>;
            if (Array.isArray(rec.tasks)) extList = rec.tasks as unknown[];
          } else if (Array.isArray(raw)) {
            extList = raw as unknown[];
          }
        }

        if (!Array.isArray(extList) || extList.length === 0) {
          return { tasks: normalizedFetchedTasks as unknown as LegacyTask[] };
        }

        // Fetch details for each external task
        const detailPromises = extList.map((et: unknown) => {
          const etRec = (et || {}) as Record<string, unknown>;
          const etId =
            toString(etRec.id) ??
            toString(etRec._id) ??
            toString(etRec.task_id);
          if (!etId) return Promise.resolve(null);
          return fetch(`${TASK_MGMT_AGENT_URL}/tasks/${etId}`)
            .then((r) => (r.ok ? r.json().catch(() => null) : null))
            .catch(() => null);
        });

        const details = await Promise.all(detailPromises);

        const mapById = new Map<string, Record<string, unknown>>();
        const mapByTitle = new Map<string, Record<string, unknown>>();
        (details || []).forEach((d: unknown) => {
          if (!d) return;
          const rec = d as Record<string, unknown>;
          const id =
            toString(rec.id) ?? toString(rec._id) ?? toString(rec.task_id);
          if (id) mapById.set(String(id), rec);
          const title = (
            toString(rec.title) ??
            toString(rec.task_name) ??
            toString(rec.name) ??
            ""
          )
            .toLowerCase()
            .trim();
          if (title) mapByTitle.set(title, rec);
        });

        const enriched = (normalizedFetchedTasks || []).map((task: unknown) => {
          const t = (task || {}) as Record<string, unknown>;
          let ext: Record<string, unknown> | null = null;

          const extGen = (t.externalGenerated || undefined) as
            | Record<string, unknown>
            | undefined;
          const candidateExtId =
            toString(t.externalId) ??
            toString(t.external_task_id) ??
            toString(extGen?.id);
          if (candidateExtId && mapById.has(String(candidateExtId))) {
            ext = mapById.get(String(candidateExtId)) ?? null;
          }

          if (!ext) {
            const norm = (toString(t.title) ?? toString(t.name) ?? "")
              .toLowerCase()
              .trim();
            if (norm && mapByTitle.has(norm))
              ext = mapByTitle.get(norm) ?? null;
          }

          if (!ext) return t as unknown as Record<string, unknown>;

          const extSubTasks = normalizeSubtasks(
            ext.sub_tasks ?? ext.sub_tasks ?? [],
          );
          const pr = toString(t.priority) ?? toString(ext.priority) ?? "medium";
          const priorityValue =
            pr === "high" || pr === "medium" || pr === "low" ? pr : "medium";

          return {
            ...t,
            externalGenerated: {
              id: toString(ext.id) ?? toString(ext._id) ?? undefined,
              raw: ext,
            },
            description:
              toString(t.description) ??
              toString(ext.description) ??
              toString(ext.body) ??
              toString(t.description),
            tags:
              Array.isArray(t.tags) && (t.tags as unknown[]).length
                ? (t.tags as unknown[]).map(String)
                : Array.isArray(ext.tags)
                  ? (ext.tags as unknown[]).map(String)
                  : [],
            sub_tasks:
              Array.isArray(t.sub_tasks) && (t.sub_tasks as unknown[]).length
                ? (t.sub_tasks as SubTask[])
                : extSubTasks,
            priority: priorityValue as "high" | "medium" | "low",
            due_date:
              toString(t.due_date) ??
              toString(ext.due_date) ??
              toString(ext.due_date) ??
              toString(t.due_date),
          } as Record<string, unknown>;
        });

        return { tasks: enriched as unknown as LegacyTask[] };
      } catch {
        return { tasks: normalizedFetchedTasks as unknown as LegacyTask[] };
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load tasks",
      );
    }
  },
);

export const moveTaskAsync = createAsyncThunk(
  "legacyTask/moveTask",
  async (
    {
      task_id,
      sourceId,
      destId,
      destIndex,
    }: { task_id: string; sourceId: string; destId: string; destIndex: number },
    { getState, rejectWithValue, dispatch },
  ) => {
    const state = getState() as { legacyTask: LegacyTaskState };
    const { columns, tasks } = state.legacyTask;
    const source = columns.find((col) => col.id === sourceId);
    const dest = columns.find((col) => col.id === destId);
    if (!source || !dest) {
      return rejectWithValue("Invalid source or destination column");
    }

    // Verify the task exists before attempting to move it
    const taskExists = tasks.some((t) => t.id === task_id || t._id === task_id);
    if (!taskExists) {
      return rejectWithValue("Task not found");
    }

    const statusToProgress = (status: string) => {
      switch (status) {
        case "completed":
          return 100;
        case "submitted":
          return 75;
        case "in-progress":
          return 50;
        case "todo":
          return 0;
        case "blocked":
          return 25;
        default:
          return 0;
      }
    };

    try {
      const progress = statusToProgress(destId);
      const { updateExternalTaskProgress } =
        await import("@/lib/externalProgress");
      await updateExternalTaskProgress(task_id, progress, { status: destId });

      await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: destId }),
        }
      );

      dispatch(invalidatePageCache({ resource: "tasks" }));
      return { task_id, sourceId, destId, destIndex };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to move task",
      );
    }
  },
);

export const deleteTaskAsync = createAsyncThunk(
  "legacyTask/deleteTask",
  async (
    { task_id }: { project_id: string; task_id: string },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const res = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        return rejectWithValue("Failed to delete task on server");
      }

      const body = await res.json().catch(() => null);
      if (isQueueResponse(body)) {
        return rejectWithValue("Delete request queued but not yet processed");
      }

      dispatch(invalidatePageCache({ resource: "tasks" }));
      return { task_id };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    }
  },
);

export const addTaskAsync = createAsyncThunk(
  "legacyTask/addTask",
  async (
    {
      columnId,
      task,
    }: {
      project_id: string;
      columnId: string;
      task: {
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
        status: string;
        assignee: {
          id: string;
          name: string;
          avatar: string;
        };
        due_date: string;
        tags: string[];
        project_id: string;
      };
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const newTask = {
        ...task,
        status: columnId,
      };

      const res = await queueAwareFetch(`${TASK_MGMT_AGENT_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      if (!res.ok) {
        return rejectWithValue("Failed to create task");
      }

      const createdTask = await res.json();

      if (isQueueResponse(createdTask)) {
        return rejectWithValue("Task creation is still processing");
      }

      dispatch(invalidatePageCache({ resource: "tasks" }));
      return { columnId, task: createdTask };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create task",
      );
    }
  },
);

const legacyTaskSlice = createSlice({
  name: "legacyTask",
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<LegacyTask[]>) => {
      state.tasks = action.payload;
    },
    updateTask: (
      state,
      action: PayloadAction<{ task_id: string; updates: Partial<LegacyTask> }>,
    ) => {
      const { task_id, updates } = action.payload;
      const index = state.tasks.findIndex((t) => t.id === task_id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...updates };
      }
    },
    deleteColumn: (
      state,
      action: PayloadAction<{ project_id: string; columnId: string }>,
    ) => {
      const { columnId } = action.payload;
      const column = state.columns.find((c) => c.id === columnId);
      state.columns = state.columns.filter((col) => col.id !== columnId);
      if (column) {
        state.tasks = state.tasks.filter(
          (task) => !column.task_ids.includes(task.id),
        );
      }
    },
    addNote: (
      state,
      action: PayloadAction<{
        task_id: string;
        content: string;
        taskMongoId?: string;
      }>,
    ) => {
      const { task_id, content } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        const newNote: TaskNote = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          created_at: new Date().toISOString(),
          author: {
            id: "current-user",
            name: "Current User",
            avatar: "https://placehold.co/30/svg",
          },
        };
        task.notes.push(newNote);
      }
    },
    updateNote: (
      state,
      action: PayloadAction<{
        task_id: string;
        noteId: string;
        content: string;
      }>,
    ) => {
      const { task_id, noteId, content } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        const note = task.notes.find((n) => n.id === noteId);
        if (note) {
          note.content = content;
        }
      }
    },
    deleteNoteFromTask: (
      state,
      action: PayloadAction<{ task_id: string; noteId: string }>,
    ) => {
      const { task_id, noteId } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        task.notes = task.notes.filter((n) => n.id !== noteId);
      }
    },
    addSubTask: (
      state,
      action: PayloadAction<{ task_id: string; title: string }>,
    ) => {
      const { task_id, title } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        const newSubTask: SubTask = {
          id: `subtask-${Date.now()}`,
          title,
          description: "",
          completed: false,
          created_at: new Date().toISOString(),
        };
        task.sub_tasks.push(newSubTask);
      }
    },
    updateSubTask: (
      state,
      action: PayloadAction<{
        task_id: string;
        subtask_id: string;
        updates: Partial<SubTask>;
      }>,
    ) => {
      const { task_id, subtask_id, updates } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        const subTask = task.sub_tasks.find((st) => st.id === subtask_id);
        if (subTask) {
          Object.assign(subTask, updates);
        }
      }
    },
    deleteSubTask: (
      state,
      action: PayloadAction<{ task_id: string; subtask_id: string }>,
    ) => {
      const { task_id, subtask_id } = action.payload;
      const task = state.tasks.find((t) => t.id === task_id);
      if (task) {
        task.sub_tasks = task.sub_tasks.filter((st) => st.id !== subtask_id);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // loadTasks
      .addCase(loadTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        // Update columns with task IDs
        state.columns = state.columns.map((col) => ({
          ...col,
          task_ids: [],
        }));
        action.payload.tasks.forEach((task) => {
          const col = state.columns.find((c) => c.id === task.status);
          if (col) col.task_ids.push(task._id || task.id);
        });
      })
      .addCase(loadTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // moveTaskAsync
      .addCase(moveTaskAsync.fulfilled, (state, action) => {
        const { task_id, sourceId, destId, destIndex } = action.payload;
        const source = state.columns.find((col) => col.id === sourceId);
        const dest = state.columns.find((col) => col.id === destId);
        if (source && dest) {
          source.task_ids = source.task_ids.filter((id) => id !== task_id);
          dest.task_ids.splice(destIndex, 0, task_id);
        }
        const task = state.tasks.find(
          (t) => t.id === task_id || t._id === task_id,
        );
        if (task) {
          task.status = destId;
        }
      })
      // deleteTaskAsync
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        const { task_id } = action.payload;
        state.tasks = state.tasks.filter(
          (t) => t._id !== task_id && t.id !== task_id,
        );
        state.columns = state.columns.map((col) => ({
          ...col,
          task_ids: col.task_ids.filter((id) => id !== task_id),
        }));
      })
      // addTaskAsync
      .addCase(addTaskAsync.fulfilled, (state, action) => {
        const { columnId, task } = action.payload;
        state.tasks.push(task);
        const col = state.columns.find((c) => c.id === columnId);
        if (col) {
          col.task_ids.push(task._id);
        }
      });
  },
});

export const {
  setTasks,
  updateTask,
  deleteColumn,
  addNote,
  updateNote,
  deleteNoteFromTask,
  addSubTask,
  updateSubTask,
  deleteSubTask,
  setLoading,
  setError,
} = legacyTaskSlice.actions;

export default legacyTaskSlice.reducer;
