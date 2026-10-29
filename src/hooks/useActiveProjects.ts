import { useMemo } from "react";
import { useAppSelector } from "@/redux/hooks";
import { getProjectCompanyId } from "@/lib/project-ownership";

interface TeamMember {
  user?: string;
  email?: string;
  _id?: string;
  name?: string;
  avatar?: string;
  role?: string;
}

interface TimelineEvent {
  date?:
    | string
    | Date
    | { $date?: string | Date }
    | { date?: string | Date }
    | null;
}

interface ActiveProject {
  _id: string;
  title: string;
  description: string;
  progress: number;
  deadline?: string | Date | { $date?: string | Date } | null;
  due_date?: string | Date | { $date?: string | Date } | null;
  team?: TeamMember[];
  team_members?: TeamMember[];
  timeline?: TimelineEvent[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface UseActiveProjectsReturn {
  projects: ActiveProject[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to return active projects from Redux cache (no extra network call)
 * For students: shows projects they're assigned to
 * For companies/colleges: shows projects they created
 */
export function useActiveProjects(limit: number = 3): UseActiveProjectsReturn {
  const allProjects = useAppSelector((state) => state.project.projects);
  const projectLoading = useAppSelector(
    (state) => state.project.loading.fetchProjects,
  );
  const projectError = useAppSelector(
    (state) => state.project.error.fetchProjects,
  );
  const userProfile = useAppSelector((state) => state.user.userProfile);

  const projects = useMemo(() => {
    if (!userProfile || allProjects.length === 0) {
      if (userProfile) {
        console.log(
          "[useActiveProjects] No projects in allProjects, total:",
          allProjects.length,
        );
      }
      return [];
    }

    const userId = String(
      userProfile._id ||
        (userProfile as any).id ||
        (userProfile as any).user_id,
    );
    const userRole = (userProfile as any).role;

    console.log(
      "[useActiveProjects] userId:",
      userId,
      "userRole:",
      userRole,
      "totalProjects:",
      allProjects.length,
    );

    // For company/college users: show projects they created
    if (userRole === "company" || userRole === "college") {
      const created = allProjects.filter((project) => {
        const projectCreatorId = String(
          getProjectCompanyId(project) || (project as any).user_id || "",
        );
        const isCreator = projectCreatorId === userId;
        if (isCreator) {
          console.log(
            "[useActiveProjects] Found created project:",
            project.title,
            "creator:",
            projectCreatorId,
          );
        }
        return isCreator;
      });

      console.log(
        "[useActiveProjects] Created projects found:",
        created.length,
      );

      // Debug: show all projects in Redux to help diagnose
      console.log(
        "[useActiveProjects] All projects in Redux:",
        allProjects.map((p) => ({
          title: p.title,
          user: p.user,
          user_id: (p as any).user_id,
        })),
      );

      // If we found created projects, return them. Otherwise return all projects (fallback)
      const projectsToShow = created.length > 0 ? created : allProjects;

      return projectsToShow
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime(),
        )
        .slice(0, limit);
    }

    // For students: show projects they're assigned to (existing logic)
    const userEmail = userProfile.email;

    const joined = allProjects.filter((project) => {
      const memberFound = (project.team ?? []).some((member: TeamMember) => {
        const candidate = member.user || (member as any)._id;
        return candidate === userId || member.email === userEmail;
      });
      if (memberFound) return true;

      const teamMemberFound = (project.team_members ?? []).some(
        (member: TeamMember) => {
          const candidate = member.user || (member as any)._id;
          return candidate === userId || member.email === userEmail;
        },
      );
      return teamMemberFound;
    });

    return joined
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      )
      .slice(0, limit);
  }, [allProjects, userProfile, limit]);

  return {
    projects,
    loading: projectLoading || userProfile == null,
    error: projectError,
  };
}
