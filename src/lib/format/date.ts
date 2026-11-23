import { formatDistanceStrict } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export const TIME_ZONE = "Asia/Colombo";

type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError("Invalid date");
  return d;
}

/** "Thu 29 Oct, 9:30 AM" in Asia/Colombo. */
export function formatDateTime(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "EEE d MMM, h:mm a");
}

/** "Feb 2026" (Joined). */
export function formatMonthYear(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "MMM yyyy");
}

/**
 * Audit times always carry the zone: "Thu 29 Oct 2026, 09:30:05 UTC+05:30".
 * (Colombo has no widely-agreed abbreviation, so the numeric offset is used.)
 */
export function formatAuditTime(value: DateInput): string {
  return formatInTimeZone(toDate(value), TIME_ZONE, "EEE d MMM yyyy, HH:mm:ss 'UTC'xxx");
}

/** "3 days ago" from an API timestamp. `now` is injectable for tests. */
export function formatRelative(value: DateInput, now: Date = new Date()): string {
  const d = toDate(value);
  if (Math.abs(now.getTime() - d.getTime()) < 60_000) return "just now";
  return formatDistanceStrict(d, now, { addSuffix: true });
}
