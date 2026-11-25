"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { PlaceSearch } from "@/components/places/place-search";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { googleMapsUrl } from "@/lib/places/policy";
import type { PickedPlace } from "@/lib/places/types";

import { Field } from "./form-field";
import type { FieldError, ProjectField, ProjectFormValues } from "./schema";

type Props = {
  defaults: Pick<
    ProjectFormValues,
    "locationName" | "locationAddress" | "timezone" | "placeId" | "placeLat" | "placeLng"
  >;
  errors: Partial<Record<ProjectField, FieldError>>;
  timeZones: string[];
  /** False when the server has no Google key: the search is hidden, fields stay manual. */
  mapsEnabled: boolean;
};

type LinkedPlace = { id: string; lat: string; lng: string };

/**
 * The "Place" part of the project form: Google place search (PlaceSearch), then name,
 * address and time zone, which the search fills in and the photographer can still edit.
 * The picked place travels in hidden inputs: placeId, and its coordinates.
 */
export function LocationFields({ defaults, errors, timeZones, mapsEnabled }: Props) {
  const t = useTranslations("ProjectForm");

  const [name, setName] = useState(defaults.locationName);
  const [address, setAddress] = useState(defaults.locationAddress);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [zones, setZones] = useState(timeZones);
  const [place, setPlace] = useState<LinkedPlace | null>(
    defaults.placeId ? { id: defaults.placeId, lat: defaults.placeLat, lng: defaults.placeLng } : null,
  );

  function pick(picked: PickedPlace, fallbackName: string) {
    setName(picked.name || fallbackName);
    setAddress(picked.address);
    if (picked.timeZone) {
      const zone = picked.timeZone;
      setZones((list) => (list.includes(zone) ? list : [...list, zone].sort()));
      setTimezone(zone);
    }
    setPlace({ id: picked.placeId, lat: String(picked.lat), lng: String(picked.lng) });
  }

  /** Shared wiring for the visible inputs: id, name and error state. */
  const wiring = (field: ProjectField) => ({
    id: field,
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <>
      {mapsEnabled && <PlaceSearch onPick={pick} />}

      {place && (
        <div
          data-testid="place-linked"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm"
        >
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">{t("placeLinked")}</span>
          <a
            href={googleMapsUrl(name, place.id)}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {t("placeOpenMap")}
          </a>
          <button
            type="button"
            onClick={() => setPlace(null)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("placeUnlink")}
          </button>
        </div>
      )}
      <input type="hidden" name="placeId" value={place?.id ?? ""} />
      <input type="hidden" name="placeLat" value={place?.lat ?? ""} />
      <input type="hidden" name="placeLng" value={place?.lng ?? ""} />

      <Field label={t("locationName")} name="locationName" error={errors.locationName}>
        <Input
          {...wiring("locationName")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          placeholder={t("locationNamePlaceholder")}
        />
      </Field>
      <Field label={t("locationAddress")} name="locationAddress" error={errors.locationAddress}>
        <Input
          {...wiring("locationAddress")}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          maxLength={300}
          autoComplete="street-address"
        />
      </Field>
      <Field label={t("timezone")} name="timezone" error={errors.timezone} hint={t("timezoneHint")}>
        <NativeSelect {...wiring("timezone")} value={timezone} onChange={(event) => setTimezone(event.target.value)}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </>
  );
}
