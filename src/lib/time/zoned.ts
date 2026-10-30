/**
 * Converting between "wall-clock time in a given time zone" and real moments (UTC).
 *
 * A form gives us "2026-11-14, 17:00, America/New_York". The database stores a moment in
 * time (timestamptz). These helpers translate between the two using only the built-in
 * Intl API, so summer/winter time is handled by the browser or Node's time zone data.
 */

/** True when `timeZone` is an IANA name the runtime knows, e.g. "America/New_York". */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

/** The calendar date and clock time that `date` shows on a wall clock in `timeZone`. */
function wallClock(date: Date, timeZone: string): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 0,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

/** How many minutes `timeZone` is ahead of UTC at the moment `date` (New York in winter: -300). */
export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = wallClock(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Drop milliseconds so they do not turn into a fractional offset.
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asIfUtc - wholeSeconds) / 60_000);
}

/**
 * The real moment for a wall-clock `date` ("YYYY-MM-DD") and `time` ("HH:MM") in `timeZone`.
 * Example: ("2026-11-14", "17:00", "America/New_York") → 2026-11-14T22:00:00.000Z.
 */
export function zonedLocalToUtc(date: string, time: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);

  // First guess with the offset at that moment, then correct once in case the guess
  // landed on the other side of a summer/winter time switch.
  const firstOffset = timeZoneOffsetMinutes(new Date(asIfUtc), timeZone);
  const guess = asIfUtc - firstOffset * 60_000;
  const secondOffset = timeZoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(asIfUtc - secondOffset * 60_000);
}

/** The wall-clock date ("YYYY-MM-DD") and time ("HH:MM") of a moment in `timeZone`, for form inputs. */
export function utcToZonedLocal(iso: string, timeZone: string): { date: string; time: string } {
  const p = wallClock(new Date(iso), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}
