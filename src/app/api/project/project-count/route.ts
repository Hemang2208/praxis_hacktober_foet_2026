import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Project from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import { Types } from "mongoose";

export async function GET() {
  await dbConnect();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let user_id = user._id;
  const userRole = user.role;

  // Ensure user_id is a valid ObjectId
  if (typeof user_id === "string" && Types.ObjectId.isValid(user_id)) {
    user_id = new Types.ObjectId(user_id);
  }

  // Ensure user_id is always an ObjectId
  const objectId =
    typeof user_id === "string" && Types.ObjectId.isValid(user_id)
      ? new Types.ObjectId(user_id)
      : user_id;

  let joinedCount = 0;
  let createdCount = 0;

  if (userRole === "student") {
    // Count projects where the student is in the team array
    joinedCount = await Project.countDocuments({
      $or: [{ "team.user": objectId }, { "team_members.user": objectId }],
    });
  } else if (
    userRole === "company" ||
    userRole === "college" ||
    userRole === "dashboard"
  ) {
    // Count projects owned by the company/user
    createdCount = await Project.countDocuments({
      $or: [
        { companyId: objectId },
        { company_id: objectId },
        { created_by: objectId },
        { user: objectId },
      ],
    });
  }

  return NextResponse.json({
    joinedCount,
    createdCount,
  });
}
