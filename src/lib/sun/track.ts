import SunCalc from "suncalc";

import { zonedLocalToUtc } from "@/lib/time/zoned";

/** How often the sun's position is sampled over the day, in minutes. */
export const TRACK_STEP_MINUTES = 15;

/** A person, for the "shadow of a person" line: 1.7 m. */
export const PERSON_HEIGHT_M = 1.7;

/** Below this height of the sun a shadow is too long to be worth a number. */
export const LOW_SUN_DEGREES = 3;

export type SunPosition = {
  /** Minutes since local midnight at the place: 0–1439. */
  minute: number;
  at: Date;
  /** Where the sun stands, as a compass bearing: 0 = north, 90 = east, clockwise. */
  bearing: number;
  /** Height of the sun above the horizon, in degrees. */
  altitude: number;
};

const DEGREES = 180 / Math.PI;

const clock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/**
 * The sun over `date` ("YYYY-MM-DD", local to `timeZone`) at a place, every 15 minutes
 * while it is above the horizon. Empty on a polar night; the whole day on a polar day.
 */
export function sunTrack(date: string, lat: number, lng: number, timeZone: string): SunPosition[] {
  const track: SunPosition[] = [];
  for (let minute = 0; minute < 24 * 60; minute += TRACK_STEP_MINUTES) {
    const at = zonedLocalToUtc(date, clock(minute), timeZone);
    // suncalc measures azimuth from south, westward; a compass counts from north, eastward.
    const { azimuth, altitude } = SunCalc.getPosition(at, lat, lng);
    const height = altitude * DEGREES;
    if (height <= 0) continue;
    track.push({
      minute,
      at,
      bearing: (azimuth * DEGREES + 180 + 360) % 360,
      altitude: height,
    });
  }
  return track;
}

/** A shadow falls away from the sun. */
export const shadowBearing = (sunBearing: number) => (sunBearing + 180) % 360;

export type CompassPoint = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const POINTS: CompassPoint[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** The nearest of the eight compass points: 0–22.4° is north, 22.5–67.4° north-east, … */
export const compassPoint = (bearing: number): CompassPoint =>
  POINTS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];

/** Length of the shadow of something `height` tall; null when the sun is below the horizon. */
export function shadowLength(altitude: number, height: number): number | null {
  if (altitude <= 0) return null;
  return height / Math.tan(altitude / DEGREES);
}

/**
 * The sample the dial opens on: the one nearest to the shoot start (`minute` since local
 * midnight), or the highest sun of the day when the shoot has no time yet.
 */
export function openingMinute(
  track: { minute: number; altitude: number }[],
  shootMinute: number | null,
): number | null {
  if (track.length === 0) return null;
  if (shootMinute === null) return track.reduce((best, next) => (next.altitude > best.altitude ? next : best)).minute;
  return track.reduce((best, next) =>
    Math.abs(next.minute - shootMinute) < Math.abs(best.minute - shootMinute) ? next : best,
  ).minute;
}
