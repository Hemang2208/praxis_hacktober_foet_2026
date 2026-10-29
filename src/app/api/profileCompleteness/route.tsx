import { NextResponse } from "next/server";
import { User, IStudent } from "@/models/User";
import dbConnect from "@/lib/dbConnect";

const PROFILE_FIELDS = [
  "full_name",
  "email",
  "bio",
  "headline",
  "phoneNumber",
  "address",
  "profile_picture",
  "skills",
  "education.degree",
  "education.institution",
  "education.fieldOfStudy",
  "education.graduationYear",
  "experience.level",
  "socialLinks.github",
  "careerGoals.preferredRole",
  "careerGoals.industries",
  "careerGoals.workMode",
  "careerGoals.careerObjective",
];

function getFieldValue(user, fieldPath) {
  const parts = fieldPath.split(".");
  let value = user;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) return undefined;
  }
  return value;
}

function calculateCompleteness(user) {
  let filled = 0;
  const filledFields = [];
  const missingFields = [];
  PROFILE_FIELDS.forEach((field) => {
    const value = getFieldValue(user, field);
    let isFilled = false;
    if (Array.isArray(value)) {
      if (value.length > 0) isFilled = true;
    } else if (typeof value === "string") {
      if (value.trim() !== "") isFilled = true;
    } else if (typeof value === "boolean" || typeof value === "number") {
      if (value !== undefined && value !== null) isFilled = true;
    } else if (value) {
      isFilled = true;
    }
    if (isFilled) {
      filled++;
      filledFields.push(field);
    } else {
      missingFields.push(field);
    }
  });
  return {
    percent: Math.round((filled / PROFILE_FIELDS.length) * 100),
    filledFields,
    missingFields,
  };
}

export async function POST(request) {
  await dbConnect();
  let user_id;
  try {
    const body = await request.json();
    user_id = body.user_id;
  } catch {
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 },
    );
  }
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }
  const user = await User.findById(user_id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Only students have profileCompleteness property
  if (user.role !== "student") {
    return NextResponse.json(
      { error: "Profile completeness only available for students" },
      { status: 400 },
    );
  }

  const studentUser = user as IStudent;
  const completenessInfo = calculateCompleteness(studentUser);

  if (!studentUser.full_name || studentUser.full_name.trim() === "") {
    console.warn("profileCompleteness: missing full_name for user, applying fallback value", user_id);
    studentUser.full_name = "Unknown User";
  }

  studentUser.profileCompleteness = completenessInfo.percent;

  try {
    await studentUser.save();
  } catch (error) {
    console.error("Failed to save profile completeness for user", user_id, error);
    return NextResponse.json(
      { error: "Failed to save profile completeness" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    completeness: completenessInfo.percent,
    filledFields: completenessInfo.filledFields,
    missingFields: completenessInfo.missingFields,
  });
}
