export const APPLICATION_STATUSES = [
  "PENDING",
  "REVIEWING",
  "NOT_FIT",
  "PARTIALLY_FIT",
  "GOOD_FIT",
  "SELECTED",
  "REJECTED",
] as const;

export const CONTACT_STATUSES = [
  "PENDING",
  "READ",
  "REPLIED",
  "CLOSED",
  "SPAM",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type ViewEntityType = "job" | "intern" | "contact";

export function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
