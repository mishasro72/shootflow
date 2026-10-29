import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Signs out and returns to the login page. POST only, so links and prefetches cannot log users out. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // 303 turns the POST into a GET of the login page.
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
