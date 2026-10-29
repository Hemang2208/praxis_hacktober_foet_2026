import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import ProjectPlan from "@/models/ProjectPlan";
import Project from "@/models/Project";
import { Company } from "@/models/User";
import { verifyJwt } from "@/lib/jwt";
import {
  COMPANY_PROJECT_MANAGEMENT_ROLES,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";
import {
  getProjectCompanyId,
  projectBelongsToCompany,
  projectHasTeamMember,
} from "@/lib/project-ownership";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> },
) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { project_id } = await params;

    console.log(`🔍 Searching for project plan with project_id: ${project_id}`);

    if (!project_id) {
      return NextResponse.json(
        { success: false, message: "Project ID is required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
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
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else if (payload.role === "college") {
      if (projectCompanyId !== String(payload.id)) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    // First try to find by project_id field
    let projectPlan = await ProjectPlan.findOne({ project_id });

    // If not found, try searching by project_id field (legacy field name)
    if (!projectPlan) {
      console.log(`🔍 Trying to find by project_id: ${project_id}`);
      projectPlan = await ProjectPlan.findOne({ project_id: project_id });
    }

    // If still not found and project_id looks like a MongoDB ObjectId, try searching by _id
    if (!projectPlan && project_id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log(`🔍 Trying to find by _id: ${project_id}`);
      try {
        projectPlan = await ProjectPlan.findById(project_id);
      } catch (error) {
        console.log(`❌ Error searching by _id: ${error}`);
      }
    }

    console.log(`📊 Query result:`, projectPlan ? "Found" : "Not found");

    if (!projectPlan) {
      // For debugging - let's also check how many project plans exist in total
      const totalPlans = await ProjectPlan.countDocuments();
      console.log(`📈 Total project plans in database: ${totalPlans}`);

      // Let's also get a sample of existing plans for debugging (including _id and project_id)
      const samplePlans = await ProjectPlan.find({})
        .select("_id project_id summary")
        .limit(5);
      console.log(
        `📋 Sample plans in database:`,
        samplePlans.map((p) => ({
          _id: p._id?.toString(),
          project_id: p.project_id,
          hasSummary: !!p.summary,
        })),
      );

      return NextResponse.json(
        {
          success: false,
          message: "Project plan not found",
          details:
            "No project plan exists for this project. You can generate one from the project plan page.",
          debug: {
            searchedproject_id: project_id,
            totalPlansInDb: totalPlans,
            samplePlans: samplePlans.map((p) => ({
              _id: p._id?.toString(),
              project_id: p.project_id,
              hasSummary: !!p.summary,
            })),
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      plan: projectPlan,
    });
  } catch (error) {
    console.error("Error fetching project plan:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string }> },
) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { project_id } = await params;
    const planData = await request.json();

    if (!project_id) {
      return NextResponse.json(
        { success: false, message: "Project ID is required" },
        { status: 400 },
      );
    }

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 },
      );
    }

    const projectCompanyId = String(getProjectCompanyId(project) || "");

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else if (payload.role === "student") {
      if (!projectCompanyId) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      const companyAccess = await resolveCompanyMembership(
        projectCompanyId,
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      if (
        !COMPANY_PROJECT_MANAGEMENT_ROLES.includes(
          companyAccess.membership.subrole,
        )
      ) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }

      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else if (payload.role === "college") {
      if (projectCompanyId !== String(payload.id)) {
        return NextResponse.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    // Clean the planData to remove any empty _id fields
    const cleanPlanData = { ...planData };
    if (
      cleanPlanData._id === "" ||
      cleanPlanData._id === null ||
      cleanPlanData._id === undefined
    ) {
      delete cleanPlanData._id;
    }

    console.log(`📝 Creating/updating project plan for project: ${project_id}`);
    console.log(`📋 Plan data:`, JSON.stringify(cleanPlanData, null, 2));

    // Check if project plan already exists
    const existingPlan = await ProjectPlan.findOne({ project_id });

    let projectPlan;
    if (existingPlan) {
      // Update existing plan
      projectPlan = await ProjectPlan.findOneAndUpdate(
        { project_id },
        {
          ...cleanPlanData,
          project_id,
          updated_at: new Date().toISOString(),
        },
        { new: true },
      );
    } else {
      // Create new plan
      const newPlan = new ProjectPlan({
        ...cleanPlanData,
        project_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      projectPlan = await newPlan.save();
    }

    return NextResponse.json({
      success: true,
      plan: projectPlan,
      message: existingPlan
        ? "Project plan updated successfully"
        : "Project plan created successfully",
    });
  } catch (error) {
    console.error("Error saving project plan:", error);

    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message.includes("validation failed")) {
        console.error("📋 Validation error details:", error.message);
        return NextResponse.json(
          {
            success: false,
            message: "Project plan validation failed",
            details: error.message,
            error: error.message,
          },
          { status: 400 },
        );
      }

      if (error.message.includes("Cast to ObjectId failed")) {
        console.error("📋 ObjectId casting error:", error.message);
        return NextResponse.json(
          {
            success: false,
            message: "Invalid ObjectId provided",
            details: "An invalid ID was provided in the request data",
            error: error.message,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
