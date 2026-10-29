import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { updateExternalTaskProgress } from "@/lib/externalProgress";
import { fastAPIAuthService } from "@/lib/fastapi-auth";
import { PLANNER_AGENT_URL, TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { queueAwareFetch } from "@/lib/queueAwareFetch";
import {
  invalidateDetailItemCache,
  invalidatePageCache,
} from "@/redux/slice/cache.slice";
import { assignUserToTask } from "@/redux/slice/task.slice";

// Shared auth: fetch a FastAPI access token and return Authorization header.
// All thunks that call the planner-agent backend MUST include this header
// because the aipm_token cookie (set on the frontend domain) is never sent
// cross-origin to the backend API domain.
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await fastAPIAuthService.getAccessToken();
    if (!token) {
      console.warn("[Auth] No FastAPI access token available — request may fail with 401");
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  } catch (error) {
    console.error("[Auth] Failed to retrieve auth token:", error);
    return {};
  }
}

// ===== ETag Cache Management =====
// Store ETag headers for HTTP 304 Not Modified validation
// Format: Map<projectId, { eTag: string, data: Project }>
const etagCache = new Map<string, { eTag: string; data: Project }>();
const cached_ETags = new Map<string, string>();

const getETag = (projectId: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const key = `project:etag:${projectId}`;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setETag = (projectId: string, eTag: string): void => {
  if (typeof window === "undefined") return;
  try {
    const key = `project:etag:${projectId}`;
    localStorage.setItem(key, eTag);
  } catch {}
};

const getCachedProject = (projectId: string): Project | null => {
  try {
    const key = `project:data:${projectId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setCachedProject = (projectId: string, project: Project): void => {
  if (typeof window === "undefined") return;
  try {
    const key = `project:data:${projectId}`;
    localStorage.setItem(key, JSON.stringify(project));
  } catch {}
};

const clearProjectCache = (projectId: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`project:etag:${projectId}`);
    localStorage.removeItem(`project:data:${projectId}`);
    etagCache.delete(projectId);
    cached_ETags.delete(projectId);
  } catch {}
};

// Normalize project data to ensure all fields are properly typed and coerced
const normalizeProjectData = (project: Project): Project => {
  if (!project) return project;

  return {
    ...project,
    progress: coerce_progress(project.progress),
    tags: Array.isArray(project.tags) ? project.tags : [],
    technologies: Array.isArray(project.technologies)
      ? project.technologies
      : [],
    resources: Array.isArray(project.resources) ? project.resources : [],
    tasks: Array.isArray(project.tasks) ? project.tasks : [],
    team: Array.isArray(project.team) ? project.team : [],
    team_members: Array.isArray(project.team_members)
      ? project.team_members
      : [],
    timeline: Array.isArray(project.timeline) ? project.timeline : [],
    sprints: Array.isArray(project.sprints) ? project.sprints : [],
  };
};

// Backend TeamMember interface (matches Pydantic model: user and role)
export interface BackendTeamMember {
  user: string; // MongoDB User ID
  role: string; // Role name (e.g., "Backend Developer")
}

// Frontend TeamMember interface (with additional display fields)
export interface FrontendTeamMember {
  name: string;
  avatar: string;
  image_url?: string; // Additional avatar field
  profile_picture?: string; // Additional avatar field
  email?: string; // Frontend-only for display
  role?: string; // Frontend-only for display
  user?: string; // Frontend-only for user ID reference
  username?: string; // Frontend-only for display
}

// Project Types
export interface Project {
  _id: string;
  project_id?: string;
  title: string;
  description: string;
  document: string;
  deadline: string;
  tags: string[];
  technologies?: string[];
  status: "planning" | "in-progress" | "completed" | "on-hold" | "deleted";
  progress: number;
  resources: Array<{
    profile: string;
    skills: string[];
    experience: string;
    description: string;
    type: string;
    avatar?: string;
    username?: string;
    name?: string;
    user?: string;
  }>;
  tasks?: string[];
  team?: BackendTeamMember[];
  // Keep team_members for backward compatibility with existing UI components
  team_members?: FrontendTeamMember[];
  timeline?: Array<{
    title: string;
    description: string;
    type: string;
    date: string;
  }>;
  sprints?: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
  assessments?: Array<{
    submission_id?: string;
    assessment_id?: string;
    project_id?: string;
    assessment_title?: string;
    score?: Record<string, any>;
    feedback?: Record<string, any>;
    status?: string;
    submitted_at?: string;
    completed_at?: string;
    user_id?: string;
  }>;
  companyId?: string;
  created_by?: string;
  user: string;
  github_repository?: string;
  created_at: string;
  updated_at: string;
}

// Project Plan Types
export interface ProjectPlanTask {
  task_name: string;
  description: string;
  dependencies: string[];
  estimated_duration: string;
}

export interface ProjectPlanMilestone {
  name: string;
  timeline: string;
}

export interface ProjectPlan {
  _id: string;
  project_id: string;
  summary: string;
  key_features_deliverables: string[];
  major_milestones: ProjectPlanMilestone[];
  high_level_tasks: ProjectPlanTask[];
  updated_at: string;
  created_at: string;
}

// Refined Tasks Types
export interface RefinedTask {
  task_name: string;
  description: string;
  dependencies: string[];
  estimated_duration: string;
  priority: string;
  complexity: string;
  skills_required: string[];
  acceptance_criteria: string[];
  sub_tasks: Array<{
    name: string;
    description: string;
    effort: string;
    technical_requirements: string[];
  }>;
}

export interface refined_tasksResponse {
  project_id: string;
  refined_tasks: RefinedTask[];
  refinement_summary: {
    total_tasks: number;
    high_priority_tasks: number;
    estimated_total_duration: string;
    complexity_breakdown: {
      low: number;
      medium: number;
      high: number;
    };
  };
  updated_at: string;
}

// Create Project Payload Type (matches FastAPI schema)
export interface CreateProjectPayload {
  title: string;
  description: string;
  deadline: string;
  tags: string[];
  document: string;
  status: "planning" | "in-progress" | "completed" | "on-hold";
  tasks?: string[];
  progress: number;
  companyId?: string;
  team?: Array<{
    user: string; // User ID reference (required)
    role: string;
    name?: string;
    email?: string;
    avatar?: string;
  }>;
  sprints?: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
  timeline?: Array<{
    title: string;
    description: string;
    type: string;
    date: string;
  }>;
  resources?: Array<{
    profile: string;
    skills: string[];
    experience: string;
    description: string;
    type: string;
    avatar?: string;
    username?: string;
    name?: string;
    user?: string;
  }>;
  created_by: string; // Who created the project (required, auto-injected from auth)
  user?: string; // Deprecated in favor of created_by
}

// Project Analytics Types
export interface ProjectAnalytics {
  project: {
    title: string;
    progress: number;
    status: string;
    deadline: string;
  };
  taskDistribution: Array<{
    name: string;
    count: number;
  }>;
  velocity: Array<{
    sprint: string;
    points: number;
    completed: number;
  }>;
  burndown: Array<{
    date: string;
    planned: number;
    actual: number;
  }>;
  commits: Array<{
    date: string;
    count: number;
  }>;
  time_tracking: {
    totalEstimated: number;
    totalLogged: number;
    totalRemaining: number;
  };
  teamPerformance: Array<{
    name: string;
    tasksAssigned: number;
    tasksCompleted: number;
    productivity: number;
  }>;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    averageTaskDuration: number;
    teamSize: number;
  };
}

// Project Board Types
export interface BoardColumn {
  id: string;
  title: string;
  task_ids: string[];
  color: string;
}

export interface BoardTask {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  tags: string[];
  comments_count?: number;
  attachments_count?: number;
  linked_pr_id?: string | null;
  sub_tasks: Array<{
    title: string;
    completed: boolean;
    description?: string;
  }>;
  time_tracking: {
    estimated: number;
    logged: number;
    remaining: number;
  };
  created_at: string;
  updated_at: string;
  project_id: string;
}

export interface ProjectBoard {
  project: {
    id: string;
    title: string;
    description: string;
  };
  columns: BoardColumn[];
  tasks: BoardTask[];
  columnOrder: string[];
}

export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  user: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  projectMembers: ProjectMember[];

  // Analytics and Board data
  projectAnalytics: ProjectAnalytics | null;
  projectBoard: ProjectBoard | null;
  projectBoardProjectId: string | null;
  projectBoardsByProjectId: Record<string, ProjectBoard>;
  projectPlan: ProjectPlan | null;
  refined_tasks: refined_tasksResponse | null;

  // Loading States
  loading: {
    fetchProjects: boolean;
    createProject: boolean;
    updateProject: boolean;
    deleteProject: boolean;
    fetchAnalytics: boolean;
    fetchBoard: boolean;
    updateBoard: boolean;
    fetchPlan: boolean;
    fetchPlanFromDB: boolean;
    refineTasks: boolean;
    fetchMembers: boolean;
  };

  // Error States
  error: {
    fetchProjects: string | null;
    createProject: string | null;
    updateProject: string | null;
    deleteProject: string | null;
    fetchAnalytics: string | null;
    fetchBoard: string | null;
    updateBoard: string | null;
    fetchPlan: string | null;
    fetchPlanFromDB: string | null;
    refineTasks: string | null;
    fetchMembers: string | null;
  };

  // UI States
  ui: {
    selectedproject_id: string | null;
    filter_status: string | null;
    search_query: string;
    sort_by: "title" | "deadline" | "progress" | "status";
    sort_order: "asc" | "desc";
  };
  optimisticRollbackTasks?: Record<string, { status: string; project_id: string }>;
  optimisticCreatedTasks?: Record<string, { tempId: string; project_id: string; status: string }>;
}

// Initial state
const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  projectMembers: [],
  projectAnalytics: null,
  projectBoard: null,
  projectBoardProjectId: null,
  projectBoardsByProjectId: {},
  projectPlan: null,
  refined_tasks: null,
  optimisticRollbackTasks: {},
  optimisticCreatedTasks: {},
  loading: {
    fetchProjects: false,
    createProject: false,
    updateProject: false,
    deleteProject: false,
    fetchAnalytics: false,
    fetchBoard: false,
    updateBoard: false,
    fetchPlan: false,
    fetchPlanFromDB: false,
    refineTasks: false,
    fetchMembers: false,
  },
  error: {
    fetchProjects: null,
    createProject: null,
    updateProject: null,
    deleteProject: null,
    fetchAnalytics: null,
    fetchBoard: null,
    updateBoard: null,
    fetchPlan: null,
    fetchPlanFromDB: null,
    refineTasks: null,
    fetchMembers: null,
  },
  ui: {
    selectedproject_id: null,
    filter_status: null,
    search_query: "",
    sort_by: "deadline",
    sort_order: "asc",
  },
};

// Helper function to normalize project data from backend
const coerce_progress = (value: unknown): number => {
  if (value == null) return 0;

  // Handle MongoDB extended JSON number wrappers.
  // Examples: { "$numberDouble": "33.3" }, { "$numberDecimal": "33.33" }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const wrapped =
      record.$numberDouble ??
      record.$numberDecimal ??
      record.$numberInt ??
      record.$numberLong;
    if (typeof wrapped === "string" || typeof wrapped === "number") {
      return coerce_progress(wrapped);
    }
  }

  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const normalize_project = (project: any): Project => {
  // Ensure user field is set (use from created_by if needed)
  const normalizedProject: any = { ...project };

  if (!normalizedProject.companyId && normalizedProject.company_id) {
    normalizedProject.companyId = normalizedProject.company_id;
  }

  if (!normalizedProject.user && normalizedProject.created_by) {
    normalizedProject.user = normalizedProject.created_by;
  }

  // Map datetime fields from snake_case to camelCase

  if (
    normalizedProject.githubRepository &&
    !normalizedProject.github_repository
  ) {
    normalizedProject.github_repository = normalizedProject.githubRepository;
  }

  // Coerce progress to a safe number. Some backends serialize it as a string.
  normalizedProject.progress = coerce_progress(normalizedProject.progress);

  return normalizedProject as Project;
};

// Async Thunks
export const fetchProjects = createAsyncThunk<
  { projects: Project[] },
  void,
  { rejectValue: string }
>("project/fetchProjects", async (_, { rejectWithValue }) => {
  try {
    console.log("Fetching projects from planner-agent API");
    const authHeaders = await getAuthHeaders();
    const backendUrl = PLANNER_AGENT_URL;
    const backendURL = `${backendUrl}/projects`;
    const response = await axios.get(`${backendURL}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      withCredentials: true,
    });

    if (response.status !== 200) {
      const errorData = response.data;
      return rejectWithValue(
        errorData?.message || "Failed to fetch projects from planner-agent",
      );
    }

    const data = response.data;
    console.log("[fetchProjects] Raw API response:", data);

    // Normalize response: accept either { projects: [...] } or an array
    let projectsPayload: Project[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.projects)
        ? data.projects
        : [];

    // Normalize all projects to ensure user field is set and field names are consistent
    projectsPayload = projectsPayload.map(normalize_project);

    console.log(
      `[fetchProjects] Normalized to ${projectsPayload.length} projects`,
    );

    if (projectsPayload.length > 0) {
      console.log("[fetchProjects] First project structure:", {
        keys: Object.keys(projectsPayload[0]),
        _id: projectsPayload[0]._id,
        user: projectsPayload[0].user,
        title: projectsPayload[0].title,
      });

      // Check for any projects without user field
      const noUserField = projectsPayload.filter((p) => !p.user);
      if (noUserField.length > 0) {
        console.warn(
          `[fetchProjects] ${noUserField.length} projects have no user field!`,
          noUserField,
        );
      }
    }

    return { projects: projectsPayload.map((p) => normalize_project(p)) };
  } catch (error) {
    console.error("Fetch Projects Error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch projects",
    );
  }
});

