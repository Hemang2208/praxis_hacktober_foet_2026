import { NextRequest, NextResponse } from "next/server";
import Contact from "@/models/Contact";
import dbConnect from "@/lib/dbConnect";
import { decrypt } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { full_name, email, message } = await req.json();

    const decryptName: string = decrypt(full_name);
    const decryptEmail: string = decrypt(email);
    const decryptmessage: string = decrypt(message);

    if (!decryptName || !decryptEmail || !decryptmessage) {
      return NextResponse.json(
        { error: "Full name, email, and message are required" },
        { status: 400 }
      );
    }

    const contact = await new Contact({
      full_name: decryptName,
      email: decryptEmail,
      message: decryptmessage,
    });

    await contact.save();

    return NextResponse.json(
      {
        message: "Contact message submitted successfully.",
        data: contact,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
