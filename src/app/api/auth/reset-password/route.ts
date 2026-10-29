import { NextResponse } from "next/server";
import { verifyOtpForEmail, clearOtpForEmail } from "@/lib/otpStore";
import { updateUserPasswordByEmail } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, otp, password } = await req.json();
  if (!email || !otp || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const valid = await verifyOtpForEmail(email, otp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }
  try {
    await updateUserPasswordByEmail(email, password); // Implement in lib/auth
    await clearOtpForEmail(email); // Remove OTP after use
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
