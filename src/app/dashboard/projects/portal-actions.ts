"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPin, newSecretToken, pinSchema } from "@/lib/portal/secrets";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { getProject } from "./queries";

/**
 * The client link's secrets: its token and PIN. The photographer may not write these
 * columns (see the grants in the first migration), so these actions use the secret key.
 * Each one first loads the project through RLS: if this photographer cannot read it, the
 * action stops before the admin client is ever created.
 */

const projectId = z.uuid();

/** The project, if this photographer may manage it. */
async function ownProject(id: string) {
  if (!projectId.safeParse(id).success) return null;
  return getProject(id);
}

/** A new client link; the old one stops working at once. */
export async function rotatePortalLink(id: string): Promise<void> {
  const project = await ownProject(id);
  if (!project) return;

  await createSupabaseAdminClient().from("projects").update({ access_token: newSecretToken() }).eq("id", project.id);
  revalidatePath(`/dashboard/projects/${project.id}`);
}

export type PinFormState = { status: "idle" | "saved" | "invalid" | "error"; attempt: number };

/** Sets or changes the four-digit PIN. Also clears failed attempts and any lock. */
export async function setPortalPin(id: string, prev: PinFormState, formData: FormData): Promise<PinFormState> {
  const next = (status: PinFormState["status"]): PinFormState => ({ status, attempt: prev.attempt + 1 });

  const raw = formData.get("pin");
  const pin = pinSchema.safeParse(typeof raw === "string" ? raw.trim() : "");
  if (!pin.success) return next("invalid");

  const project = await ownProject(id);
  if (!project) return next("error");

  try {
    const { error } = await createSupabaseAdminClient()
      .from("projects")
      .update({ pin_hash: await hashPin(pin.data), pin_failed_attempts: 0, pin_locked_until: null })
      .eq("id", project.id);
    if (error) return next("error");
  } catch {
    return next("error");
  }

  revalidatePath(`/dashboard/projects/${project.id}`);
  return next("saved");
}

/** Removes the PIN: the link alone opens the page again. */
export async function clearPortalPin(id: string): Promise<void> {
  const project = await ownProject(id);
  if (!project) return;

  await createSupabaseAdminClient()
    .from("projects")
    .update({ pin_hash: null, pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", project.id);
  revalidatePath(`/dashboard/projects/${project.id}`);
}
