const UNITS = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;

/** 1536 → "1.5 kB" / "1,5 кБ", in the viewer's language. Uses 1024 per step, like file managers. */
export function formatBytes(bytes: number, locale: string): string {
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: UNITS[unit],
    unitDisplay: "short",
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}