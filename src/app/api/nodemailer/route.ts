import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/mailer";
import { generateOTP, storeOTP, getStoredOTP } from "@/lib/otpStore";
import PreRegister from "@/models/Pre-Register";
import dbConnect from "@/lib/dbConnect";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 },
      );
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered in PreRegister
    await dbConnect();
    const alreadyRegistered = await PreRegister.findOne({ email: normalizedEmail });
    if (alreadyRegistered) {
      return NextResponse.json(
        { message: "User already registered." },
        { status: 409 },
      );
    }

    // Check if user already has OTP sent recently (prevent spam)
    const existingOtp = await getStoredOTP(normalizedEmail);
    if (existingOtp) {
      const timeSinceLastOtp = Date.now() - existingOtp.timestamp;
      const oneMinute = 60 * 1000;

      if (timeSinceLastOtp < oneMinute) {
        return NextResponse.json(
          {
            message: "OTP already sent. Please wait before requesting another.",
          },
          { status: 202 },
        );
      }
    }

    // Generate new OTP
    const otp = generateOTP();

    // Store OTP with timestamp
    await storeOTP(normalizedEmail, otp);

    await sendVerificationEmail({
      email: normalizedEmail,
      name: name || "User",
      otp,
    });

    return NextResponse.json(
      { message: "Verification email sent!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Nodemailer error:", error);
    return NextResponse.json(
      { message: "Failed to send email." },
      { status: 500 },
    );
  }
}
