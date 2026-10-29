import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Traction from "@/models/Traction";
import { verifyOTP } from "@/lib/otpStore";
import {
  signPlannerToken,
  getPlannerCookieName,
  buildPlannerUidFromEmail,
} from "@/lib/plannerAuth";

type VerifyBody = {
  email?: string;
  otp?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyBody;
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const otp = String(body.otp || "").trim();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required." },
        { status: 400 },
      );
    }

    const result = await verifyOTP(email, otp);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await dbConnect();

    const uid = buildPlannerUidFromEmail(email);
    const existingTraction = await Traction.findOne({ "user.uid": uid }).exec();
    if (!existingTraction) {
      const now = new Date();
      await Traction.create({
        user: {
          uid,
          email,
        },
        project: {
          isPlanGenerated: false,
          created_at: now,
          updated_at: now,
        },
        plan: {
          summary: "",
          milestones: [],
          tasks: [],
          usedFallback: false,
          created_at: now,
          updated_at: now,
        },
        history: [{ action: "user_verified", at: now }],
        extras: {},
        created_at: now,
        updated_at: now,
      });
    }

    const token = await signPlannerToken(email);
    const response = NextResponse.json(
      { success: true, message: "OTP verified successfully." },
      { status: 200 },
    );

    response.cookies.set(getPlannerCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Planner OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP." },
      { status: 500 },
    );
  }
}
