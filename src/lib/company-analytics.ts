import dbConnect from "@/lib/dbConnect";
import { Company } from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import { verifyJwt } from "@/lib/jwt";
import { NextRequest } from "next/server";
import {
  COMPANY_ANALYTICS_ROLES,
  COMPANY_TALENT_UNLOCK_ROLES,
  CompanySubrole,
  normalizeCompanySubrole,
} from "@/lib/company-rbac";

export type ViewerMembership = {
  email: string;
  subrole: CompanySubrole;
  status: "invited" | "active";
} | null;

export type AnalyticsAccess = {
  company: any;
  viewerMembership: ViewerMembership;
  canViewAnalytics: boolean;
};

export type AnalyticsSnapshot = {
  company: any;
  projects: any[];
  tasks: any[];
  projectIds: string[];
};

const ANALYTICS_CACHE_TTL_MS = 30_000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

declare global {
  var __kiyoAnalyticsCache: Map<string, CacheEntry<unknown>> | undefined;
}

const analyticsCache =
  globalThis.__kiyoAnalyticsCache || new Map<string, CacheEntry<unknown>>();

if (!globalThis.__kiyoAnalyticsCache) {
  globalThis.__kiyoAnalyticsCache = analyticsCache;
}

export function getCachedAnalytics<T>(key: string): T | null {
  const entry = analyticsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    analyticsCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedAnalytics<T>(
  key: string,
  value: T,
  ttlMs = ANALYTICS_CACHE_TTL_MS,
) {
  analyticsCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCachedAnalytics(key: string) {
  analyticsCache.delete(key);
}

export function isAnalyticsViewer(member: ViewerMembership): boolean {
  return Boolean(
    member &&
    member.status === "active" &&
    COMPANY_ANALYTICS_ROLES.includes(member.subrole),
  );
}

export async function resolveAnalyticsAccess(
  req: NextRequest,
  companyId: string,
): Promise<AnalyticsAccess | { error: string; status: number }> {
  await dbConnect();

  const company = await Company.findById(companyId).lean();
  if (!company) {
    return { error: "Company not found", status: 404 };
  }

  const token = req.cookies.get("aipm_token")?.value;
  const payload = token ? await verifyJwt(token).catch(() => null) : null;
  const viewerEmail = payload?.email || null;
  const isCompanyOwnerToken =
    payload?.role === "company" &&
    payload?.id &&
    String(payload.id) === String(company._id);

  let viewerMembership: ViewerMembership = null;
  if (viewerEmail && Array.isArray(company.members)) {
    const member = company.members.find(
      (entry: { email: string }) => entry.email === viewerEmail,
    );
    if (member) {
      viewerMembership = {
        email: member.email,
        subrole: normalizeCompanySubrole(member.subrole),
        status: member.status,
      };
    }
  }

  return {
    company,
    viewerMembership,
    canViewAnalytics:
      isCompanyOwnerToken || isAnalyticsViewer(viewerMembership),
  };
}

export async function loadAnalyticsSnapshot(
  companyId: string,
): Promise<AnalyticsSnapshot | null> {
  const cacheKey = `company-analytics:snapshot:${companyId}`;
  const cached = getCachedAnalytics<AnalyticsSnapshot>(cacheKey);
  if (cached) {
    return cached;
  }

  const company = await Company.findById(companyId).lean();
  if (!company) {
    return null;
  }

  const projectConditions = [
    { companyId: company._id },
    { company_id: company._id },
    { created_by: company._id },
    { user: company._id },
    { "team.user": company._id },
    { "team_members.user": company._id },
  ];

  const projects = await Project.find({ $or: projectConditions })
    .select(
      "title description status progress deadline tags team team_members timeline githubCommits lastCommitSync created_at updated_at",
    )
    .lean()
    .exec();

  const projectIds = projects.map((project: any) => String(project._id));

  const tasks = projectIds.length
    ? await Task.find({
        $or: [
          { project: { $in: projectIds } },
          { project_id: { $in: projectIds } },
        ],
      })
        .select(
          "title description status priority due_date assigned_to project project_id tags completed_at created_at updated_at time_tracking",
        )
        .lean()
        .exec()
    : [];

  const snapshot = {
    company,
    projects,
    tasks,
    projectIds,
  } satisfies AnalyticsSnapshot;

  setCachedAnalytics(cacheKey, snapshot);
  return snapshot;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function uniqueValues(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function formatDays(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function anonymizeLabel(seed: string, index: number) {
  const cleaned = seed
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `KIYO_${cleaned || "TEAM"}_${String(index + 1).padStart(2, "0")}`;
}

export function canUnlockTalent(member: ViewerMembership) {
  return Boolean(
    member &&
    member.status === "active" &&
    COMPANY_TALENT_UNLOCK_ROLES.includes(member.subrole),
  );
}
