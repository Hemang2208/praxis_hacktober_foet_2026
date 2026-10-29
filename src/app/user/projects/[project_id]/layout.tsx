"use client";

import { useEffect, ReactNode, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useUserJoinedProjects } from "@/hooks/useUserJoinedProjects";
import useUserProfile from "@/hooks/useUserProfile";
import { canManageCompanyProjects } from "@/lib/company-rbac";
import toast from "react-hot-toast";

interface LayoutProps {
  children: ReactNode;
}

export default function ProjectLayout({ children }: LayoutProps) {
  const params = useParams();
  const project_id = params.project_id as string;
  const pathname = usePathname();
  const router = useRouter();
  const { joinedProjects, hasJoinedAny } = useUserJoinedProjects();
  const { mongoUser: viewerProfile } = useUserProfile();
  const [projectCompanyId, setProjectCompanyId] = useState<string | null>(null);

  const canManageProjectActions = canManageCompanyProjects(
    viewerProfile as any,
  );

  const toComparableId = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) {
      const maybeObject = value as Record<string, unknown>;
      if (typeof maybeObject.$oid === "string") return maybeObject.$oid;
    }
    return String(value);
  };

  const requestedProjectId = toComparableId(project_id);
  const isCurrentProjectJoined = joinedProjects.some(
    (joined) => toComparableId(joined._id) === requestedProjectId,
  );

  const projectBasePath = `/user/projects/${requestedProjectId}`;
  const isAssessmentManageRoute =
    pathname === `${projectBasePath}/assessment/manage`;
  const requiresJoinedMembership =
    pathname.startsWith(`${projectBasePath}/board`) ||
    pathname.startsWith(`${projectBasePath}/statusui`) ||
    isAssessmentManageRoute;

  // Fetch project to check if it belongs to user's company
  useEffect(() => {
    if (!requestedProjectId) return;

    // Check among joined projects first
    const joinedProject = joinedProjects.find(
      (p) => toComparableId(p._id) === requestedProjectId,
    );
    if (joinedProject && (joinedProject as any).companyId) {
      setProjectCompanyId((joinedProject as any).companyId);
      return;
    }

    // If not in joined projects, fetch project details to check company ownership
    const fetchProjectData = async () => {
      try {
        const response = await fetch(`/api/project/${requestedProjectId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const project = data.project || data;
          if (project.companyId) {
            setProjectCompanyId(project.companyId);
          }
        }
      } catch (error) {
        console.error("[ProjectLayout] Error fetching project data:", error);
      }
    };

    fetchProjectData();
  }, [requestedProjectId, joinedProjects]);

  useEffect(() => {
    if (!requestedProjectId) {
      return;
    }

    // Wait for profile to load before showing errors
    if (!viewerProfile) {
      return;
    }

    // BYPASS 1: If user is admin/owner with company management permissions, allow access
    if (canManageProjectActions) {
      return;
    }

    // BYPASS 2: If project belongs to user's company and user is admin/owner, allow access
    const userCompanyId = (viewerProfile as any)?.activeCompanyMembership
      ?.companyId;
    const userCompanySubrole = (viewerProfile as any)?.activeCompanyMembership
      ?.subrole;
    const isAdminOrOwner =
      userCompanySubrole === "admin" || userCompanySubrole === "owner";

    if (
      projectCompanyId &&
      userCompanyId &&
      projectCompanyId === userCompanyId &&
      isAdminOrOwner
    ) {
      console.log(
        "[ProjectLayout] Allowing company admin access to company project",
        { projectCompanyId, userCompanyId, userCompanySubrole },
      );
      return;
    }

    if (hasJoinedAny && !isCurrentProjectJoined) {
      toast.error("You can only access projects you are already part of.");
      router.push("/user/projects");
      return;
    }

    if (!isCurrentProjectJoined && requiresJoinedMembership) {
      toast.error(
        "Join this project first to access board and workspace pages.",
      );
      router.push(projectBasePath);
      return;
    }

    if (isAssessmentManageRoute) {
      toast.error("Only owner/admin can manage assessments.");
      router.push(`${projectBasePath}/assessment`);
    }
  }, [
    canManageProjectActions,
    hasJoinedAny,
    isAssessmentManageRoute,
    isCurrentProjectJoined,
    projectBasePath,
    requestedProjectId,
    requiresJoinedMembership,
    router,
    viewerProfile,
    projectCompanyId,
  ]);

  return <>{children}</>;
}
