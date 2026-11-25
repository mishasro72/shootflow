import { formatShootDate, formatShootTime } from "@/lib/time/format";
import { zonedLocalToUtc } from "@/lib/time/zoned";

import { getDayLight, type TimeRange } from "./light";

/** A place card's light on the shoot day, already written out in the place's time zone. */
export type PlaceLight = {
  /** "Saturday, November 14, 2026" */
  date: string;
  /** "6:52 – 7:40 AM", or `none` when the day has no such light. */
  morningGolden: string;
  eveningGolden: string;
  sunrise: string;
  sunset: string;
};

/**
 * Light at a place on the shoot day. `date` is the shoot day ("YYYY-MM-DD") in the
 * project's time zone; times are shown in the place's own zone, since that is where
 * the sun is (a second location may be in another zone).
 */
export function placeLight(
  date: string,
  lat: number,
  lng: number,
  timeZone: string,
  locale: string,
  none: string,
): PlaceLight {
  const light = getDayLight(date, lat, lng, timeZone);
  const span = (range: TimeRange | null) =>
    range ? formatShootTime(range.start.toISOString(), range.end.toISOString(), timeZone, locale) : none;
  const clock = (moment: Date | null) => (moment ? formatShootTime(moment.toISOString(), null, timeZone, locale) : none);
  return {
    date: formatShootDate(zonedLocalToUtc(date, "12:00", timeZone).toISOString(), timeZone, locale),
    morningGolden: span(light.morningGolden),
    eveningGolden: span(light.eveningGolden),
    sunrise: clock(light.sunrise),
    sunset: clock(light.sunset),
  };
}
