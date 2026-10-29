import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import AIFeedback from "@/models/AIFeedback";
import { getCurrentUser } from "@/lib/auth";

// GET /api/ai-feedback/[id] - Get specific AI feedback
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const feedback = await AIFeedback.findById(id)
      .populate('task_id', 'title description status')
      .populate('user_id', 'full_name email');

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this feedback
    if (feedback.user_id._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Mark as read if not already read
    if (!feedback.isRead) {
      await feedback.markAsRead();
    }

    return NextResponse.json({ feedback });

  } catch (error) {
    console.error("Error fetching AI feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI feedback" },
      { status: 500 }
    );
  }
}

// PATCH /api/ai-feedback/[id] - Update feedback (e.g., add student rating)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentRating, studentFeedback } = body;

    const { id } = await params;
    const feedback = await AIFeedback.findById(id);

    if (!feedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this feedback
    if (feedback.user_id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Update allowed fields
    if (studentRating !== undefined) {
      if (studentRating < 1 || studentRating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
      feedback.studentRating = studentRating;
    }

    if (studentFeedback !== undefined) {
      feedback.studentFeedback = studentFeedback;
    }

    await feedback.save();

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback._id,
        studentRating: feedback.studentRating,
        studentFeedback: feedback.studentFeedback
      }
    });

  } catch (error) {
    console.error("Error updating AI feedback:", error);
    return NextResponse.json(
      { error: "Failed to update AI feedback" },
      { status: 500 }
    );
  }
}