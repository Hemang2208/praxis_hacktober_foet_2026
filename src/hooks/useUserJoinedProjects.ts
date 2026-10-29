import { useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProjects } from "@/redux/slice/project.slice";
import { fetchUserProfile } from "@/redux/slice/user.slice";
import { Project } from "@/redux/slice/project.slice";
import { getProjectCompanyId } from "@/lib/project-ownership";
import {
  getViewerCompanySubrole,
  canManageCompanyProjects,
} from "@/lib/company-rbac";

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
  status?: string;
  invitationStatus?: string;
  invite_status?: string;
  invited?: boolean;
}

/**
 * Hook to check if a user has joined any projects
 * A user is considered "joined" if they are in the team of a project
 */
export const useUserJoinedProjects = (): UserJoinedProjectsState => {
  const dispatch = useAppDispatch();
  const allProjects = useAppSelector(
    (state) => (state.project as any)?.projects || [],
  );
  const projectLoading = useAppSelector(
    (state) => (state.project as any)?.loading?.fetchProjects || false,
  );
  const projectError = useAppSelector(
    (state) => (state.project as any)?.error?.fetchProjects || null,
  );
  const userProfile = useAppSelector(
    (state) => (state.user as any)?.userProfile,
  );
  const userLoading = useAppSelector(
    (state) => (state.user as any)?.loading?.fetchProfile || false,
  );
  const userError = useAppSelector(
    (state) => (state.user as any)?.error?.fetchProfile || null,
  );

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
    const toComparableId = (value: unknown): string => {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        const maybeObject = value as Record<string, unknown>;
        const objectId = maybeObject.$oid;
        if (typeof objectId === "string") return objectId;
      }
      return String(value);
    };

    const userId = toComparableId(
      userProfile.user_id ||
        (userProfile as any)._id ||
        (userProfile as any).id,
    );
    const userEmail = String(userProfile.email || "").toLowerCase();
    const companySubrole = getViewerCompanySubrole(userProfile as any);
    const hasCompanyProjectManageAccess = canManageCompanyProjects(
      userProfile as any,
    );
    const activeCompanyId = toComparableId(
      (userProfile as any)?.activeCompanyMembership?.companyId ||
        (userProfile as any)?.companyId ||
        (userProfile as any)?.company_id ||
        null,
    );

    const isAccessibleTeamMember = (member: TeamMember | BackendTeamMember) => {
      const memberId = toComparableId(
        (member as any).user || (member as any)._id,
      );
      const memberEmail = String(
        (member as TeamMember).email || "",
      ).toLowerCase();
      const memberStatus = String(
        (member as TeamMember).status ||
          (member as TeamMember).invitationStatus ||
          (member as TeamMember).invite_status ||
          "",
      ).toLowerCase();

      const matchesIdentity = memberId === userId || memberEmail === userEmail;
      if (!matchesIdentity) return false;

      // Legacy project records often do not include invite/status fields on team members.
      // If identity matches, treat missing status as accessible.
      if (!memberStatus) return true;

      const isActiveMembershipStatus =
        memberStatus === "active" ||
        memberStatus === "accepted" ||
        memberStatus === "joined";

      return isActiveMembershipStatus;
    };

    return allProjects.filter((project) => {
      // Company owner/admin users have implicit access to all projects in their company.
      if (hasCompanyProjectManageAccess && activeCompanyId) {
        const projectCompanyId = toComparableId(
          getProjectCompanyId(project as any),
        );
        if (projectCompanyId && projectCompanyId === activeCompanyId) {
          return true;
        }
      }

      // Fallback for company owner/admin accounts where activeCompanyMembership
      // isn't available yet in profile payload.
      if (
        hasCompanyProjectManageAccess &&
        (companySubrole === "owner" || companySubrole === "admin")
      ) {
        const projectCompanyId = toComparableId(
          getProjectCompanyId(project as any),
        );
        const viewerId = toComparableId(
          (userProfile as any)._id || (userProfile as any).id,
        );
        if (projectCompanyId && viewerId && projectCompanyId === viewerId) {
          return true;
        }
      }

      if (Array.isArray(project.team)) {
        const found = project.team.some((member: BackendTeamMember) =>
          isAccessibleTeamMember(member),
        );
        if (found) return true;
      }

      if (Array.isArray((project as any).team_members)) {
        const byTeamMembers = (project as any).team_members.some(
          (member: TeamMember) => isAccessibleTeamMember(member),
        );
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
