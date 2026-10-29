import { NextRequest, NextResponse } from "next/server";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { normalizeCompanySubrole } from "@/lib/company-rbac";
import {
  projectBelongsToCompany,
  projectHasTeamMember,
} from "@/lib/project-ownership";
import Project from "@/models/Project";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const para = await params;
    const { project_id } = para;

    const project = await Project.findById(project_id).lean().exec();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (payload.role === "company") {
      const companyAccess = await resolveCompanyMembership(
        String(payload.id),
        payload.email,
      );
      if (!companyAccess || !companyAccess.membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!projectBelongsToCompany(project, companyAccess.companyId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (payload.role === "student") {
      if (!projectHasTeamMember(project, String(payload.id), payload.email)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    console.log("Members API called for project:", project_id);

    const backendURL = `${TASK_MGMT_AGENT_URL}/projects/${project_id}/members`;
    console.log("Making request to TASK_MGMT_AGENT_URL == ", backendURL);
    if (!backendURL) {
      console.error("Backend URL is not defined");
      return NextResponse.json(
        { error: "Backend URL is not defined" },
        { status: 500 },
      );
    }

    // Forward the request to the task management service
    const response = await fetch(backendURL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Backend response status:", response.status);

    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get("content-type");
      console.log("Error response content-type:", contentType);

      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        const textResponse = await response.text();
        console.log("Non-JSON error response:", textResponse);
        errorData = {
          detail: `Server returned ${response.status}: ${textResponse}`,
        };
      }

      return NextResponse.json(
        { error: errorData.detail || "Failed to fetch project members" },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("Members response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
}
