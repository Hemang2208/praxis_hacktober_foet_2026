// src/lib/formatDate.ts
// Deterministic date formatting for SSR/CSR consistency

export function formatDate(dateInput: string | number | Date): string {
  if (!dateInput) return "No due date";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "No due date";
  // Always output YYYY-MM-DD for consistency
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid date";

  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(date).reduce(
    (acc, part) => ({
      ...acc,
      [part.type]: part.value,
    }),
    {} as Record<string, string>,
  );

  const day = parts.day || "";
  const month = parts.month || "";
  const year = parts.year || "";
  const hour = parts.hour || "";
  const minute = parts.minute || "";
  const dayPeriod = parts.dayPeriod || "";
  const timeZoneName = parts.timeZoneName || "IST";

  return `${day} ${month}, ${year} at ${hour}:${minute} ${dayPeriod} ${timeZoneName}`;
}

export function formatDateWithDay(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "No date";

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayName = dayNames[date.getDay()];
  const dayNum = date.getDate();
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();

  // Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  let suffix = "th";
  if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = "st";
  else if (dayNum === 2 || dayNum === 22) suffix = "nd";
  else if (dayNum === 3 || dayNum === 23) suffix = "rd";

  // Format time with AM/PM
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${dayName}, ${dayNum}${suffix} ${monthName}, ${year}: ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}
