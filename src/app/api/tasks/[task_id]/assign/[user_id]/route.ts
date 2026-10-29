import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import Project from "@/models/Project";
import { Types } from "mongoose";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { normalizeTaskWorkflowStatus } from "@/lib/taskWorkflow";
import { serverQueueAwareFetch } from "@/lib/queueAwareFetch";
import { emit_notification_event } from "@/lib/notificationEvents";
import { verifyJwt } from "@/lib/jwt";
import { User } from "@/models/User";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ task_id: string; user_id: string }> },
) {
  try {
    const token = request.cookies.get("aipm_token")?.value;
    const para = await params;
    const { task_id, user_id } = para;

    if (!task_id || !user_id) {
      return NextResponse.json(
        { error: "Task ID and User ID are required" },
        { status: 400 },
      );
    }

    // Connect to database to validate membership
    await dbConnect();

    // Get the task to find the project
    const task = await Task.findById(task_id);
    // If the task is not available in the local DB, fall back to forwarding
    // the assignment request to the task-mgmt-agent without local validation.
    const project_id = task ? task.project_id || task.project : null;
    const project = project_id ? await Project.findById(project_id) : null;
    let matchedProjectMember: {
      user?: Types.ObjectId;
      email?: string;
      role?: string;
    } | null = null;

    // Check if user is a member of the project
    // Only check by user ID, not email - the backend expects a user ID
    let isMember = project?.team_members?.some((member) => {
      const matches = member.user?.toString() === user_id;
      if (matches) {
        matchedProjectMember = member as {
          user?: Types.ObjectId;
          email?: string;
          role?: string;
        };
      }
      return matches;
    });

    // If not a member, attempt a best-effort resolution:
    // - Handle cases where the client passes an email-like token (e.g. `temp_hemang_2208_gmail_com`)
    // - Try to match a team member by normalized email-key derived from `member.email`
    // - If a match exists but member.user is missing, attempt to resolve the User doc and persist the `user` id
    if (!isMember && project?.team_members && project.team_members.length) {
      const normalizeKey = (s?: string) =>
        (s || "")
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      const incomingKey = normalizeKey(user_id.replace(/^temp_/, ""));

      // Try to find a matching team member by normalized email
      const matchedIndex = project.team_members.findIndex((member) => {
        const emailKey = normalizeKey(member.email);
        return emailKey && emailKey === incomingKey;
      });

      if (matchedIndex !== -1) {
        const matchedMember = project.team_members[matchedIndex];
        matchedProjectMember = matchedMember as {
          user?: Types.ObjectId;
          email?: string;
          role?: string;
        };
        // If the matched member has a user id, accept it
        if (matchedMember.user) {
          isMember =
            String(matchedMember.user) === user_id ||
            Boolean(matchedMember.user);
        } else if (matchedMember.email) {
          // Attempt to resolve a User by email and persist it onto the project
          try {
            const foundUser = await (
              await import("@/models/User")
            ).User.findOne({
              email: {
                $regex: `^${String(matchedMember.email).trim()}$`,
                $options: "i",
              },
            })
              .select("_id")
              .lean()
              .exec();
            const foundObj = foundUser as unknown as Record<
              string,
              unknown
            > | null;
            if (foundObj && foundObj._id) {
              // Update the project member in DB to include user id
              const resolvedId =
                typeof foundObj._id === "string"
                  ? new Types.ObjectId(String(foundObj._id))
                  : (foundObj._id as unknown as Types.ObjectId);
              project.team_members[matchedIndex].user = resolvedId;
              await Project.findByIdAndUpdate(project._id, {
                team_members: project.team_members,
              }).exec();
              isMember = true;
            }
          } catch (e) {
            console.warn(
              "Failed to resolve matched member email to user:",
              matchedMember.email,
              e,
            );
          }
        }
      }
    }

    if (project && !isMember) {
      return NextResponse.json(
        {
          error: `User with ID ${user_id} is not a member of this project. Only project members can be assigned to tasks.`,
        },
        { status: 403 },
      );
    }

    const shouldAutoSetInProgress =
      normalizeTaskWorkflowStatus(task?.status) === "todo";

    // Forward the request to the configured task backend service
    const backendUrl = TASK_MGMT_AGENT_URL;
    const forwardUrl = `${backendUrl}/tasks/${task_id}/assign/${user_id}`;

    let forwardBody: unknown = {};
    try {
      forwardBody = await request.json();
    } catch {
      // If parsing fails or body was empty, keep an empty object
      forwardBody = {};
    }

    const response = await serverQueueAwareFetch(forwardUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(forwardBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to assign task: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // ALWAYS keep local Mongo task in sync for assigned_to
    try {
      await Task.findByIdAndUpdate(task_id, {
        assigned_to: user_id,
        ...(shouldAutoSetInProgress
          ? {
              status: "in-progress",
              completed_at: null,
            }
          : {}),
        updated_at: new Date(),
      }).exec();

      if (Types.ObjectId.isValid(user_id)) {
        let assignedByName: string | undefined = undefined;
        try {
          if (token) {
            const payload = await verifyJwt(token);
            if (payload && payload.id) {
              const assigner = await User.findById(payload.id).select("full_name companyName collegeName").lean().exec();
              if (assigner) {
                assignedByName = (assigner as any).full_name || (assigner as any).companyName || (assigner as any).collegeName || undefined;
              }
            }
          }
        } catch (authErr) {
          console.warn("Failed to resolve task assigner identity in endpoint:", authErr);
        }

        await emit_notification_event({
          user_id: user_id,
          event_type: "TASK_ASSIGNED",
          title: "Task Assigned",
          message: `You have been assigned a task: ${task?.title || "Task"}`,
          category: "tasks",
          priority: "high",
          event_key: `TASK_ASSIGNED:${task_id}:${user_id}`,
          metadata: {
            task_id: task_id,
            task_title: task?.title || "Task",
            project_id: project_id ? String(project_id) : undefined,
            assigned_by: assignedByName,
          },
        });
      }
    } catch (syncErr) {
      console.warn("Error while syncing task assigned_to to local DB:", syncErr);
    }

    if (shouldAutoSetInProgress) {
      try {
        const statusUpdateRes = await serverQueueAwareFetch(
          `${backendUrl}/tasks/${encodeURIComponent(task_id)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status: "in-progress" }),
          },
        );

        if (!statusUpdateRes.ok) {
          const errText = await statusUpdateRes.text().catch(() => "");
          console.warn(
            "Failed to auto-set task status to in-progress for trainee assignment:",
            statusUpdateRes.status,
            errText,
          );
        }
      } catch (statusErr) {
        console.warn(
          "Error while auto-updating task status to in-progress via API:",
          statusErr,
        );
      }

      (data as Record<string, unknown>).status = "in-progress";
    }

    // Enrich response with local assignee info (if available) so UI can show avatar
    try {
      const normalizeKey = (s?: string) =>
        (s || "")
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

      let assignee:
        | { id: string; name?: string; email?: string; avatar?: string }
        | undefined = undefined;

      if (project.team_members && project.team_members.length) {
        // Try to match by explicit user id
        let matched = project.team_members.find(
          (m) => m.user && String(m.user) === String(user_id),
        );

        if (!matched) {
          // Try normalized email match (supports temp_ tokens)
          const incomingKey = normalizeKey(
            String(user_id).replace(/^temp_/, ""),
          );
          matched = project.team_members.find((m) => {
            const emailKey = normalizeKey(m.email);
            return emailKey && emailKey === incomingKey;
          });
        }

        if (matched) {
          const mRec = matched as unknown as Record<string, unknown>;
          assignee = {
            id: String(mRec.user ?? mRec._id ?? user_id),
            name:
              (typeof mRec.name === "string" && mRec.name) ||
              (typeof mRec.full_name === "string" && mRec.full_name) ||
              undefined,
            email: typeof mRec.email === "string" ? mRec.email : undefined,
            avatar:
              (typeof mRec.avatar === "string" && mRec.avatar) ||
              (typeof mRec.profile_picture === "string" &&
                mRec.profile_picture) ||
              (typeof mRec.image_url === "string" && mRec.image_url) ||
              undefined,
          };
        }
      }

      // Merge assignee into returned payload (non-destructive)
      if (assignee) {
        try {
          const merged = { ...(data || {}), assignee };
          return NextResponse.json(merged);
        } catch (e) {
          // If merging fails for any reason, fall back to returning original data
          console.warn("Failed to merge assignee into response:", e);
        }
      }
    } catch (e) {
      console.warn("Assignee enrichment failed:", e);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in task assignment API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
