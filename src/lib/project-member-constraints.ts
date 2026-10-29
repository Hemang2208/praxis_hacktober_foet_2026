export function normalizeMemberEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeMemberRoleKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function isPrivilegedProjectMemberRole(value: unknown): boolean {
  const normalized = normalizeMemberRoleKey(value).replace(/\s+/g, "_");
  return (
    normalized === "owner" ||
    normalized === "project_owner" ||
    normalized === "super_owner" ||
    normalized === "admin" ||
    normalized === "superadmin"
  );
}

export function buildMemberIdentityKey(args: {
  user?: unknown;
  email?: unknown;
}): string {
  const userId = String(args.user ?? "")
    .trim()
    .toLowerCase();
  if (userId) return `user:${userId}`;

  const email = normalizeMemberEmail(args.email);
  if (email) return `email:${email}`;

  return "";
}

export function countRoles(
  members: Array<{ role?: unknown }> | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const source = Array.isArray(members) ? members : [];

  for (const member of source) {
    const role = normalizeMemberRoleKey(member?.role);
    if (!role) continue;
    counts[role] = (counts[role] ?? 0) + 1;
  }

  return counts;
}
