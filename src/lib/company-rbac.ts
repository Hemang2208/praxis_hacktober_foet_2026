export const COMPANY_SUBROLES = [
  "owner",
  "admin",
  "manager",
  "trainee",
] as const;

export type CompanySubrole = (typeof COMPANY_SUBROLES)[number];

const LEGACY_SUBROLE_MAP: Record<string, CompanySubrole> = {
  ["super" + "admin"]: "admin",
  super_owner: "owner",
  "super-owner": "owner",
  "super owner": "owner",
  superowner: "owner",
};

export function normalizeCompanySubrole(value: unknown): CompanySubrole {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if ((COMPANY_SUBROLES as readonly string[]).includes(raw)) {
    return raw as CompanySubrole;
  }
  return LEGACY_SUBROLE_MAP[raw] || "trainee";
}

export function isCompanySubrole(value: unknown): value is CompanySubrole {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return (
    (COMPANY_SUBROLES as readonly string[]).includes(raw) ||
    raw in LEGACY_SUBROLE_MAP
  );
}

export const COMPANY_INVITE_PERMISSIONS: Record<
  CompanySubrole,
  CompanySubrole[]
> = {
  owner: ["admin", "manager", "trainee"],
  admin: ["manager", "trainee"],
  manager: [],
  trainee: [],
};

export const COMPANY_ROLE_CHANGE_PERMISSIONS: Record<
  CompanySubrole,
  CompanySubrole[]
> = {
  owner: ["admin", "manager", "trainee"],
  admin: ["manager", "trainee"],
  manager: [],
  trainee: [],
};

export const COMPANY_ROLE_REMOVE_PERMISSIONS: Record<
  CompanySubrole,
  CompanySubrole[]
> = {
  owner: ["admin", "manager", "trainee"],
  admin: ["manager", "trainee"],
  manager: ["trainee"],
  trainee: [],
};

export const COMPANY_MANAGEMENT_ROLES: CompanySubrole[] = ["owner", "admin"];

export const COMPANY_ANALYTICS_ROLES: CompanySubrole[] = ["owner", "admin"];

export const COMPANY_TALENT_UNLOCK_ROLES: CompanySubrole[] = ["owner", "admin"];

export const COMPANY_PROJECT_MANAGEMENT_ROLES: CompanySubrole[] = [
  "owner",
  "admin",
];

export const COMPANY_TASK_REVIEW_ROLES: CompanySubrole[] = [
  "owner",
  "admin",
  "manager",
];

export function formatCompanySubroleLabel(value: unknown): string {
  const role = normalizeCompanySubrole(value);
  return role.charAt(0).toUpperCase() + role.slice(1);
}

type CompanyProfileMember = {
  email?: unknown;
  status?: unknown;
  subrole?: unknown;
};

export type CompanyProfileLike =
  | {
      role?: unknown;
      email?: unknown;
      subrole?: unknown;
      activeCompanyMembership?: {
        companyId?: unknown;
        companyName?: unknown;
        subrole?: unknown;
        status?: unknown;
      };
      members?: CompanyProfileMember[];
    }
  | null
  | undefined;

export function getViewerCompanySubrole(
  profile: CompanyProfileLike,
): CompanySubrole | null {
  if (!profile) return null;

  const membershipSubrole = profile.activeCompanyMembership?.subrole;
  if (membershipSubrole != null && String(membershipSubrole).trim()) {
    return normalizeCompanySubrole(membershipSubrole);
  }

  if (profile.subrole != null && String(profile.subrole).trim()) {
    return normalizeCompanySubrole(profile.subrole);
  }

  const role = String(profile.role ?? "")
    .trim()
    .toLowerCase();
  if (role !== "company") return null;

  const email = String(profile?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email || !Array.isArray(profile?.members)) return null;

  const member = profile.members.find(
    (entry) =>
      String(entry.email ?? "")
        .trim()
        .toLowerCase() === email &&
      String(entry.status ?? "")
        .trim()
        .toLowerCase() === "active",
  );

  return member ? normalizeCompanySubrole(member.subrole) : null;
}

export function canManageCompanyProjects(profile: CompanyProfileLike): boolean {
  const subrole = getViewerCompanySubrole(profile);
  return subrole === "owner" || subrole === "admin";
}

export function canManageCompanyTaskStatus(
  profile: CompanyProfileLike,
): boolean {
  const subrole = getViewerCompanySubrole(profile);
  return subrole === "owner" || subrole === "admin" || subrole === "manager";
}

export function canManageCompanyTaskActions(
  profile: CompanyProfileLike,
): boolean {
  return canManageCompanyProjects(profile);
}
