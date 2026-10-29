import { useSelector, useDispatch } from "react-redux";
import { useMemo } from "react";
import { RootState, AppDispatch } from "@/redux/store";

export const useProjects = () => {
  const dispatch = useDispatch<AppDispatch>();
  const projectState = useSelector((state: RootState) => state.project);

  // Memoized selectors for filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projectState.projects];

    // Apply status filter
    if (projectState.ui.filter_status) {
      filtered = filtered.filter(
        (project) => project.status === projectState.ui.filter_status,
      );
    }

    // Apply search query
    if (projectState.ui.search_query) {
      const query = projectState.ui.search_query.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sort_by, sort_order } = projectState.ui;
      let comparison = 0;

      switch (sort_by) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "deadline":
          comparison =
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case "progress":
          comparison = a.progress - b.progress;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sort_order === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [projectState.projects, projectState.ui]);

  // Project statistics
  const projectStats = useMemo(() => {
    const total = projectState.projects.length;
    const completed = projectState.projects.filter(
      (p) => p.status === "completed",
    ).length;
    const inProgress = projectState.projects.filter(
      (p) => p.status === "in-progress",
    ).length;
    const planning = projectState.projects.filter(
      (p) => p.status === "planning",
    ).length;
    const onHold = projectState.projects.filter(
      (p) => p.status === "on-hold",
    ).length;

    return {
      total,
      completed,
      inProgress,
      planning,
      onHold,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [projectState.projects]);

  return {
    // Data
    projects: projectState.projects,
    filteredProjects,
    currentProject: projectState.currentProject,
    projectStats,

    // Loading states
    loading: projectState.loading,

    // Error states
    error: projectState.error,

    // UI state
    ui: projectState.ui,

    // Dispatch for actions
    dispatch,
  };
};

export default useProjects;
