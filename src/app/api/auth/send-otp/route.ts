import { NextResponse } from "next/server";
import { sendOtpToEmail, storeOtpForEmail } from "@/lib/otpStore";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await sendOtpToEmail(email, otp); // Implement this in lib/mailer or similar
    await storeOtpForEmail(email, otp); // Implement this in lib/otpStore
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