export const createProject = createAsyncThunk<
  { project: Project },
  CreateProjectPayload,
  { rejectValue: string }
>("project/createProject", async (projectData, { rejectWithValue, dispatch }) => {
  try {
    // Use planner-agent to create projects so the Python backend handles
    // enrichment and persistent storage.
    const authHeaders = await getAuthHeaders();
    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(projectData),
      },
    );

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // ignore
      }
      return rejectWithValue(
        errorData?.message || errorData?.detail || "Failed to create project",
      );
    }

    const data = await response.json();
    // Planner-agent may return the created project directly or nested under `project`.
    let projectReturned: Project = data?.project || data;

    // Normalize the returned project to ensure all fields are correct
    projectReturned = normalize_project(projectReturned);

    console.log("Created project via planner-agent:", projectReturned);

    // Invalidate project list cache and dashboard counts
    dispatch(invalidatePageCache({ resource: "projects" }));
    dispatch({ type: "dashboard/forceReinitialization" });

    return { project: projectReturned };
  } catch (error: any) {
    if (error?.status === 401) {
      console.error("[createProject] Received 401 — auth token missing or expired. Ensure user is logged in and fastapi-token route is accessible.");
    }
    return rejectWithValue(
      error?.message || "Failed to create project",
    );
  }
});

export const updateProject = createAsyncThunk<
  { project: Project },
  { id: string; updates: Partial<Project> },
  { rejectValue: string }
>("project/updateProject", async ({ id, updates }, { rejectWithValue, dispatch }) => {
  try {
    const token = await fastAPIAuthService.getAccessToken();
    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      },
    );

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // ignore
      }
      return rejectWithValue(
        errorData?.message || "Failed to update project",
      );
    }

    const data = await response.json();

    // Invalidate cached lists/details and dashboard counts
    dispatch(invalidatePageCache({ resource: "projects" }));
    dispatch(invalidateDetailItemCache({ resource: "projects", id }));
    dispatch({ type: "dashboard/forceReinitialization" });

    return { project: data?.project || data };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update project",
    );
  }
});

export const deleteProject = createAsyncThunk<
  { id: string },
  string,
  { rejectValue: string }
>("project/deleteProject", async (id, { rejectWithValue, dispatch }) => {
  try {
    // Call planner-agent delete endpoint so Python backend removes project and related data
    console.log(`Deleting project via planner-agent: ${id}`);
    const authHeaders = await getAuthHeaders();
    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      },
    );

    if (!response.ok) {
      let err;
      try {
        err = await response.json();
      } catch (e) {
        // ignore
      }
      return rejectWithValue(
        err?.message ||
          err?.detail ||
          `Failed to delete project (status ${response.status})`,
      );
    }

    console.log(
      "Planner-agent delete response:",
      response.status,
    );

    // Invalidate caches and dashboard statistics
    dispatch(invalidatePageCache({ resource: "projects" }));
    dispatch(invalidateDetailItemCache({ resource: "projects", id }));
    dispatch({ type: "dashboard/forceReinitialization" });

    return { id };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete project",
    );
  }
});

// =====================================================================
// Team & Resource Management Thunks
// =====================================================================

export interface TeamUpdatePayload {
  team: BackendTeamMember[];
  team_members: FrontendTeamMember[];
}

/**
 * Update project team members (add or remove).
 * This is called from ProjectDetailClient after the component validates
 * the user and builds the updated team arrays locally.
 */
export const updateProjectTeam = createAsyncThunk<
  { project: Project },
  { id: string; team: BackendTeamMember[]; team_members: FrontendTeamMember[] },
  { rejectValue: string }
