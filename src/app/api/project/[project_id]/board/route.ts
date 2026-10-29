export const dynamic = "force-dynamic";

import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { Company, User } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import {
  COMPANY_PROJECT_MANAGEMENT_ROLES,
  COMPANY_TASK_REVIEW_ROLES,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import {
  getProjectCompanyId,
  projectBelongsToCompany,
  projectHasTeamMember,
} from "@/lib/project-ownership";
import { Types } from "mongoose";
import {
  canTransitionWorkflowStatus,
  getTaskWorkflowLabel,
  normalizeTaskWorkflowStatus,
} from "@/lib/taskWorkflow";
import { emit_notification_event, check_and_notify_student_code_review } from "@/lib/notificationEvents";
import AIFeedback from "@/models/AIFeedback";

type TaskWorkflowRecord = Record<string, unknown>;

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

function coerceIsoDate(input: unknown): string | undefined {
  if (!input) return undefined;
  try {
    const d = new Date(String(input));
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

function hasAllVisibleSubTasksCompleted(
  task: Record<string, unknown>,
): boolean {
  const subTasksRaw = task.sub_tasks;
  const subTasks = Array.isArray(subTasksRaw) ? subTasksRaw : [];
  const visibleSubTasks = subTasks.filter((st) => {
    if (!st || typeof st !== "object") return false;
    const rec = st as Record<string, unknown>;
    return !Boolean(rec.is_deleted ?? rec.isDeleted ?? rec.deleted ?? false);
  });

  if (visibleSubTasks.length === 0) return true;
  return visibleSubTasks.every((st) => {
    const rec = st as Record<string, unknown>;
    return Boolean(rec.completed ?? false);
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ project_id: string }> },
): Promise<Response> {
  try {
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

    const project = await Project.findById(project_id)
      .select({
        title: 1,
        description: 1,
        companyId: 1,
        company_id: 1,
        created_by: 1,
        user: 1,
        team: 1,
        team_members: 1,
      })
      .lean()
      .exec();
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

    // Fetch tasks from the external backend (task-mgmt-agent)
    let boardTasks = [];
    try {
      const TASK_MGMT_AGENT_URL = process.env.NEXT_PUBLIC_API_URL?.replace(
        /\/$/,
        "",
      );
      const agentUrl = TASK_MGMT_AGENT_URL?.endsWith("/agent")
        ? TASK_MGMT_AGENT_URL
        : `${TASK_MGMT_AGENT_URL}/agent`;

      const response = await fetch(
        `${agentUrl}/task-mgmt-agent/api/v1/projects/${encodeURIComponent(project_id)}/tasks?include_notes=false&t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
        },
      );

      if (response.ok) {
        const data = (await response.json()) as unknown;
        const rawTasks = Array.isArray(data)
          ? data
          : data &&
              typeof data === "object" &&
              "tasks" in data &&
              Array.isArray((data as any).tasks)
            ? (data as any).tasks
            : [];

        boardTasks = rawTasks.map((task: any) => {
          const rawSubTasks =
            (Array.isArray(task?.sub_tasks) && task.sub_tasks) ||
            (Array.isArray(task?.sub_tasks) && task.sub_tasks) ||
            [];

          const sub_tasks = rawSubTasks
            .filter((st: any) => {
              const raw = st || {};
              return !Boolean(
                raw.is_deleted ?? raw.isDeleted ?? raw.deleted ?? false,
              );
            })
            .map((st: any) => ({
            title: String(st?.title ?? st?.name ?? st?.task_name ?? "Subtask"),
            description:
              typeof st?.description === "string" ? st.description : undefined,
            completed:
              typeof st?.completed === "boolean"
                ? st.completed
                : String(st?.status ?? "").toLowerCase() === "completed",
          }));

          const created_at =
            coerceIsoDate(task?.created_at ?? task?.created_at) ??
            new Date().toISOString();
          const updated_at =
            coerceIsoDate(task?.updated_at ?? task?.updated_at) ?? created_at;
          const due_date = coerceIsoDate(task?.due_date ?? task?.due_date);

          const notesCountFromPayload =
            typeof task?.notesCount === "number"
              ? task.notesCount
              : typeof task?.notes_count === "number"
                ? task.notes_count
                : Array.isArray(task?.notes)
                  ? task.notes.filter((n: any) => !n?.is_deleted).length
                  : 0;

          const comments_count =
            typeof task?.comments_count === "number"
              ? task.comments_count
              : typeof task?.comments_count === "number"
                ? task.comments_count
                : notesCountFromPayload > 0
                  ? notesCountFromPayload
                  : Array.isArray(task?.comments)
                    ? task.comments.length
                    : 0;

          const attachments_count =
            typeof task?.attachments_count === "number"
              ? task.attachments_count
              : typeof task?.attachments_count === "number"
                ? task.attachments_count
                : Array.isArray(task?.attachments)
                  ? task.attachments.length
                  : Array.isArray(task?.files)
                    ? task.files.length
                    : 0;

          const tags = Array.isArray(task?.tags)
            ? task.tags
                .filter((t: any) => typeof t === "string" && t.trim())
                .map((t: string) => t.trim())
            : typeof task?.tags === "string"
              ? task.tags
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean)
              : [];

          const linkedPrIdRaw =
            task?.linked_pr_id ?? task?.linked_pr_id ?? null;
          const linked_pr_id =
            typeof linkedPrIdRaw === "string" && linkedPrIdRaw.trim()
              ? linkedPrIdRaw.trim()
              : null;

          return {
            id: String(task?.id ?? task?._id ?? ""),
            title: String(task?.title ?? ""),
            description: String(task?.description ?? ""),
            status: normalizeTaskWorkflowStatus(task?.status),
            priority: String(task?.priority ?? "medium"),
            assigned_to:
              (task?.assigned_to ?? task?.assigned_to)
                ? String(task?.assigned_to ?? task?.assigned_to)
                : undefined,
            due_date,
            tags,
            comments_count,
            attachments_count,
            linked_pr_id,
            sub_tasks,
            time_tracking: task?.time_tracking || {
              estimated: 0,
              logged: 0,
              remaining: 0,
            },
            created_at,
            updated_at,
            project_id,
          };
        });
      }
    } catch (err) {
      console.warn(
        "Failed to fetch tasks from external backend, falling back to local DB:",
        err,
      );
      // Fallback to local database
      const tasks = await Task.find({
        $or: [{ project: project_id }, { project_id: project_id }],
      })
        .select({
          ai_feedback: 0,
          comments: 0,
          "notes.content": 0,
          "notes.author": 0,
        })
        .lean()
        .exec();

      boardTasks = tasks.map((task) => ({
        id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        status: normalizeTaskWorkflowStatus(task.status),
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date
          ? new Date(task.due_date).toISOString()
          : undefined,
        tags: task.tags,
        comments_count:
          (Array.isArray(task.notes)
            ? task.notes.filter((n: any) => !n?.is_deleted).length
            : 0) + (Array.isArray(task.comments) ? task.comments.length : 0),
        attachments_count: Array.isArray(task.attachments)
          ? task.attachments.length
          : 0,
        linked_pr_id: (task as any).linked_pr_id ?? null,
        sub_tasks: (task.sub_tasks || []).filter((st: any) => {
              const raw = st || {};
              return !Boolean(
                raw.is_deleted ?? raw.isDeleted ?? raw.deleted ?? false,
              );
            }),
        time_tracking: task.time_tracking,
        created_at: new Date(task.created_at).toISOString(),
        updated_at: new Date(task.updated_at).toISOString(),
        project_id: project_id,
      }));
    }

    // If we did fetch tasks from the external backend, we may still prefer local DB counts
    // for attachments (and any legacy comments) but must NOT overwrite agent note counts with zeros.
    if (Array.isArray(boardTasks) && boardTasks.length > 0) {
      const validIds = boardTasks
        .map((t: any) => String(t?.id ?? ""))
        .filter((id: string) => Types.ObjectId.isValid(id));

      if (validIds.length > 0) {
        const localTasks = await Task.find({
          _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        })
          .select({ notes: 1, comments: 1, attachments: 1 })
          .lean()
          .exec();

        const countsById = new Map<
          string,
          { comments_count: number; attachments_count: number }
        >();

        for (const t of localTasks) {
          const notesCount = Array.isArray((t as any).notes)
            ? (t as any).notes.filter((n: any) => !n?.is_deleted).length
            : 0;
          const comments_count = Array.isArray((t as any).comments)
            ? (t as any).comments.length
            : 0;
          const attachments_count = Array.isArray((t as any).attachments)
            ? (t as any).attachments.length
            : 0;
          countsById.set(String((t as any)._id), {
            comments_count: notesCount + comments_count,
            attachments_count,
          });
        }

        boardTasks = boardTasks.map((task: any) => {
          const local = countsById.get(String(task?.id ?? ""));
          if (!local) return task;
          const currentComments =
            typeof task?.comments_count === "number" ? task.comments_count : 0;
          const currentAttachments =
            typeof task?.attachments_count === "number"
              ? task.attachments_count
              : 0;
          return {
            ...task,
            // Keep the higher value so we don't replace agent note counts with 0 from local.
            comments_count: Math.max(currentComments, local.comments_count),
            // Attachments are still primarily local; prefer local if it is higher.
            attachments_count: Math.max(
              currentAttachments,
              local.attachments_count,
            ),
          };
        });
      }
    }

    // Group tasks by status (columns)
    const columns = [
      {
        id: "todo",
        title: getTaskWorkflowLabel("todo"),
        task_ids: boardTasks
          .filter(
            (task: any) => normalizeTaskWorkflowStatus(task.status) === "todo",
          )
          .map((task: any) => task.id),
        color: "#e2e8f0",
      },
      {
        id: "in-progress",
        title: getTaskWorkflowLabel("in-progress"),
        task_ids: boardTasks
          .filter(
            (task: any) =>
              normalizeTaskWorkflowStatus(task.status) === "in-progress",
          )
          .map((task: any) => task.id),
        color: "#fef3c7",
      },
      {
        id: "submitted",
        title: getTaskWorkflowLabel("submitted"),
        task_ids: boardTasks
          .filter(
            (task: any) =>
              normalizeTaskWorkflowStatus(task.status) === "submitted",
          )
          .map((task: any) => task.id),
        color: "#f3e8ff",
      },
      {
        id: "completed",
        title: getTaskWorkflowLabel("completed"),
        task_ids: boardTasks
          .filter(
            (task: any) =>
              normalizeTaskWorkflowStatus(task.status) === "completed",
          )
          .map((task: any) => task.id),
        color: "#d1fae5",
      },
      {
        id: "blocked",
        title: getTaskWorkflowLabel("blocked"),
        task_ids: boardTasks
          .filter(
            (task: any) =>
              normalizeTaskWorkflowStatus(task.status) === "blocked",
          )
          .map((task: any) => task.id),
        color: "#fee2e2",
      },
    ];

    const boardData = {
      project: {
        id: project._id.toString(),
        title: project.title,
        description: project.description,
      },
      columns,
      tasks: boardTasks,
      columnOrder: ["todo", "in-progress", "submitted", "completed", "blocked"],
    };

    return new Response(JSON.stringify({ board: boardData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching project board:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

// Update task status when moved between columns
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ project_id: string }> },
): Promise<Response> {
  try {
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
    const body = await req.json();
    const { task_id, newStatus } = body;

    console.log("[BOARD PATCH] Request:", JSON.stringify({ project_id, task_id, newStatus, body }));

    const normalizedStatus = normalizeTaskWorkflowStatus(newStatus);
    console.log("[BOARD PATCH] Normalized status:", normalizedStatus);

    if (
      !Types.ObjectId.isValid(project_id) ||
      typeof task_id !== "string" ||
      !task_id
    ) {
      console.warn("[BOARD PATCH] Invalid ID: project_id valid?", Types.ObjectId.isValid(project_id), "task_id:", typeof task_id);
      return new Response(JSON.stringify({ error: "Invalid ID" }), {
        status: 400,
      });
    }

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      console.warn("[BOARD PATCH] Project not found:", project_id);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
      });
    }

    let currentTask: TaskWorkflowRecord | null = (await Task.findOne({
      _id: task_id,
      $or: [{ project: project_id }, { project_id: project_id }],
    })
      .lean()
      .exec()) as unknown as TaskWorkflowRecord | null;

    console.log("[BOARD PATCH] Local task lookup:", currentTask ? `found (status=${currentTask.status})` : "not found");

    // Fallback to task-mgmt-agent when the local shadow collection does not contain the task.
    if (!currentTask) {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
        const agentBase = base?.endsWith("/agent") ? base : `${base}/agent`;
        const lookupRes = await fetch(
          `${agentBase}/task-mgmt-agent/api/v1/tasks/${encodeURIComponent(task_id)}?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: { 
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
          },
        );

        console.log("[BOARD PATCH] Agent lookup status:", lookupRes.status);

        if (lookupRes.ok) {
          const payload = (await lookupRes
            .json()
            .catch(() => null)) as TaskWorkflowRecord | null;
          if (payload) {
            currentTask = (
              payload.task && typeof payload.task === "object"
                ? payload.task
                : payload
            ) as TaskWorkflowRecord;
            console.log("[BOARD PATCH] Agent fallback task status:", currentTask?.status);
          }
        }
      } catch (lookupError) {
        console.warn(
          "[BOARD PATCH] Failed to look up task from external backend:",
          lookupError,
        );
      }
    }

    if (!currentTask) {
      console.warn("[BOARD PATCH] Task not found after all lookups:", task_id);
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404,
      });
    }

    const currentTaskRecord = currentTask as TaskWorkflowRecord;
    const currentStatus = normalizeTaskWorkflowStatus(currentTaskRecord.status);

    const triggerNotificationsAndAI = async () => {
      // 1. Notify company supervisors if the status is submitted or blocked
      if (normalizedStatus === "submitted" || normalizedStatus === "blocked") {
        try {
          const companyId = getProjectCompanyId(project);
          if (companyId) {
            const company = await Company.findById(companyId).lean().exec();
            if (company && Array.isArray(company.members)) {
              const supervisorEmails = company.members
                .filter(
                  (m: any) =>
                    m.status === "active" &&
                    ["owner", "admin", "manager"].includes(m.subrole)
                )
                .map((m: any) => String(m.email).toLowerCase());

              if (supervisorEmails.length > 0) {
                const supervisors = await User.find({
                  email: { $in: supervisorEmails },
                }).select("_id full_name").lean().exec();

                if (supervisors.length > 0) {
                  const assignedTo = currentTaskRecord.assigned_to
                    ? String(currentTaskRecord.assigned_to)
                    : null;
                  let studentName = "A student";
                  if (assignedTo) {
                    const parts = assignedTo.split(",").map(p => p.trim()).filter(Boolean);
                    if (parts[0]) {
                      const part = parts[0];
                      if (Types.ObjectId.isValid(part)) {
                        const assigneeUser = await User.findById(part).select("full_name").lean().exec();
                        if (assigneeUser && (assigneeUser as any).full_name) {
                          studentName = (assigneeUser as any).full_name;
                        }
                      } else {
                        const assigneeUser = await User.findOne({
                          $or: [
                            { email: part.toLowerCase() },
                            { username: part },
                            { full_name: part }
                          ]
                        }).select("full_name").lean().exec();
                        if (assigneeUser && (assigneeUser as any).full_name) {
                          studentName = (assigneeUser as any).full_name;
                        }
                      }
                    }
                  }

                  for (const supervisor of supervisors) {
                    if (normalizedStatus === "submitted") {
                      await emit_notification_event({
                        user_id: supervisor._id as any,
                        event_type: "SUPERVISOR_TASK_SUBMITTED",
                        title: "Student Task Submitted for Review",
                        message: `${studentName} has submitted a task for review: ${currentTaskRecord.title || "Task"}`,
                        category: "tasks",
                        priority: "high",
                        event_key: `SUPERVISOR_TASK_SUBMITTED:${task_id}:${supervisor._id}`,
                        metadata: {
                          task_id: task_id as any,
                          task_title: currentTaskRecord.title || "Task",
                          project_id: project_id as any,
                          project_title: project?.title || "",
                          student_name: studentName,
                          pull_request_url: currentTaskRecord.linked_pr_id as string,
                        },
                      });
                    } else if (normalizedStatus === "blocked") {
                      await emit_notification_event({
                        user_id: supervisor._id as any,
                        event_type: "SUPERVISOR_TASK_BLOCKED",
                        title: "Student Task Blocked",
                        message: `${studentName} has marked a task as blocked: ${currentTaskRecord.title || "Task"}`,
                        category: "tasks",
                        priority: "high",
                        event_key: `SUPERVISOR_TASK_BLOCKED:${task_id}:${supervisor._id}`,
                        metadata: {
                          task_id: task_id as any,
                          task_title: currentTaskRecord.title || "Task",
                          project_id: project_id as any,
                          project_title: project?.title || "",
                          student_name: studentName,
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (superErr) {
          console.error("[BOARD PATCH] Failed to notify supervisors:", superErr);
        }
      }

      // 2. Notify student assignee(s)
      const assignedTo = currentTaskRecord.assigned_to
        ? String(currentTaskRecord.assigned_to)
        : null;
      if (!assignedTo) return;

      const triggerNotif = async (userId: string) => {
        if (normalizedStatus === "submitted") {
          await emit_notification_event({
            user_id: userId,
            event_type: "TASK_IN_REVIEW",
            title: "Task In Review",
            message: `Task moved to review: ${currentTaskRecord.title || "Task"}`,
            category: "tasks",
            priority: "medium",
            event_key: `TASK_IN_REVIEW:${task_id}`,
            metadata: {
              task_id: task_id as any,
              task_title: currentTaskRecord.title || "Task",
              project_id: project_id as any,
              project_title: project?.title || "",
            },
          });

          // Trigger AI feedback generation if a PR is linked but feedback is not ready
          const prUrl = currentTaskRecord.linked_pr_id as string | undefined;
          if (prUrl && (!currentTaskRecord.has_feedback || currentTaskRecord.feedback_status !== "ready")) {
            // Automatic mock fallback has been disabled to prevent duplicate/polluted reviews.
            /*
            setTimeout(async () => {
              try {
                await generateAIFeedback(
                  String(task_id),
                  userId,
                  prUrl,
                );
              } catch (error) {
                console.error("[BOARD PATCH] Error generating AI feedback:", error);
              }
            }, 1000);
            */
          }
        } else if (normalizedStatus === "completed") {
          await emit_notification_event({
            user_id: userId,
            event_type: "TASK_COMPLETED",
            title: "Task Completed",
            message: `Task completed successfully: ${currentTaskRecord.title || "Task"}`,
            category: "tasks",
            priority: "medium",
            event_key: `TASK_COMPLETED:${task_id}`,
            metadata: {
              task_id: task_id as any,
              task_title: currentTaskRecord.title || "Task",
              project_id: project_id as any,
              project_title: project?.title || "",
            },
          });

          // Notify student of code review status if generated and task is completed
          await check_and_notify_student_code_review(task_id);
        } else if (normalizedStatus === "blocked") {
          await emit_notification_event({
            user_id: userId,
            event_type: "TASK_BLOCKED",
            title: "Task Blocked",
            message: `Task has been marked as blocked: ${currentTaskRecord.title || "Task"}`,
            category: "tasks",
            priority: "high",
            event_key: `TASK_BLOCKED:${task_id}`,
            metadata: {
              task_id: task_id as any,
              task_title: currentTaskRecord.title || "Task",
              project_id: project_id as any,
              project_title: project?.title || "",
            },
          });
        } else if (currentStatus === "submitted" && (normalizedStatus === "in-progress" || normalizedStatus === "todo")) {
          await emit_notification_event({
            user_id: userId,
            event_type: "TASK_REJECTED",
            title: "Task Revision Required",
            message: `Task revision required: ${currentTaskRecord.title || "Task"}`,
            category: "tasks",
            priority: "high",
            event_key: `TASK_REJECTED:${task_id}`,
            metadata: {
              task_id: task_id as any,
              task_title: currentTaskRecord.title || "Task",
              project_id: project_id as any,
              project_title: project?.title || "",
            },
          });
        }
      };

      const parts = assignedTo.split(",").map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (Types.ObjectId.isValid(part)) {
          try {
            await triggerNotif(part);
          } catch (err) {
            console.error("[BOARD PATCH] Failed to notify user ID:", part, err);
          }
        } else {
          try {
            const userObj = await User.findOne({
              $or: [
                { email: part.toLowerCase() },
                { username: part },
                { full_name: part }
              ]
            }).select("_id").lean().exec();

            if (userObj && userObj._id) {
              await triggerNotif(userObj._id.toString());
            } else {
              console.warn("[BOARD PATCH] User not found for identifier:", part);
            }
          } catch (err) {
            console.error("[BOARD PATCH] Failed to look up user for identifier:", part, err);
          }
        }
      }
    };

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    let hasWriteAccess = false;
    let isAdminOrOwner = false;
    let isReviewer = false;

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );

      hasWriteAccess = Boolean(
        companyAccess?.membership &&
        projectBelongsToCompany(project, companyAccess.companyId),
      );
      isAdminOrOwner =
        companyAccess?.membership?.subrole === "owner" ||
        companyAccess?.membership?.subrole === "admin";
      isReviewer =
        isAdminOrOwner || companyAccess?.membership?.subrole === "manager";
    } else if (payload.role === "college") {
      hasWriteAccess = projectCompanyId === String(payload.id);
      isAdminOrOwner = hasWriteAccess;
      isReviewer = hasWriteAccess;
    } else if (payload.role === "student" && projectCompanyId) {
      const companyAccess = await resolveCompanyMembership(
        projectCompanyId,
        payload.email,
      );

      hasWriteAccess = Boolean(
        companyAccess?.membership &&
        COMPANY_TASK_REVIEW_ROLES.includes(companyAccess.membership.subrole) &&
        projectBelongsToCompany(project, companyAccess.companyId),
      );
      isAdminOrOwner =
        companyAccess?.membership?.subrole === "owner" ||
        companyAccess?.membership?.subrole === "admin";
      isReviewer =
        isAdminOrOwner || companyAccess?.membership?.subrole === "manager";
    }

    const isAssignee = Boolean(
      currentTaskRecord.assigned_to &&
        String(currentTaskRecord.assigned_to)
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .some((item) => {
            const userIdMatch = payload.id && item === String(payload.id).trim().toLowerCase();
            const emailMatch = payload.email && item === String(payload.email).trim().toLowerCase();
            return userIdMatch || emailMatch;
          })
    );

    if (!hasWriteAccess && isAssignee) {
      hasWriteAccess = true;
    }

    console.log("[BOARD PATCH] RBAC: role=", payload.role, "hasWriteAccess=", hasWriteAccess, "isAdminOrOwner=", isAdminOrOwner, "isAssignee=", isAssignee);

    if (!hasWriteAccess) {
      console.warn("[BOARD PATCH] Forbidden: no write access for user", payload.id);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    console.log("[BOARD PATCH] Transition check:", currentStatus, "->", normalizedStatus);

    if (!isReviewer && !canTransitionWorkflowStatus(currentStatus, normalizedStatus)) {
      console.warn("[BOARD PATCH] Invalid transition:", currentStatus, "->", normalizedStatus);
      return new Response(
        JSON.stringify({
          error: `Invalid task transition from ${currentStatus} to ${normalizedStatus}`,
        }),
        { status: 400 },
      );
    }

    const allSubTasksCompleted =
      hasAllVisibleSubTasksCompleted(currentTaskRecord);
    const feedbackStatus = String(currentTaskRecord.feedback_status ?? "")
      .trim()
      .toLowerCase();
    const hasLinkedPullRequest = Boolean(
      currentTaskRecord.linked_pr_id ?? currentTaskRecord.linked_pull_request,
    );

    console.log("[BOARD PATCH] Validations: allSubTasksCompleted=", allSubTasksCompleted, "feedbackStatus=", feedbackStatus, "hasLinkedPR=", hasLinkedPullRequest);

    if (normalizedStatus === "in-progress" && currentStatus === "submitted") {
      if (!isReviewer) {
        console.warn("[BOARD PATCH] Reject forbidden: not admin/owner/manager");
        return new Response(
          JSON.stringify({
            error:
              "Only Admin, Owner, or Manager can reject a submitted task back to Progress.",
          }),
          { status: 403 },
        );
      }
    }

    if (normalizedStatus === "submitted") {
      if (!isReviewer && !hasLinkedPullRequest) {
        console.warn("[BOARD PATCH] Submitted requires PR link");
        return new Response(
          JSON.stringify({
            error:
              "Tasks can move to Submitted only after a pull request is linked.",
          }),
          { status: 400 },
        );
      }

      if (!isReviewer && !allSubTasksCompleted) {
        console.warn("[BOARD PATCH] Submitted requires all subtasks completed");
        return new Response(
          JSON.stringify({
            error:
              "Tasks can move to Submitted only after all subtasks are completed.",
          }),
          { status: 400 },
        );
      }

      // Bypass checking if feedbackStatus === "ready" to prevent deadlocking trainees
      // during submission when AI agent has delays or errors.
      /*
      if (feedbackStatus !== "ready") {
        console.warn("[BOARD PATCH] Submitted requires feedbackStatus=ready, got:", feedbackStatus);
        return new Response(
          JSON.stringify({
            error:
              "Tasks can move to Submitted only after a code review result is ready.",
          }),
          { status: 400 },
        );
      }
      */
    }

    if (normalizedStatus === "completed") {
      if (!isReviewer && currentStatus !== "submitted") {
        console.warn("[BOARD PATCH] Completed only from Submitted, current:", currentStatus);
        return new Response(
          JSON.stringify({
            error: "Tasks can move to Completed only from Submitted.",
          }),
          { status: 400 },
        );
      }

      if (!isReviewer) {
        console.warn("[BOARD PATCH] Approve forbidden: not admin/owner/manager");
        return new Response(
          JSON.stringify({
            error: "Only Admin, Owner, or Manager can approve a submitted task.",
          }),
          { status: 403 },
        );
      }
    }

    // Prefer updating the external task-mgmt-agent since the board is sourced from it.
    const isRejectedToProgress =
      currentStatus === "submitted" && normalizedStatus === "in-progress";

    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
      const agentBase = base?.endsWith("/agent") ? base : `${base}/agent`;
      console.log("[BOARD PATCH] Proxying to task-mgmt-agent PATCH /tasks/", task_id, "status=", normalizedStatus);
      const response = await fetch(
        `${agentBase}/task-mgmt-agent/api/v1/tasks/${encodeURIComponent(task_id)}`,
        {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            status: normalizedStatus,
            ...(isRejectedToProgress ? { feedback_status: "pending" } : {}),
          }),
        },
      );
      if (response.ok) {
        const json = (await response.json().catch(() => ({}))) as any;

        // Handle queue-based responses from the backend.
        // When the queue system is enabled, the backend may return
        // {"status": "processing"|"completed"|..., "request_id": "...", ...} with HTTP 200.
        // The update has been accepted/queued — return success with the intended status.
        if (
          json &&
          typeof json === "object" &&
          json.request_id &&
          !json.task
        ) {
          console.log("[BOARD PATCH] Queue response (status=" + json.status + "), treating as success:", json);
          
          // Trigger notifications and AI feedback asynchronously so we do not block client response
          void triggerNotificationsAndAI();

          return new Response(
            JSON.stringify({
              success: true,
              task: {
                id: task_id,
                status: normalizedStatus,
                updated_at: new Date().toISOString(),
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const updated = json?.task ?? json;
        console.log("[BOARD PATCH] Agent update succeeded:", json);
        
        // Trigger notifications and AI feedback
        void triggerNotificationsAndAI();

        return new Response(
          JSON.stringify({
            success: true,
            task: {
              id: String(updated?.id ?? updated?._id ?? task_id),
              status: normalizeTaskWorkflowStatus(
                updated?.status ?? normalizedStatus,
              ),
              updated_at:
                coerceIsoDate(updated?.updated_at ?? updated?.updated_at) ??
                new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        const errText = await response.text().catch(() => "");
        console.warn("[BOARD PATCH] Agent update failed:", response.status, errText);
      }
    } catch (err) {
      console.warn("[BOARD PATCH] External task update failed, trying local DB:", err);
    }

    // Backward-compatible fallback: update local Task collection if present.
    if (Types.ObjectId.isValid(task_id)) {
      console.log("[BOARD PATCH] Falling back to local DB update for task:", task_id);
      const task = await Task.findOneAndUpdate(
        {
          _id: task_id,
          $or: [{ project: project_id }, { project_id: project_id }],
        },
        {
          status: normalizedStatus,
          ...(isRejectedToProgress ? { feedback_status: "pending" } : {}),
          updated_at: new Date(),
          ...(normalizedStatus === "completed" && { completed_at: new Date() }),
          ...(normalizedStatus !== "completed" && { completed_at: null }),
        },
        { new: true },
      )
        .lean()
        .exec();

      if (task) {
        console.log("[BOARD PATCH] Local DB fallback succeeded, status:", task.status);
        
        // Trigger notifications and AI feedback
        void triggerNotificationsAndAI();
        return new Response(
          JSON.stringify({
            success: true,
            task: {
              id: task._id.toString(),
              status: normalizeTaskWorkflowStatus(task.status),
              updated_at: new Date(task.updated_at).toISOString(),
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    console.warn("[BOARD PATCH] Task not found for update after all attempts:", task_id);
    return new Response(JSON.stringify({ error: "Task not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BOARD PATCH] Error updating task status:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
