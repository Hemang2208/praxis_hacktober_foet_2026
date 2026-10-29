import { useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchTasksByProject } from "@/redux/slice/task.slice";
import { useActiveProjects } from "./useActiveProjects";

interface RecentTask {
  _id: string;
  title: string;
  project_id?: string;
  status: "todo" | "in-progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  due_date?: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

interface UseRecentTasksReturn {
  tasks: RecentTask[];
  loading: boolean;
  error: string | null;
}

export function useRecentTasks(limit?: number): UseRecentTasksReturn {
  const dispatch = useAppDispatch();
  const allTasks = useAppSelector((state) => state.task.tasks);
  const taskLoading = useAppSelector(
    (state) => state.task.loading.fetchTasksByProject,
  );
  const taskError = useAppSelector(
    (state) => state.task.error.fetchTasksByProject,
  );
  const { projects } = useActiveProjects(100); // Get all user's active projects

  // Fetch tasks for each active project
  useEffect(() => {
    projects.forEach((project) => {
      void dispatch(fetchTasksByProject(project._id));
    });
  }, [dispatch, projects]);

  // Filter tasks to only show those from user's projects and sort by recent
  const recentTasks = useMemo(() => {
    const projectIds = new Set(projects.map((p) => p._id));

    const filtered = allTasks
      .filter((task) => {
        const taskProjectId = task.project_id || (task as any).project;
        return projectIds.has(taskProjectId);
      })
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      })
      .map((task) => ({
        ...task,
        due_date:
          typeof task.due_date === "string"
            ? task.due_date
            : task.due_date instanceof Date
              ? task.due_date.toISOString()
              : undefined,
      }));

    // Apply limit only if specified
    return limit ? filtered.slice(0, limit) : filtered;
  }, [allTasks, projects, limit]);

  return {
    tasks: recentTasks as RecentTask[],
    loading: taskLoading || projects.length === 0,
    error: taskError,
  };
}