>("project/updateProjectTeam", async ({ id, team, team_members }, { rejectWithValue, dispatch }) => {
  try {
    const response = await fetch(`/api/project/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ team, team_members }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.error as string ||
          (err as Record<string, unknown>)?.message as string ||
          `Failed to update project team (status ${response.status})`,
      );
    }

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const updatedProject = (payload?.project || payload) as Project;

    // Sync Redux state by re-fetching full project from backend
    void dispatch(fetchProjectById(id));

    // Invalidate caches so list views and boards refresh
    dispatch(invalidateDetailItemCache({ resource: "projects", id }));
    dispatch(invalidatePageCache({ resource: "projects" }));
    dispatch({ type: "dashboard/forceReinitialization" });

    return { project: updatedProject };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update project team",
    );
  }
});

/**
 * Link a GitHub repository to a project and sync commits.
 */
export const linkProjectRepo = createAsyncThunk<
  { synced: boolean },
  { project_id: string; repoPath: string },
  { rejectValue: string }
>("project/linkProjectRepo", async ({ project_id, repoPath }, { rejectWithValue, dispatch }) => {
  try {
    const [owner = "", repoName = ""] = repoPath.split("/");
    const token = await fastAPIAuthService.getAccessToken();

    // First update the project with the repo path
    const projectUpdate = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ github_repository: repoPath }),
      },
    );

    if (!projectUpdate.ok) {
      const err = await projectUpdate.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.message as string || "Failed to link repository",
      );
    }

    // Then sync commits
    const syncRes = await queueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/sync-commits?username=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!syncRes.ok) {
      console.warn("Repo linked but commit sync may have failed");
    }

    dispatch(invalidateDetailItemCache({ resource: "projects", id: project_id }));
    dispatch(invalidatePageCache({ resource: "projects" }));
    dispatch({ type: "dashboard/forceReinitialization" });

    return { synced: syncRes.ok };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to link repository",
    );
  }
});

/**
 * Generate tasks for a project via the task management agent.
 */
export const generateProjectTasks = createAsyncThunk<
  { tasks: Record<string, unknown>[] },
  string,
  { rejectValue: string }
>("project/generateProjectTasks", async (project_id, { rejectWithValue, dispatch }) => {
  try {
    console.log("🔍 QUEUE_COMPLETED — generateProjectTasks polling finished");
    const response = await queueAwareFetch(
      `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/generate-tasks`,
      { method: "POST" },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return rejectWithValue(
        (err as Record<string, unknown>)?.message as string || "Failed to generate tasks",
      );
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    const tasks = Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
    console.log("🔍 RESULT_RECEIVED — generateProjectTasks got:", tasks.length, "tasks");
    console.log("🔍 THUNK_RESOLVED — generateProjectTasks fulfilled");

    dispatch(invalidatePageCache({ resource: "tasks" }));
    dispatch(invalidatePageCache({ resource: "projects" }));
    console.log("🔍 REDUX_UPDATED — cache invalidated for tasks, projects");
    dispatch({ type: "dashboard/forceReinitialization" });

    return { tasks: tasks as Record<string, unknown>[] };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to generate tasks",
    );
  }
});

export const fetchProjectById = createAsyncThunk<
  { project: Project },
  string | { id: string; bypassCache?: boolean },
  { rejectValue: string }
>("project/fetchProjectById", async (payload, { rejectWithValue }) => {
  // Extract id and bypassCache at function level so they're available in catch block
  const id = typeof payload === "string" ? payload : payload.id;
  const bypassCache =
    typeof payload === "object" && payload.bypassCache === true;

  try {
    console.log(
      `Fetching project description from planner-agent for ID: ${id}${bypassCache ? " (bypass cache)" : ""}`,
    );
    const plannerProjectUrl = `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(id)}`;

    const cachedETag = bypassCache ? null : getETag(id);
    const cachedProject = bypassCache ? null : getCachedProject(id);

    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (cachedETag && !bypassCache) {
      headers["If-None-Match"] = cachedETag;
    }

    const response = await axios.get(plannerProjectUrl, {
      headers,
      withCredentials: true,
    });

    if (response.status === 304 && cachedProject && !bypassCache) {
      console.log("✅ Using cached project data (ETag validation passed)");
      return { project: normalizeProjectData(cachedProject) };
    }

    if (response.status !== 200) {
      return rejectWithValue(
        response.data?.message || "Failed to fetch project description",
      );
    }

    const data = response.data?.project || response.data;

    const project: Project = {
      _id: data._id || id,
      title: data.title || data.name || "",
      description: data.description || data.summary || "",
      document: data.document || "",
      deadline: data.deadline || data.due_date || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      technologies: Array.isArray(data.technologies) ? data.technologies : [],
      status:
        typeof data.status === "string"
          ? (data.status as Project["status"])
          : "planning",
      progress: coerce_progress(data.progress),
      resources: data.resources || [],
      // If API doesn't return tasks/timeline/sprints, only preserve from cache if not bypassing cache
      tasks:
        Array.isArray(data.tasks) && data.tasks.length > 0
          ? data.tasks
          : !bypassCache
            ? cachedProject?.tasks || []
            : [],
      team: data.team || [],
      team_members: data.team_members || [],
      timeline:
        Array.isArray(data.timeline) && data.timeline.length > 0
          ? data.timeline
          : !bypassCache
            ? cachedProject?.timeline || []
            : [],
      sprints:
        Array.isArray(data.sprints) && data.sprints.length > 0
          ? data.sprints
          : !bypassCache
            ? cachedProject?.sprints || []
            : [],
      user: data.user || "",
      github_repository: data.github_repository || data.githubRepository || "",
      created_at:
        data.created_at || data.created_at || new Date().toISOString(),
      updated_at:
        data.updated_at || data.updated_at || new Date().toISOString(),
    };

    // Fallback: re-fetch from planner API if project resources are empty
    if (!project.resources || project.resources.length === 0) {
      console.log(
        "Resources missing from planner-agent, retrying planner-agent fetch...",
      );
      try {
        const localResponse = await axios.get(plannerProjectUrl, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          withCredentials: true,
        });
        if (localResponse.status === 200) {
          const localProject = localResponse.data.project || localResponse.data;
          if (localProject.resources && localProject.resources.length > 0) {
            project.resources = localProject.resources;
          }
          if (!project.team_members || project.team_members.length === 0) {
            project.team_members = localProject.team_members || [];
          }
        }
      } catch (localError) {
        console.error("Failed to fetch from local API:", localError);
      }
    }

    // Only cache if not bypassing cache
    if (!bypassCache) {
      const eTag = response.headers["etag"] as string;
      if (eTag) {
        setETag(id, eTag);
        setCachedProject(id, project);
      }
    }

    return { project: normalizeProjectData(project) };
  } catch (error: any) {
    if (error.response?.status === 304 && !bypassCache) {
      const cachedProject = getCachedProject(id);
      if (cachedProject)
        return { project: normalizeProjectData(cachedProject) };
    }

    const cachedProject = getCachedProject(id);
    if (cachedProject) {
      console.warn("API failed, falling back to cached project data");
      return { project: normalizeProjectData(cachedProject) };
    }

    try {
      // Retry the same planner-agent URL as a fallback in case the first attempt
      // failed due to a transient network issue (not a different URL or config).
      const fallbackAuthHeaders = await getAuthHeaders();
      const localResponse = await axios.get(
        `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(id)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...fallbackAuthHeaders,
          },
          withCredentials: true,
        },
      );
      if (localResponse.status === 200) {
        const localData = localResponse.data.project || localResponse.data;
        const project: Project = {
          _id: localData._id || id,
          title: localData.title || "",
          description: localData.description || "",
          document: localData.document || "",
          deadline: localData.deadline || "",
          tags: Array.isArray(localData.tags) ? localData.tags : [],
          technologies: Array.isArray(localData.technologies)
            ? localData.technologies
            : [],
          status:
            typeof localData.status === "string"
              ? (localData.status as Project["status"])
              : "planning",
          progress:
            typeof localData.progress === "number" ? localData.progress : 0,
          resources: localData.resources || [],
          tasks: localData.tasks || [],
          team: localData.team || [],
          team_members: localData.team_members || [],
          timeline: localData.timeline || [],
          sprints: localData.sprints || [],
          user: localData.user || "",
          created_at: localData.created_at || new Date().toISOString(),
          updated_at: localData.updated_at || new Date().toISOString(),
        };
        return { project: normalizeProjectData(project) };
      }
    } catch (localError) {
      console.error("Local API fallback also failed:", localError);
    }

    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch project",
    );
  }
});

export const fetchProjectPlan = createAsyncThunk<
  { plan: ProjectPlan },
  string,
  { rejectValue: string }
>("project/fetchPlan", async (project_id, { rejectWithValue }) => {
  try {
    console.log(`🚀 Fetching project plan for ID: ${project_id}`);
    const authHeaders = await getAuthHeaders();

    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch (e) {}
      return rejectWithValue(
        errData?.message || "Failed to fetch project plan",
      );
    }

    const data = await response.json();
    console.log("✅ Project plan fetched successfully:", data);

    // Transform the response to match our ProjectPlan interface
    const projectPlan: ProjectPlan = {
      _id: data._id || `temp-${Date.now()}`, // Generate a temporary ID if not provided
      project_id: project_id,
      summary: data.summary,
      key_features_deliverables: data.key_features_deliverables,
      major_milestones: data.major_milestones,
      high_level_tasks: data.high_level_tasks,
      updated_at: data.updated_at,
      created_at: data.created_at,
    };

    return { plan: projectPlan };
  } catch (error) {
    console.error("❌ Failed to fetch project plan:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch project plan",
    );
  }
});

// Fetch Project Plan from MongoDB
export const fetchProjectPlanFromDB = createAsyncThunk<
  { plan: ProjectPlan },
  string,
  { rejectValue: string }
