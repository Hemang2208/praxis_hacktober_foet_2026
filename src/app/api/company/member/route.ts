import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import {
  COMPANY_ROLE_CHANGE_PERMISSIONS,
  COMPANY_ROLE_REMOVE_PERMISSIONS,
  COMPANY_SUBROLES,
  isCompanySubrole,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";

// PATCH /api/company/member
export async function PATCH(req: NextRequest) {
  await dbConnect();
  const { companyId, email, action, subrole } = await req.json();
  if (!companyId || !email || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get requesting user from JWT
  const token = req.cookies.get("aipm_token")?.value;
  const payload = token && (await verifyJwt(token));
  if (!payload || !payload.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await Company.findById(companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Find the requesting user's membership
  const requester = company.members.find(
    (m: { email: string; subrole: string; status: string }) =>
      m.email === payload.email && m.status === "active",
  );
  if (!requester) {
    return NextResponse.json(
      { error: "You are not a member of this company" },
      { status: 403 },
    );
  }

  const memberIdx = company.members.findIndex(
    (m: {
      email: string;
      subrole: string;
      status: string;
      inviteToken?: string;
    }) => m.email === email,
  );
  if (memberIdx === -1) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const targetMember = company.members[memberIdx];
  const requesterRole = normalizeCompanySubrole(requester.subrole);
  const targetRole = normalizeCompanySubrole(targetMember.subrole);

  if (action === "remove") {
    // Cannot remove yourself
    if (targetMember.email === payload.email) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 403 },
      );
    }
    // Cannot remove an owner
    if (targetRole === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 403 },
      );
    }
    // Enforce remove permissions
    const allowedRemoves = COMPANY_ROLE_REMOVE_PERMISSIONS[requesterRole] || [];
    if (!allowedRemoves.includes(targetRole)) {
      return NextResponse.json(
        { error: `As ${requesterRole}, you cannot remove a ${targetRole}` },
        { status: 403 },
      );
    }
    company.members.splice(memberIdx, 1);
  } else if (action === "changeRole" && subrole) {
    // Validate subrole
    if (!isCompanySubrole(subrole)) {
      return NextResponse.json({ error: "Invalid subrole" }, { status: 400 });
    }
    const normalizedSubrole = normalizeCompanySubrole(subrole);
    if (!COMPANY_SUBROLES.includes(normalizedSubrole)) {
      return NextResponse.json({ error: "Invalid subrole" }, { status: 400 });
    }
    // Cannot change own role
    if (targetMember.email === payload.email) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 },
      );
    }
    // Cannot change owner's role
    if (targetRole === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 403 },
      );
    }
    // Only owner and admin can change roles
    const allowedChanges = COMPANY_ROLE_CHANGE_PERMISSIONS[requesterRole];
    if (!allowedChanges) {
      return NextResponse.json(
        { error: "You do not have permission to change roles" },
        { status: 403 },
      );
    }
    // Check if requester can change the target's current role AND the new role is within their scope
    if (
      !allowedChanges.includes(targetRole) ||
      !allowedChanges.includes(normalizedSubrole)
    ) {
      return NextResponse.json(
        { error: `As ${requesterRole}, you cannot assign or modify this role` },
        { status: 403 },
      );
    }
    company.members[memberIdx].subrole = normalizedSubrole;
  }
  await company.save();
  return NextResponse.json({ success: true, members: company.members });
}
