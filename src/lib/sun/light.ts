import SunCalc from "suncalc";

import { zonedLocalToUtc } from "@/lib/time/zoned";

/**
 * Natural light for a shoot day, the way photographers count it (as on timeanddate.com):
 * golden hour while the sun is between −4° and +6°, blue hour between −6° and −4°.
 * suncalc already knows +6° ("goldenHourEnd" / "goldenHour") and −6° ("dawn" / "dusk");
 * the −4° moments are added once, here.
 */
SunCalc.addTime(-4, "minus4Morning", "minus4Evening");

export type TimeRange = { start: Date; end: Date };

export type DayLight = {
  sunrise: Date | null;
  sunset: Date | null;
  morningBlue: TimeRange | null;
  morningGolden: TimeRange | null;
  eveningGolden: TimeRange | null;
  eveningBlue: TimeRange | null;
};

/** suncalc returns an Invalid Date when the sun never reaches an angle (polar day or night). */
const valid = (date: Date | undefined): Date | null => (date && !Number.isNaN(date.getTime()) ? date : null);

const range = (start: Date | null, end: Date | null): TimeRange | null =>
  start && end && start < end ? { start, end } : null;

/**
 * Light for `date` ("YYYY-MM-DD", the shoot day in the project's time zone) at a place.
 * suncalc picks the solar day nearest to the moment it is given, so we pass local noon.
 */
export function getDayLight(date: string, lat: number, lng: number, timeZone: string): DayLight {
  const noon = zonedLocalToUtc(date, "12:00", timeZone);
  // The two −4° times are not in suncalc's types, so we read the result as a plain record.
  const times = SunCalc.getTimes(noon, lat, lng) as unknown as Record<string, Date | undefined>;
  const at = (name: string) => valid(times[name]);

  return {
    sunrise: at("sunrise"),
    sunset: at("sunset"),
    morningBlue: range(at("dawn"), at("minus4Morning")),
    morningGolden: range(at("minus4Morning"), at("goldenHourEnd")),
    eveningGolden: range(at("goldenHour"), at("minus4Evening")),
    eveningBlue: range(at("minus4Evening"), at("dusk")),
  };
}

export type GoldenAdvice = { window: "morning" | "evening"; range: TimeRange };

/**
 * Null when the shoot already touches a golden hour (or the day has none). Otherwise the
 * golden hour whose start is closest to the planned start, as a suggestion to move it.
 * A shoot without an end time counts as one minute long.
 */
export function goldenHourAdvice(light: DayLight, start: Date, end: Date | null): GoldenAdvice | null {
  const windows: GoldenAdvice[] = [];
  if (light.morningGolden) windows.push({ window: "morning", range: light.morningGolden });
  if (light.eveningGolden) windows.push({ window: "evening", range: light.eveningGolden });
  if (windows.length === 0) return null;

  const from = start.getTime();
  const to = end ? end.getTime() : from + 60_000;
  const overlaps = windows.some(({ range: r }) => from < r.end.getTime() && to > r.start.getTime());
  if (overlaps) return null;

  const distance = (advice: GoldenAdvice) => Math.abs(advice.range.start.getTime() - from);
  return windows.reduce((best, next) => (distance(next) < distance(best) ? next : best));
}

/** Moves the shoot to `newStart`, keeping its length. */
export function moveShoot(start: Date, end: Date | null, newStart: Date): { start: Date; end: Date | null } {
  return {
    start: newStart,
    end: end ? new Date(newStart.getTime() + (end.getTime() - start.getTime())) : null,
  };
}