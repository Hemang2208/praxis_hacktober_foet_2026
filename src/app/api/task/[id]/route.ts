import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Task from "@/models/Task";
import Project from "@/models/Project";
import pull_request from "@/models/PullRequest";
import AIFeedback from "@/models/AIFeedback";
import { Types } from "mongoose";
import { fetchAndValidateGitHubPR, convertToGitHubWebUrl } from "@/lib/github";
import { buildCodeReviewMarkdown } from "@/lib/aiFeedback";
import { normalizeTaskWorkflowStatus } from "@/lib/taskWorkflow";
import { emit_notification_event, notify_company_supervisors, check_and_notify_student_code_review } from "@/lib/notificationEvents";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";

// Helper function to generate AI feedback
async function generateAIFeedback(
  task_id: string,
  user_id: string,
  pull_request_url: string,
  pr_details?: {
    repository_url?: string;
    branch?: string;
    commitHash?: string;
  },
): Promise<unknown | null> {
  console.log("Starting AI feedback generation:", {
    task_id,
    user_id,
    pull_request_url,
  });
  try {
    const aiFeedbackPayload = {
      task_id,
      user_id,
      pull_request_url,
      repository_url:
        pr_details?.repository_url || extractRepoFromPrUrl(pull_request_url),
      branch_name: pr_details?.branch || "main",
      commitHash: pr_details?.commitHash || "latest",
      assessment: {
        codeQuality: Math.floor(Math.random() * 30) + 70, // 70-100
        documentation: Math.floor(Math.random() * 40) + 60, // 60-100
        testCoverage: Math.floor(Math.random() * 50) + 50, // 50-100
        performance: Math.floor(Math.random() * 30) + 70, // 70-100
        security: Math.floor(Math.random() * 20) + 80, // 80-100
        bestPractices: Math.floor(Math.random() * 30) + 70, // 70-100
        overall: Math.floor(Math.random() * 25) + 75, // 75-100
      },
      summary:
        "Great work on this pull request! Your code demonstrates solid understanding of the requirements and follows most best practices.",
      strengths: [
        "Clean and readable code structure",
        "Good variable naming conventions",
        "Proper error handling implemented",
      ],
      improvements: [
        "Consider adding more comprehensive comments",
        "Some functions could be broken down into smaller units",
        "Test coverage could be improved",
      ],
      recommendations: [
        "Add JSDoc comments for complex functions",
        "Consider implementing unit tests for critical functions",
        "Review performance optimizations for data processing",
      ],
      comments: [
        {
          line: Math.floor(Math.random() * 50) + 1,
          fileName: "src/components/main.tsx",
          message: "Consider using useMemo here to optimize performance",
          severity: "suggestion",
          category: "performance",
          suggestion:
            "Wrap this calculation in useMemo to prevent unnecessary recalculations",
        },
        {
          line: Math.floor(Math.random() * 30) + 10,
          fileName: "src/utils/helpers.ts",
          message: "Great error handling implementation!",
          severity: "info",
          category: "best-practices",
        },
      ],
      processing_time: Math.floor(Math.random() * 5000) + 2000, // 2-7 seconds
    };

    // Connect to database and create feedback directly
    await dbConnect();

    // Resolve user_id to a valid MongoDB ObjectId if it is an email, username, or name
    let mongouser_id: Types.ObjectId;
    if (Types.ObjectId.isValid(user_id)) {
      mongouser_id = new Types.ObjectId(user_id);
    } else {
      const user = await User.findOne({
        $or: [
          { email: String(user_id).toLowerCase() },
          { username: String(user_id) },
          { full_name: String(user_id) }
        ]
      }).select("_id").lean().exec();

      if (user && user._id) {
        mongouser_id = user._id as Types.ObjectId;
      } else {
        console.error("User not found for AI feedback generation identifier:", user_id);
        return null;
      }
    }

    // Verify task exists
    const task = await Task.findById(task_id);
    if (!task) {
      console.error("Task not found:", task_id);
      return null;
    }

    // Create AI feedback directly in database
    const feedback = new AIFeedback({
      task_id,
      user_id: mongouser_id,
      pull_request_url,
      repository_url: aiFeedbackPayload.repository_url,
      branch_name: aiFeedbackPayload.branch_name,
      commitHash: aiFeedbackPayload.commitHash,
      review: buildCodeReviewMarkdown(aiFeedbackPayload),
      comments: aiFeedbackPayload.comments || [],
      assessment: aiFeedbackPayload.assessment,
      summary: aiFeedbackPayload.summary,
      strengths: aiFeedbackPayload.strengths || [],
      improvements: aiFeedbackPayload.improvements || [],
      recommendations: aiFeedbackPayload.recommendations || [],
      ai_model: "gpt-4",
      processing_time: aiFeedbackPayload.processing_time || 0,
      status: "completed",
    });

    await feedback.save();



    let studentName = "A student";
    try {
      const studentUser = await User.findById(user_id).select("full_name").lean().exec();
      if (studentUser && (studentUser as any).full_name) {
        studentName = (studentUser as any).full_name;
      }
    } catch (err) {
      console.warn("Failed to fetch student name for supervisor feedback notification:", err);
    }

    try {
      const projectId = task.project_id || (task as any).project;
      if (projectId) {
        await notify_company_supervisors({
          projectId,
          eventType: "SUPERVISOR_CODE_REVIEW_READY",
          title: "Student Code Review Completed",
          message: `${studentName}'s code review is complete for task: ${task.title || "Task"}`,
          category: "reviews",
          priority: "medium",
          metadata: {
            task_id,
            task_title: task.title || "Task",
            feedback_id: feedback._id,
            pull_request_url,
            overall_score: feedback.assessment?.overall ?? 0,
            student_name: studentName,
          },
        });
      }
    } catch (superErr) {
      console.error("Failed to notify supervisors of completed code review:", superErr);
    }

    // Update the task to mark it as having feedback and move Progress -> Submitted.
    const existingTask = await Task.findById(task_id).lean().exec();
    const shouldMoveToSubmitted =
      normalizeTaskWorkflowStatus(existingTask?.status) === "in-progress";

    await Task.findByIdAndUpdate(task_id, {
      has_feedback: true,
      feedback_status: "ready",
      ai_feedback: feedback._id,
      ...(shouldMoveToSubmitted
        ? {
            status: "submitted",
            completed_at: null,
          }
        : {}),
    });

    const result = {
      success: true,
      feedback: {
        id: feedback._id,
        task_id: feedback.task_id,
        status: feedback.status,
        assessment: feedback.assessment,
        summary: feedback.summary,
      },
    };

    console.log("AI feedback generated successfully for task:", task_id);
    return result;
  } catch (error: unknown) {
    console.error("Error in generateAIFeedback:", error);

    // Update task to mark feedback as failed
    await Task.findByIdAndUpdate(task_id, {
      feedback_status: "failed",
    });

    console.error(
      "AI feedback generation failed. Skipping feedback generation.",
    );
    return null;
  }
}

