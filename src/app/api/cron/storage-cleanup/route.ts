import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/cron/auth";
import { getEnv } from "@/lib/env";
import { uploadsEnabled } from "@/lib/storage/availability";
import { deleteObject } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Objects handled per run; the queue is emptied over several days if it ever grows. */
const BATCH = 500;

/**
 * GET /api/cron/storage-cleanup — called once a day by Vercel Cron (vercel.json).
 *
 * The database queues the R2 key of every file row it deletes (a card purged from the
 * trash, an unfinished upload, a deleted project). This job deletes those objects from
 * R2 and removes them from the queue; a failure is retried on the next run.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"), getEnv().CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!uploadsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const admin = createSupabaseAdminClient();
  const { data: queued, error } = await admin
    .from("storage_deletions")
    .select("object_key, attempts")
    .order("queued_at")
    .limit(BATCH);
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  let deleted = 0;
  let failed = 0;
  for (const item of queued) {
    try {
      // Deleting an object that is already gone is not an error.
      await deleteObject(item.object_key);
      await admin.from("storage_deletions").delete().eq("object_key", item.object_key);
      deleted += 1;
    } catch {
      await admin
        .from("storage_deletions")
        .update({ attempts: item.attempts + 1 })
        .eq("object_key", item.object_key);
      failed += 1;
    }
  }

  return NextResponse.json({ deleted, failed });
}
