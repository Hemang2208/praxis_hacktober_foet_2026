import { NextRequest, NextResponse } from "next/server";
import { TASK_MGMT_AGENT_URL } from "@/utils/API_URL";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const para = await params;
    const { user_id } = para;
    const backendURL = `${TASK_MGMT_AGENT_URL}/tasks/assigned/${user_id}`;

    // Forward the request to the task management service
    const response = await fetch(backendURL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to fetch assigned tasks" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
