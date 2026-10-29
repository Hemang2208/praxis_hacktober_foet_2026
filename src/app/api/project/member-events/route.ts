import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import { inngest } from "../../../../../inngest/client";

type SupportedMemberEvent = "project/member.added" | "project/member.removed";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyJwt(token);
    if (!auth || !auth.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      eventName?: string;
      payload?: Record<string, unknown>;
    };

    const eventName = String(body.eventName || "") as SupportedMemberEvent;
    if (
      eventName !== "project/member.added" &&
      eventName !== "project/member.removed"
    ) {
      return NextResponse.json(
        { error: "Unsupported eventName" },
        { status: 400 },
      );
    }

    const payload = body.payload || {};

    const result = await inngest.send({
      name: eventName,
      data: {
        ...payload,
        triggeredBy: {
          userId: auth.id,
          email: auth.email,
          role: auth.role,
        },
        triggeredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Member event queued",
        ids: result?.ids || [],
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error queueing project member event:", error);
    return NextResponse.json(
      { error: "Failed to queue member event" },
      { status: 500 },
    );
  }
}
