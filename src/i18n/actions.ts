"use server";

import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Remembers the chosen language in a cookie and, for a signed-in photographer,
 * in their profile so it follows them to other devices.
 */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ locale }).eq("id", user.id);
    }
  } catch {
    // Not configured (e.g. marketing page without Supabase) or signed out: cookie is enough.
  }
}
