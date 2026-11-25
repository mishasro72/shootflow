"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { SunStep } from "@/lib/sun/place-light";
import { compassPoint, LOW_SUN_DEGREES, PERSON_HEIGHT_M, shadowBearing, shadowLength } from "@/lib/sun/track";

const FEET_PER_METRE = 3.28084;

/** "2.3 m" / "2,3 м", or feet in English: "7.6 ft". Whole units from 10 up. */
function formatLength(metres: number, locale: string): string {
  const feet = locale.startsWith("en");
  const value = feet ? metres * FEET_PER_METRE : metres;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: feet ? "foot" : "meter",
    unitDisplay: "short",
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

/** A point `r` from the centre of the 120×120 dial, at a compass bearing. */
function onDial(bearing: number, r: number) {
  const angle = (bearing * Math.PI) / 180;
  return { x: 60 + r * Math.sin(angle), y: 60 - r * Math.cos(angle) };
}

/**
 * Where the sun stands and where a person's shadow falls at a place, through the shoot day.
 * North is up, as on the map. The positions are worked out on the server; the slider only
 * picks one of them, so nothing here depends on the viewer's own clock or time zone.
 */
export function ShadowDial({ sun, openAt }: { sun: SunStep[]; openAt: number | null }) {
  const t = useTranslations("Board");
  const locale = useLocale();
  const [minute, setMinute] = useState(openAt ?? sun[0]?.minute ?? 0);

  const first = sun[0];
  if (!first) {
    return <p className="text-xs text-muted-foreground">{t("shadowNoSun")}</p>;
  }

  const last = sun.at(-1) ?? first;
  const stepMinutes = sun[1] ? sun[1].minute - first.minute : 15;
  const step = sun.find((s) => s.minute === minute) ?? first;
  const length = shadowLength(step.altitude, PERSON_HEIGHT_M);
  const toward = shadowBearing(step.bearing);
  const sunText = t("shadowSun", {
    from: t(`sunFrom.${compassPoint(step.bearing)}`),
    altitude: Math.round(step.altitude),
  });
  const castText = t("shadowCast", {
    direction: t(`shadowTo.${compassPoint(toward)}`),
    length: step.altitude < LOW_SUN_DEGREES || length === null ? t("shadowVeryLong") : formatLength(length, locale),
  });

  // The drawn shadow: a person is 14 px tall on the dial; very long shadows stop at the rim.
  const tip = onDial(toward, Math.min(46, 14 * ((length ?? 100) / PERSON_HEIGHT_M)));
  const sunDot = onDial(step.bearing, 50);

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted px-3 py-2 text-xs" data-testid="place-shadow">
      <p className="font-medium">{t("shadowTitle", { time: step.time })}</p>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 120 120" className="size-24 shrink-0" role="img" aria-label={`${sunText} ${castText}`}>
          <circle cx="60" cy="60" r="50" className="fill-background stroke-border" strokeWidth="1.5" />
          <text x="60" y="20" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            {t("shadowNorth")}
          </text>
          {[90, 180, 270].map((bearing) => {
            const a = onDial(bearing, 50);
            const b = onDial(bearing, 44);
            return (
              <line key={bearing} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth="1.5" />
            );
          })}
          <line
            x1="60"
            y1="60"
            x2={tip.x}
            y2={tip.y}
            className="stroke-foreground/60"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="60" cy="60" r="4" className="fill-foreground" />
          <circle cx={sunDot.x} cy={sunDot.y} r="7" className="fill-amber-400 stroke-amber-600" strokeWidth="1.5" />
        </svg>
        <div className="flex min-w-0 flex-col gap-1">
          <p>{sunText}</p>
          <p>{castText}</p>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">{t("shadowTime")}</span>
        <input
          type="range"
          min={first.minute}
          max={last.minute}
          step={stepMinutes}
          value={step.minute}
          aria-valuetext={step.time}
          onChange={(event) => setMinute(Number(event.target.value))}
          className="w-full accent-foreground"
        />
      </label>
      <p className="text-muted-foreground">{t("shadowNote")}</p>
    </div>
  );
}
