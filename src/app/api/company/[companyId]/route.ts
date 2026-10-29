import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ companyId: string }> }
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

  return NextResponse.json({ company });
}
