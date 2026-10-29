
import { NextRequest, NextResponse } from "next/server";
import { Company } from "@/models/User";
import dbConnect from "@/lib/dbConnect";
import bcrypt from "bcryptjs";
import { decrypt } from "@/lib/crypto";
import { generateOTP, storeOTP } from "@/lib/otpStore";
import { sendEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const { encryptedData } = await req.json();
    const decryptedData = decrypt(encryptedData);
    const {
      companyName,
      industry,
      contactPersonName,
      designation,
      email,
      password,
      confirmPassword,
    } = JSON.parse(decryptedData);

    if (
      !companyName ||
      !industry ||
      !contactPersonName ||
      !designation ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    // Soft-warn for gmail
    const personalDomains = [
      "gmail.com",
      "hotmail.com",
      "yahoo.com",
      "outlook.com",
      "live.com",
    ];

    const domain = email.split("@")[1]?.toLowerCase();

    if (personalDomains.includes(domain)) {
      return NextResponse.json(
        {
          warning:
            "Using a company domain email is preferred over personal email providers.",
        },
        { status: 200 },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Company.findOne({
      email: { $regex: `^${normalizedEmail}$`, $options: "i" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = new Company({
      companyName,
      industry,
      contactPersonName,
      designation,
      email: normalizedEmail,
      password: hashedPassword,
      role: "company",
      companySize: "1-10", // Explicitly set default value
      isVerified: false,
      members: [
        {
          user_id: undefined, // Set after login if needed
          email: normalizedEmail,
          subrole: "owner",
          status: "active",
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      ],
    });

    await company.save();

    // Generate and store OTP, then send to email
    const otp = generateOTP();
    await storeOTP(email, otp);
    // Log OTP to server console for debugging
    console.log(`[OTP][COMPANY SIGNUP] Email: ${email}, OTP: ${otp}`);
    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <b>${otp}</b></p>`
    });

    return NextResponse.json({ message: "Company registered successfully. OTP sent to your email." });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Invalid request data." },
      { status: 400 },
    );
  }
}
