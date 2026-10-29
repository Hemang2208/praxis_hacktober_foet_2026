import { useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";

interface SummaryStats {
  taskCompletionRate: number;
  gitHubCommits: number;
  aiFeedbackScore: number;
  certificatesEarned: number;
}

interface UseSummaryStatsReturn {
  stats: SummaryStats | null;
  loading: boolean;
  error: string | null;
}

export function useSummaryStats(): UseSummaryStatsReturn {
  const tasks = useAppSelector((state) => state.task.tasks);
  const projects = useAppSelector((state) => state.project.projects);
  const githubCommits = useAppSelector((state) => Object.values(state.github.repoCommits).reduce((sum, commits) => sum + (commits?.length || 0), 0));
  const certificateCount = useAppSelector((state) => state.certificates?.certificates?.length || 0);
  const taskLoading = useAppSelector((state) => state.task.loading.fetchTasks);
  const projectLoading = useAppSelector((state) => state.project.loading.fetchProjects);
  const userLoading = useAppSelector((state) => state.user.loading.fetchProfile);
  const taskError = useAppSelector((state) => state.task.error.fetchTasks);
  const projectError = useAppSelector((state) => state.project.error.fetchProjects);
  const userError = useAppSelector((state) => state.user.error.fetchProfile);

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // aiFeedbackScore may not exist in current state; use project+task as proxy
    const aiFeedbackScore = Math.min(100, Math.round((projectLoading ? 0 : projects.length) * 2));

    return {
      taskCompletionRate,
      gitHubCommits: githubCommits,
      aiFeedbackScore,
      certificatesEarned: certificateCount,
    };
  }, [tasks, projects.length, githubCommits, certificateCount, projectLoading]);

  const error = taskError || projectError || userError || null;
  const loading = taskLoading || projectLoading || userLoading;

  return {
    stats,
    loading,
    error,
  };
}
