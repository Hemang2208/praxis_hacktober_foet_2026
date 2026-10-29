
import { NextRequest, NextResponse } from 'next/server';
import { College } from '@/models/User';
import dbConnect from '@/lib/dbConnect';
import bcrypt from 'bcryptjs';
import { generateOTP, storeOTP } from '@/lib/otpStore';
import { sendEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const {
      collegeName,
      collegeType,
      contactPersonName,
      designation,
      email,
      password,
      confirmPassword
    } = await req.json();

    // Validate required fields
    if (!collegeName || !collegeType || !contactPersonName || !designation || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Email validation
    const allowedDomains = [/\.edu$/, /\.ac\.in$/, /\.in$/];
    const blockedDomains = [/gmail\.com$/, /yahoo\.com$/];
    if (!allowedDomains.some((re) => re.test(email)) || blockedDomains.some((re) => re.test(email))) {
      return NextResponse.json({ error: 'Please use an official college email (not gmail.com or yahoo.com).'}, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const existing = await College.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const college = new College({
      collegeName,
      collegeType,
      contactPersonName,
      designation,
      email,
      password: hashedPassword,
      role: 'college',
      isVerified: false,
    });
    await college.save();

    // Generate and store OTP, then send to email
    const otp = generateOTP();
    await storeOTP(email, otp);
    // Log OTP to server console for debugging
    console.log(`[OTP][COLLEGE SIGNUP] Email: ${email}, OTP: ${otp}`);
    await sendEmail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <b>${otp}</b></p>`
    });

    return NextResponse.json({ message: 'College registered successfully. OTP sent to your email.' });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