>("project/fetchPlanFromDB", async (project_id, { rejectWithValue }) => {
  try {
    console.log(`🚀 Fetching project plan from DB for ID: ${project_id}`);
    const authHeaders = await getAuthHeaders();

    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/projects/${encodeURIComponent(project_id)}/plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      // try to read body safely
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        try {
          errorData = await response.text();
        } catch {
          errorData = null;
        }
      }
      let parsedMsg = `Failed to fetch project plan from database (status ${response.status})`;
      if (errorData && typeof errorData === "object") {
        const rec = errorData as Record<string, unknown>;
        if (typeof rec.message === "string") parsedMsg = rec.message;
        else if (typeof rec.detail === "string") parsedMsg = rec.detail;
      } else if (typeof errorData === "string") {
        parsedMsg = errorData;
      }
      return rejectWithValue(parsedMsg);
    }

    const data = await response.json().catch(() => null);
    console.log("✅ Project plan fetched from DB successfully:", data);

    // Planner-agent may return either { plan: { ... } } or the plan object directly.
    const planObj = data && data.plan ? data.plan : data;
    if (!planObj) {
      return rejectWithValue("Failed to parse project plan from response");
    }

    return { plan: planObj };
  } catch (error) {
    console.error("❌ Failed to fetch project plan from DB:", error);
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch project plan from database",
    );
  }
});

// Refine Project Tasks
export const refineProjectTasks = createAsyncThunk<
  { refined_tasks: refined_tasksResponse },
  string,
  { rejectValue: string }
>("project/refineTasks", async (project_id, { rejectWithValue, dispatch }) => {
  try {
    console.log(`🚀 Refining tasks for project ID: ${project_id}`);
    const token = await fastAPIAuthService.getAccessToken();

    console.log("🔍 QUEUE_COMPLETED — refineProjectTasks polling finished");
    const response = await queueAwareFetch(
      `${PLANNER_AGENT_URL}/refine-tasks/${encodeURIComponent(project_id)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      },
      // Wait up to 90s for backend queue to finish (Planner Agent has 90s internal timeout)
      { maxPollAttempts: 45, pollIntervalMs: 2000 },
    );

    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch (e) {}
      return rejectWithValue(
        errData?.message || "Failed to refine project tasks",
      );
    }

    const data = await response.json();
    console.log("🔍 RESULT_RECEIVED — refineProjectTasks got:", data);
    console.log("🔍 THUNK_RESOLVED — refineProjectTasks fulfilled");

    dispatch(invalidateDetailItemCache({ resource: "projects", id: project_id }));
    dispatch(invalidatePageCache({ resource: "tasks" }));
    dispatch(invalidatePageCache({ resource: "projects" }));
    console.log("🔍 REDUX_UPDATED — cache invalidated for tasks, projects");
    dispatch({ type: "dashboard/forceReinitialization" });

    return { refined_tasks: data };
  } catch (error: any) {
    console.error("❌ Failed to refine project tasks:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to refine project tasks",
    );
  }
});

// Fetch Project Analytics
export const fetchProjectAnalytics = createAsyncThunk<
  { analytics: ProjectAnalytics },
  string,
  { rejectValue: string }
>("project/fetchAnalytics", async (project_id, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/project/${project_id}/analytics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.message || "Failed to fetch project analytics",
      );
    }

    const data = await response.json();
    return { analytics: data.analytics };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch project analytics",
    );
  }
});

// Fetch Project Board
export const fetchProjectBoard = createAsyncThunk<
  { board: ProjectBoard },
  string,
  { rejectValue: string }
>("project/fetchBoard", async (project_id, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/project/${project_id}/board?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return rejectWithValue(
        errorData.message || "Failed to fetch project board",
      );
    }

    const data = await response.json();
    return { board: data.board };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch project board",
    );
  }
});

// Fetch Project Members
export const fetchProjectMembers = createAsyncThunk<
  { members: ProjectMember[] },
  string,
  { rejectValue: string }
>("project/fetchMembers", async (project_id, { rejectWithValue }) => {
  try {
    const response = await fetch(
      `/api/project/${project_id}/members?t=${Date.now()}`,
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
      // Check if response is JSON or HTML
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.message ||
            errorData.error ||
            "Failed to fetch project members",
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
    const members = Array.isArray(data)
      ? data
      : Array.isArray(data?.members)
        ? data.members
        : [];
    return { members };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unexpected token")) {
        return rejectWithValue(
          "Authentication required. Please refresh the page and try again.",
        );
      }
      return rejectWithValue(error.message);
    }
    return rejectWithValue("Failed to fetch project members");
  }
});

// Update Task Status in Board
export const updateTaskStatusInBoard = createAsyncThunk<
  {
    project_id: string;
    task_id: string;
    newStatus: string;
    projectProgress?: number;
    projectStatus?: Project["status"];
  },
  {
    project_id: string;
    task_id: string;
    newStatus: string;
    newPosition?: number;
  },
  { rejectValue: string }
>(
  "project/updateTaskStatus",
  async (
    { project_id, task_id, newStatus, newPosition },
    { rejectWithValue, dispatch },
  ) => {
    try {
      let projectProgress: number | undefined;
      let projectStatus: Project["status"] | undefined;

      // Call the board PATCH endpoint FIRST. It proxies to the task-mgmt-agent,
      // validates workflow transitions, checks RBAC, and updates the task status.
      // DO NOT call updateExternalTaskProgress beforehand — it would mutate the
      // task status in MongoDB before the PATCH handler reads it, causing the
      // workflow validation to fail with 400 ("Tasks can move to Completed only from Submitted").
      const token = await fastAPIAuthService.getAccessToken();
      const response = await queueAwareFetch(`/api/project/${project_id}/board`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ task_id, newStatus, newPosition }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(
          errorData.error ||
            errorData.message ||
            "Failed to update task status",
        );
      }

      // The fulfilled reducer already updates the board state locally via
      // updateBoardObject — no background re-fetches here. Fire-and-forget
      // GET requests (fetchProjectBoard / fetchTasksByProject) would race
      // with the local update and could overwrite the correct status with
      // stale API data, forcing the user to refresh.
      dispatch(invalidateDetailItemCache({ resource: "tasks", id: task_id }));
      dispatch(
        invalidateDetailItemCache({ resource: "projects", id: project_id }),
      );
      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "projects" }));

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });

      return { project_id, task_id, newStatus, projectProgress, projectStatus };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update task status",
      );
    }
  },
);

// Delete Task from Board
export const deleteTaskFromBoard = createAsyncThunk<
  { task_id: string; project_id: string },
  { project_id: string; task_id: string },
  { rejectValue: string }
>(
  "project/deleteTask",
  async ({ project_id, task_id }, { rejectWithValue, dispatch }) => {
    try {
      const response = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_id)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to delete task");
      }

      // Backend recalculates project progress/status based on active tasks.
      // Refetch project so UI progress bars update immediately.
      try {
        void dispatch(fetchProjectById(project_id));
      } catch {
        // Non-blocking: deletion succeeded even if refresh fails
      }

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });

      return { task_id, project_id };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    }
  },
);
// Create Task in Board
export const createTaskInBoard = createAsyncThunk<
  { task: BoardTask },
  {
    project_id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low" | "critical";
    status: string;
    due_date?: string;
    tags?: string[];
    sub_tasks?: Array<{
      title: string;
      completed?: boolean;
      description?: string;
    }>;
  },
  { rejectValue: string }
>(
  "project/createTask",
  async (
    {
      project_id,
      title,
      description,
      priority,
      status,
      due_date,
      tags,
      sub_tasks,
    },
    { rejectWithValue, dispatch },
  ) => {
    try {
      if (!due_date) {
        return rejectWithValue("Please select a due date");
      }

      const token = await fastAPIAuthService.getAccessToken();
      const response = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/projects/${encodeURIComponent(project_id)}/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title,
            description,
            priority,
            status,
            // Use canonical camelCase for backend
            due_date: new Date(due_date).toISOString(),
            sub_tasks: Array.isArray(sub_tasks)
              ? sub_tasks.map((st) => ({
                  title: st.title,
                  description: st.description || "",
                  estimated_hours: 1,
                  status: st.completed ? "completed" : "pending",
                }))
              : [],
            // tags are currently UI-only; agent ignores unknown fields
            tags: tags || [],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to create task");
      }

      const data = (await response.json().catch(() => ({}))) as any;
      const raw = data?.task ?? data;

      const normalizeStatus = (s: unknown) => {
        const v = String(s ?? "")
          .trim()
          .toLowerCase();
        if (v === "completed" || v === "done" || v === "complete")
          return "completed";
        if (v === "blocked") return "blocked";
        if (
          v === "in-progress" ||
          v === "in_progress" ||
          v === "inprogress" ||
          v === "in progress"
        )
          return "in-progress";
        if (
          v === "todo" ||
          v === "pending" ||
          v === "not-started" ||
          v === "to-do" ||
          v === "to do"
        )
          return "todo";
        return v || "todo";
      };

      const toIso = (x: unknown) => {
        if (!x) return undefined;
        const d = new Date(String(x));
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      };

      const rawSubTasks =
        (Array.isArray(raw?.sub_tasks) && raw.sub_tasks) ||
        (Array.isArray(raw?.sub_tasks) && raw.sub_tasks) ||
        [];
      const mappedSubtasks = rawSubTasks.map((st: any) => ({
        title: String(st?.title ?? st?.name ?? "Subtask"),
        description:
          typeof st?.description === "string" ? st.description : undefined,
        completed:
          typeof st?.completed === "boolean"
            ? st.completed
            : String(st?.status ?? "").toLowerCase() === "completed",
      }));

      const created_at =
        toIso(raw?.created_at ?? raw?.created_at) ?? new Date().toISOString();
      const updated_at =
        toIso(raw?.updated_at ?? raw?.updated_at) ?? created_at;
      const dueIso = toIso(raw?.due_date ?? raw?.due_date);

      const task: BoardTask = {
        id: String(raw?.id ?? raw?._id ?? ""),
        title: String(raw?.title ?? title),
        description: String(raw?.description ?? description ?? ""),
        status: normalizeStatus(raw?.status ?? status),
        priority: String(raw?.priority ?? priority ?? "medium"),
        assigned_to: raw?.assigned_to ?? raw?.assigned_to,
        due_date: dueIso,
        tags: Array.isArray(raw?.tags) ? raw.tags : tags || [],
        sub_tasks: mappedSubtasks,
        time_tracking: raw?.time_tracking || {
          estimated: 0,
          logged: 0,
          remaining: 0,
        },
        created_at,
        updated_at,
        project_id: String(raw?.project_id ?? raw?.project_id ?? project_id),
      };

      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "projects" }));
      dispatch(invalidateDetailItemCache({ resource: "projects", id: project_id }));

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });

      console.log("[createTaskInBoard] REDUX_UPDATED", { task_id: task.id, project_id });

      // Invalidate SWR caches so SWR-powered components also refetch
      try {
        const { mutate } = await import("swr");
        await Promise.allSettled([
          mutate((key) => typeof key === "string" && key.includes("task")),
          mutate((key) => typeof key === "string" && key.includes("project")),
        ]);
        console.log("[createTaskInBoard] SWR_INVALIDATED");
      } catch {
        // SWR might not be installed or available — non-critical
      }

      return { task };
    } catch (error) {
      console.error("[createTaskInBoard] THUNK_REJECTED", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create task",
      );
    }
  },
);

// Update Task in Board
export const updateTaskInBoard = createAsyncThunk<
  { task: BoardTask },
  {
    task_id: string;
    title?: string;
    description?: string;
    priority?: "high" | "medium" | "low" | "critical";
    status?: string;
    due_date?: string;
    tags?: string[];
  },
  { rejectValue: string }
>(
  "project/updateTask",
  async (
    { task_id, title, description, priority, status, due_date, tags },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) updates.status = status;
      if (due_date !== undefined) {
        // Use canonical camelCase for backend
        updates.due_date = new Date(due_date).toISOString();
      }
      if (tags !== undefined) updates.tags = tags;

      const response = await queueAwareFetch(
        `${TASK_MGMT_AGENT_URL}/tasks/${encodeURIComponent(task_id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to update task");
      }

      const data = (await response.json().catch(() => ({}))) as any;

      // Handle queue-based responses from the backend.
      // When the queue system is enabled, the backend may return
      // {"status": "processing"|"completed"|..., "request_id": "...", ...} with HTTP 200.
      // Treat as success and return a synthetic task with the applied updates.
      if (
        data &&
        typeof data === "object" &&
        data.request_id &&
        !data.task
      ) {
        console.log("[project/updateTask] Queue response (status=" + data.status + "), treating as success for task:", task_id);
        dispatch(invalidatePageCache({ resource: "tasks" }));
        dispatch(invalidatePageCache({ resource: "projects" }));
        dispatch({ type: "dashboard/forceReinitialization" });
        // Build a minimal BoardTask from the updates we sent
        const syntheticTask: BoardTask = {
          id: task_id,
          _id: task_id,
          title: title ?? "",
          description: description ?? "",
          status: status ?? "todo",
          priority: priority ?? "medium",
          assigned_to: undefined,
          due_date: due_date ? new Date(due_date).toISOString() : undefined,
          tags: tags || [],
          sub_tasks: [],
          time_tracking: { estimated: 0, logged: 0, remaining: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          project_id: "",
        };
        return { task: syntheticTask };
      }

      const raw = data?.task ?? data;

      const normalizeStatus = (s: unknown) => {
        const v = String(s ?? "")
          .trim()
          .toLowerCase();
        if (v === "completed" || v === "done" || v === "complete")
          return "completed";
        if (v === "blocked") return "blocked";
        if (
          v === "in-progress" ||
          v === "in_progress" ||
          v === "inprogress" ||
          v === "in progress"
        )
          return "in-progress";
        if (
          v === "todo" ||
          v === "pending" ||
          v === "not-started" ||
          v === "to-do" ||
          v === "to do"
        )
          return "todo";
        return v || "todo";
      };

      const toIso = (x: unknown) => {
        if (!x) return undefined;
        const d = new Date(String(x));
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      };

      const rawSubTasks =
        (Array.isArray(raw?.sub_tasks) && raw.sub_tasks) ||
        (Array.isArray(raw?.sub_tasks) && raw.sub_tasks) ||
        [];
      const mappedSubtasks = rawSubTasks.map((st: any) => ({
        title: String(st?.title ?? st?.name ?? "Subtask"),
        description:
          typeof st?.description === "string" ? st.description : undefined,
        completed:
          typeof st?.completed === "boolean"
            ? st.completed
            : String(st?.status ?? "").toLowerCase() === "completed",
      }));

      const created_at =
        toIso(raw?.created_at ?? raw?.created_at) ?? new Date().toISOString();
      const updated_at =
        toIso(raw?.updated_at ?? raw?.updated_at) ?? created_at;
      const dueIso = toIso(raw?.due_date ?? raw?.due_date);

      const normalized: BoardTask = {
        id: String(raw?.id ?? raw?._id ?? task_id),
        _id: String(raw?._id ?? raw?.id ?? task_id),
        title: String(raw?.title ?? title ?? ""),
        description: String(raw?.description ?? description ?? ""),
        status: normalizeStatus(raw?.status ?? status),
        priority: String(raw?.priority ?? priority ?? "medium"),
        assigned_to: raw?.assigned_to ?? raw?.assigned_to,
        due_date: dueIso,
        tags: Array.isArray(raw?.tags) ? raw.tags : tags || [],
        sub_tasks: mappedSubtasks,
        time_tracking: raw?.time_tracking || {
          estimated: 0,
          logged: 0,
          remaining: 0,
        },
        created_at,
        updated_at,
        project_id: raw?.project_id ?? raw?.project_id ?? (raw as any)?.project ?? "",
      };

      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "projects" }));
      if (normalized.project_id) {
        dispatch(invalidateDetailItemCache({ resource: "projects", id: normalized.project_id }));
      }

      // Invalidate dashboard so overview re-fetches fresh aggregated data
      dispatch({ type: "dashboard/forceReinitialization" });

      return { task: normalized };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update task",
      );
    }
  },
);

