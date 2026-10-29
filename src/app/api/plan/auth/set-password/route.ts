import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Traction from "@/models/Traction";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";

type SetPasswordBody = {
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as SetPasswordBody;
    const password = String(body.password || "").trim();

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          error: "Password must be at least 6 characters long.",
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const traction = await Traction.findOne({ "user.uid": auth.uid }).exec();
    if (!traction) {
      return NextResponse.json(
        { error: "Planner user record not found." },
        { status: 404 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    traction.user.password = hashedPassword;
    traction.updated_at = new Date();
    await traction.save();

    return NextResponse.json(
      { success: true, message: "Password set successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner set-password error:", error);
    return NextResponse.json(
      { error: "Failed to set password." },
      { status: 500 },
    );
  }
}
