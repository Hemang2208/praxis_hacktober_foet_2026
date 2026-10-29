import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useProjects } from "@/hooks/useProjects";
import { getProjectCompanyId } from "@/lib/project-ownership";

/**
 * Debug hook to log project filtering information
 */
export const useDebugProjectFiltering = () => {
  const { mongoUser, isLoaded: userLoaded } = useUser();
  const { projects, loading } = useProjects();

  useEffect(() => {
    if (!userLoaded) {
      console.log("[DEBUG] User not loaded yet");
      return;
    }

    console.log("=== PROJECT FILTERING DEBUG ===");
    console.log("[USER API] mongoUser object structure:", {
      keys: mongoUser ? Object.keys(mongoUser) : null,
      user_id: mongoUser?.user_id,
      _id: mongoUser?._id,
      id: mongoUser?.id,
      fullData: mongoUser,
    });

    console.log(`[PROJECTS] Total projects from API: ${projects.length}`);

    if (projects.length > 0) {
      const firstProject = projects[0] as any;
      console.log("[PROJECTS] First project structure:", {
        keys: Object.keys(projects[0]),
        _id: projects[0]._id,
        user: projects[0].user,
        companyId: getProjectCompanyId(projects[0]),
        created_by: firstProject.created_by,
        created_at: projects[0].created_at,
        title: projects[0].title,
        fullData: projects[0],
      });

      console.log("[FILTERING] Comparing values:");
      projects.forEach((project, index) => {
        const creatorId = getProjectCompanyId(project);
        const user_id = mongoUser?.user_id;
        const matches = creatorId === user_id;
        console.log(`  Project ${index} (${project.title}):`, {
          projectUser: creatorId,
          currentuser_id: user_id,
          match: matches,
          type: {
            projectUserType: typeof creatorId,
            user_idType: typeof user_id,
            projectUserIsNull: creatorId === null,
            user_idIsNull: user_id === null,
          },
        });
      });
    }

    console.log("[LOADING STATES]", { loading });
  }, [mongoUser, userLoaded, projects, loading]);
};
