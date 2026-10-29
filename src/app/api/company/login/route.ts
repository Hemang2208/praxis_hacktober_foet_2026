import { NextRequest, NextResponse } from "next/server";
import { authenticateLocal, createAuthResponse } from "@/lib/passport/authenticate";
import { decrypt } from "@/lib/crypto";
import "@/lib/passport"; // Initialize passport strategies

export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    let email = "";
    let password = "";

    if (requestData.encryptedData) {
      try {
        const decryptedData = decrypt(requestData.encryptedData);
        const parsed = JSON.parse(decryptedData);
        email = parsed.email || "";
        password = parsed.password || "";
      } catch (e) {
        console.warn("[Company Login] Failed decrypting payload, attempting raw fallback:", e);
      }
    }

    if (!email && requestData.email) {
      email = requestData.email || "";
      password = requestData.password || "";
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required." },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Use Passport.js local strategy for company authentication
    const { user, error } = await authenticateLocal("local-company", cleanEmail, password);

    if (!user) {
      return NextResponse.json(
        { error: error || "Invalid credentials." },
        { status: 401 },
      );
    }

    // Create response with JWT cookie
    return createAuthResponse(user, "Company login successful.");
  } catch (error) {
    console.error("Company login error:", error);
    return NextResponse.json(
      { error: "Invalid request data." },
      { status: 400 },
    );
  }
}
