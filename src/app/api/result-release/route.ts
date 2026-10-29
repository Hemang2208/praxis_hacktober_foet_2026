import { NextRequest, NextResponse } from "next/server";
import { executeResultRelease, executeResultReleaseForProject } from "@/utils/executeResultRelease";

export async function POST(req: NextRequest) {
  try {
    const { project_id, action } = await req.json();
    
    // Check for authorization (you might want to add proper auth here)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET || "test-secret"}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let result;
    
    if (action === "manual" && project_id) {
      // Manual release for specific project
      result = await executeResultReleaseForProject(project_id);
    } else {
      // Automatic daily release for projects created 7 days ago
      result = await executeResultRelease();
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });

  } catch (error) {
    console.error("Error in result release API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// For GET requests (cron job calls)
export async function GET(req: NextRequest) {
  try {
    // Check for authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET || "test-secret"}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await executeResultRelease();

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });

  } catch (error) {
    console.error("Error in result release API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
