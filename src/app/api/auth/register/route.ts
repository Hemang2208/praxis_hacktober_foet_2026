import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import {User} from "@/models/User";
import { decrypt } from "@/lib/crypto";
import { generateOTP, storeOTP } from "@/lib/otpStore";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { full_name, email, password } = await request.json();

    const decryptName = decrypt(full_name);
    const decryptEmail = decrypt(email);
    const decryptPassword = decrypt(password);

    if (!decryptName || !decryptEmail || !decryptPassword) {
      return NextResponse.json(
        { error: "Full name, email, and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: decryptEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(decryptPassword, 12);

    const newUser = await new User({
      full_name: decryptName,
      email: decryptEmail,
      password: hashedPassword,
      role: "student",
    });

    await newUser.save();

    // Send OTP after registration
    const otp = generateOTP();
    await storeOTP(decryptEmail, otp);
    await sendEmail({
      to: decryptEmail,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <b>${otp}</b></p>`
    });

    const userObj = await newUser.toObject();
    delete userObj.password;

    return NextResponse.json(
      { user: userObj, message: "User Registered Successfully. OTP sent to your email." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error in Registration of your Account." },
      { status: 500 }
    );
  }
}
