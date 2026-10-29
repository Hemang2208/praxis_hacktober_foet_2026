import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/jwt";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { User } from "@/models/User";
import { emit_notification_event, notify_company_supervisors } from "@/lib/notificationEvents";
import { Types } from "mongoose";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ project_id: string; assessment_id: string }> }
) {
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

    const { project_id, assessment_id } = await params;
    const body = await request.json().catch(() => ({}));
    const assessment_title = body.assessment_title || "Technical Assessment";

    await dbConnect();

    const project = await Project.findById(project_id).select("title team_members team").lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const team = project.team_members || project.team || [];
    const userIds = team.map((m: any) => m.user).filter(Boolean);

    // Resolve which team members are students
    const students = await User.find({
      _id: { $in: userIds },
      role: "student",
    }).select("_id email").lean();

    let notifiedCount = 0;
    for (const student of students) {
      try {
        await emit_notification_event({
          user_id: String(student._id),
          event_type: "ASSESSMENT_READY",
          title: "Assessment Ready",
          message: `A new assessment "${assessment_title}" is ready for project: ${project.title}`,
          category: "assessments",
          priority: "medium",
          event_key: `ASSESSMENT_READY:${project_id}:${assessment_id}:${String(student._id)}`,
          metadata: {
            assessment_id: new Types.ObjectId(assessment_id),
            assessment_title: assessment_title,
            project_id: new Types.ObjectId(project_id),
            project_title: project.title,
          },
        });
        notifiedCount++;
      } catch (err) {
        console.error(`Failed to notify trainee ${student._id}:`, err);
      }
    }

    try {
      await notify_company_supervisors({
        projectId: project_id,
        eventType: "SUPERVISOR_ASSESSMENT_CREATED",
        title: "New Assessment Created",
        message: `A new assessment "${assessment_title}" has been created for project: ${project.title}`,
        category: "assessments",
        priority: "medium",
        metadata: {
          assessment_id: new Types.ObjectId(assessment_id),
          assessment_title: assessment_title,
          project_id: new Types.ObjectId(project_id),
          project_title: project.title,
        },
      });
    } catch (superErr) {
      console.error("Failed to notify supervisors of new assessment:", superErr);
    }

    return NextResponse.json({ success: true, notifiedCount });
  } catch (error) {
    console.error("Error sending assessment notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
