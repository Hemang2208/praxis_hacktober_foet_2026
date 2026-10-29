import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import AIFeedback from "@/models/AIFeedback";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import { buildCodeReviewMarkdown, deriveReviewSummary } from "@/lib/aiFeedback";
import { convertToGitHubWebUrl } from "@/lib/github";
import { emit_notification_event, notify_company_supervisors, check_and_notify_student_code_review } from "@/lib/notificationEvents";
import { User } from "@/models/User";

const toObjectId = (value: string): Types.ObjectId | string =>
  Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;

const normalizePullRequestUrl = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return convertToGitHubWebUrl(trimmed) || trimmed;
};

const toFeedbackResponse = (feedback: any) => {
  if (!feedback) return null;

  const review =
    typeof feedback.review === "string" && feedback.review.trim()
      ? feedback.review.trim()
      : buildCodeReviewMarkdown(feedback);

  return {
    ...feedback,
    review,
    summary: deriveReviewSummary(feedback.summary, review),
  };
};

// GET /api/ai-feedback - Get AI feedback from DB
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id")?.trim() || "";
    const pullRequestUrl = normalizePullRequestUrl(
      searchParams.get("pull_request_url"),
    );
    const userId = searchParams.get("user_id")?.trim() || "";
    const page = Math.max(
      parseInt(searchParams.get("page") || "1", 10) || 1,
      1,
    );
    const rawLimit = parseInt(
      searchParams.get("limit") ||
        (taskId || pullRequestUrl || userId ? "1" : "10"),
      10,
    );
    const limit = Math.min(Math.max(rawLimit || 1, 1), 50);

    const query: Record<string, unknown> = {};
    if (taskId) query.task_id = toObjectId(taskId);
    if (userId) query.user_id = toObjectId(userId);
    if (pullRequestUrl) query.pull_request_url = pullRequestUrl;

    if (Object.keys(query).length === 0) {
      return NextResponse.json({
        success: true,
        feedback: null,
        feedbacks: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      });
    }

    const total = await AIFeedback.countDocuments(query);
    const feedbackDocs = await AIFeedback.find(query)
      .sort({ updated_at: -1, created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("task_id", "title description status project_id")
      .populate("user_id", "full_name email profile_picture")
      .lean();

    const feedbacks = feedbackDocs.map(toFeedbackResponse).filter(Boolean);

    return NextResponse.json({
      success: true,
      feedback: feedbacks[0] || null,
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching AI feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI feedback", feedback: null, feedbacks: [] },
      { status: 200 }, // Return 200 with empty data instead of 500 to prevent errors
    );
  }
}

// POST /api/ai-feedback - Create or update AI feedback
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const {
      task_id,
      user_id,
      pull_request_url,
      repository_url,
      branch_name,
      commitHash,
      comments,
      assessment,
      summary,
      strengths,
      improvements,
      recommendations,
      review,
      ai_model,
      processing_time,
    } = body;

    // Validate required fields
    if (!task_id || !user_id || !pull_request_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const normalizedPullRequestUrl = normalizePullRequestUrl(pull_request_url);
    if (!normalizedPullRequestUrl) {
      return NextResponse.json(
        { error: "Invalid pull request URL" },
        { status: 400 },
      );
    }

    const mongouser_id = toObjectId(user_id);
    const mongoTaskId = toObjectId(task_id);
    const normalizedReview =
      typeof review === "string" && review.trim()
        ? review.trim()
        : buildCodeReviewMarkdown({
            summary,
            assessment,
            strengths,
            improvements,
            recommendations,
            comments,
            pull_request_url: normalizedPullRequestUrl,
            repository_url,
            branch_name,
            ai_model,
            processing_time,
          });
    const normalizedSummary = deriveReviewSummary(summary, normalizedReview);

    // Verify task exists
    const task = await Task.findById(task_id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const query = {
      task_id: mongoTaskId,
      user_id: mongouser_id,
      pull_request_url: normalizedPullRequestUrl,
    };

    const existingFeedback = await AIFeedback.findOne(query).lean();

    const feedback = await AIFeedback.findOneAndUpdate(
      query,
      {
        task_id: mongoTaskId,
        user_id: mongouser_id,
        pull_request_url: normalizedPullRequestUrl,
        repository_url,
        branch_name,
        commitHash,
        review: normalizedReview,
        comments: comments || [],
        assessment,
        summary: normalizedSummary,
        strengths: strengths || [],
        improvements: improvements || [],
        recommendations: recommendations || [],
        ai_model: ai_model || "gpt-4",
        processing_time: processing_time || 0,
        status: "completed",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    const shouldMoveToSubmitted =
      String(task.status || "").toLowerCase() === "in-progress";

    await Task.findByIdAndUpdate(task_id, {
      ai_feedback: feedback._id,
      has_feedback: true,
      feedback_status: "ready",
      ...(shouldMoveToSubmitted
        ? {
            status: "submitted",
            completed_at: null,
          }
        : {}),
    });

    // Notify student if task is already completed (and thus shown on the frontend)
    await check_and_notify_student_code_review(mongoTaskId);

    if (!existingFeedback) {
      try {
        const projectId = task.project_id || (task as any).project;
        if (projectId) {
          let studentName = "A student";
          const studentUser = await User.findById(mongouser_id).select("full_name").lean().exec();
          if (studentUser && (studentUser as any).full_name) {
            studentName = (studentUser as any).full_name;
          }

          const overallScore = feedback.assessment?.overall ?? 0;

          await notify_company_supervisors({
            projectId,
            eventType: "SUPERVISOR_CODE_REVIEW_READY",
            title: "Student Code Review Completed",
            message: `${studentName}'s code review is complete for task: ${task.title || "Task"}`,
            category: "reviews",
            priority: "medium",
            metadata: {
              task_id: mongoTaskId,
              task_title: task.title || "Task",
              feedback_id: feedback._id as Types.ObjectId,
              pull_request_url: normalizedPullRequestUrl,
              overall_score: overallScore,
              student_name: studentName,
            },
          });
        }
      } catch (superErr) {
        console.error("Failed to notify supervisors of completed code review:", superErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        feedback: {
          id: feedback._id,
          task_id: feedback.task_id,
          status: feedback.status,
          assessment: feedback.assessment,
          summary: feedback.summary,
          review: feedback.review,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating AI feedback:", error);
    return NextResponse.json(
      { error: "Failed to create AI feedback" },
      { status: 500 },
    );
  }
}
