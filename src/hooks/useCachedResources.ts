/**
 * Resource-specific caching hooks
 * Each hook is tailored to its resource with proper caching logic
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchProjects,
  fetchProjectById,
  setProjects,
  type Project,
} from "@/redux/slice/project.slice";
import {
  fetchTasks,
  fetchTaskById,
  setTasks,
  type Task,
} from "@/redux/slice/task.slice";
import { fetchUserProfile } from "@/redux/slice/user.slice";
import {
  selectPageCache,
  selectDetailItemCache,
  markPageFetched,
  markDetailItemFetched,
  invalidatePageCache,
  invalidateDetailItemCache,
} from "@/redux/slice/cache.slice";

/**
 * Hook to fetch projects with caching
 * Prevents re-fetches when navigating back to projects list
 */
export function useCachedProjects(page = 1, pageSize = 10) {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => state.project.projects);
  const loading = useAppSelector(
    (state) => state.project.loading.fetchProjects,
  );
  const error = useAppSelector((state) => state.project.error.fetchProjects);

  // Check cache state
  const cacheState = useAppSelector((state) =>
    selectPageCache(state, "projects", page),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  useEffect(() => {
    // If cache is valid and we have data, don't fetch
    if (isCacheValid && projects.length > 0) {
      return;
    }

    // If already loading, don't dispatch again
    if (loading) {
      return;
    }

    // Fetch projects with pagination
    void dispatch(fetchProjects() as any).then(() => {
      // Mark this page as fetched
      dispatch(markPageFetched({ resource: "projects", page }));
    });
  }, [page, pageSize, dispatch, isCacheValid, projects.length, loading]);

  return {
    projects,
    loading,
    error,
    isCached: isCacheValid && projects.length > 0,
  };
}

/**
 * Hook to fetch project by ID with caching
 * For dynamic routes, always fetch fresh data on mount to ensure consistency
 */