// NEW: Fetch projects from unified /api/student/projects endpoint with caching
export const fetchProjectsFromUnified = createAsyncThunk<
  { projects: Project[]; total: number; hasMore: boolean },
  { status?: string; search?: string; limit?: number; skip?: number },
  { rejectValue: string }
>(
  "project/fetchProjectsFromUnified",
  async ({ status, search, limit = 100, skip = 0 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      params.append("limit", String(limit));
      params.append("skip", String(skip));

      const response = await fetch(
        `/api/user/student/projects?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          (errorData as any)?.error || "Failed to fetch projects",
        );
      }

      const data = await response.json();
      const projects = (data.projects || []).map(normalize_project);

      return {
        projects,
        total: data.total || projects.length,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch projects",
      );
    }
  },
);

// NEW: Fetch single project detail from /api/student/projects/[projectId]
export const fetchProjectDetailFromUnified = createAsyncThunk<
  { project: Project },
  string,
  { rejectValue: string }
>(
  "project/fetchProjectDetailFromUnified",
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/user/student/projects/${projectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          (errorData as any)?.error || "Failed to fetch project",
        );
      }

      const data = await response.json();
      const project = normalize_project(data.project);

      return { project };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch project",
      );
    }
  },
);

// NEW: Fetch projects for college from /api/college/projects
export const fetchCollegeProjectsFromUnified = createAsyncThunk<
  { projects: Project[]; total: number; hasMore: boolean },
  { status?: string; search?: string; limit?: number; skip?: number },
  { rejectValue: string }
>(
  "project/fetchCollegeProjectsFromUnified",
  async ({ status, search, limit = 100, skip = 0 }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      params.append("limit", String(limit));
      params.append("skip", String(skip));

      const response = await fetch(
        `/api/college/projects?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          (errorData as any)?.error || "Failed to fetch college projects",
        );
      }

      const data = await response.json();
      const projects = (data.projects || []).map(normalize_project);

      return {
        projects,
        total: data.total || projects.length,
        hasMore: data.hasMore || false,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch college projects",
      );
    }
  },
);

// NEW: Fetch single college project detail
export const fetchCollegeProjectDetailFromUnified = createAsyncThunk<
  { project: Project },
  string,
  { rejectValue: string }
>(
  "project/fetchCollegeProjectDetailFromUnified",
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/college/projects/${projectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          (errorData as any)?.error || "Failed to fetch college project",
        );
      }

      const data = await response.json();
      const project = normalize_project(data.project);

      return { project };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch college project",
      );
    }
  },
);

