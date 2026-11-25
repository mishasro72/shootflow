import { formatShootDate, formatShootTime } from "@/lib/time/format";
import { utcToZonedLocal, zonedLocalToUtc } from "@/lib/time/zoned";

import { getDayLight, type TimeRange } from "./light";
import { openingMinute, sunTrack } from "./track";

/** One step of the sun over the day, for the shadow dial. */
export type SunStep = {
  /** Minutes since local midnight at the place. */
  minute: number;
  /** "2:15 PM" / "14:15" */
  time: string;
  /** Compass bearing of the sun, whole degrees. */
  bearing: number;
  /** Degrees above the horizon, one decimal. */
  altitude: number;
};

/** A place card's light on the shoot day, already written out in the place's time zone. */
export type PlaceLight = {
  /** "Saturday, November 14, 2026" */
  date: string;
  /** "6:52 – 7:40 AM", or `none` when the day has no such light. */
  morningGolden: string;
  eveningGolden: string;
  sunrise: string;
  sunset: string;
  /** The sun every 15 minutes while it is up; empty on a polar night. */
  sun: SunStep[];
  /** The step the shadow dial opens on: the shoot start, or the highest sun. */
  openAt: number | null;
};

/**
 * Light at a place on the shoot day. `date` is the shoot day ("YYYY-MM-DD") in the
 * project's time zone; times are shown in the place's own zone, since that is where
 * the sun is (a second location may be in another zone). `shootStart` (a moment, or
 * null when the shoot has no time) is where the shadow dial opens.
 */
export function placeLight(
  date: string,
  lat: number,
  lng: number,
  timeZone: string,
  locale: string,
  none: string,
  shootStart: string | null = null,
): PlaceLight {
  const light = getDayLight(date, lat, lng, timeZone);
  const span = (range: TimeRange | null) =>
    range ? formatShootTime(range.start.toISOString(), range.end.toISOString(), timeZone, locale) : none;
  const clock = (moment: Date | null) => (moment ? formatShootTime(moment.toISOString(), null, timeZone, locale) : none);
  const sun = sunTrack(date, lat, lng, timeZone).map((step) => ({
    minute: step.minute,
    time: clock(step.at),
    bearing: Math.round(step.bearing),
    altitude: Math.round(step.altitude * 10) / 10,
  }));
  const local = shootStart ? utcToZonedLocal(shootStart, timeZone).time : null;
  const shootMinute = local ? Number(local.slice(0, 2)) * 60 + Number(local.slice(3, 5)) : null;
  return {
    date: formatShootDate(zonedLocalToUtc(date, "12:00", timeZone).toISOString(), timeZone, locale),
    morningGolden: span(light.morningGolden),
    eveningGolden: span(light.eveningGolden),
    sunrise: clock(light.sunrise),
    sunset: clock(light.sunset),
    sun,
    openAt: openingMinute(sun, shootMinute),
  };
}
