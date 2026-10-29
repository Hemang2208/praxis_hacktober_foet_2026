import { NextResponse } from "next/server";
import { getRoleByEmail } from "@/lib/getRoleByEmail";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }
  try {
    const role = await getRoleByEmail(email);
    if (!role) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ role });
  } catch {
    return NextResponse.json({ error: "Failed to get role" }, { status: 500 });
  }
}
