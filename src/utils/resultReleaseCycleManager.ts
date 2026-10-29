import dbConnect from "@/lib/dbConnect";
import ResultReleaseCycle from "@/models/ResultReleaseCycle";

/**
 * Create a result release cycle entry when a new project is created
 * This should be called whenever a new project is created
 */
export const createResultReleaseCycle = async (project_id: string, user_id: string, projectTitle: string) => {
  if (!project_id || !user_id || !projectTitle) {
    throw new Error("project_id, user_id, and projectTitle are required to create a ResultReleaseCycle");
  }

  try {
    await dbConnect();

    // Calculate processing date (7 days from now)
    const processingDate = new Date();
    processingDate.setDate(processingDate.getDate() + 7);
    processingDate.setUTCHours(9, 0, 0, 0); // Set to 9 AM UTC for consistent processing time

    // Create the cycle entry
    const cycle = new ResultReleaseCycle({
      project_id,
      user_id,
      projectTitle,
      processingDate,
      status: "pending",
    });

    await cycle.save();
    
    console.log(`Created result release cycle for project: ${projectTitle} (ID: ${project_id}), scheduled for: ${processingDate.toISOString()}`);
    
    return cycle;
  } catch (error) {
    console.error("Error creating result release cycle:", error);
    throw error;
  }
};

/**
 * Execute the result release cycle for projects scheduled for the target date
 * This follows the same pattern as your payment cycle
 */
export const executeResultReleaseCycle = async (targetDate = new Date()) => {
  try {
    await dbConnect();

    // Set up date range for the target date (same pattern as your payment cycle)
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log(
      `[${new Date().toISOString()}] Looking for result release cycles between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`
    );

    // Get all result release cycles scheduled for today with pending status
    const pendingCycles = await ResultReleaseCycle.find({
      processingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: "pending",
    }).populate("project_id", "title description status resources")
      .populate("user_id", "full_name email");

    console.log(`Found ${pendingCycles.length} pending result release cycles to process`);

    if (pendingCycles.length === 0) {
      return {
        success: true,
        message: "No pending result release cycles found for today",
        processedCycles: 0,
        totalEmailsSent: 0,
      };
    }

    let totalEmailsSent = 0;
    let successfulCycles = 0;
    let failedCycles = 0;

    const resolveProjectId = (rawProjectId: any): string | null => {
      if (!rawProjectId) return null;
      if (typeof rawProjectId === "object") {
        if (rawProjectId._id) return rawProjectId._id.toString();
        if (typeof rawProjectId.toString === "function") return rawProjectId.toString();
        return null;
      }
      if (typeof rawProjectId === "string") return rawProjectId;
      return null;
    };

    for (const cycle of pendingCycles) {
      try {
        const project_id = resolveProjectId(cycle.project_id);

        if (!project_id) {
          console.warn(`Skipping cycle ${cycle._id}: invalid or missing project_id`, cycle.project_id);
          await ResultReleaseCycle.findByIdAndUpdate(cycle._id, {
            status: "failed",
            error: "Invalid or missing project_id in ResultReleaseCycle",
            processedAt: new Date(),
          }, { runValidators: false });
          failedCycles++;
          continue;
        }

        console.log(`Processing result release cycle for project: ${cycle.projectTitle} (ID: ${project_id})`);

        // Execute the result release for this specific project
        const result = await executeResultReleaseForProject(project_id);

        if (result.success) {
          successfulCycles++;
          totalEmailsSent += result.emailsSent;
          console.log(`✅ Successfully processed cycle for project: ${cycle.projectTitle}, emails sent: ${result.emailsSent}`);

          await ResultReleaseCycle.findByIdAndUpdate(cycle._id, {
            status: "completed",
            emailsSent: result.emailsSent,
            processedAt: new Date(),
          }, { runValidators: false });
        } else {
          failedCycles++;
          console.log(`❌ Failed to process cycle for project: ${cycle.projectTitle}, error: ${result.error}`);

          await ResultReleaseCycle.findByIdAndUpdate(cycle._id, {
            status: "failed",
            error: result.error || "Unknown error occurred",
            processedAt: new Date(),
          }, { runValidators: false });
        }
      } catch (error) {
        console.error(`Error processing cycle for project ${cycle.projectTitle}:`, error);

        failedCycles++;
        await ResultReleaseCycle.findByIdAndUpdate(cycle._id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          processedAt: new Date(),
        }, { runValidators: false });
      }
    }

    const summary = {
      success: true,
      message: `Processed ${pendingCycles.length} result release cycles`,
      processedCycles: pendingCycles.length,
      successfulCycles,
      failedCycles,
      totalEmailsSent,
    };

    console.log(`[${new Date().toISOString()}] Result release cycle execution completed:`, summary);
    
    return summary;
    
  } catch (error) {
    console.error("Error in executeResultReleaseCycle:", error);
    throw error;
  }
};

/**
 * Import the existing executeResultReleaseForProject function
 * We'll use this to process individual projects
 */
async function executeResultReleaseForProject(project_id: string): Promise<{
  success: boolean;
  emailsSent: number;
  error?: string;
}> {
  try {
    // Import the existing function dynamically to avoid circular dependencies
    const { executeResultReleaseForProject } = await import("./executeResultRelease");
    const result = await executeResultReleaseForProject(project_id);
    
    return {
      success: result.success,
      emailsSent: result.emailsSent || 0,
      error: result.success ? undefined : result.message,
    };
  } catch (error) {
    return {
      success: false,
      emailsSent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get pending result release cycles (useful for admin dashboard)
 */
export const getPendingResultReleaseCycles = async () => {
  try {
    await dbConnect();
    
    const pendingCycles = await ResultReleaseCycle.find({
      status: "pending",
    })
      .populate("project_id", "title description status")
      .populate("user_id", "full_name email")
      .sort({ processingDate: 1 });
    
    return pendingCycles;
  } catch (error) {
    console.error("Error getting pending result release cycles:", error);
    throw error;
  }
};

/**
 * Get result release cycle history (useful for admin dashboard)
 */
export const getResultReleaseCycleHistory = async (limit = 50) => {
  try {
    await dbConnect();
    
    const cycles = await ResultReleaseCycle.find({})
      .populate("project_id", "title description status")
      .populate("user_id", "full_name email")
      .sort({ created_at: -1 })
      .limit(limit);
    
    return cycles;
  } catch (error) {
    console.error("Error getting result release cycle history:", error);
    throw error;
  }
};