// Project Slice
const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    // Clear project cache (ETag and localStorage)
    clearProjectCacheStorage: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      clearProjectCache(projectId);
      console.log("✅ Cleared project cache for:", projectId);
    },

    patchProjectProgressStatus: (
      state,
      action: PayloadAction<{
        project_id: string;
        progress?: number;
        status?: Project["status"];
      }>,
    ) => {
      const { project_id, progress, status } = action.payload;

      const patchProject = (p: Project) => {
        if (typeof progress === "number") p.progress = progress;
        if (typeof status === "string") p.status = status;
        p.updated_at = new Date().toISOString();
      };

      const listProject = state.projects.find(
        (p) => p._id === project_id || p.project_id === project_id,
      );
      if (listProject) patchProject(listProject);

      if (
        state.currentProject &&
        (state.currentProject._id === project_id ||
          state.currentProject.project_id === project_id)
      ) {
        patchProject(state.currentProject);
      }
    },
    // UI Actions
    setSelectedProject: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedproject_id = action.payload;
      state.currentProject =
        state.projects.find((p) => p._id === action.payload) || null;
    },

    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      if (!state.ui.selectedproject_id && action.payload.length > 0) {
        state.ui.selectedproject_id = action.payload[0]._id;
      }
    },

    setFilterStatus: (state, action: PayloadAction<string | null>) => {
      state.ui.filter_status = action.payload;
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.ui.search_query = action.payload;
    },

    setSortBy: (
      state,
      action: PayloadAction<{
        sort_by: ProjectState["ui"]["sort_by"];
        sort_order: ProjectState["ui"]["sort_order"];
      }>,
    ) => {
      state.ui.sort_by = action.payload.sort_by;
      state.ui.sort_order = action.payload.sort_order;
    },

    clearProjectError: (
      state,
      action: PayloadAction<keyof ProjectState["error"]>,
    ) => {
      state.error[action.payload] = null;
    },

    clearAllProjectErrors: (state) => {
      Object.keys(state.error).forEach((key) => {
        state.error[key as keyof ProjectState["error"]] = null;
      });
    },

    removeTaskFromBoard: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      if (state.projectBoard) {
        state.projectBoard.tasks = state.projectBoard.tasks.filter(
          (task) => task.id !== taskId,
        );
        // Also remove from columns
        state.projectBoard.columns = state.projectBoard.columns.map((col) => ({
          ...col,
          task_ids: col.task_ids.filter((id) => id !== taskId),
        }));
      }

      // Also search and remove from all cached project boards
      Object.keys(state.projectBoardsByProjectId).forEach((projectId) => {
        const board = state.projectBoardsByProjectId[projectId];
        if (board) {
          board.tasks = board.tasks.filter((task) => task.id !== taskId);
          board.columns = board.columns.map((col) => ({
            ...col,
            task_ids: col.task_ids.filter((id) => id !== taskId),
          }));
        }
      });
    },

    addTaskToBoard: (state, action: PayloadAction<BoardTask>) => {
      const task = action.payload;
      const projectId = task.project_id || state.projectBoardProjectId;
      if (!projectId) return;

      // Update the cache map first if it exists
      if (state.projectBoardsByProjectId[projectId]) {
        const cachedBoard = state.projectBoardsByProjectId[projectId];
        if (!cachedBoard.tasks.some((t) => t.id === task.id)) {
          cachedBoard.tasks.push(task);
        }
        const column = cachedBoard.columns.find((col) => col.id === task.status);
        if (column && !column.task_ids.includes(task.id)) {
          column.task_ids.push(task.id);
        }
      }

      // Update the active board if it matches the project ID
      if (
        state.projectBoard &&
        (state.projectBoardProjectId === projectId ||
          state.projectBoard.project?.id === projectId)
      ) {
        if (!state.projectBoard.tasks.some((t) => t.id === task.id)) {
          state.projectBoard.tasks.push(task);
        }
        const column = state.projectBoard.columns.find(
          (col) => col.id === task.status,
        );
        if (column && !column.task_ids.includes(task.id)) {
          column.task_ids.push(task.id);
        }
      }
    },

    updateTaskInBoardState: (state, action: PayloadAction<BoardTask>) => {
      const task = action.payload;
      const projectId = task.project_id || state.projectBoardProjectId;

      const updateBoardObject = (board: any) => {
        const taskIndex = board.tasks.findIndex((t: any) => t.id === task.id);
        if (taskIndex !== -1) {
          const oldTask = board.tasks[taskIndex];
          // If status changed, move between columns
          if (oldTask.status !== task.status) {
            // Remove from old column
            const oldColumn = board.columns.find(
              (col: any) => col.id === oldTask.status,
            );
            if (oldColumn) {
              oldColumn.task_ids = oldColumn.task_ids.filter(
                (id: string) => id !== task.id,
              );
            }
            // Add to new column
            const newColumn = board.columns.find(
              (col: any) => col.id === task.status,
            );
            if (newColumn && !newColumn.task_ids.includes(task.id)) {
              newColumn.task_ids.push(task.id);
            }
          }
          board.tasks[taskIndex] = task;
        }
      };

      if (projectId && state.projectBoardsByProjectId[projectId]) {
        updateBoardObject(state.projectBoardsByProjectId[projectId]);
      }

      if (
        state.projectBoard &&
        (state.projectBoardProjectId === projectId ||
          state.projectBoard.project?.id === projectId)
      ) {
        updateBoardObject(state.projectBoard);
      }
    },

    resetProjectState: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch Projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading.fetchProjects = true;
        state.error.fetchProjects = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading.fetchProjects = false;
        state.projects = action.payload.projects.filter(
          (project) => project.status !== "deleted",
        );
        state.error.fetchProjects = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading.fetchProjects = false;
        state.error.fetchProjects =
          action.payload || "Failed to fetch projects";
      });

    // Create Project
    builder
      .addCase(createProject.pending, (state) => {
        state.loading.createProject = true;
        state.error.createProject = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading.createProject = false;
        state.projects.push(action.payload.project);
        state.error.createProject = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading.createProject = false;
        state.error.createProject =
          action.payload || "Failed to create project";
      });

    // Update Project
    builder
      .addCase(updateProject.pending, (state) => {
        state.loading.updateProject = true;
        state.error.updateProject = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading.updateProject = false;
        const index = state.projects.findIndex(
          (p) => p._id === action.payload.project._id,
        );
        if (index !== -1) {
          state.projects[index] = action.payload.project;
        }
        if (state.currentProject?._id === action.payload.project._id) {
          state.currentProject = action.payload.project;
        }
        state.error.updateProject = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading.updateProject = false;
        state.error.updateProject =
          action.payload || "Failed to update project";
      });

    // Delete Project
    builder
      .addCase(deleteProject.pending, (state) => {
        state.loading.deleteProject = true;
        state.error.deleteProject = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading.deleteProject = false;
        state.projects = state.projects.filter(
          (p) => p._id !== action.payload.id,
        );
        if (state.currentProject?._id === action.payload.id) {
          state.currentProject = null;
          state.ui.selectedproject_id = null;
        }
        state.error.deleteProject = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading.deleteProject = false;
        state.error.deleteProject =
          action.payload || "Failed to delete project";
      });

    // Fetch Project By ID
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.loading.fetchProjects = true;
        state.error.fetchProjects = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading.fetchProjects = false;
        state.currentProject = action.payload.project;
        // Update the project in the projects array if it exists
        const index = state.projects.findIndex(
          (p) => p._id === action.payload.project._id,
        );
        if (index !== -1) {
          state.projects[index] = action.payload.project;
        } else {
          state.projects.push(action.payload.project);
        }
        state.error.fetchProjects = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading.fetchProjects = false;
        state.error.fetchProjects = action.payload || "Failed to fetch project";
      })

      // Fetch Project Analytics
      .addCase(fetchProjectAnalytics.pending, (state) => {
        state.loading.fetchAnalytics = true;
        state.error.fetchAnalytics = null;
      })
      .addCase(fetchProjectAnalytics.fulfilled, (state, action) => {
        state.loading.fetchAnalytics = false;
        state.projectAnalytics = action.payload.analytics;
        state.error.fetchAnalytics = null;
      })
      .addCase(fetchProjectAnalytics.rejected, (state, action) => {
        state.loading.fetchAnalytics = false;
        state.error.fetchAnalytics =
          action.payload || "Failed to fetch project analytics";
      })

      // Fetch Project Board
      .addCase(fetchProjectBoard.pending, (state) => {
        state.loading.fetchBoard = true;
        state.error.fetchBoard = null;
      })
      .addCase(fetchProjectBoard.fulfilled, (state, action) => {
        state.loading.fetchBoard = false;
        // Backend currently does not persist UI-only fields like `tags`.
        // Preserve any existing in-memory tags when the fetched board returns empty tags.
        const incoming = action.payload.board;
        const incomingProjectId = incoming?.project?.id || null;
        if (state.projectBoard) {
          const prevTagsById = new Map(
            state.projectBoard.tasks.map((t) => [t.id, t.tags] as const),
          );

          const mergedTasks = incoming.tasks.map((t) => {
            const prevTags = prevTagsById.get(t.id);
            const incomingTags = Array.isArray(t.tags) ? t.tags : [];
            const prevTask = state.projectBoard!.tasks.find(
              (pt) => pt.id === t.id,
            );
            const prevSubtasks = prevTask?.sub_tasks;
            const prevCompleted = Array.isArray(prevSubtasks)
              ? prevSubtasks.filter((st) => st.completed).length
              : 0;
            const incomingCompleted = Array.isArray(t.sub_tasks)
              ? t.sub_tasks.filter((st) => st.completed).length
              : 0;

            let merged = t;
            if (incomingTags.length === 0 && (prevTags?.length ?? 0) > 0) {
              merged = { ...merged, tags: prevTags! };
            }
            if (
              prevCompleted > incomingCompleted &&
              Array.isArray(prevSubtasks) &&
              prevSubtasks.length > 0
            ) {
              merged = { ...merged, sub_tasks: prevSubtasks };
            }
            return merged;
          });

          state.projectBoard = { ...incoming, tasks: mergedTasks };
        } else {
          state.projectBoard = incoming;
        }
        if (incomingProjectId) {
          state.projectBoardProjectId = String(incomingProjectId);
          state.projectBoardsByProjectId[String(incomingProjectId)] =
            state.projectBoard;
        }
        state.error.fetchBoard = null;
      })
      .addCase(fetchProjectBoard.rejected, (state, action) => {
        state.loading.fetchBoard = false;
        state.error.fetchBoard =
          action.payload || "Failed to fetch project board";
      })

      // Update Task Status in Board
      .addCase(updateTaskStatusInBoard.pending, (state, action) => {
        state.loading.updateBoard = true;
        state.error.updateBoard = null;

        const { task_id, newStatus, project_id } = action.meta.arg;
        
        // Track the original status for rollback
        if (!state.optimisticRollbackTasks) {
          state.optimisticRollbackTasks = {};
        }

        const updateBoardObjectOptimistically = (board: any) => {
          const task = board.tasks.find((t: any) => t.id === task_id);
          if (task) {
            if (!state.optimisticRollbackTasks[task_id]) {
              state.optimisticRollbackTasks[task_id] = {
                status: task.status,
                project_id,
              };
            }
            task.status = newStatus;
            task.updated_at = new Date().toISOString();
          }

          // Update column task IDs
          board.columns.forEach((column: any) => {
            column.task_ids = column.task_ids.filter((id: string) => id !== task_id);
          });

          const targetColumn = board.columns.find((col: any) => col.id === newStatus);
          if (targetColumn) {
            if (!targetColumn.task_ids.includes(task_id)) {
              targetColumn.task_ids.push(task_id);
            }
          }
        };

        if (project_id && state.projectBoardsByProjectId[project_id]) {
          updateBoardObjectOptimistically(state.projectBoardsByProjectId[project_id]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === project_id ||
            state.projectBoard.project?.id === project_id)
        ) {
          updateBoardObjectOptimistically(state.projectBoard);
        }
      })
      .addCase(updateTaskStatusInBoard.fulfilled, (state, action) => {
        state.loading.updateBoard = false;
        const {
          task_id,
          project_id,
          projectProgress,
          projectStatus,
        } = action.payload;

        // Clean up rollback since it succeeded
        if (state.optimisticRollbackTasks && state.optimisticRollbackTasks[task_id]) {
          delete state.optimisticRollbackTasks[task_id];
        }

        // Apply computed project progress/status from agent response (if present)
        if (
          project_id &&
          (typeof projectProgress === "number" ||
            typeof projectStatus === "string")
        ) {
          const patchProject = (p: Project) => {
            if (typeof projectProgress === "number")
              p.progress = projectProgress;
            if (typeof projectStatus === "string") p.status = projectStatus;
            p.updated_at = new Date().toISOString();
          };

          const listProject = state.projects.find(
            (p) => p._id === project_id || p.project_id === project_id,
          );
          if (listProject) patchProject(listProject);

          if (
            state.currentProject &&
            (state.currentProject._id === project_id ||
              state.currentProject.project_id === project_id)
          ) {
            patchProject(state.currentProject);
          }
        }
        state.error.updateBoard = null;
      })
      .addCase(updateTaskStatusInBoard.rejected, (state, action) => {
        state.loading.updateBoard = false;
        state.error.updateBoard =
          action.payload || "Failed to update task status";

        const { task_id } = action.meta.arg;
        if (state.optimisticRollbackTasks && state.optimisticRollbackTasks[task_id]) {
          const { status: originalStatus, project_id } = state.optimisticRollbackTasks[task_id];

          const rollbackBoardObject = (board: any) => {
            const task = board.tasks.find((t: any) => t.id === task_id);
            if (task) {
              task.status = originalStatus;
              task.updated_at = new Date().toISOString();
            }

            // Update column task IDs
            board.columns.forEach((column: any) => {
              column.task_ids = column.task_ids.filter((id: string) => id !== task_id);
            });

            const targetColumn = board.columns.find((col: any) => col.id === originalStatus);
            if (targetColumn) {
              if (!targetColumn.task_ids.includes(task_id)) {
                targetColumn.task_ids.push(task_id);
              }
            }
          };

          if (project_id && state.projectBoardsByProjectId[project_id]) {
            rollbackBoardObject(state.projectBoardsByProjectId[project_id]);
          }

          if (
            state.projectBoard &&
            (state.projectBoardProjectId === project_id ||
              state.projectBoard.project?.id === project_id)
          ) {
            rollbackBoardObject(state.projectBoard);
          }

          delete state.optimisticRollbackTasks[task_id];
        }
      })

      .addCase(assignUserToTask.fulfilled, (state, action) => {
        const taskId = action.payload.task_id || (action.payload as any)._id || (action.payload as any).id;
        const newStatus = action.payload.status;
        const projectId = action.payload.project_id || state.projectBoardProjectId;

        const updateBoardObject = (board: any) => {
          const task = board.tasks.find((t: any) => t.id === taskId);
          if (task) {
            if (newStatus) task.status = newStatus;
            task.updated_at = new Date().toISOString();
            
            task.assigned_to =
              typeof action.payload.assigned_to === "string" && action.payload.assigned_to
                ? action.payload.assigned_to
                : typeof (action.payload as any).user_id === "string" && (action.payload as any).user_id
                  ? (action.payload as any).user_id
                  : String(action.payload.assigned_to ?? (action.payload as any).user_id ?? "");
            
            if ((action.payload as any).assignee && typeof (action.payload as any).assignee === "object") {
              task.assignee = (action.payload as any).assignee;
            } else {
              task.assignee = undefined;
            }
          }

          if (newStatus) {
            board.columns.forEach((column: any) => {
              column.task_ids = column.task_ids.filter((id: string) => id !== taskId);
            });

            const targetColumn = board.columns.find((col: any) => col.id === newStatus);
            if (targetColumn) {
              targetColumn.task_ids.push(taskId);
            }
          }
        };

        if (projectId && state.projectBoardsByProjectId[projectId]) {
          updateBoardObject(state.projectBoardsByProjectId[projectId]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === projectId ||
            state.projectBoard.project?.id === projectId)
        ) {
          updateBoardObject(state.projectBoard);
        }
      })

      // Delete Task from Board
      .addCase(deleteTaskFromBoard.pending, (state) => {
        state.loading.updateBoard = true;
        state.error.updateBoard = null;
      })
      .addCase(deleteTaskFromBoard.fulfilled, (state, action) => {
        state.loading.updateBoard = false;
        const { task_id, project_id } = action.payload;

        const updateBoardObject = (board: any) => {
          board.tasks = board.tasks.filter((task: any) => task.id !== task_id);
          board.columns = board.columns.map((col: any) => ({
            ...col,
            task_ids: col.task_ids.filter((id: string) => id !== task_id),
          }));
        };

        if (project_id && state.projectBoardsByProjectId[project_id]) {
          updateBoardObject(state.projectBoardsByProjectId[project_id]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === project_id ||
            state.projectBoard.project?.id === project_id)
        ) {
          updateBoardObject(state.projectBoard);
        }

        state.error.updateBoard = null;
      })
      .addCase(deleteTaskFromBoard.rejected, (state, action) => {
        state.loading.updateBoard = false;
        state.error.updateBoard = action.payload || "Failed to delete task";
      })

      // Create Task in Board
      .addCase(createTaskInBoard.pending, (state, action) => {
        state.loading.updateBoard = true;
        state.error.updateBoard = null;

        const { project_id, title, description, priority, status, due_date, tags, sub_tasks } = action.meta.arg;
        const tempId = `temp-${action.meta.requestId}`;

        if (!state.optimisticCreatedTasks) {
          state.optimisticCreatedTasks = {};
        }
        state.optimisticCreatedTasks[action.meta.requestId] = {
          tempId,
          project_id,
          status,
        };

        const tempTask: BoardTask = {
          id: tempId,
          title,
          description: description || "",
          status,
          priority: priority || "medium",
          assigned_to: undefined,
          due_date: due_date ? new Date(due_date).toISOString() : undefined,
          tags: tags || [],
          sub_tasks: (sub_tasks || []).map((st) => ({
            title: st.title,
            completed: st.completed || false,
            description: st.description || "",
          })),
          time_tracking: { estimated: 0, logged: 0, remaining: 0 },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          project_id,
        };

        const addOptimisticTaskToBoard = (board: any) => {
          if (!board.tasks.some((t: any) => t.id === tempId)) {
            board.tasks.push(tempTask);
          }
          const column = board.columns.find((col: any) => col.id === status);
          if (column && !column.task_ids.includes(tempId)) {
            column.task_ids.push(tempId);
          }
        };

        if (project_id && state.projectBoardsByProjectId[project_id]) {
          addOptimisticTaskToBoard(state.projectBoardsByProjectId[project_id]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === project_id ||
            state.projectBoard.project?.id === project_id)
        ) {
          addOptimisticTaskToBoard(state.projectBoard);
        }
      })
      .addCase(createTaskInBoard.fulfilled, (state, action) => {
        state.loading.updateBoard = false;
        console.log("[createTaskInBoard] REDUX_FULFILLED", { task_id: action.payload?.task?.id, project_id: action.payload?.task?.project_id });
        const { task } = action.payload;
        const resolveProjectIdString = (proj: any): string => {
          if (!proj) return "";
          if (typeof proj === "string") return proj;
          if (typeof proj === "object") {
            return String(proj._id || proj.id || "");
          }
          return String(proj);
        };
        const projectId = resolveProjectIdString(task.project_id);

        const tracking = state.optimisticCreatedTasks?.[action.meta.requestId];
        const tempId = tracking?.tempId;

        const updateBoardObject = (board: any) => {
          // If we have a temporary task matching tempId, replace it
          if (tempId) {
            board.tasks = board.tasks.map((t: any) => (t.id === tempId ? task : t));
            board.columns.forEach((col: any) => {
              col.task_ids = col.task_ids.map((id: string) => (id === tempId ? task.id : id));
            });
          } else {
            // Normal fallback
            if (!board.tasks.some((t: any) => t.id === task.id)) {
              board.tasks.push(task);
            }
            const column = board.columns.find((col: any) => col.id === task.status);
            if (column && !column.task_ids.includes(task.id)) {
              column.task_ids.push(task.id);
            }
          }
        };

        if (projectId && state.projectBoardsByProjectId[projectId]) {
          updateBoardObject(state.projectBoardsByProjectId[projectId]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === projectId ||
            state.projectBoard.project?.id === projectId)
        ) {
          updateBoardObject(state.projectBoard);
        }

        if (state.optimisticCreatedTasks && state.optimisticCreatedTasks[action.meta.requestId]) {
          delete state.optimisticCreatedTasks[action.meta.requestId];
        }

        state.error.updateBoard = null;
      })
      .addCase(createTaskInBoard.rejected, (state, action) => {
        state.loading.updateBoard = false;
        state.error.updateBoard = action.payload || "Failed to create task";
        console.error("[createTaskInBoard] REDUX_REJECTED", action.payload || action.error);

        const tracking = state.optimisticCreatedTasks?.[action.meta.requestId];
        if (tracking) {
          const { tempId, project_id } = tracking;

          const rollbackCreatedTask = (board: any) => {
            board.tasks = board.tasks.filter((t: any) => t.id !== tempId);
            board.columns.forEach((col: any) => {
              col.task_ids = col.task_ids.filter((id: string) => id !== tempId);
            });
          };

          if (project_id && state.projectBoardsByProjectId[project_id]) {
            rollbackCreatedTask(state.projectBoardsByProjectId[project_id]);
          }

          if (
            state.projectBoard &&
            (state.projectBoardProjectId === project_id ||
              state.projectBoard.project?.id === project_id)
          ) {
            rollbackCreatedTask(state.projectBoard);
          }

          delete state.optimisticCreatedTasks[action.meta.requestId];
        }
      })

      // Update Task in Board
      .addCase(updateTaskInBoard.pending, (state) => {
        state.loading.updateBoard = true;
        state.error.updateBoard = null;
      })
      .addCase(updateTaskInBoard.fulfilled, (state, action) => {
        state.loading.updateBoard = false;
        const { task } = action.payload;
        const resolveProjectIdString = (proj: any): string => {
          if (!proj) return "";
          if (typeof proj === "string") return proj;
          if (typeof proj === "object") {
            return String(proj._id || proj.id || "");
          }
          return String(proj);
        };
        const projectId = resolveProjectIdString(task.project_id);

        const updateBoardObject = (board: any) => {
          const taskIndex = board.tasks.findIndex(
            (t: any) =>
              t.id === task.id ||
              t.id === task._id ||
              t._id === task.id ||
              t._id === task._id,
          );
          if (taskIndex !== -1) {
            const oldTask = board.tasks[taskIndex];
            const normalizedTask = {
              ...task,
              id: task.id || task._id,
              _id: task._id || task.id,
            };
            // If status changed, move between columns
            if (oldTask.status !== normalizedTask.status) {
              // Remove from old column
              const oldColumn = board.columns.find(
                (col: any) => col.id === oldTask.status,
              );
              if (oldColumn) {
                oldColumn.task_ids = oldColumn.task_ids.filter(
                  (id: string) => id !== task.id && id !== task._id,
                );
              }
              // Add to new column
              const newColumn = board.columns.find(
                (col: any) => col.id === normalizedTask.status,
              );
              if (
                newColumn &&
                !newColumn.task_ids.includes(normalizedTask.id) &&
                !newColumn.task_ids.includes(normalizedTask._id)
              ) {
                newColumn.task_ids.push(normalizedTask.id);
              }
            }
            board.tasks[taskIndex] = normalizedTask;
          }
        };

        if (projectId && state.projectBoardsByProjectId[projectId]) {
          updateBoardObject(state.projectBoardsByProjectId[projectId]);
        }

        if (
          state.projectBoard &&
          (state.projectBoardProjectId === projectId ||
            state.projectBoard.project?.id === projectId)
        ) {
          updateBoardObject(state.projectBoard);
        }

        state.error.updateBoard = null;
      })
      .addCase(updateTaskInBoard.rejected, (state, action) => {
        state.loading.updateBoard = false;
        state.error.updateBoard = action.payload || "Failed to update task";
      })

      // Fetch Project Plan
      .addCase(fetchProjectPlan.pending, (state) => {
        state.loading.fetchPlan = true;
        state.error.fetchPlan = null;
      })
      .addCase(fetchProjectPlan.fulfilled, (state, action) => {
        state.loading.fetchPlan = false;
        state.projectPlan = action.payload.plan;
        state.error.fetchPlan = null;
      })
      .addCase(fetchProjectPlan.rejected, (state, action) => {
        state.loading.fetchPlan = false;
        state.error.fetchPlan =
          action.payload || "Failed to fetch project plan";
      })

      // Fetch Project Plan from DB
      .addCase(fetchProjectPlanFromDB.pending, (state) => {
        state.loading.fetchPlanFromDB = true;
        state.error.fetchPlanFromDB = null;
      })
      .addCase(fetchProjectPlanFromDB.fulfilled, (state, action) => {
        state.loading.fetchPlanFromDB = false;
        state.projectPlan = action.payload.plan;
        state.error.fetchPlanFromDB = null;
      })
      .addCase(fetchProjectPlanFromDB.rejected, (state, action) => {
        state.loading.fetchPlanFromDB = false;
        state.error.fetchPlanFromDB =
          action.payload || "Failed to fetch project plan from database";
      })

      // Refine Project Tasks
      .addCase(refineProjectTasks.pending, (state) => {
        state.loading.refineTasks = true;
        state.error.refineTasks = null;
      })
      .addCase(refineProjectTasks.fulfilled, (state, action) => {
        state.loading.refineTasks = false;
        state.refined_tasks = action.payload.refined_tasks;
        state.error.refineTasks = null;
      })
      .addCase(refineProjectTasks.rejected, (state, action) => {
        state.loading.refineTasks = false;
        state.error.refineTasks =
          action.payload || "Failed to refine project tasks";
      });

    // Fetch Project Members
    builder
      .addCase(fetchProjectMembers.pending, (state) => {
        state.loading.fetchMembers = true;
        state.error.fetchMembers = null;
      })
      .addCase(fetchProjectMembers.fulfilled, (state, action) => {
        state.loading.fetchMembers = false;
        state.projectMembers = action.payload.members;
        state.error.fetchMembers = null;
      })
      .addCase(fetchProjectMembers.rejected, (state, action) => {
        state.loading.fetchMembers = false;
        state.error.fetchMembers =
          action.payload || "Failed to fetch project members";
        state.projectMembers = [];
      });
  },
});

export const { patchProjectProgressStatus, clearProjectCacheStorage } =
  projectSlice.actions;

export const {
  setSelectedProject,
  setProjects,
  setFilterStatus,
  setSearchQuery,
  setSortBy,
  clearProjectError,
  clearAllProjectErrors,
  removeTaskFromBoard,
  addTaskToBoard,
  updateTaskInBoardState,
  resetProjectState,
} = projectSlice.actions;

// Export ETag/Cache utilities
export {
  getETag,
  setETag,
  getCachedProject,
  setCachedProject,
  clearProjectCache,
};

export default projectSlice.reducer;
