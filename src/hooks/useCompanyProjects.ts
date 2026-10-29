import { useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/hooks/useUser";
import { Project } from "@/redux/slice/project.slice";
import { getProjectCompanyId } from "@/lib/project-ownership";

interface CompanyProjectsState {
  companyProjects: Project[];
  projectStats: {
    total: number;
    completed: number;
    inProgress: number;
    planning: number;
    onHold: number;
    completionRate: number;
  };
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get only projects created by the logged-in company/user
 * Filters projects by the creator's ID
 */
export const useCompanyProjects = (): CompanyProjectsState => {
  const { mongoUser, isLoaded } = useUser();
  const { projects, loading, error } = useProjects();

  // Filter projects created by the current user (company)
  const companyProjects = useMemo(() => {
    if (!isLoaded || !mongoUser) {
      console.log("[useCompanyProjects] Not ready:", {
        isLoaded,
        hasUser: !!mongoUser,
      });
      return [];
    }

    const user_id = mongoUser.user_id;
    console.log("[useCompanyProjects] Current user ID:", user_id);
    console.log(
      "[useCompanyProjects] Total projects to filter:",
      projects.length,
    );

    const filtered = projects.filter((project) => {
      // Check if current user is the creator of the project
      const creatorId = getProjectCompanyId(project);
      const matches = creatorId === user_id;
      if (!matches && projects.length <= 5) {
        console.log(
          `[useCompanyProjects] Project "${project.title}" - user: ${creatorId} vs current: ${user_id} = ${matches}`,
        );
      }
      return matches;
    });

    console.log(
      `[useCompanyProjects] Filtered result: ${filtered.length}/${projects.length} projects`,
    );
    return filtered;
  }, [projects, mongoUser, isLoaded]);

  // Calculate statistics for company projects
  const projectStats = useMemo(() => {
    const total = companyProjects.length;
    const completed = companyProjects.filter(
      (p) => p.status === "completed",
    ).length;
    const inProgress = companyProjects.filter(
      (p) => p.status === "in-progress",
    ).length;
    const planning = companyProjects.filter(
      (p) => p.status === "planning",
    ).length;
    const onHold = companyProjects.filter((p) => p.status === "on-hold").length;

    return {
      total,
      completed,
      inProgress,
      planning,
      onHold,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [companyProjects]);

  return {
    companyProjects,
    projectStats,
    loading: loading.fetchProjects,
    error: error.fetchProjects,
  };
};

export default useCompanyProjects;
