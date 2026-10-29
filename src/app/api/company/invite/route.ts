import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { v4 as uuidv4 } from "uuid";
import { sendCompanyInviteEmail } from "@/lib/mailer";
import { verifyJwt } from "@/lib/jwt";
import {
  COMPANY_INVITE_PERMISSIONS,
  COMPANY_SUBROLES,
  isCompanySubrole,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";

// POST /api/company/invite
export async function POST(req: NextRequest) {
  await dbConnect();
  const { companyId, email, subrole } = await req.json();
  if (!companyId || !email || !subrole) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate subrole value
  if (!isCompanySubrole(subrole)) {
    return NextResponse.json({ error: "Invalid subrole" }, { status: 400 });
  }
  const normalizedSubrole = normalizeCompanySubrole(subrole);
  if (!COMPANY_SUBROLES.includes(normalizedSubrole)) {
    return NextResponse.json({ error: "Invalid subrole" }, { status: 400 });
  }

  // Get requesting user from JWT
  const token = req.cookies.get("aipm_token")?.value;
  const payload = token && (await verifyJwt(token));
  if (!payload || !payload.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find company
  const company = await Company.findById(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Find the requesting user's membership and subrole
  const requester = company.members?.find(
    (m: { email: string; subrole: string; status: string }) =>
      m.email === payload.email && m.status === "active",
  );
  if (!requester) {
    return NextResponse.json(
      { error: "You are not a member of this company" },
      { status: 403 },
    );
  }

  // Enforce invite permissions based on role hierarchy
  const requesterRole = normalizeCompanySubrole(requester.subrole);
  const allowedInvites = COMPANY_INVITE_PERMISSIONS[requesterRole] || [];
  if (!allowedInvites.includes(normalizedSubrole)) {
    return NextResponse.json(
      {
        error: `As ${requesterRole}, you cannot invite ${normalizedSubrole} members`,
      },
      { status: 403 },
    );
  }

  // Check if already invited or member
  if (
    company.members?.some(
      (m: {
        email: string;
        subrole: string;
        status: string;
        inviteToken?: string;
      }) => m.email === email,
    )
  ) {
    return NextResponse.json(
      { error: "Already invited or member" },
      { status: 409 },
    );
  }
  // Create invite
  const inviteToken = uuidv4();
  company.members.push({
    email,
    subrole: normalizedSubrole,
    status: "invited",
    invitedAt: new Date(),
    inviteToken,
  });
  await company.save();
  // Send invite email
  await sendCompanyInviteEmail({
    email,
    companyName: company.companyName,
    inviteToken,
    subrole: normalizedSubrole,
  });
  return NextResponse.json({ success: true, inviteToken });
}
