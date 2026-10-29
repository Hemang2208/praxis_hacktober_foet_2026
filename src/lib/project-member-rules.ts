import { FrontendTeamMember, Project } from "@/redux/slice/project.slice";

export function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeRoleKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function toMemberIdentityKey(member: {
  user?: unknown;
  email?: unknown;
}): string {
  const userId = String(member.user ?? "")
    .trim()
    .toLowerCase();
  if (userId) return `user:${userId}`;

  const email = normalizeEmail(member.email);
  if (email) return `email:${email}`;

  return "";
}

export function isPrivilegedCompanyRole(value: unknown): boolean {
  const normalized = normalizeRoleKey(value).replace(/\s+/g, "_");
  return (
    normalized === "owner" ||
    normalized === "super_owner" ||
    normalized === "admin" ||
    normalized === "superadmin"
  );
}

export function isRestrictedResourceRoleName(value: unknown): boolean {
  const normalized = normalizeRoleKey(value).replace(/\s+/g, "_");
  return (
    normalized === "owner" ||
    normalized === "project_owner" ||
    normalized === "super_owner" ||
    normalized === "admin" ||
    normalized === "superadmin"
  );
}

export function getAssignedRoleCounts(
  teamMembers: Array<Partial<FrontendTeamMember>> | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const source = Array.isArray(teamMembers) ? teamMembers : [];

  for (const member of source) {
    const role = normalizeRoleKey(member.role);
    if (!role) continue;
    counts[role] = (counts[role] ?? 0) + 1;
  }

  return counts;
}

export function getAssignableResourceRoles(
  project: Project | null | undefined,
): string[] {
  const resources = Array.isArray(project?.resources) ? project!.resources : [];
  const roleCounts = getAssignedRoleCounts(project?.team_members || []);

  return resources
    .map((resource) => String(resource?.profile ?? "").trim())
    .filter((profile) => profile.length > 0)
    .filter((profile) => !isRestrictedResourceRoleName(profile))
    .filter((profile) => (roleCounts[normalizeRoleKey(profile)] ?? 0) === 0);
}

export function isResourceRoleOccupied(
  teamMembers: Array<Partial<FrontendTeamMember>> | undefined,
  roleProfile: string,
): boolean {
  const roleKey = normalizeRoleKey(roleProfile);
  if (!roleKey) return false;
  const roleCounts = getAssignedRoleCounts(teamMembers);
  return (roleCounts[roleKey] ?? 0) > 0;
}

export function buildAllowedResourceRoleSet(
  project: Pick<Project, "resources"> | null | undefined,
): Set<string> {
  const roles = Array.isArray(project?.resources)
    ? project.resources
        .map((resource) => normalizeRoleKey(resource?.profile))
        .filter((role) => Boolean(role))
    : [];
  return new Set(roles);
}