// Helper to extract repository URL from PR URL
function extractRepoFromPrUrl(prUrl: string): string {
  const match = prUrl.match(/github.com\/(.+?)\/(.+?)\/pull/);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}`;
  }
  return "";
}

function hasAllVisibleSubTasksCompleted(task: any): boolean {
  const subTasks = Array.isArray(task?.sub_tasks) ? task.sub_tasks : [];
  const visibleSubTasks = subTasks.filter(
    (st: any) => !Boolean(st?.is_deleted ?? st?.isDeleted ?? st?.deleted),
  );

  if (visibleSubTasks.length === 0) return true;
  return visibleSubTasks.every((st: any) => Boolean(st?.completed));
}

// PATCH: Link PR and update status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const para = await params;
  const data = await req.json();
  const currentTask = await Task.findById(para.id).lean().exec();
  const update: Partial<{
    linked_pr_id?: string | null;
    assigned_to?: string;
    status?: string;
    completed_at?: Date | null;
    linked_pull_request?: string | null;
    has_feedback?: boolean;
    feedback_status?: "pending" | "ready" | "reviewed";
    ai_feedback?: Types.ObjectId | null;
    feedback_notification_sent?: boolean;
  }> = {};

  if (data.assigned_to && typeof data.assigned_to === "string") {
    update.assigned_to = data.assigned_to;
  }
  // Convert API URL to web URL before storing
  if (data.linked_pr_id) {
    const webUrl =
      convertToGitHubWebUrl(data.linked_pr_id) || data.linked_pr_id;
    update.linked_pr_id = webUrl;
  }
  if (data.status) {
    const normalizedStatus = normalizeTaskWorkflowStatus(data.status);
    const allSubTasksCompleted = hasAllVisibleSubTasksCompleted(currentTask);

    if (
      normalizedStatus === "submitted" &&
      !data.linked_pr_id &&
      !currentTask?.linked_pr_id
    ) {
      return NextResponse.json(
        {
          error:
            "Tasks can only move to Submitted after a linked pull request is available.",
        },
        { status: 400 },
      );
    }

    // Bypass feedback_status check when moving to Submitted to prevent deadlocks
    /*
    if (
      normalizedStatus === "submitted" &&
      String((currentTask as any)?.feedback_status || "") !== "ready"
    ) {
      return NextResponse.json(
        {
          error:
            "Tasks can only move to Submitted after a code review result is ready.",
        },
        { status: 400 },
      );
    }
    */

    if (normalizedStatus === "submitted" && !allSubTasksCompleted) {
      return NextResponse.json(
        {
          error:
            "Tasks can only move to Submitted after all visible subtasks are completed.",
        },
        { status: 400 },
      );
    }

    if (
      normalizedStatus === "completed" &&
      normalizeTaskWorkflowStatus((currentTask as any)?.status) !==
        "submitted"
    ) {
      return NextResponse.json(
        {
          error:
            "Tasks can only move to Completed from the Submitted state.",
        },
        { status: 400 },
      );
    }

    update.status = normalizedStatus;
    if (
      normalizedStatus === "in-progress" &&
      normalizeTaskWorkflowStatus((currentTask as any)?.status) ===
        "submitted"
    ) {
      update.feedback_status = "pending";
    }
    if (normalizedStatus === "completed") {
      update.completed_at = new Date();
    } else if (normalizedStatus === "submitted") {
      update.completed_at = null;
    } else {
      update.completed_at = null;
    }
  }

  // If linking a PR, upsert in pull_request collection and store its _id
  if (data.linked_pr_id && data.pr_details) {
    // If title or description missing, fetch from GitHub
    let prTitle = data.pr_details.title || "";
    let prDescription = data.pr_details.body || "";
    let isValidPR = false;
    let validationResult: Awaited<
      ReturnType<typeof fetchAndValidateGitHubPR>
    > | null = null;

    // Validate and fetch PR details from GitHub
    if (!prTitle || !prDescription) {
      console.log("Validating PR URL:", data.linked_pr_id);
      const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

      validationResult = await fetchAndValidateGitHubPR(
        data.linked_pr_id,
        GITHUB_TOKEN,
      );

      if (validationResult.isValid && validationResult.data) {
        isValidPR = true;
        if (!prTitle) prTitle = validationResult.data.title || "";
        if (!prDescription) prDescription = validationResult.data.body || "";
        console.log("Successfully validated PR:", { title: prTitle });
      } else {
        console.error("PR validation failed:", validationResult.error);
      }
    } else {
      // If we have title and description, assume it's valid (could be from cached data)
      isValidPR = true;
    }

    // If PR validation failed, return an error
    if (!isValidPR) {
      return NextResponse.json(
        {
          error:
            "Invalid or inaccessible pull request URL. Please check the URL and ensure the repository is accessible.",
        },
        { status: 400 },
      );
    }

    // Convert API URL to web URL for proper linking
    const webUrl =
      convertToGitHubWebUrl(data.linked_pr_id) || data.linked_pr_id;
    console.log("Converted PR URL:", { original: data.linked_pr_id, webUrl });

    let prDoc;
    try {
      // Extract PR number for unique identification
      const prUrlMatch = webUrl.match(/\/pull\/(\d+)$/);
      const githubId = prUrlMatch
        ? `${validationResult?.data?.user?.login || "unknown"}-${prUrlMatch[1]}`
        : null;

      prDoc = await pull_request.findOneAndUpdate(
        { "pull_request.url": webUrl },
        {
          user_id: data.user_id || null,
          task_id: para.id,
          pull_request: {
            url: webUrl,
            branch: data.pr_details.branch || "",
            status: data.pr_details.state || "",
            title: prTitle,
            description: prDescription,
          },
          submitted_at: data.pr_details.created_at
            ? new Date(data.pr_details.created_at)
            : new Date(),
          status: data.pr_details.state || "",
          githubId: githubId, // Add unique identifier
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error: unknown) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        // Handle duplicate key error - try to find existing record
        console.log("Duplicate key error, finding existing PR record");
        prDoc = await pull_request.findOne({ "pull_request.url": webUrl });
        if (!prDoc) {
          // If we still can't find it, create without githubId
          prDoc = await pull_request.findOneAndUpdate(
            { "pull_request.url": webUrl },
            {
              user_id: data.user_id || null,
              task_id: para.id,
              pull_request: {
                url: webUrl,
                branch: data.pr_details.branch || "",
                status: data.pr_details.state || "",
                title: prTitle,
                description: prDescription,
              },
              submitted_at: data.pr_details.created_at
                ? new Date(data.pr_details.created_at)
                : new Date(),
              status: data.pr_details.state || "",
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        }
      } else {
        throw error;
      }
    }

    update.linked_pull_request = prDoc._id.toString();
    update.feedback_status = "pending";
    update.has_feedback = false;
  } else if (data.linked_pr_id === null) {
    // Unlink PR: remove linked_pr_id and linked_pull_request from task
    update.linked_pr_id = null;
    update.linked_pull_request = null;

    // Also clear AI feedback when unlinking PR
    const currentTask = await Task.findById(para.id);
    if (currentTask && currentTask.ai_feedback) {
      // Delete the AI feedback document
      await AIFeedback.findByIdAndDelete(currentTask.ai_feedback);

      // Clear feedback-related fields from task
      update.has_feedback = false;
      update.feedback_status = "pending";
      update.ai_feedback = null;
      update.feedback_notification_sent = false;

      console.log("AI feedback cleared due to PR unlinking for task:", para.id);
    }
  } else if (data.linked_pr_id && !data.pr_details) {
    const prDoc = await pull_request.findOne({
      "pull_request.url": data.linked_pr_id,
    });
    if (prDoc) update.linked_pull_request = prDoc._id.toString();
    else update.linked_pull_request = null;
  }

  const task = await Task.findByIdAndUpdate(para.id, update, { new: true });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    update.assigned_to &&
    Types.ObjectId.isValid(update.assigned_to) &&
    update.assigned_to !== String((currentTask as any)?.assigned_to || "")
  ) {
    let assignProjectTitle: string | undefined = undefined;
    if (task.project_id) {
      try {
        const proj = await Project.findById(task.project_id).select("title").lean();
        if (proj) {
          assignProjectTitle = (proj as any).title;
        }
      } catch (err) {
        console.warn("Failed to fetch project title for assign notification:", err);
      }
    }

    let assignedByName: string | undefined = undefined;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("aipm_token")?.value;
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
      console.warn("Failed to resolve task assigner identity:", authErr);
    }

    await emit_notification_event({
      user_id: update.assigned_to,
      event_type: "TASK_ASSIGNED",
      title: "Task Assigned",
      message: `You have been assigned a task: ${task.title || "Task"}`,
      category: "tasks",
      priority: "high",
      event_key: `TASK_ASSIGNED:${task._id}:${update.assigned_to}`,
      metadata: {
        task_id: task._id,
        task_title: task.title,
        project_id: task.project_id,
        project_title: assignProjectTitle,
        assigned_by: assignedByName,
      },
    });
  }

  // Fetch project title for status change notifications
  let statusProjectTitle: string | undefined = undefined;
  if (task.project_id) {
    try {
      const proj = await Project.findById(task.project_id).select("title").lean();
      if (proj) {
        statusProjectTitle = (proj as any).title;
      }
    } catch (err) {
      console.warn("Failed to fetch project title for status change notification:", err);
    }
  }

  if (
    update.status === "completed" &&
    task.assigned_to &&
    Types.ObjectId.isValid(String(task.assigned_to))
  ) {
    await emit_notification_event({
      user_id: String(task.assigned_to),
      event_type: "TASK_COMPLETED",
      title: "Task Completed",
      message: `Task completed successfully: ${task.title || "Task"}`,
      category: "tasks",
      priority: "medium",
      event_key: `TASK_COMPLETED:${task._id}:${String(task.assigned_to)}`,
      metadata: {
        task_id: task._id,
        task_title: task.title,
        project_id: task.project_id,
        project_title: statusProjectTitle,
      },
    });

    // Notify student of code review status if generated and task is completed
    await check_and_notify_student_code_review(String(task._id));
  }

  if (
    (update.status === "submitted" || update.status === "in-review") &&
    task.assigned_to &&
    Types.ObjectId.isValid(String(task.assigned_to))
  ) {
    await emit_notification_event({
      user_id: String(task.assigned_to),
      event_type: "TASK_IN_REVIEW",
      title: "Task In Review",
      message: `Task moved to review: ${task.title || "Task"}`,
      category: "tasks",
      priority: "medium",
      event_key: `TASK_IN_REVIEW:${task._id}:${String(task.assigned_to)}`,
      metadata: {
        task_id: task._id,
        task_title: task.title,
        project_id: task.project_id,
        project_title: statusProjectTitle,
      },
    });
  }

  // Create notifications for PR actions
  if (data.user_id) {
    try {
      // Convert user_id to MongoDB ObjectId
      const userObjectId = new Types.ObjectId(data.user_id);
      const taskObjectId = new Types.ObjectId(para.id);

      if (data.linked_pr_id && data.pr_details) {
        // Convert API URL to web URL for notifications
        const notificationPrUrl =
          convertToGitHubWebUrl(data.linked_pr_id) || data.linked_pr_id;

        await emit_notification_event({
          user_id: userObjectId,
          event_type: "PR_SUBMITTED",
          title: "Pull Request Submitted",
          message: `Pull request submitted for task: ${task.title || "Task"}`,
          category: "tasks",
          priority: "medium",
          event_key: `PR_SUBMITTED:${taskObjectId}:${notificationPrUrl}`,
          metadata: {
            task_id: taskObjectId,
            task_title: task.title || "Task",
            pull_request_url: notificationPrUrl,
            project_id: task.project_id,
          },
        });
      } else if (data.linked_pr_id === null) {
        await emit_notification_event({
          user_id: userObjectId,
          event_type: "SYSTEM_ACTIVITY",
          title: "Pull Request Unlinked",
          message: `Pull request was unlinked from task: ${task.title || "Task"}`,
          category: "system",
          priority: "low",
          event_key: `PR_UNLINKED:${taskObjectId}:${userObjectId}`,
          metadata: {
            task_id: taskObjectId,
            task_title: task.title || "Task",
            project_id: task.project_id,
          },
        });
      }
    } catch (notificationError) {
      console.error("Error creating notifications:", notificationError);
      // Don't fail the main operation if notification creation fails
    }
  }

  // Trigger AI feedback generation when a PR is linked (or task is submitted).
  let prUrl = data.linked_pr_id || update.linked_pr_id;

  // Convert API URL to web URL for AI feedback
  if (prUrl) {
    prUrl = convertToGitHubWebUrl(prUrl) || prUrl;
    console.log("Using converted PR URL for AI feedback:", prUrl);
  }

  const linkedPrChanged =
    Boolean(data.linked_pr_id) &&
    String(data.linked_pr_id) !== String((currentTask as any)?.linked_pr_id || "");
  const reviewUserId = String(data.user_id || (currentTask as any)?.assigned_to || "");

  if (
    prUrl &&
    reviewUserId &&
    (data.status === "submitted" ||
      update.status === "submitted" ||
      linkedPrChanged)
  ) {
    console.log(
      "AI feedback generation for task will be processed by the agent. Task ID:",
      para.id,
      "user:",
      reviewUserId,
      "PR:",
      prUrl,
    );
    // Automatic mock fallback has been disabled to prevent duplicate/polluted reviews.
    /*
    try {
      // Call AI feedback generation in the background
      setTimeout(async () => {
        try {
          await generateAIFeedback(
            para.id,
            reviewUserId,
            prUrl,
            data.pr_details,
          );
        } catch (error) {
          console.error("Error generating AI feedback:", error);
        }
      }, 1000); // Small delay to ensure task is saved
    } catch (error) {
      console.error("Error triggering AI feedback:", error);
    }
    */
  }

  return NextResponse.json(task);
}

// GET: Fetch task and populate linked_pull_request for dashboard display
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const para = await params;
  // Populate linked_pull_request and its user_id (user)
  const task = await Task.findById(para.id)
    .populate({
      path: "linked_pull_request",
      populate: { path: "user_id", select: "full_name email profile_picture" },
    })
    .populate({
      path: "ai_feedback",
    });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

// DELETE: Remove a task by ID
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await dbConnect();
  const para = await params;
  await Task.findByIdAndDelete(para.id);
  return NextResponse.json({ message: "Deleted" });
}