export function useCachedProject(
  projectId: string,
  options?: { forceFresh?: boolean },
) {
  const dispatch = useAppDispatch();
  const currentProject = useAppSelector(
    (state) => state.project.currentProject,
  );
  const projects = useAppSelector((state) => state.project.projects);
  const loading = useAppSelector(
    (state) => state.project.loading.fetchProjects,
  );
  const error = useAppSelector((state) => state.project.error.fetchProjects);

  // Use currentProject (from fetchProjectById) if available and matches
  const project =
    currentProject?._id === projectId
      ? currentProject
      : projects.find((p: Project) => p._id === projectId);

  // Check detail cache
  const cacheState = useAppSelector((state) =>
    selectDetailItemCache(state, "projects", projectId),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;
  const forceFreshFetchedForProject = useRef<string | null>(null);

  useEffect(() => {
    forceFreshFetchedForProject.current = null;
  }, [projectId]);

  useEffect(() => {
    // For dynamic routes, always fetch fresh data on first load (forceFresh mode)
    if (options?.forceFresh) {
      // Only force-refresh once per project id to avoid request loops.
      if (forceFreshFetchedForProject.current === projectId) {
        return;
      }
      if (!loading) {
        forceFreshFetchedForProject.current = projectId;
        // Invalidate only this project's detail cache; keep list/page cache intact.
        dispatch(
          invalidateDetailItemCache({ resource: "projects", id: projectId }),
        );
        // Pass bypassCache option to skip ETag caching
        void dispatch(
          fetchProjectById({ id: projectId, bypassCache: true }) as any,
        ).then(() => {
          dispatch(
            markDetailItemFetched({ resource: "projects", id: projectId }),
          );
        });
      }
      return;
    }

    // Standard caching logic: if detail cache is valid and project exists, don't fetch.
    if (isCacheValid && project) {
      return;
    }

    if (loading) {
      return;
    }

    // Fetch single project with full details (tasks, timeline, sprints, etc.)
    void dispatch(fetchProjectById(projectId) as any).then(() => {
      dispatch(markDetailItemFetched({ resource: "projects", id: projectId }));
    });
  }, [projectId, dispatch, loading, isCacheValid, project, options?.forceFresh]);

  return {
    project: project || null,
    loading,
    error,
    isCached: isCacheValid && !!project,
  };
}

/**
 * Hook to fetch tasks with caching
 * Prevents re-fetches when navigating between pages
 */
export function useCachedTasks(page = 1, pageSize = 20, filters: any = {}) {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((state) => state.task.tasks);
  const loading = useAppSelector((state) => state.task.loading.fetchTasks);
  const error = useAppSelector((state) => state.task.error.fetchTasks);

  // Check cache state
  const cacheState = useAppSelector((state) =>
    selectPageCache(state, "tasks", page),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  // Stringify filters for dependency comparison
  const filtersString = JSON.stringify(filters);

  useEffect(() => {
    // If cache is valid and we have data, don't fetch
    if (isCacheValid && tasks.length > 0) {
      return;
    }

    if (loading) {
      return;
    }

    // Fetch tasks with filters
    void dispatch(fetchTasks() as any).then(() => {
      dispatch(markPageFetched({ resource: "tasks", page }));
    });
  }, [
    page,
    pageSize,
    dispatch,
    isCacheValid,
    tasks.length,
    loading,
    filtersString,
  ]);

  return {
    tasks,
    loading,
    error,
    isCached: isCacheValid && tasks.length > 0,
  };
}

/**
 * Hook to fetch task by ID with caching
 */
export function useCachedTask(taskId: string) {
  const dispatch = useAppDispatch();
  const currentTask = useAppSelector((state) => state.task.currentTask);
  const tasks = useAppSelector((state) => state.task.tasks);
  const loading = useAppSelector((state) => state.task.loading.fetchTasks);
  const error = useAppSelector((state) => state.task.error.fetchTasks);

  const task =
    currentTask?._id === taskId
      ? currentTask
      : tasks.find((t: Task) => t._id === taskId);

  const cacheState = useAppSelector((state) =>
    selectDetailItemCache(state, "tasks", taskId),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  useEffect(() => {
    if (!taskId) return;

    if (isCacheValid && task) {
      return;
    }

    if (loading) {
      return;
    }

    void dispatch(fetchTaskById(taskId)).then(() => {
      dispatch(markDetailItemFetched({ resource: "tasks", id: taskId }));
    });
  }, [taskId, dispatch, isCacheValid, task, loading]);

  return {
    task: task || null,
    loading,
    error,
    isCached: isCacheValid && !!task,
  };
}

/**
 * Hook to fetch user profile with caching
 * Prevents re-fetching user data when navigating between profile pages
 */
export function useCachedUser() {
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector((state) => state.user.userProfile);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const loading = useAppSelector((state) => state.user.loading.fetchProfile);
  const error = useAppSelector((state) => state.user.error.fetchProfile);

  // Check cache state for user profile
  const cacheState = useAppSelector((state) =>
    selectDetailItemCache(state, "user", "profile"),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  useEffect(() => {
    // If we have valid cached user profile, don't fetch
    if (isCacheValid && userProfile) {
      return;
    }

    // If already loading, don't dispatch again
    if (loading) {
      return;
    }

    // Only fetch if authenticated and no cached data
    if (isAuthenticated && !userProfile) {
      void dispatch(fetchUserProfile() as any).then(() => {
        dispatch(markDetailItemFetched({ resource: "user", id: "profile" }));
      });
    }
  }, [isAuthenticated, userProfile, loading, isCacheValid, dispatch]);

  return {
    user: userProfile,
    isAuthenticated,
    loading,
    error,
    isCached: isCacheValid && !!userProfile,
  };
}

/**
 * Hook for assessment caching with loading state
 * Provides generic caching for assessment-related queries
 */
export function useCachedAssessments() {
  const dispatch = useAppDispatch();
  const assessmentState = useAppSelector((state) => state.assessment);

  // Check if assessment data is cached (simple check - you may need to enhance this)
  const cacheState = useAppSelector((state) =>
    selectPageCache(state, "assessments", 1),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  return {
    assessments: assessmentState.assessments || [],
    loading: assessmentState.loading.fetchAssessments || false,
    error: assessmentState.error.fetchAssessments || null,
    isCached: isCacheValid,
  };
}

/**
 * Hook for single assessment caching
 */
export function useCachedAssessment(assessmentId: string) {
  const assessmentState = useAppSelector((state) => state.assessment);

  // Find assessment in state
  const assessment = (assessmentState.assessments || []).find(
    (a: any) => a.id === assessmentId || a._id === assessmentId,
  );

  // Check detail cache
  const cacheState = useAppSelector((state) =>
    selectDetailItemCache(state, "assessments", assessmentId),
  );
  const isCacheValid = cacheState && !cacheState.isExpired;

  return {
    assessment: assessment || null,
    loading: assessmentState.loading.fetchAssessments || false,
    error: assessmentState.error.fetchAssessments || null,
    isCached: isCacheValid && !!assessment,
  };
}

/**
 * Hook to invalidate resource cache on mutation
 * Call this after creating/updating/deleting a resource
 */
export function useInvalidateCache() {
  const dispatch = useAppDispatch();

  return {
    invalidateProjects: () => {
      dispatch(invalidatePageCache({ resource: "projects" }));
    },
    invalidateTasks: () => {
      dispatch(invalidatePageCache({ resource: "tasks" }));
    },
    invalidateAssessments: () => {
      dispatch(invalidatePageCache({ resource: "assessments" }));
    },
    invalidateCertificates: () => {
      dispatch(invalidatePageCache({ resource: "certificates" }));
    },
    invalidateUser: () => {
      dispatch(invalidatePageCache({ resource: "user" }));
      dispatch(invalidateDetailItemCache({ resource: "user", id: "profile" }));
    },
    invalidateAll: () => {
      dispatch(invalidatePageCache({ resource: "projects" }));
      dispatch(invalidatePageCache({ resource: "tasks" }));
      dispatch(invalidatePageCache({ resource: "assessments" }));
      dispatch(invalidatePageCache({ resource: "certificates" }));
      dispatch(invalidatePageCache({ resource: "user" }));
    },
  };
}
