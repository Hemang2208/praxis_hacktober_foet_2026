import { NextResponse } from "next/server";
import { authenticateLocal, createAuthResponse } from "@/lib/passport/authenticate";
import '@/lib/passport'; // Initialize passport strategies

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Use Passport.js local strategy for authentication
    const { user, error } = await authenticateLocal('local-student', email, password);
    
    if (!user) {
      return NextResponse.json({ error: error || "Invalid credentials" }, { status: 401 });
    }

    // Create response with JWT cookie
    return createAuthResponse(user, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error logging in" }, { status: 500 });
  }
}
