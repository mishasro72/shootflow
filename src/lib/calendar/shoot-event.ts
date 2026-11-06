import { getEnv } from "@/lib/env";

import type { CalendarEvent } from "./ics";

/** The project columns a calendar event is made of. Notes are never among them. */
export type ShootForCalendar = {
  id: string;
  title: string;
  shoot_start: string;
  shoot_end: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  location_map_url: string | null;
};

/** One shoot as a calendar event. The UID stays the same, so re-imports update it. */
export function shootEvent(
  shoot: ShootForCalendar,
  text: { summary: string; description: string; url: string },
): CalendarEvent {
  const host = new URL(getEnv().NEXT_PUBLIC_APP_URL).host;
  const location = [shoot.location_name, shoot.location_address].filter(Boolean).join(", ");
  return {
    uid: `project-${shoot.id}@${host}`,
    start: new Date(shoot.shoot_start),
    end: shoot.shoot_end ? new Date(shoot.shoot_end) : null,
    timeZone: shoot.timezone,
    summary: text.summary,
    location: location || null,
    description: text.description,
    url: text.url,
  };
}

/** A calendar file response. `filename` makes browsers download it instead of showing it. */
export function icsResponse(body: string, options: { filename?: string; maxAgeSeconds?: number } = {}): Response {
  const headers = new Headers({
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": `private, max-age=${options.maxAgeSeconds ?? 0}`,
    // The URLs carry secrets: keep them out of search engines.
    "X-Robots-Tag": "noindex",
  });
  if (options.filename) headers.set("Content-Disposition", `attachment; filename="${options.filename}"`);
  return new Response(body, { headers });
}
