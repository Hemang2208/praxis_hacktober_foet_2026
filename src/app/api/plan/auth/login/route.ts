import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Traction from "@/models/Traction";
import { generateOTP, storeOTP } from "@/lib/otpStore";
import { sendVerificationEmail } from "@/lib/mailer";
import {
  buildPlannerUidFromEmail,
  signPlannerToken,
  getPlannerCookieName,
} from "@/lib/plannerAuth";

const allowedProviders = [
  "gmail",
  "hotmail",
  "yahoo",
  "outlook",
  "live",
  "icloud",
  "aol",
  "protonmail",
];

type LoginBody = {
  email?: string;
  password?: string;
};

function isAllowedEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }

  const domain = normalized.split("@")[1] || "";
  const provider = domain.split(".")[0] || "";
  return allowedProviders.includes(provider);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 },
      );
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please use a Gmail, Hotmail, Yahoo, Outlook, Live, iCloud, AOL, or ProtonMail email.",
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const uid = buildPlannerUidFromEmail(email);
    const existingTraction = await Traction.findOne({ "user.uid": uid }).exec();

    if (existingTraction && existingTraction.user.password) {
      if (!password) {
        return NextResponse.json(
          {
            error:
              "This email is already registered. Please enter your password to login.",
            requiresPassword: true,
          },
          { status: 400 },
        );
      }

      const isValid = await bcrypt.compare(
        password,
        existingTraction.user.password,
      );
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid password." },
          { status: 401 },
        );
      }

      const token = await signPlannerToken(email);
      const response = NextResponse.json(
        {
          success: true,
          message: "Logged in successfully.",
          directLogin: true,
        },
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
    }

    const otp = generateOTP();
    await storeOTP(email, otp);
    await sendVerificationEmail({ email, otp });

    return NextResponse.json(
      { success: true, message: "OTP sent successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner login error:", error);
    return NextResponse.json(
      { error: "Failed to process login." },
      { status: 500 },
    );
  }
}
