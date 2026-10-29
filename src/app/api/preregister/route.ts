import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import PreRegister from "@/models/Pre-Register";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { name, email, phone, organization, location, role } = await req.json();

    if (!name || !email || !phone || !organization || !location || !role) {
      return NextResponse.json(
        { error: "Name, email, phone, organization/city, location, and role are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingRegistration = await PreRegister.findOne({ email: email });
    if (existingRegistration) {
      // Update existing entry with new user information
      existingRegistration.full_name = name;
      existingRegistration.phone = phone;
      existingRegistration.organization = organization;
      existingRegistration.location = location;
      existingRegistration.role = role;
      await existingRegistration.save();
      return NextResponse.json(
        { message: "Pre-registration updated!", data: existingRegistration },
        { status: 200 }
      );
    }

    // Create new pre-registration entry
    const preRegisterData = {
      full_name: name,
      email,
      phone,
      organization,
      location,
      role,
    };
    const preRegister = new PreRegister(preRegisterData);
    await preRegister.save();
    return NextResponse.json(
      {
        message: "Pre-registration successful!",
        data: preRegister,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in pre-registration:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
