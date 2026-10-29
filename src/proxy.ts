import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

// Feature flag: Toggle pre-register redirect functionality
const ENABLE_PRE_REGISTER_REDIRECT = false;

// Feature flag: Block right-click and prevent inspect/console access
const ENABLE_DEVELOPER_TOOLS_BLOCK = false;

// Routes to redirect to pre-register page while website is under development
const preRegisterRedirectRoutes = [
  "/login",
  "/signup",
  "/college/signup",
  "/college/login",
  "/company/login",
  "/company/signup",
];

const publicRoutes = [
  "/reset-password",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/",
  "/login",
  "/signup",
  "/verify",
  "/about",
  "/contact",
  "/careers",
  "/register",
  "/preregister",
  "/privacy-policy",
  "/terms-and-conditions",
  "/cookie-policy",
  "/features",
  "/api/preregister",
  "/api/nodemailer",
  "/api/otp",
  "/api/auth",
  "/api/careers",
  "/careers",
  "/api/contact",
  "/api/webhook",
  "/api/result-release-cycles",
  "/api/v1/assessments",
  "/api/v1/support",
  "/api/v1/planner",
  "/api/v1/code-review",
  "/api/cron",
  "/api/test-ai-feedback",
  "/api/project",
  "/api/migrate-project-plans",
  "/api/debug",
  "/college/signup",
  "/college/login",
  "/company/signup",
  "/company/login",
  "/api/college/signup",
  "/api/company/signup",
  "/api/college/login",
  "/api/company/login",
  "/api/inngest/test",
  "/api/inngest",
  "/plan-login",
  "/api/plan/auth",
];

function isPublicRoute(path: string) {
  return publicRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
}

function shouldRedirectToPreRegister(path: string) {
  return preRegisterRedirectRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
}

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // Keep landing page truly public regardless of any future matcher/auth changes.
  if (path === "/") {
    return NextResponse.next();
  }

  // Redirect login/signup routes to home page while website is under development
  if (ENABLE_PRE_REGISTER_REDIRECT && shouldRedirectToPreRegister(path)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check public routes first, before any authentication logic
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  // Isolated planner auth guard: /plan and /api/plan require planner_token.
  if (path === "/plan" || path.startsWith("/api/plan")) {
    if (path.startsWith("/api/plan/auth")) {
      return NextResponse.next();
    }

    const plannerToken = req.cookies.get("planner_token")?.value;
    if (!plannerToken) {
      if (path.startsWith("/api/plan")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/plan-login", req.url));
    }
  }

  // Handle college-specific protected routes
  if (path.startsWith("/college")) {
    const token = req.cookies.get("aipm_token")?.value;
    const payload = token && (await verifyJwt(token));
    if (!payload || payload.role !== "college") {
      return NextResponse.redirect(new URL("/college/login", req.url));
    }
    // Only allow college role
    return NextResponse.next();
  }

  // Handle public-facing company page (accessible by any authenticated user)
  if (path.match(/^\/company\/[a-zA-Z0-9]+/)) {
    const token = req.cookies.get("aipm_token")?.value;
    const payload = token && (await verifyJwt(token));
    if (!payload || !payload.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Any authenticated user can view company pages
    return NextResponse.next();
  }

  // Handle company-specific protected routes
  if (path.startsWith("/dashboard")) {
    const token = req.cookies.get("aipm_token")?.value;
    const payload = token && (await verifyJwt(token));
    if (!payload || (payload.role !== "company" && payload.role !== "college")) {
      return NextResponse.redirect(new URL("/company/login", req.url));
    }
    // Allow company and college roles
    return NextResponse.next();
  }

  // JWT-protected API endpoints for students only
  const protectedApiRoutes = ["/api/user/create"];

  // API endpoints that need authentication but work for all roles
  const authApiRoutes = [
    "/api/auth/profile",
    "/api/ai-feedback",
    "/api/support-chats",
    "/api/notifications",
  ];

  // Handle user-specific protected routes
  if (
    path.startsWith("/user") ||
    path.startsWith("/student") ||
    protectedApiRoutes.some((route) => path.startsWith(route))
  ) {
    const token = req.cookies.get("aipm_token")?.value;
    const payload = token && (await verifyJwt(token));
    if (!payload || !payload.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const isUserProjectsRoute =
      path === "/user/projects" || path.startsWith("/user/projects/");

    if (path.startsWith("/user")) {
      if (payload.role === "student") {
        return NextResponse.next();
      }

      if (payload.role === "company" && isUserProjectsRoute) {
        return NextResponse.next();
      }

      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (payload.role !== "student") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Handle auth API routes that work for all authenticated users
  if (authApiRoutes.some((route) => path.startsWith(route))) {
    const token = req.cookies.get("aipm_token")?.value;
    const payload = token && (await verifyJwt(token));
    if (!payload || !payload.role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Backward compatibility alias for middleware
export const middleware = proxy;

export const config = {
  matcher: [
    "/plan",
    "/user/:path*",
    "/api/:path*",
    "/dashboard/:path*",
    "/college/:path*",
    "/company/:path*",
  ],
};
