import "server-only";

import { getEnv } from "@/lib/env";

import { isStorageConfigured } from "./r2";

/**
 * Uploads need both R2 (for the bytes) and the Supabase secret key (only the server may
 * mark an upload as finished). Without either, the upload UI is hidden.
 */
export function uploadsEnabled(): boolean {
  return isStorageConfigured() && Boolean(getEnv().SUPABASE_SECRET_KEY);
}