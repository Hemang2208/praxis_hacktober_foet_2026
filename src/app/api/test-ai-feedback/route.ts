import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";
import Task from "@/models/Task";

// Test endpoint to manually trigger AI feedback generation (no auth required for testing)
export async function POST(request: NextRequest) {
  console.log('Test AI feedback endpoint called');
  try {
    await dbConnect();
    console.log('Database connected');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { task_id, user_id, pull_request_url } = body;

    if (!task_id || !user_id || !pull_request_url) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: task_id, user_id, pull_request_url" },
        { status: 400 }
      );
    }

    // Verify the task and student exist
    const task = await Task.findById(task_id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let user = await User.findById(user_id);
    if (user_id.startsWith('user_')) {
      user = await User.findOne({ externaluser_id: user_id });
    } else {
      user = await User.findById(user_id);
    }

    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Generate AI feedback using the same logic as the task route
    const aiFeedbackPayload = {
      task_id,
      user_id: user._id,
      pull_request_url,
      repository_url: extractRepoFromPrUrl(pull_request_url),
      branch_name: 'main',
      commitHash: 'latest',
      assessment: {
        codeQuality: Math.floor(Math.random() * 30) + 70,
        documentation: Math.floor(Math.random() * 40) + 60,
        testCoverage: Math.floor(Math.random() * 50) + 50,
        performance: Math.floor(Math.random() * 30) + 70,
        security: Math.floor(Math.random() * 20) + 80,
        bestPractices: Math.floor(Math.random() * 30) + 70,
        overall: Math.floor(Math.random() * 25) + 75
      },
      summary: "Great work on this pull request! Your code demonstrates solid understanding of the requirements and follows most best practices.",
      strengths: [
        "Clean and readable code structure",
        "Good variable naming conventions",
        "Proper error handling implemented"
      ],
      improvements: [
        "Consider adding more comprehensive comments",
        "Some functions could be broken down into smaller units",
        "Test coverage could be improved"
      ],
      recommendations: [
        "Add JSDoc comments for complex functions",
        "Consider implementing unit tests for critical functions",
        "Review performance optimizations for data processing"
      ],
      comments: [
        {
          line: Math.floor(Math.random() * 50) + 1,
          fileName: "src/components/main.tsx",
          message: "Consider using useMemo here to optimize performance",
          severity: "suggestion",
          category: "performance",
          suggestion: "Wrap this calculation in useMemo to prevent unnecessary recalculations"
        },
        {
          line: Math.floor(Math.random() * 30) + 10,
          fileName: "src/utils/helpers.ts",
          message: "Great error handling implementation!",
          severity: "info",
          category: "best-practices"
        }
      ],
      processing_time: Math.floor(Math.random() * 5000) + 2000
    };

    // Call the AI feedback API directly
    const baseUrl = process.env.NEXTAUTH_URL
    const response = await fetch(`${baseUrl}/api/ai-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiFeedbackPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI feedback API responded with status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    
    // Update the task to mark it as having feedback
    await Task.findByIdAndUpdate(task_id, {
      has_feedback: true,
      feedback_status: 'ready',
      ai_feedback: result.feedback.id,
      status: 'submitted',
      completed_at: null,
    });

    return NextResponse.json({
      success: true,
      message: "AI feedback generated successfully",
      feedback: result.feedback
    });

  } catch (error) {
    console.error("Error in test AI feedback generation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI feedback" },
      { status: 500 }
    );
  }
}

// GET method for simple testing
export async function GET() {
  return NextResponse.json({
    message: "Test AI feedback endpoint is working",
    timestamp: new Date().toISOString()
  });
}

// Helper to extract repository URL from PR URL
function extractRepoFromPrUrl(prUrl: string): string {
  const match = prUrl.match(/github.com\/(.+?)\/(.+?)\/pull/);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}`;
  }
  return '';
}