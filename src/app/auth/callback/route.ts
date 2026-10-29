import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { applyProfileLocale } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for links from Supabase emails (magic link, sign-up confirmation).
 * Exchanges the one-time code for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await applyProfileLocale(data.user.id);
      return NextResponse.redirect(new URL(next, origin));
    }

    // The link was opened in a different browser than the one that requested it (for
    // example in a mail app), so the one-time verifier cookie is missing. Supabase has
    // already confirmed the address at this point; the person just needs to sign in here.
    if (error && isOtherBrowserError(error)) {
      const login = new URL("/login", origin);
      login.searchParams.set("notice", "other-browser");
      if (next !== "/dashboard") login.searchParams.set("next", next);
      return NextResponse.redirect(login);
    }
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "link");
  return NextResponse.redirect(login);
}

function isOtherBrowserError(error: { code?: string; name?: string }): boolean {
  return (
    error.code === "pkce_code_verifier_not_found" ||
    error.code === "bad_code_verifier" ||
    error.name === "AuthPKCECodeVerifierMissingError"
  );
}
