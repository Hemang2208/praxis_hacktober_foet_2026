type ProjectLike = Record<string, unknown> & {
  companyId?: unknown;
  company_id?: unknown;
  created_by?: unknown;
  user?: unknown;
  team?: Array<Record<string, unknown>>;
  team_members?: Array<Record<string, unknown>>;
};

function toStringId(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function getProjectCompanyId(
  project: ProjectLike | null | undefined,
): string | null {
  if (!project) return null;
  return (
    toStringId(project.companyId) ||
    toStringId(project.company_id) ||
    toStringId(project.created_by) ||
    toStringId(project.user)
  );
}

export function projectBelongsToCompany(
  project: ProjectLike | null | undefined,
  companyId: string | null | undefined,
): boolean {
  const projectCompanyId = getProjectCompanyId(project);
  if (!projectCompanyId || !companyId) return false;
  return String(projectCompanyId) === String(companyId);
}

export function projectHasTeamMember(
  project: ProjectLike | null | undefined,
  userId: string | null | undefined,
  email?: unknown,
): boolean {
  if (!project || !userId) return false;

  const candidates = [
    ...(Array.isArray(project.team) ? project.team : []),
    ...(Array.isArray(project.team_members) ? project.team_members : []),
  ];

  return candidates.some((member) => {
    const memberUser = toStringId(member.user);
    const memberEmail = toStringId(member.email);
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();
    return (
      memberUser === String(userId) ||
      (normalizedEmail.length > 0 &&
        memberEmail?.toLowerCase() === normalizedEmail)
    );
  });
}
