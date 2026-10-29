import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import { normalizeCompanySubrole } from "@/lib/company-rbac";

// POST /api/company/invite/accept
export async function POST(req: NextRequest) {
  await dbConnect();
  const { inviteToken, user_id } = await req.json();
  if (!inviteToken || !user_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Find company with matching invite token
  const company = await Company.findOne({ "members.inviteToken": inviteToken });
  if (!company) {
    return NextResponse.json(
      { error: "Invalid invite token" },
      { status: 404 },
    );
  }
  // Find member
  const memberIdx = company.members.findIndex(
    (m: {
      email: string;
      subrole: string;
      status: string;
      inviteToken?: string;
    }) => m.inviteToken === inviteToken,
  );
  if (memberIdx === -1) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  // Update member status
  company.members[memberIdx].status = "active";
  company.members[memberIdx].joinedAt = new Date();
  company.members[memberIdx].user_id = user_id;
  company.members[memberIdx].subrole = normalizeCompanySubrole(
    company.members[memberIdx].subrole,
  );
  company.members[memberIdx].inviteToken = undefined;
  await company.save();
  return NextResponse.json({
    success: true,
    companyId: company._id,
    companyName: company.companyName,
    subrole: company.members[memberIdx].subrole,
  });
}
