import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import { User, Company } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import AIFeedback from "@/models/AIFeedback";
import { Types } from "mongoose";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("aipm_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const student = await User.findById(payload.id).lean();

    if (!student || student.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userEmail = student.email?.toLowerCase() || "";

    const companyConditions: Array<Record<string, unknown>> = [];
    companyConditions.push({
      members: {
        $elemMatch: {
          user_id: String(student._id),
          status: "active",
        },
      },
    });
    companyConditions.push({
      members: {
        $elemMatch: {
          email: userEmail,
          status: "active",
        },
      },
    });

    const companies = await Company.find({
      $or: companyConditions,
    })
      .select(
        "companyName industry image_url headquartersLocation companySize members",
      )
      .lean();

    const companyData = companies.map((company) => {
      const member = (company.members || []).find((m: any) => {
        const memberEmail = String(m.email || "").toLowerCase();
        const memberId = m.user_id ? String(m.user_id) : "";

        return (
          (memberId && memberId === String(student._id)) ||
          (memberEmail && memberEmail === userEmail)
        );
      });

      return {
        companyId: company._id,
        companyName: company.companyName,
        industry: company.industry,
        image_url: company.image_url,
        headquartersLocation: company.headquartersLocation,
        companySize: company.companySize,
        subrole: member?.subrole || "trainee",
        joinedAt: member?.joinedAt || null,
      };
    });

    const projectConditions: Array<Record<string, unknown>> = [
      { user: student._id },
      { "team.user": student._id },
      { "team_members.user": student._id },
    ];

    if (userEmail) {
      projectConditions.push({ "team_members.email": userEmail });
    }

    const joinedProjects = await Project.find({
      $or: projectConditions,
    })
      .select({
        title: 1,
        description: 1,
        status: 1,
        progress: 1,
        deadline: 1,
        tags: 1,
        team: 1,
        team_members: 1,
        created_at: 1,
        updated_at: 1,
        user: 1,
        companyId: 1,
        githubCommits: 1,
      })
      .lean()
      .exec();

    const studentId = String(student._id);
    const joinedProjectIds = joinedProjects.map((p: any) => p._id);

    // Match the backend task-mgmt logic: assigned tasks can be tracked
    // both on task.assigned_to and in task_assignments logs.
    const assignmentDocs = await Task.db
      .collection("task_assignments")
      .find({ user_id: { $in: [studentId, String(payload.id)] } })
      .project({ task_id: 1, _id: 0 })
      .toArray();

    const assignedTaskObjectIds = assignmentDocs
      .map((doc: any) => String(doc.task_id || ""))
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    const taskConditions: Array<Record<string, unknown>> = [];

    if (joinedProjectIds.length > 0) {
      taskConditions.push({ project: { $in: joinedProjectIds } });
      taskConditions.push({ project_id: { $in: joinedProjectIds } });
    }

    taskConditions.push({
      assigned_to: { $in: [studentId, String(payload.id)] },
    });

    if (assignedTaskObjectIds.length > 0) {
      taskConditions.push({ _id: { $in: assignedTaskObjectIds } });
    }

    const tasks = taskConditions.length
      ? await Task.find({ $or: taskConditions })
          .select({
            title: 1,
            description: 1,
            status: 1,
            priority: 1,
            due_date: 1,
            assigned_to: 1,
            tags: 1,
            sub_tasks: 1,
            created_at: 1,
            updated_at: 1,
            project: 1,
            project_id: 1,
            has_feedback: 1,
            feedback_status: 1,
          })
          .lean()
          .exec()
      : [];

    const taskSummary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === "completed").length,
      inProgressTasks: tasks.filter((t: any) => t.status === "in-progress")
        .length,
      todoTasks: tasks.filter((t: any) => t.status === "todo").length,
      blockedTasks: tasks.filter((t: any) => t.status === "blocked").length,
    };

    const taskCompletionRate =
      taskSummary.totalTasks > 0
        ? Math.round((taskSummary.completedTasks / taskSummary.totalTasks) * 100)
        : 0;

    const studentName = String(
      (student as any).full_name || (student as any).name || "",
    ).toLowerCase();

    const gitHubCommits = joinedProjects.reduce((total: number, project: any) => {
      const commits = Array.isArray(project.githubCommits)
        ? project.githubCommits
        : [];

      const userScopedCommits = commits.filter((commit: any) => {
        const commitAuthorEmail = String(commit?.authorEmail || "").toLowerCase();
        const commitAuthorName = String(commit?.author || "").toLowerCase();

        return (
          (userEmail && commitAuthorEmail === userEmail) ||
          (studentName && commitAuthorName === studentName)
        );
      });

      return total + userScopedCommits.length;
    }, 0);

    let aiFeedbackScore = 0;
    try {
      const feedbackDocs = await AIFeedback.find({
        user_id: student._id,
        status: "completed",
      })
        .select("assessment.overall")
        .lean()
        .exec();

      const overallScores = feedbackDocs
        .map((doc: any) => Number(doc?.assessment?.overall))
        .filter((score: number) => Number.isFinite(score));

      if (overallScores.length > 0) {
        aiFeedbackScore = Math.round(
          overallScores.reduce((sum: number, score: number) => sum + score, 0) /
            overallScores.length,
        );
      }
    } catch {
      // Keep default 0 if feedback collection is unavailable.
    }

    if (aiFeedbackScore === 0 && tasks.length > 0) {
      const feedbackReadyTasks = tasks.filter(
        (t: any) =>
          t.has_feedback === true ||
          t.feedback_status === "ready" ||
          t.feedback_status === "reviewed",
      ).length;
      aiFeedbackScore = Math.round((feedbackReadyTasks / tasks.length) * 100);
    }

    let certificatesEarned = 0;
    try {
      certificatesEarned = await Task.db.collection("certificates").countDocuments({
        $or: [
          { user_id: student._id },
          { user_id: studentId },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      });
    } catch {
      // Keep default 0 if certificates collection is unavailable.
    }

    const summaryStats = {
      taskCompletionRate,
      gitHubCommits,
      aiFeedbackScore,
      certificatesEarned,
    };

    return NextResponse.json(
      {
        user: student,
        companies: companyData,
        joinedProjects,
        tasks,
        taskSummary,
        summaryStats,
        projectSummary: {
          totalProjects: joinedProjects.length,
          completedProjects: joinedProjects.filter(
            (p: any) => p.status === "completed",
          ).length,
          inProgressProjects: joinedProjects.filter(
            (p: any) => p.status === "in-progress",
          ).length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("/api/student/overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student overview" },
      { status: 500 },
    );
  }
}
