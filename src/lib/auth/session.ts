import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The signed-in user for this request, validated with Supabase Auth, or null. */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Like getCurrentUser, but sends signed-out visitors to the login page. */
export async function requireUser(nextPath: string = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/**
 * The photographer's profile, studio and role. Loaded through RLS, so it can only
 * ever return the signed-in user's own data.
 */
export const getPhotographerContext = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("id, name, email, locale, timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("role, workspace:workspaces (id, name, default_locale, default_retouch_limit)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const workspace = membershipResult.data?.workspace ?? null;
  if (!profile || !workspace) return null;

  return { user, profile, workspace, role: membershipResult.data?.role ?? "OWNER" };
});

/** Applies the photographer's saved language to this browser after sign-in. */
export async function applyProfileLocale(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("locale").eq("id", userId).maybeSingle();
  if (data && isLocale(data.locale)) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, data.locale, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
  }
}
