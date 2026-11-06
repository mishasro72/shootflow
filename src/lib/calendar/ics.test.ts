import { describe, expect, it } from "vitest";

import { zonedLocalToUtc } from "@/lib/time/zoned";

import { buildCalendar, escapeText, findTransitions, foldLine, type CalendarEvent } from "./ics";

const NOW = new Date("2026-11-06T12:00:00Z");
const bytes = (text: string) => new TextEncoder().encode(text).length;

const raleigh: CalendarEvent = {
  uid: "project-1@shootflow.test",
  start: zonedLocalToUtc("2026-11-14", "17:00", "America/New_York"),
  end: zonedLocalToUtc("2026-11-14", "19:00", "America/New_York"),
  timeZone: "America/New_York",
  summary: "Golden hour portraits · Anna",
  location: "Dix Park, 2105 Umstead Dr, Raleigh",
  description: "Project: https://shootflow.test/dashboard/projects/1",
  url: "https://shootflow.test/dashboard/projects/1",
};

describe("escapeText", () => {
  it("escapes the characters iCalendar treats as separators", () => {
    expect(escapeText("Studio; room 2, back\\door\nfloor 3")).toBe("Studio\\; room 2\\, back\\\\door\\nfloor 3");
  });
});

describe("foldLine", () => {
  it("keeps short lines as they are", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("folds long lines at 75 bytes without splitting a letter", () => {
    const line = `DESCRIPTION:${"Съёмка в парке на закате. ".repeat(8)}`;
    const folded = foldLine(line);
    const physical = folded.split("\r\n");
    expect(physical.length).toBeGreaterThan(1);
    for (const part of physical) expect(bytes(part)).toBeLessThanOrEqual(75);
    // Unfolding (dropping CRLF + space) gives the original line back.
    expect(folded.replaceAll("\r\n ", "")).toBe(line);
  });
});

describe("findTransitions", () => {
  it("finds both clock changes of 2026 in New York", () => {
    const changes = findTransitions(
      "America/New_York",
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-12-31T00:00:00Z"),
    );
    expect(changes).toEqual([
      { at: new Date("2026-03-08T07:00:00Z"), offsetFrom: -300, offsetTo: -240 },
      { at: new Date("2026-11-01T06:00:00Z"), offsetFrom: -240, offsetTo: -300 },
    ]);
  });

  it("finds nothing where the clocks never change", () => {
    expect(
      findTransitions("Asia/Yekaterinburg", new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T00:00:00Z")),
    ).toEqual([]);
  });
});

describe("buildCalendar", () => {
  const ics = buildCalendar([raleigh], { now: NOW });

  it("writes the shoot in its own time zone", () => {
    expect(ics).toContain("DTSTART;TZID=America/New_York:20261114T170000\r\n");
    expect(ics).toContain("DTEND;TZID=America/New_York:20261114T190000\r\n");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:America/New_York\r\n");
    expect(ics).toContain("TZOFFSETTO:-0500\r\n");
  });

  it("includes the event details, escaped", () => {
    expect(ics).toContain("UID:project-1@shootflow.test\r\n");
    expect(ics).toContain("DTSTAMP:20261106T120000Z\r\n");
    expect(ics).toContain("SUMMARY:Golden hour portraits · Anna\r\n");
    expect(ics).toContain("LOCATION:Dix Park\\, 2105 Umstead Dr\\, Raleigh\r\n");
    expect(ics).toContain("URL:https://shootflow.test/dashboard/projects/1\r\n");
  });

  it("is a well-formed file: CRLF everywhere, short lines", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(bytes(line)).toBeLessThanOrEqual(75);
  });

  it("covers a clock change between the margin and the shoot", () => {
    // 3 November: New York switched to winter time on 1 November, inside the week before.
    const early = buildCalendar(
      [{ ...raleigh, start: zonedLocalToUtc("2026-11-03", "17:00", "America/New_York"), end: null }],
      { now: NOW },
    );
    expect(early).toContain("BEGIN:DAYLIGHT");
    expect(early).toContain("TZOFFSETFROM:-0400\r\nTZOFFSETTO:-0500\r\n");
  });

  it("gives an event without an end one hour", () => {
    const single = buildCalendar([{ ...raleigh, end: null }], { now: NOW });
    expect(single).toContain("DTEND;TZID=America/New_York:20261114T180000\r\n");
  });

  it("writes one time zone block per zone in a feed, with the feed settings", () => {
    const tyumen: CalendarEvent = {
      ...raleigh,
      uid: "project-2@shootflow.test",
      start: zonedLocalToUtc("2026-12-01", "10:00", "Asia/Yekaterinburg"),
      end: null,
      timeZone: "Asia/Yekaterinburg",
    };
    const feed = buildCalendar([raleigh, tyumen], { name: "ShootFlow · Studio", refreshMinutes: 60, now: NOW });
    expect(feed.match(/BEGIN:VTIMEZONE/g)).toHaveLength(2);
    expect(feed).toContain("DTSTART;TZID=Asia/Yekaterinburg:20261201T100000\r\n");
    expect(feed).toContain("X-WR-CALNAME:ShootFlow · Studio\r\n");
    expect(feed).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT60M\r\n");
  });
});
