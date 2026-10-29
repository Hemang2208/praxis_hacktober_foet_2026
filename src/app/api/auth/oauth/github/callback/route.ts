/**
 * GitHub OAuth Callback Route
 * Handles the callback from GitHub OAuth and creates/updates user
 */

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Student, College, Company, IUserBase } from "@/models/User";
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

// Use separate GitHub OAuth App for login (different from commits/profile OAuth)
const GITHUB_CLIENT_ID = process.env.GITHUB_LOGIN_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_LOGIN_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_LOGIN_REDIRECT_URI;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("GitHub OAuth error:", error);
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
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error("No access token received from GitHub:", tokenData);
      return NextResponse.redirect(`${BASE_URL}/login?error=no_token`);
    }

    const accessToken = tokenData.access_token;

    // Fetch user info from GitHub
    const userInfoResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const githubUser: GitHubUserInfo = await userInfoResponse.json();

    // Fetch user emails from GitHub (for private email)
    let primaryEmail = githubUser.email;
    if (!primaryEmail) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
      const emails: GitHubEmail[] = await emailsResponse.json();
      const primary = emails.find((e) => e.primary && e.verified);
      primaryEmail = primary?.email || emails[0]?.email;
    }

    if (!primaryEmail) {
      // Use GitHub username as fallback email
      primaryEmail = `${githubUser.login}@github.local`;
    }

    await dbConnect();

    // Handle user based on type
    let user;
    const UserModel = getModelForType(userType);

    // Find user by email or GitHub ID
    user = await UserModel.findOne({
      $or: [{ email: primaryEmail }, { githubId: githubUser.id }],
    });

    if (user) {
      // Update existing user
      user.githubId = githubUser.id;
      user.githubToken = accessToken;
      user.avatar = githubUser.avatar_url;
      // Auto-populate social link for GitHub
      if (!user.socialLinks) {
        user.socialLinks = { github: githubUser.html_url };
      } else {
        user.socialLinks.github = githubUser.html_url;
      }
      await user.save();
    } else {
      // Create new user
      user = new UserModel({
        full_name: githubUser.name || githubUser.login,
        email: primaryEmail,
        githubId: githubUser.id,
        githubToken: accessToken,
        avatar: githubUser.avatar_url,
        role: userType,
        socialLinks: { github: githubUser.html_url },
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
    console.error("GitHub OAuth callback error:", error);
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
