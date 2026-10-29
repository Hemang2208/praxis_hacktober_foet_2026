/**
 * Google OAuth Callback Route
 * Handles the callback from Google OAuth and creates/updates user
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Student, IUserBase } from "@/models/User";
import { College, Company } from "@/models/User";
import { createOAuthRedirectResponse } from "@/lib/passport/authenticate";
import { Model } from "mongoose";

// Helper function to get the correct model based on user type
const getModelForType = (
  type: "student" | "college" | "company",
): Model<IUserBase> => {
  switch (type) {
    case "student":
      return Student as Model<IUserBase>;
    case "college":
      return College as Model<IUserBase>;
    case "company":
      return Company as Model<IUserBase>;
    default:
      return Student as Model<IUserBase>; // Default to Student
  }
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/login?error=no_code`);
  }

  // Parse state to get user type and redirect URL
  let userType: "student" | "college" | "company" = "student";
  let redirectAfterAuth = "/user";

  if (state) {
    try {
      const stateData = JSON.parse(decodeURIComponent(state));
      userType = stateData.userType || "student";
      redirectAfterAuth = stateData.redirect || getDefaultRedirect(userType);
    } catch (e) {
      console.error("Error parsing state:", e);
    }
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${BASE_URL}/api/auth/oauth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("No access token received from Google:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/login?error=no_token`);
    }

    // Fetch user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${BASE_URL}/login?error=no_email`);
    }

    await dbConnect();

    // Handle user based on type
    let user;
    const UserModel = getModelForType(userType);

    user = await UserModel.findOne({ email: googleUser.email });

    if (user) {
      // Update existing user
      user.googleId = googleUser.id;
      user.avatar = googleUser.picture;
      await user.save();
    } else {
      // Create new user
      user = new UserModel({
        full_name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        avatar: googleUser.picture,
        role: userType,
      });
      await user.save();
    }

    if (!user) {
      return NextResponse.redirect(
        `${BASE_URL}/login?error=user_creation_failed`,
      );
    }

    // Create authenticated response with JWT cookie
    return createOAuthRedirectResponse(user, `${BASE_URL}${redirectAfterAuth}`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${BASE_URL}/login?error=oauth_error`);
  }
}

function getDefaultRedirect(userType: string): string {
  switch (userType) {
    case "student":
      return "/user";
    case "college":
    case "company":
      return "/dashboard";
    default:
      return "/user";
  }
}
