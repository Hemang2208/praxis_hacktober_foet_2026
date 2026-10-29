import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto";
import Application, { IApplication } from "@/models/Application";
import dbConnect from "@/lib/dbConnect";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const { encryptedData } = await req.json();
    if (!encryptedData) {
      return NextResponse.json(
        { error: "Encrypted data is required" },
        { status: 400 },
      );
    }

    const decryptedData = JSON.parse(decrypt(encryptedData));

    // Keep expectedPackage optional while avoiding failures from stale required validators.
    if (!decryptedData.expectedPackage?.trim()) {
      decryptedData.expectedPackage = "Not specified";
    }
    if (!decryptedData.information) {
      decryptedData.information = {};
    }

    if (!decryptedData.information.expectedPackage?.trim()) {
      decryptedData.information.expectedPackage = "Not specified";
    }

    const application = (await new Application({
      ...decryptedData,
    })) as IApplication;

    await application.save();

    const encryptedResponse = encrypt(JSON.stringify(application));

    return NextResponse.json(
      {
        message: "JOB Application Submitted Successfully.",
        data: encryptedResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error submitting InternshipApplication form:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 },
    );
  }
}
