import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { Company, User } from "@/models/User";
import Task from "@/models/Task";
import { Types } from "mongoose";
import { emit_notification_event } from "@/lib/notificationEvents";
import {
  COMPANY_PROJECT_MANAGEMENT_ROLES,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import {
  getProjectCompanyId,
  projectBelongsToCompany,
  projectHasTeamMember,
} from "@/lib/project-ownership";
import {
  buildMemberIdentityKey,
  countRoles,
  isPrivilegedProjectMemberRole,
  normalizeMemberEmail,
  normalizeMemberRoleKey,
} from "@/lib/project-member-constraints";

async function resolveCompanyMembership(companyId: string, email?: unknown) {
  const company = await Company.findById(companyId).lean().exec();
  if (!company) return null;

  const membership = Array.isArray(company.members)
    ? company.members.find(
        (member: { email: string; status: string }) =>
          String(member.email).toLowerCase() ===
            String(email ?? "").toLowerCase() && member.status === "active",
      )
    : null;

  return {
    companyId: company._id.toString(),
    membership: membership
      ? {
          email: membership.email,
          subrole: normalizeCompanySubrole(membership.subrole),
          status: membership.status,
        }
      : null,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function isPrivilegedTargetMember(args: {
  member: { user?: unknown; email?: unknown; role?: unknown };
  projectCompanyId: string;
}): Promise<boolean> {
  const { member, projectCompanyId } = args;

  if (isPrivilegedProjectMemberRole(member.role)) return true;

  const memberUserId = String(member.user ?? "").trim();
  const memberEmail = normalizeMemberEmail(member.email);

  let userDoc: {
    _id?: unknown;
    role?: unknown;
    email?: unknown;
  } | null = null;

  if (Types.ObjectId.isValid(memberUserId)) {
    userDoc = (await User.findById(memberUserId)
      .select("_id role email")
      .lean()) as {
      _id?: unknown;
      role?: unknown;
      email?: unknown;
    } | null;
  }

  if (!userDoc && memberEmail) {
    userDoc = (await User.findOne({
      email: { $regex: `^${escapeRegex(memberEmail)}$`, $options: "i" },
    })
      .select("_id role email")
      .lean()) as {
      _id?: unknown;
      role?: unknown;
      email?: unknown;
    } | null;
  }

  const normalizedEmail = normalizeMemberEmail(userDoc?.email ?? memberEmail);

  if (isPrivilegedProjectMemberRole(userDoc?.role)) return true;

  if (
    !projectCompanyId ||
    !Types.ObjectId.isValid(projectCompanyId) ||
    !normalizedEmail
  ) {
    return false;
  }

  const companyDoc = (await Company.findById(projectCompanyId)
    .select("members")
    .lean()) as {
    members?: Array<{ email?: unknown; status?: unknown; subrole?: unknown }>;
  } | null;

  if (!companyDoc || !Array.isArray(companyDoc.members)) return false;

  const membership = companyDoc.members.find(
    (entry) =>
      normalizeMemberEmail(entry.email) === normalizedEmail &&
      String(entry.status ?? "")
        .trim()
        .toLowerCase() === "active",
  );

  if (!membership) return false;
  return isPrivilegedProjectMemberRole(membership.subrole);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ project_id: string }> },
): Promise<Response> {
  try {
    // JWT authentication (from cookies)
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const para = await params;
    const { project_id } = para;

    if (!Types.ObjectId.isValid(project_id)) {
      return new Response(JSON.stringify({ error: "Invalid project ID" }), {
        status: 400,
      });
    }

    // Avoid populating `project.tasks` because some projects may have task
    // entries that are not valid ObjectId values (e.g. legacy string titles).
    // We already fetch tasks separately below, so populate is unnecessary
    // and can cause CastError when Mongoose attempts to cast non-IDs.
    const project = await Project.findOne({ _id: project_id }).lean().exec();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    } else if (payload.role === "student") {
      let hasCompanyManagementAccess = false;

      if (projectCompanyId) {
        const companyAccess = await resolveCompanyMembership(
          projectCompanyId,
          payload.email,
        );

        hasCompanyManagementAccess = Boolean(
          companyAccess?.membership &&
          COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
            companyAccess.membership.subrole,
          ) &&
          projectBelongsToCompany(project, companyAccess.companyId),
        );
      }

      if (
        !hasCompanyManagementAccess &&
        !projectHasTeamMember(project, String(payload.id), payload.email)
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    } else if (payload.role === "college") {
      if (projectCompanyId !== String(payload.id)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    }

    const allTasks = await Task.find({
      $or: [{ project: project_id }, { project_id: project_id }],
    })
      .select({
        ai_feedback: 0,
        comments: 0,
        "notes.content": 0,
        "notes.author": 0,
      })
      .exec();

    const completedTasks = allTasks.filter(
      (task) => task.status === "completed" || !!task.completed_at,
    );

    const upcomingTasks = allTasks
      .filter((task) => !task.completed_at && task.due_date)
      .sort(
        (a, b) =>
          new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
      )
      .slice(0, 3);

    const timelineFromTasks = [
      ...completedTasks.map((task) => ({
        id: task._id.toString(),
        title: task.title,
        description: "Task completed",
        type: "milestone",
        date: task.completed_at || task.updated_at,
      })),
      ...upcomingTasks.map((task) => ({
        id: task._id.toString(),
        title: task.title,
        description: "Upcoming task",
        type: "assessment",
        date: task.due_date!,
      })),
    ];

    const enrichedProject = {
      ...project,
      tasks: allTasks,
      completedTasks: completedTasks.length,
      totalTasks: allTasks.length,
      overdueTasks: allTasks.filter(
        (task) =>
          !task.completed_at &&
          task.due_date &&
          new Date(task.due_date) < new Date(),
      ).length,
      timeline: [...timelineFromTasks, ...(project.timeline || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };

    return new Response(JSON.stringify({ project: enrichedProject }), {
      status: 200,
    });
  } catch (error) {
    console.error("Project fetch error:", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ project_id: string }> },
): Promise<Response> {
  try {
    // JWT authentication (from cookies)
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const para = await params;
    const { project_id } = para;
    const updates = (await req.json()) as Record<string, unknown> | null;

    // Handle legacy 'team' field - convert to 'team_members'
    if (updates && updates.team && !updates.team_members) {
      updates.team_members = updates.team;
      delete updates.team;
    }

    // Helper type guard for incoming team member shapes
    const isMemberLike = (
      v: unknown,
    ): v is {
      user?: unknown;
      email?: unknown;
      name?: unknown;
      avatar?: unknown;
    } => {
      if (!v || typeof v !== "object") return false;
      const r = v as Record<string, unknown>;
      // Expect at least an email or a name or user field. Accept ObjectIds with toString.
      const userHasToString =
        r.user &&
        typeof (r.user as { toString?: unknown }).toString === "function";
      return (
        typeof r.email === "string" ||
        typeof r.name === "string" ||
        typeof r.user === "string" ||
        Boolean(userHasToString)
      );
    };

    try {
      if (updates && Array.isArray(updates.team_members)) {
        const fixedMembers: Array<Record<string, unknown>> = [];
        for (const mem of updates.team_members) {
          if (!isMemberLike(mem)) {
            // Preserve unknown shapes but coerce to object to avoid crashes
            fixedMembers.push({} as Record<string, unknown>);
            continue;
          }

          const memRec = mem as Record<string, unknown>;
          const memberCopy: Record<string, unknown> = {
            name: typeof memRec.name === "string" ? memRec.name : undefined,
            email: typeof memRec.email === "string" ? memRec.email : undefined,
            avatar:
              typeof memRec.avatar === "string" ? memRec.avatar : undefined,
            role: typeof memRec.role === "string" ? memRec.role : undefined,
            user: typeof memRec.user === "string" ? memRec.user : undefined,
          };

          if (
            (!memberCopy.user || memberCopy.user === "") &&
            typeof memberCopy.email === "string"
          ) {
            try {
              const normalizedEmail = String(memberCopy.email)
                .toLowerCase()
                .trim();
              const foundUser = await User.findOne({
                email: { $regex: `^${normalizedEmail}$`, $options: "i" },
              })
                .select("_id full_name profile_picture image_url")
                .lean()
                .exec();
              const foundObj = foundUser as unknown as Record<
                string,
                unknown
              > | null;
              if (foundObj && foundObj._id) {
                memberCopy.user = String(foundObj._id);
                if (!memberCopy.name && typeof foundObj.full_name === "string")
                  memberCopy.name = foundObj.full_name;
                if (
                  !memberCopy.avatar &&
                  (typeof foundObj.profile_picture === "string" ||
                    typeof foundObj.image_url === "string")
                ) {
                  memberCopy.avatar =
                    (foundObj.profile_picture as string) ||
                    (foundObj.image_url as string);
                }
              }
            } catch (e) {
              console.warn(
                "Failed to resolve user for member email:",
                memberCopy.email,
                e,
              );
            }
          }

          fixedMembers.push(memberCopy);
        }

        // Replace the incoming team_members with the fixed list
        updates.team_members = fixedMembers as unknown as undefined;
      }
    } catch (e) {
      console.warn(
        "Error while attempting to fix team members before save:",
        e,
      );
      // Non-fatal: continue with the provided updates even if fix attempt fails
    }

    if (!Types.ObjectId.isValid(project_id)) {
      return new Response(JSON.stringify({ error: "Invalid project ID" }), {
        status: 400,
      });
    }

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    let isProjectAdminOrOwner = false;

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      isProjectAdminOrOwner =
        companyAccess.membership.subrole === "owner" ||
        companyAccess.membership.subrole === "admin";
    } else if (payload.role === "student") {
      if (!projectCompanyId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      const companyAccess = await resolveCompanyMembership(
        projectCompanyId,
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      isProjectAdminOrOwner =
        companyAccess.membership.subrole === "owner" ||
        companyAccess.membership.subrole === "admin";
    } else if (payload.role === "college") {
      if (projectCompanyId !== String(payload.id)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      isProjectAdminOrOwner = true;
    } else {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    if (updates && Array.isArray(updates.team_members)) {
      const existingMembers = Array.isArray(project.team_members)
        ? (project.team_members as Array<Record<string, unknown>>)
        : [];

      const resourceSource = Array.isArray(updates.resources)
        ? (updates.resources as Array<Record<string, unknown>>)
        : Array.isArray(project.resources)
          ? (project.resources as Array<Record<string, unknown>>)
          : [];

      const allowedRoleSet = new Set(
        resourceSource
          .map((resource) => normalizeMemberRoleKey(resource?.profile))
          .filter((role) => Boolean(role)),
      );

      const existingKeys = new Set(
        existingMembers
          .map((m) => buildMemberIdentityKey(m))
          .filter((k) => Boolean(k)),
      );

      const seenIncoming = new Set<string>();
      const incomingMembers = (updates.team_members as Array<unknown>).filter(
        (raw): raw is Record<string, unknown> =>
          Boolean(raw) && typeof raw === "object",
      );

      const roleCounts = countRoles(
        incomingMembers as Array<{ role?: unknown }>,
      );

      for (const [roleKey, count] of Object.entries(roleCounts)) {
        if (count > 1) {
          return new Response(
            JSON.stringify({
              error: `Role assignment conflict: ${roleKey} is already occupied.`,
            }),
            { status: 409 },
          );
        }
      }

      for (const raw of updates.team_members as Array<unknown>) {
        if (!raw || typeof raw !== "object") continue;
        const member = raw as Record<string, unknown>;
        const key = buildMemberIdentityKey(member);
        if (!key) continue;

        const roleKey = normalizeMemberRoleKey(member.role);
        if (!roleKey) {
          return new Response(
            JSON.stringify({
              error:
                "Each team member must map to a valid project resource role.",
            }),
            { status: 409 },
          );
        }

        if (isPrivilegedProjectMemberRole(roleKey)) {
          return new Response(
            JSON.stringify({
              error:
                "Admin/Owner users already have implicit access and cannot be added manually.",
            }),
            { status: 409 },
          );
        }

        if (!allowedRoleSet.has(roleKey)) {
          return new Response(
            JSON.stringify({
              error: `Invalid role assignment: ${String(member.role || roleKey)} is not defined in project resources.`,
            }),
            { status: 409 },
          );
        }

        if (seenIncoming.has(key)) {
          return new Response(
            JSON.stringify({
              error: "Duplicate member entries are not allowed.",
            }),
            { status: 409 },
          );
        }
        seenIncoming.add(key);
      }

      if (isProjectAdminOrOwner) {
        const currentUserIdKey = `user:${String(payload.id ?? "")
          .trim()
          .toLowerCase()}`;
        const currentUserEmail = normalizeMemberEmail(payload.email);
        const currentUserEmailKey = currentUserEmail
          ? `email:${currentUserEmail}`
          : "";

        const newlyAddedKeys = Array.from(seenIncoming).filter(
          (key) => !existingKeys.has(key),
        );

        const isSelfAdd = newlyAddedKeys.some(
          (key) =>
            key === currentUserIdKey ||
            (String(payload.email ?? "").trim() && key === currentUserEmailKey),
        );

        if (isSelfAdd) {
          return new Response(
            JSON.stringify({
              error:
                "Admin/Owner already has implicit project access and cannot be added as a team member.",
            }),
            { status: 409 },
          );
        }

        for (const member of incomingMembers) {
          const identityKey = buildMemberIdentityKey(member);
          if (!identityKey || !newlyAddedKeys.includes(identityKey)) continue;

          const privilegedTarget = await isPrivilegedTargetMember({
            member,
            projectCompanyId,
          });

          if (privilegedTarget) {
            return new Response(
              JSON.stringify({
                error:
                  "Admin/Owner users already have implicit access and cannot be added manually.",
              }),
              { status: 409 },
            );
          }
        }
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      project_id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    if (!updatedProject) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    if (updates?.status === "approved" || updates?.status === "rejected") {
      const projectOwnerId = updatedProject.user || updatedProject.created_by;
      if (projectOwnerId) {
        try {
          await emit_notification_event({
            user_id: String(projectOwnerId),
            event_type: updates.status === "approved" ? "PROJECT_APPROVED" : "PROJECT_REJECTED",
            title: updates.status === "approved" ? "Project Approved" : "Project Rejected",
            message: `Project "${updatedProject.title}" has been ${updates.status}`,
            category: "projects",
            priority: updates.status === "rejected" ? "high" : "medium",
            event_key: `PROJECT_${updates.status.toUpperCase()}:${updatedProject._id}`,
            metadata: {
              project_id: updatedProject._id,
              project_title: updatedProject.title,
            },
          });
        } catch (notifError) {
          console.error("Failed to create project status notification:", notifError);
        }
      }
    }

    return new Response(JSON.stringify({ project: updatedProject }), {
      status: 200,
    });
  } catch (error) {
    console.error("Project update error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to update project",
      }),
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ project_id: string }> },
): Promise<Response> {
  try {
    // JWT authentication (from cookies)
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const para = await params;
    const { project_id } = para;

    if (!Types.ObjectId.isValid(project_id)) {
      return new Response(JSON.stringify({ error: "Invalid project ID" }), {
        status: 400,
      });
    }

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    } else if (payload.role === "student") {
      if (!projectCompanyId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      const companyAccess = await resolveCompanyMembership(
        projectCompanyId,
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    } else if (payload.role === "college") {
      if (projectCompanyId !== String(payload.id)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    // First delete all tasks associated with this project
    await Task.deleteMany({ project: project_id });

    // Then delete the project
    const deletedProject = await Project.findByIdAndDelete(project_id);

    if (!deletedProject) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({
        message: "Project deleted successfully",
        id: project_id,
      }),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Project delete error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to delete project",
      }),
      {
        status: 500,
      },
    );
  }
}
