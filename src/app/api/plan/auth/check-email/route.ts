import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Traction from "@/models/Traction";
import { buildPlannerUidFromEmail } from "@/lib/plannerAuth";

type CheckEmailBody = {
  email?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckEmailBody;
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    await dbConnect();
    const uid = buildPlannerUidFromEmail(email);
    const traction = await Traction.findOne({ "user.uid": uid }).exec();

    return NextResponse.json(
      {
        exists: Boolean(traction),
        hasPassword: Boolean(traction?.user.password),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner check-email error:", error);
    return NextResponse.json(
      { error: "Failed to check email." },
      { status: 500 },
    );
  }
}
