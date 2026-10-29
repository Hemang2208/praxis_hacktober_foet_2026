import { NextRequest, NextResponse } from "next/server";
import {
  executeResultReleaseCycle,
  getPendingResultReleaseCycles,
  getResultReleaseCycleHistory,
} from "@/utils/resultReleaseCycleManager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetDate, project_id, user_id, projectTitle } = body;
    console.log('[ResultReleaseCycle] POST called with:', body);

    switch (action) {
      case "execute": {
        // Execute result release cycles for a specific date (default: today)
        const date = targetDate ? new Date(targetDate) : new Date();
        const result = await executeResultReleaseCycle(date);
        return NextResponse.json({
          success: true,
          ...result,
        });
      }
      case "create": {
        // Create a new result release cycle entry for a project
        if (!project_id || !user_id || !projectTitle) {
          return NextResponse.json(
            { error: "Missing required fields: project_id, user_id, projectTitle" },
            { status: 400 }
          );
        }
        const { createResultReleaseCycle } = await import("@/utils/resultReleaseCycleManager");
        const cycle = await createResultReleaseCycle(project_id, user_id, projectTitle);
        return NextResponse.json({ success: true, cycle });
      }
      case "fetch": {
        // Fetch cycles for given project_ids
        if (!body.project_ids || !Array.isArray(body.project_ids)) {
          return NextResponse.json(
            { error: "Missing or invalid project_ids" },
            { status: 400 }
          );
        }
        const ResultReleaseCycle = (await import("@/models/ResultReleaseCycle")).default;
        await (await import("@/lib/dbConnect")).default();
        // Find cycles for the given project_ids
        const cycles = await ResultReleaseCycle.find({
          project_id: { $in: body.project_ids },
        });
        return NextResponse.json({ success: true, cycles });
      }
      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'execute', 'create', or 'fetch'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Result release cycle API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");

    switch (type) {
      case "pending":
        const pendingCycles = await getPendingResultReleaseCycles();
        return NextResponse.json({
          success: true,
          cycles: pendingCycles,
          count: pendingCycles.length,
        });

      case "history":
        const historyCycles = await getResultReleaseCycleHistory(limit);
        return NextResponse.json({
          success: true,
          cycles: historyCycles,
          count: historyCycles.length,
        });

      default:
        return NextResponse.json(
          { error: "Invalid type. Use 'pending' or 'history'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Result release cycle API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
