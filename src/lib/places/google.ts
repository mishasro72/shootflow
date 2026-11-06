import "server-only";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import type { PlaceSuggestion } from "./types";

/**
 * A thin client for Places API (New). It runs only on the server, so the API key never
 * reaches the browser. Docs: https://developers.google.com/maps/documentation/places/web-service
 */
const API = "https://places.googleapis.com/v1";

/** The key is not configured: the app works, just without place search. */
export class PlacesUnavailableError extends Error {}

function apiKey(): string {
  const key = getEnv().GOOGLE_MAPS_API_KEY;
  if (!key) throw new PlacesUnavailableError("GOOGLE_MAPS_API_KEY is not set");
  return key;
}

const text = z.object({ text: z.string() });

const autocompleteResponse = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string(),
            text: text.optional(),
            structuredFormat: z.object({ mainText: text, secondaryText: text.optional() }).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

/**
 * Suggestions for what the photographer typed. `sessionToken` groups the keystrokes and
 * the final details request into one billable session.
 */
export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  languageCode: string,
): Promise<PlaceSuggestion[]> {
  const response = await fetch(`${API}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      // Ask only for the fields we show: Google bills by the fields requested.
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({ input, sessionToken, languageCode }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Places autocomplete failed with ${response.status}`);

  const data = autocompleteResponse.parse(await response.json());
  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p
      ? [
          {
            placeId: p.placeId,
            mainText: p.structuredFormat?.mainText.text ?? p.text?.text ?? "",
            secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
          },
        ]
      : [],
  );
}

const detailsResponse = z.object({
  id: z.string(),
  displayName: text.optional(),
  formattedAddress: z.string().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
});

export type PlaceDetails = { placeId: string; name: string; address: string; lat: number; lng: number };

/**
 * Name, address and coordinates of a place, or null if Google no longer knows it.
 * `locationOnly` asks for the coordinates alone (the cheapest request), for refreshing.
 */
export async function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; languageCode?: string; locationOnly?: boolean } = {},
): Promise<PlaceDetails | null> {
  const url = new URL(`${API}/places/${encodeURIComponent(placeId)}`);
  if (options.sessionToken) url.searchParams.set("sessionToken", options.sessionToken);
  if (options.languageCode) url.searchParams.set("languageCode", options.languageCode);

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": options.locationOnly ? "id,location" : "id,displayName,formattedAddress,location",
    },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Place details failed with ${response.status}`);

  const data = detailsResponse.parse(await response.json());
  return {
    placeId: data.id,
    name: data.displayName?.text ?? "",
    address: data.formattedAddress ?? "",
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}
