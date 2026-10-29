import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

// GET /api/company/[companyId]/public
// Returns company public profile + viewer's membership info
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  await dbConnect();

  const { companyId } = await context.params;

  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  const company = await Company.findById(companyId).lean();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Get viewer info from JWT
  const token = req.cookies.get("aipm_token")?.value;
  const payload = token && (await verifyJwt(token));
  const viewerEmail = payload?.email || null;

  // Find viewer's membership in this company (if any)
  let viewerMembership = null;
  if (viewerEmail && company.members) {
    const member = company.members.find(
      (m: { email: string; subrole: string; status: string }) =>
        m.email === viewerEmail,
    );
    if (member) {
      viewerMembership = {
        email: member.email,
        subrole: normalizeCompanySubrole(member.subrole),
        status: member.status,
      };
    }
  }

  // Public company data (safe to expose)
  const publicData = {
    _id: company._id,
    companyName: company.companyName,
    industry: company.industry,
    companyDescription: company.companyDescription || "",
    companySize: company.companySize || "",
    headquartersLocation: company.headquartersLocation || "",
    officialWebsite: company.officialWebsite || "",
    linkedinProfile: company.linkedinProfile || "",
    image_url: company.image_url || "",
    hiringRolesOffered: company.hiringRolesOffered || [],
    internshipAvailable: company.internshipAvailable || false,
    contactPersonName: company.contactPersonName || "",
    // Only expose member count, not full members list
    memberCount:
      company.members?.filter((m: { status: string }) => m.status === "active")
        .length || 0,
  };

  return NextResponse.json({
    company: publicData,
    viewerMembership,
  });
}
