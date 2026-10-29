/**
 * Passport Authentication Utilities for Next.js API Routes
 * Provides helper functions to use Passport.js with Next.js App Router
 */

import { NextRequest, NextResponse } from "next/server";
import passport from "./index";
import { signJwt } from "@/lib/jwt";
import { IUser, ICollege, ICompany } from "@/models/User";
import { emit_notification_event } from "@/lib/notificationEvents";

// Type for authenticated user
export type AuthenticatedUser = IUser | ICollege | ICompany;

// JWT Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Creates a mock request object for Passport.js
 * Passport expects Express-style request objects
 */
function createPassportRequest(
  body: Record<string, unknown>,
  cookies: Record<string, string> = {},
) {
  return {
    body,
    cookies,
    query: {},
    params: {},
    headers: {},
    logIn: () => {},
    logOut: () => {},
    isAuthenticated: () => false,
    isUnauthenticated: () => true,
  };
}

/**
 * Authenticate user with Local Strategy (email/password)
 */
export async function authenticateLocal(
  strategy: "local-student" | "local-college" | "local-company",
  email: string,
  password: string,
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  return new Promise((resolve) => {
    const req = createPassportRequest({ email, password });
    const res = {};

    passport.authenticate(
      strategy,
      { session: false },
      (
        err: Error | null,
        user: AuthenticatedUser | false,
        info?: { message: string },
      ) => {
        if (err) {
          resolve({ user: null, error: err.message });
          return;
        }

        if (!user) {
          resolve({
            user: null,
            error: info?.message || "Authentication failed",
          });
          return;
        }

        resolve({ user, error: null });
      },
    )(req, res, () => {});
  });
}

/**
 * Verify JWT token from request
 */
export async function verifyJwtFromRequest(
  request: NextRequest,
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  return new Promise((resolve) => {
    const token = request.cookies.get("aipm_token")?.value;
    const authHeader = request.headers.get("authorization");

    const cookies = token ? { aipm_token: token } : {};
    const req = createPassportRequest({}, cookies);

    // Add authorization header if present
    if (authHeader) {
      req.headers = { authorization: authHeader };
    }

    passport.authenticate(
      "jwt",
      { session: false },
      (
        err: Error | null,
        user: AuthenticatedUser | false,
        info?: { message: string },
      ) => {
        if (err) {
          resolve({ user: null, error: err.message });
          return;
        }

        if (!user) {
          resolve({
            user: null,
            error: info?.message || "Invalid or expired token",
          });
          return;
        }

        resolve({ user, error: null });
      },
    )(req, {}, () => {});
  });
}

/**
 * Generate JWT token for authenticated user
 */
export async function generateAuthToken(
  user: AuthenticatedUser,
): Promise<string> {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  return signJwt(payload);
}

/**
 * Create authenticated response with JWT cookie
 * Also ensures user has an accessToken for external backend
 */
export async function createAuthResponse(
  user: AuthenticatedUser,
  message: string = "Login successful",
): Promise<NextResponse> {
  const token = await generateAuthToken(user);

  // Remove password from response
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  const response = NextResponse.json({
    user: userObj,
    message,
  });

  response.cookies.set("aipm_token", token, cookieOptions);

  // Non-blocking activity feed event.
  void emit_notification_event({
    user_id: String(user._id),
    event_type: "LOGIN",
    title: "Login Successful",
    message: "You logged in successfully.",
    category: "system",
    priority: "low",
    event_key: `LOGIN:${String(user._id)}:${new Date().toISOString().slice(0, 16)}`,
    metadata: {
      login_method: "credentials_or_oauth",
      role: user.role,
    },
  }).catch((error) => {
    console.error("Failed to emit LOGIN notification:", error);
  });

  return response;
}

/**
 * Create OAuth redirect response with JWT cookie
 * Also ensures user has an accessToken for external backend
 */
export async function createOAuthRedirectResponse(
  user: AuthenticatedUser,
  redirectUrl: string = "/user",
): Promise<NextResponse> {
  const token = await generateAuthToken(user);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("aipm_token", token, cookieOptions);

  return response;
}

/**
 * Get OAuth authorization URL
 */
export function getOAuthAuthorizationUrl(
  provider: "google" | "github",
  userType: "student" | "college" | "company" = "student",
  redirectAfterAuth?: string,
): string {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

  let authUrl = "";
  const state = encodeURIComponent(
    JSON.stringify({ userType, redirect: redirectAfterAuth }),
  );

  if (provider === "google") {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = `${BASE_URL}/api/auth/oauth/google/callback`;
    const scope = encodeURIComponent("profile email");
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  } else if (provider === "github") {
    // Use separate GitHub OAuth App for login (different from commits/profile OAuth)
    const GITHUB_CLIENT_ID = process.env.GITHUB_LOGIN_CLIENT_ID;
    const callbackUrl =
      process.env.GITHUB_LOGIN_REDIRECT_URI ||
      `${BASE_URL}/api/auth/oauth/github/callback`;
    const scope = encodeURIComponent("user:email read:user");
    authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${state}`;
  }

  return authUrl;
}

/**
 * Middleware helper to protect API routes
 */
export function withAuth(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error } = await verifyJwtFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: error || "Unauthorized" },
        { status: 401 },
      );
    }

    return handler(request, user);
  };
}

/**
 * Middleware helper to protect routes with specific role
 */
export function withRole(
  roles: ("student" | "college" | "company")[],
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error } = await verifyJwtFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: error || "Unauthorized" },
        { status: 401 },
      );
    }

    if (!roles.includes(user.role as "student" | "college" | "company")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(request, user);
  };
}
