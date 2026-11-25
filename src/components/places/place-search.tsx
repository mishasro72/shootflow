"use client";

import { Loader2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PickedPlace, PlaceSuggestion } from "@/lib/places/types";
import { cn } from "@/lib/utils";

type SearchStatus = "idle" | "loading" | "done" | "error";

/** Wait this long after the last keystroke before asking Google (each request costs). */
const DEBOUNCE_MS = 300;
const MIN_QUERY = 3;

/**
 * Google place search: a combobox that suggests places as one types (our
 * /api/places/autocomplete), then asks for the picked place's details and hands them to
 * `onPick` (with the suggestion's text, in case Google has no name). Used by the project
 * form and by place cards on the board. Keyboard: arrows, Enter, Escape.
 */
export function PlaceSearch({ onPick }: { onPick: (place: PickedPlace, fallbackName: string) => void }) {
  const t = useTranslations("ProjectForm");
  const locale = useLocale();
  const searchId = useId();
  const listId = `${searchId}-list`;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [active, setActive] = useState(-1);

  // One session token covers the keystrokes and the final details request (one bill).
  const session = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef<AbortController | null>(null);

  // Stop a pending search when the form goes away.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  function cancelSearch() {
    clearTimeout(timer.current);
    request.current?.abort();
  }

  function search(text: string) {
    setQuery(text);
    setActive(-1);
    cancelSearch();
    if (text.trim().length < MIN_QUERY) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    timer.current = setTimeout(async () => {
      session.current ??= crypto.randomUUID();
      const controller = new AbortController();
      request.current = controller;
      try {
        const params = new URLSearchParams({ q: text.trim(), session: session.current, lang: locale });
        const response = await fetch(`/api/places/autocomplete?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`autocomplete ${response.status}`);
        const data = (await response.json()) as { suggestions: PlaceSuggestion[] };
        setSuggestions(data.suggestions);
        setStatus("done");
      } catch {
        // An aborted request was replaced by a newer one: nothing to show.
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setStatus("error");
        }
      }
    }, DEBOUNCE_MS);
  }

  async function pick(suggestion: PlaceSuggestion) {
    cancelSearch();
    setStatus("loading");
    const params = new URLSearchParams({ id: suggestion.placeId, lang: locale });
    if (session.current) params.set("session", session.current);
    // The details request ends the session; the next search starts a new one.
    session.current = null;

    try {
      const response = await fetch(`/api/places/details?${params}`);
      if (!response.ok) throw new Error(`details ${response.status}`);
      onPick((await response.json()) as PickedPlace, suggestion.mainText);
      setQuery("");
      setSuggestions([]);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const listOpen = status === "done" || (status === "loading" && suggestions.length > 0);

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter in the search box must never submit the whole form.
    if (event.key === "Enter") {
      event.preventDefault();
      const choice = suggestions[active] ?? suggestions[0];
      if (listOpen && choice) void pick(choice);
      return;
    }
    if (!listOpen || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setStatus("idle");
    }
  }

  return (
    <div className="relative flex flex-col gap-2">
      <Label htmlFor={searchId}>{t("placeSearch")}</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={searchId}
          type="search"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={t("placeSearchPlaceholder")}
          onChange={(event) => search(event.target.value)}
          onKeyDown={onSearchKeyDown}
          onBlur={() => setStatus((current) => (current === "done" ? "idle" : current))}
          className="pl-9"
        />
        {status === "loading" && (
          <Loader2
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      {listOpen && (
        <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestions.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={t("placeSearch")}>
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.placeId}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown would blur the input first and close the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void pick(suggestion)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer flex-col px-3 py-2 text-sm",
                    index === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="font-medium">{suggestion.mainText}</span>
                  {suggestion.secondaryText && (
                    <span className="text-xs text-muted-foreground">{suggestion.secondaryText}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("placeNoResults")}</p>
          )}
          {/* Google requires attribution wherever Places results are shown without its map. */}
          <p className="border-t px-3 py-1.5 text-right text-xs text-muted-foreground">{t("poweredBy")}</p>
        </div>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("placeError")}
        </p>
      )}
    </div>
  );
}
