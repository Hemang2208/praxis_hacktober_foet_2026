import { NextResponse } from "next/server";
import { getPlannerAuthFromCookies } from "@/lib/plannerAuth";

export async function GET() {
  try {
    const auth = await getPlannerAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: auth.uid,
          email: auth.email,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Planner auth me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
