import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("aipm_token");
    cookieStore.delete("token");
  } catch (error) {
    console.error("Failed to delete cookies server-side:", error);
  }

  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete("aipm_token");
  response.cookies.delete("token");
  return response;
}
