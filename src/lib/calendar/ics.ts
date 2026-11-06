import { timeZoneOffsetMinutes, utcToZonedLocal } from "@/lib/time/zoned";

/**
 * A tiny iCalendar (RFC 5545) writer: just what shoot events need. Times are written in the
 * project's own time zone (DTSTART;TZID=...), with a VTIMEZONE block that spells out that
 * zone's UTC offsets, so every calendar app shows 17:00 in Raleigh as 17:00 in Raleigh.
 */

export type CalendarEvent = {
  /** Stable and unique: calendar apps use it to update an event instead of adding a copy. */
  uid: string;
  start: Date;
  /** Null: the event lasts DEFAULT_LENGTH_MINUTES. */
  end: Date | null;
  timeZone: string;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

export type CalendarOptions = {
  /** Calendar name shown for subscribed feeds (X-WR-CALNAME). */
  name?: string;
  /** How often subscribed apps should check for changes. */
  refreshMinutes?: number;
  /** The moment the file is made (DTSTAMP); tests pass a fixed one. */
  now?: Date;
};

export const DEFAULT_LENGTH_MINUTES = 60;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const CRLF = "\r\n";

/** Text values escape backslashes, semicolons, commas and line breaks. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * Lines longer than 75 bytes are folded: the rest continues on the next line after one space.
 * The limit counts UTF-8 bytes, and a letter is never cut in half (Cyrillic takes 2 bytes).
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74; // the leading space of a continuation line counts too
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** 2026-11-14T22:00:00.000Z → "20261114T220000Z". */
function formatUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Wall-clock time in `timeZone` without a zone mark: "20261114T170000". */
function formatLocal(date: Date, timeZone: string): string {
  const { date: day, time } = utcToZonedLocal(date.toISOString(), timeZone);
  return `${day.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

/** A moment shifted by an offset, printed as plain wall-clock time: "20260308T020000". */
function formatShifted(date: Date, offsetMinutes: number): string {
  return formatUtc(new Date(date.getTime() + offsetMinutes * MINUTE_MS)).replace("Z", "");
}

/** -300 → "-0500", 330 → "+0530". */
function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

export type Transition = { at: Date; offsetFrom: number; offsetTo: number };

/**
 * Moments between `from` and `to` when `timeZone` changes its UTC offset (summer/winter
 * time). Walks day by day, then narrows each change down to the minute.
 */
export function findTransitions(timeZone: string, from: Date, to: Date): Transition[] {
  const transitions: Transition[] = [];
  let previous = Math.floor(from.getTime() / MINUTE_MS) * MINUTE_MS;
  let previousOffset = timeZoneOffsetMinutes(new Date(previous), timeZone);

  for (let day = previous + DAY_MS; day <= to.getTime() + DAY_MS; day += DAY_MS) {
    const offset = timeZoneOffsetMinutes(new Date(day), timeZone);
    if (offset !== previousOffset) {
      // Binary search: `low` still has the old offset, `high` already has the new one.
      let low = previous;
      let high = day;
      while (high - low > MINUTE_MS) {
        const middle = low + Math.floor((high - low) / 2 / MINUTE_MS) * MINUTE_MS;
        if (timeZoneOffsetMinutes(new Date(middle), timeZone) === previousOffset) low = middle;
        else high = middle;
      }
      transitions.push({ at: new Date(high), offsetFrom: previousOffset, offsetTo: offset });
      previousOffset = offset;
    }
    previous = day;
  }
  return transitions;
}

/**
 * VTIMEZONE for `timeZone` between `from` and `to`: the offset in force at `from`, then
 * every switch in the range. The smallest offset is "standard" time, larger ones "daylight".
 */
function timeZoneBlock(timeZone: string, from: Date, to: Date): string[] {
  const startOffset = timeZoneOffsetMinutes(from, timeZone);
  const transitions = findTransitions(timeZone, from, to);
  const standardOffset = Math.min(startOffset, ...transitions.map((t) => t.offsetTo));

  const lines = ["BEGIN:VTIMEZONE", `TZID:${timeZone}`];
  const observance = (at: Date, offsetFrom: number, offsetTo: number) => {
    const kind = offsetTo > standardOffset ? "DAYLIGHT" : "STANDARD";
    lines.push(
      `BEGIN:${kind}`,
      // The local time when the rule starts, on the clock that was in force before it.
      `DTSTART:${formatShifted(at, offsetFrom)}`,
      `TZOFFSETFROM:${formatOffset(offsetFrom)}`,
      `TZOFFSETTO:${formatOffset(offsetTo)}`,
      `END:${kind}`,
    );
  };
  observance(from, startOffset, startOffset);
  for (const t of transitions) observance(t.at, t.offsetFrom, t.offsetTo);
  lines.push("END:VTIMEZONE");
  return lines;
}

const endOf = (event: CalendarEvent) =>
  event.end ?? new Date(event.start.getTime() + DEFAULT_LENGTH_MINUTES * MINUTE_MS);

/** A whole .ics file: one VTIMEZONE per zone used, then the events. Lines end with CRLF. */
export function buildCalendar(events: CalendarEvent[], options: CalendarOptions = {}): string {
  const now = options.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShootFlow//Shoot calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (options.name) lines.push(`X-WR-CALNAME:${escapeText(options.name)}`);
  if (options.refreshMinutes) {
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${options.refreshMinutes}M`);
    lines.push(`X-PUBLISHED-TTL:PT${options.refreshMinutes}M`);
  }

  // The span each zone has to cover, with a week of margin on both sides.
  const spans = new Map<string, { from: number; to: number }>();
  for (const event of events) {
    const span = spans.get(event.timeZone);
    const from = event.start.getTime() - 7 * DAY_MS;
    const to = endOf(event).getTime() + 7 * DAY_MS;
    spans.set(event.timeZone, span ? { from: Math.min(span.from, from), to: Math.max(span.to, to) } : { from, to });
  }
  for (const [timeZone, span] of spans) {
    lines.push(...timeZoneBlock(timeZone, new Date(span.from), new Date(span.to)));
  }

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${formatUtc(now)}`,
      `DTSTART;TZID=${event.timeZone}:${formatLocal(event.start, event.timeZone)}`,
      `DTEND;TZID=${event.timeZone}:${formatLocal(endOf(event), event.timeZone)}`,
      `SUMMARY:${escapeText(event.summary)}`,
    );
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    // URL values are not text: they are written as they are.
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
