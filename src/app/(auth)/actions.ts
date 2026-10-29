"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { applyProfileLocale } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; error: AuthErrorKey; email?: string }
  | { status: "sent"; email: string };

const email = z.email().max(320).transform((value) => value.trim().toLowerCase());
const password = z.string().min(8).max(72);

function callbackUrl(next: string): string {
  const url = new URL("/auth/callback", getEnv().NEXT_PUBLIC_APP_URL);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signInWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ email, password: z.string().min(1).max(72) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { status: "error", error: authErrorKey(error), email: parsed.data.email };
  }

  await applyProfileLocale(data.user.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function sendMagicLink(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: callbackUrl(safeNextPath(formData.get("next"))),
      // A magic link also works as sign-up; the studio is created by the database.
      shouldCreateUser: true,
      data: { locale: await getLocale() },
    },
  });
  if (error) return { status: "error", error: authErrorKey(error), email: parsed.data };

  return { status: "sent", email: parsed.data };
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(120), email, password })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) {
    const weak = parsed.error.issues.some((issue) => issue.path[0] === "password");
    return { status: "error", error: weak ? "weakPassword" : "invalidInput" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl("/dashboard"),
      data: { name: parsed.data.name, locale: await getLocale() },
    },
  });
  if (error) return { status: "error", error: authErrorKey(error), email: parsed.data.email };

  // With email confirmation off (local development) the user is signed in at once.
  if (data.session) redirect("/dashboard");

  // Supabase returns a user with no identities when the address is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { status: "error", error: "userExists", email: parsed.data.email };
  }

  return { status: "sent", email: parsed.data.email };
}
