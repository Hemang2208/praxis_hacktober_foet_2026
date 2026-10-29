interface AuthUser {
  _id: unknown;
  role: string;
}
import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = process.env.GITHUB_OAUTH_REDIRECT_URI

// Step 2: GitHub OAuth callback, exchange code for access token and fetch user data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");
  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token received" }, { status: 400 });
  }

  // Fetch user data from GitHub
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const userData = await userRes.json();

  // Save GitHub username in DB for the authenticated user
  try {
    const dbConnect = (await import("@/lib/dbConnect")).default;
    await dbConnect();
    const { User, Student, Company, College } = await import("@/models/User");
    // Get app user from JWT (custom auth)
    const { getCurrentUser } = await import("@/lib/auth");
    const user: AuthUser | null = await getCurrentUser();
    if (user && user._id) {
      const user_id = typeof user._id === "string" ? user._id : String(user._id);
      console.log('OAuth Callback:', { user_id, accessToken, githubUrl: userData.html_url });
      let result;
      if (user.role === "student") {
        result = await Student.findByIdAndUpdate(
          user_id,
          { $set: { "socialLinks.github": userData.html_url, githubToken: accessToken } },
          { new: true, upsert: false }
        );
      } else if (user.role === "company") {
        result = await Company.findByIdAndUpdate(
          user_id,
          { $set: { "socialLinks.github": userData.html_url, githubToken: accessToken } },
          { new: true, upsert: false }
        );
      } else if (user.role === "college") {
        result = await College.findByIdAndUpdate(
          user_id,
          { $set: { "socialLinks.github": userData.html_url, githubToken: accessToken } },
          { new: true, upsert: false }
        );
      } else {
        result = await User.findByIdAndUpdate(
          user_id,
          { $set: { "socialLinks.github": userData.html_url, githubToken: accessToken } },
          { new: true, upsert: false }
        );
      }
      console.log('User update result:', result);
    } else {
      console.error('No authenticated user found for GitHub OAuth callback');
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }
  } catch (err) {
    console.error("Error saving GitHub username to DB", err);
  }

  // Build absolute URL for redirect
  const origin = req.headers.get("origin")
  let redirectUrl = origin + "/user/github";
  if (redirectParam) {
    // If redirectParam is already absolute, use it; otherwise, prepend origin
    if (/^https?:\/+/.test(redirectParam)) {
      redirectUrl = redirectParam;
    } else {
      redirectUrl = origin + redirectParam;
    }
  }
  // Set cookie for frontend use
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("github_user", encodeURIComponent(JSON.stringify({ login: userData.login })), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  return response;
}
