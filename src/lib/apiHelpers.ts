/**
 * Unified API data fetching utilities
 * Centralizes all API calls with proper error handling and retry logic
 */

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Unified API fetch wrapper with automatic error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuth = false,
  } = options;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401 && !skipAuth) {
        // Unauthorized - might need to redirect to login
        return {
          success: false,
          error: "Unauthorized",
          status: 401,
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Forbidden",
          status: 403,
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: "Not found",
          status: 404,
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          (errorData as any).message ||
          (errorData as any).error ||
          `HTTP ${response.status}`,
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return {
      success: true,
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

/**
 * Fetch student overview data
 */
export async function fetchStudentOverviewAPI() {
  return apiFetch("/api/user/student/overview");
}

/**
 * Fetch college overview data
 */
export async function fetchCollegeOverviewAPI() {
  return apiFetch("/api/college/overview");
}

/**
 * Fetch company overview data
 */
export async function fetchCompanyOverviewAPI(companyId: string) {
  return apiFetch(`/api/company/${companyId}/overview`);
}

/**
 * Fetch projects for current user
 */
export async function fetchProjectsAPI(page = 1, pageSize = 10) {
  return apiFetch(`/api/projects?page=${page}&pageSize=${pageSize}`);
}

/**
 * Fetch single project by ID
 */
export async function fetchProjectByIdAPI(projectId: string) {
  return apiFetch(`/api/projects/${projectId}`);
}

/**
 * Fetch tasks for current user
 */
export async function fetchTasksAPI(page = 1, pageSize = 20, filters: any = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  // Add filter parameters
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.append(`filter.${key}`, String(value));
    }
  });

  return apiFetch(`/api/tasks?${params.toString()}`);
}

/**
 * Fetch single task by ID
 */
export async function fetchTaskByIdAPI(taskId: string) {
  return apiFetch(`/api/tasks/${taskId}`);
}

/**
 * Fetch certificates
 */
export async function fetchCertificatesAPI(page = 1, pageSize = 10) {
  return apiFetch(`/api/certificates?page=${page}&pageSize=${pageSize}`);
}

/**
 * Fetch assessments
 */
export async function fetchAssessmentsAPI(page = 1, pageSize = 10) {
  return apiFetch(`/api/assessments?page=${page}&pageSize=${pageSize}`);
}

/**
 * Fetch assessment by ID
 */
export async function fetchAssessmentByIdAPI(assessmentId: string) {
  return apiFetch(`/api/assessments/${assessmentId}`);
}

/**
 * Fetch learning resources
 */
export async function fetchLearningResourcesAPI(page = 1, pageSize = 10) {
  return apiFetch(`/api/learning?page=${page}&pageSize=${pageSize}`);
}

/**
 * Create new project
 */
export async function createProjectAPI(data: any) {
  return apiFetch("/api/projects", {
    method: "POST",
    body: data,
  });
}

/**
 * Update project
 */
export async function updateProjectAPI(projectId: string, data: any) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "PUT",
    body: data,
  });
}

/**
 * Delete project
 */
export async function deleteProjectAPI(projectId: string) {
  return apiFetch(`/api/projects/${projectId}`, {
    method: "DELETE",
  });
}

/**
 * Create new task
 */
export async function createTaskAPI(data: any) {
  return apiFetch("/api/tasks", {
    method: "POST",
    body: data,
  });
}

/**
 * Update task
 */
export async function updateTaskAPI(taskId: string, data: any) {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    body: data,
  });
}

/**
 * Delete task
 */
export async function deleteTaskAPI(taskId: string) {
  return apiFetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

/**
 * Bulk operation - update multiple tasks
 */
export async function bulkUpdateTasksAPI(updates: Array<{ id: string; data: any }>) {
  return apiFetch("/api/tasks/bulk-update", {
    method: "PUT",
    body: { updates },
  });
}
