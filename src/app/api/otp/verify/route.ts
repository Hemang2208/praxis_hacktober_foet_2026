import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otpStore";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";
import { Student, Company, College } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, isPreRegister } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required." },
        { status: 400 }
      );
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    const result = await verifyOTP(normalizedEmail, otp);

    if (result.success) {
      if (isPreRegister) {
        // For pre-registration, skip user lookup and verification update
        return NextResponse.json({ message: result.message }, { status: 200 });
      } else {
        await dbConnect();
        // Find user by email and role
        const user = await User.findOne({
          email: { $regex: `^${normalizedEmail}$`, $options: "i" },
        });
        if (!user) {
          return NextResponse.json({ message: "User not found." }, { status: 404 });
        }
        if (user.role === "college") {
          await College.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        } else if (user.role === "company") {
          await Company.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        } else {
          await Student.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        }
        return NextResponse.json({ message: result.message }, { status: 200 });
      }
    } else {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { message: "Failed to verify OTP." },
      { status: 500 }
    );
  }
}