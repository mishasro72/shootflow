/**
 * All IANA time zones the runtime knows, sorted, always including `current`
 * (so an old or unusual saved value still shows up in the list).
 */
export function listTimeZones(current?: string): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add("UTC");
  if (current) zones.add(current);
  return [...zones].sort();
}
