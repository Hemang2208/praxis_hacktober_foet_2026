import { NextResponse } from "next/server";
import { verifyOtpForEmail } from "@/lib/otpStore";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
  }
  const valid = await verifyOtpForEmail(email, otp); // Implement in lib/otpStore
  if (valid) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }
}
