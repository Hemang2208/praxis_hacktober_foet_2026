import { useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProjects } from "@/redux/slice/project.slice";
import { fetchUserProfile } from "@/redux/slice/user.slice";
import { Project } from "@/redux/slice/project.slice";

interface UserJoinedProjectsState {
  joinedProjects: Project[];
  hasJoinedAny: boolean;
  isLoading: boolean;
  error: string | null;
}

interface BackendTeamMember {
  user: string;
  role: string;
}

interface TeamMember {
  user?: string;
  email?: string;
  role?: string;
  name?: string;
  avatar?: string;
}

/**
 * Hook to check if a user has joined any projects
 * A user is considered "joined" if they are in the team of a project
 */
export const useUserJoinedProjects = (): UserJoinedProjectsState => {
  const dispatch = useAppDispatch();
  const allProjects = useAppSelector((state) => (state.project as any)?.projects || []);
  const projectLoading = useAppSelector((state) => (state.project as any)?.loading?.fetchProjects || false);
  const projectError = useAppSelector((state) => (state.project as any)?.error?.fetchProjects || null);
  const userProfile = useAppSelector((state) => (state.user as any)?.userProfile);
  const userLoading = useAppSelector((state) => (state.user as any)?.loading?.fetchProfile || false);
  const userError = useAppSelector((state) => (state.user as any)?.error?.fetchProfile || null);

  useEffect(() => {
    if (!userProfile && !userLoading) {
      void dispatch(fetchUserProfile());
    }
    if (!allProjects.length && !projectLoading) {
      void dispatch(fetchProjects());
    }
  }, [dispatch, allProjects.length, projectLoading, userProfile, userLoading]);

  const joinedProjects = useMemo(() => {
    if (!userProfile || !allProjects.length) return [];
    const userId = userProfile.user_id || (userProfile as any)._id || (userProfile as any).id;
    const userEmail = userProfile.email;

    return allProjects.filter((project) => {
      if (Array.isArray(project.team)) {
        const found = project.team.some((member: BackendTeamMember) => {
          const memberId = (member as any).user || (member as any)._id;
          return memberId === userId;
        });
        if (found) return true;
      }

      if (Array.isArray((project as any).team_members)) {
        const byTeamMembers = (project as any).team_members.some((member: TeamMember) => {
          const memberId = member.user || (member as any)._id;
          return memberId === userId || member.email === userEmail;
        });
        if (byTeamMembers) return true;
      }

      return false;
    });
  }, [userProfile, allProjects]);

  const hasError = projectError || userError || null;
  const isLoading = projectLoading || userLoading;

  return {
    joinedProjects,
    hasJoinedAny: joinedProjects.length > 0,
    isLoading,
    error: hasError,
  };
};
