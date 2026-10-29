import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "email is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({
      email: { $regex: `^${normalizedEmail}$`, $options: "i" },
    }).select(
      "_id role full_name companyName collegeName contactPersonName username email profile_picture image_url",
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const u = user as unknown as {
      _id?: string;
      role?: string;
      full_name?: string;
      companyName?: string;
      collegeName?: string;
      contactPersonName?: string;
      username?: string;
      email?: string;
      profile_picture?: string;
      image_url?: string;
    };

    const displayName =
      u.full_name?.trim() ||
      u.companyName?.trim() ||
      u.collegeName?.trim() ||
      u.contactPersonName?.trim() ||
      u.username?.trim() ||
      u.email?.split("@")[0] ||
      "User";

    return NextResponse.json(
      {
        exists: true,
        user: {
          _id: u._id,
          id: u._id, // Provide both formats for compatibility
          role: u.role,
          full_name: u.full_name,
          name: displayName,
          display_name: displayName,
          email: u.email,
          profile_picture: u.profile_picture || u.image_url || "",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in user check route:", error);
    return NextResponse.json(
      { message: "Failed to check user" },
      { status: 500 },
    );
  }
}
