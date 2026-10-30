/**
 * Shoot dates are always shown in the project's time zone, never the viewer's:
 * a 17:00 shoot in Raleigh is "17:00" even when the photographer opens it from Tyumen.
 */

/** "Saturday, November 14, 2026" / "суббота, 14 ноября 2026 г." */
export function formatShootDate(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }).format(new Date(iso));
}

/** "5:00 – 7:00 PM" / "17:00–19:00", or just the start when there is no end. */
export function formatShootTime(startIso: string, endIso: string | null, timeZone: string, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone });
  const start = new Date(startIso);
  return endIso ? formatter.formatRange(start, new Date(endIso)) : formatter.format(start);
}

/** "Nov 14, 2026, 5:00 PM", compact form for lists. */
export function formatShootShort(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso));
}

/** "America/New_York" → "America/New York", for display only. */
export function formatTimeZone(timeZone: string): string {
  return timeZone.replaceAll("_", " ");
}
