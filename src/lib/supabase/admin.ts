import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

import type { Database } from "./database.types";

/** The secret key is not configured, so features that need it are switched off. */
export class AdminUnavailableError extends Error {}

/**
 * Supabase client with the secret key: it ignores RLS. Use it only after the caller has
 * proven access (a valid portal or feed token, or a project the photographer could read
 * through RLS), and always filter by that one project or studio.
 */
export function createSupabaseAdminClient() {
  const env = getEnv();
  if (!env.SUPABASE_SECRET_KEY) throw new AdminUnavailableError("SUPABASE_SECRET_KEY is not set");

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
