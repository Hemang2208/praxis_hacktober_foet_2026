import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto";
import Internship, { IInternship } from "@/models/Internship";
import dbConnect from "@/lib/dbConnect";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { encryptedData } = await req.json();
    if (!encryptedData) {
      return NextResponse.json(
        { error: "Encrypted data is required" },
        { status: 400 }
      );
    }

    const decryptedData = JSON.parse(decrypt(encryptedData));

    const InternshipApplication = (await new Internship({
      ...decryptedData,
    })) as IInternship;

    await InternshipApplication.save();

    const encryptedResponse = encrypt(JSON.stringify(InternshipApplication));

    return NextResponse.json(
      {
        message: "Internship Application Submitted Successfully.",
        data: encryptedResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting InternshipApplication form:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
