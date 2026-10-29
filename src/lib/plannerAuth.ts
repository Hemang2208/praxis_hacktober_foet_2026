import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { cookies } from "next/headers";

const PLANNER_COOKIE_NAME = "planner_token";
const PLANNER_JWT_SECRET =
  process.env.PLANNER_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "planner-secret-change-me";
const secret = new TextEncoder().encode(PLANNER_JWT_SECRET);

type PlannerTokenPayload = {
  uid: string;
  email: string;
  planner: true;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildPlannerUidFromEmail(email: string) {
  const normalized = normalizeEmail(email);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export async function signPlannerToken(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const uid = buildPlannerUidFromEmail(normalizedEmail);

  const payload: PlannerTokenPayload = {
    uid,
    email: normalizedEmail,
    planner: true,
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyPlannerToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      !payload ||
      payload.planner !== true ||
      typeof payload.uid !== "string"
    ) {
      return null;
    }

    return {
      uid: String(payload.uid),
      email: String(payload.email || ""),
    };
  } catch {
    return null;
  }
}

export async function getPlannerAuthFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLANNER_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifyPlannerToken(token);
}

export function getPlannerCookieName() {
  return PLANNER_COOKIE_NAME;
}
