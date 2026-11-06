"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPhotographerContext } from "@/lib/auth/session";
import { getDayLight, goldenHourAdvice, moveShoot } from "@/lib/sun/light";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { utcToZonedLocal } from "@/lib/time/zoned";

import { getFreshCoords } from "./place-coords";
import { getProject } from "./queries";
import {
  HIDDEN_FIELDS,
  parseProjectForm,
  placeColumns,
  readProjectForm,
  type FieldError,
  type ProjectField,
  type ProjectFormValues,
} from "./schema";

/** What the form shows after a submit that did not redirect. */
export type ProjectFormState =
  | { status: "idle"; attempt: number }
  | {
      status: "error";
      /** Grows on every failed submit; the form uses it to re-render with `values`. */
      attempt: number;
      values: ProjectFormValues;
      errors: Partial<Record<ProjectField, FieldError>>;
      /** A problem not tied to one field. */
      formError?: "quota" | "unexpected";
    };

const projectId = z.uuid();

type Failure = { errors?: Partial<Record<ProjectField, FieldError>>; formError?: "quota" | "unexpected" };

/** Builds the error state for one submit, keeping what the photographer typed. */
function failWith(prev: ProjectFormState, values: ProjectFormValues) {
  return ({ errors = {}, formError }: Failure): ProjectFormState => ({
    status: "error",
    attempt: prev.attempt + 1,
    values,
    errors,
    formError,
  });
}

/** Field errors, plus a general message when a hidden field is wrong (it has no place on screen). */
function invalidForm(errors: Partial<Record<ProjectField, FieldError>>): Failure {
  const hidden = HIDDEN_FIELDS.some((field) => errors[field]);
  return { errors, formError: hidden ? "unexpected" : undefined };
}

export async function createProject(prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = readProjectForm(formData);
  const fail = failWith(prev, values);

  const parsed = parseProjectForm(values);
  if (!parsed.ok) return fail(invalidForm(parsed.errors));

  const context = await getPhotographerContext();
  if (!context) redirect("/login");
  const workspaceId = context.workspace.id;
  const supabase = await createSupabaseServerClient();

  // Plan quota: how many active (not archived) projects this studio may have.
  const [{ count }, { data: workspace }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("workspaces").select("plan:plans (max_active_projects)").eq("id", workspaceId).single(),
  ]);
  const limit = workspace?.plan?.max_active_projects;
  if (limit !== undefined && count !== null && count >= limit) return fail({ formError: "quota" });

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      ...parsed.project,
      ...placeColumns(parsed.project, parsed.pickedCoords, null),
      workspace_id: workspaceId,
    })
    .select("id")
    .single();
  if (error || !project) return fail({ formError: "unexpected" });

  if (parsed.client) {
    // workspace_id is overwritten by a database trigger from the project; we pass it
    // only because the column is required.
    const { error: clientError } = await supabase
      .from("project_clients")
      .insert({ project_id: project.id, workspace_id: workspaceId, ...parsed.client });
    if (clientError) return fail({ formError: "unexpected" });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${project.id}`);
}

export async function updateProject(id: string, prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = readProjectForm(formData);
  const fail = failWith(prev, values);

  if (!projectId.safeParse(id).success) return fail({ formError: "unexpected" });
  const parsed = parseProjectForm(values);
  if (!parsed.ok) return fail(invalidForm(parsed.errors));

  const supabase = await createSupabaseServerClient();

  // The saved place decides whether its coordinates can stay (see placeColumns).
  // RLS makes another studio's project invisible, so "no row" covers "not yours" too.
  const { data: saved } = await supabase.from("projects").select("google_place_id").eq("id", id).maybeSingle();
  if (!saved) return fail({ formError: "unexpected" });

  const { data: project, error } = await supabase
    .from("projects")
    .update({ ...parsed.project, ...placeColumns(parsed.project, parsed.pickedCoords, saved.google_place_id) })
    .eq("id", id)
    .select("id, workspace_id")
    .maybeSingle();
  if (error || !project) return fail({ formError: "unexpected" });

  const clientResult = parsed.client
    ? await supabase
        .from("project_clients")
        .upsert({ project_id: id, workspace_id: project.workspace_id, ...parsed.client }, { onConflict: "project_id" })
    : await supabase.from("project_clients").delete().eq("project_id", id);
  if (clientResult.error) return fail({ formError: "unexpected" });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}`);
  redirect(`/dashboard/projects/${id}`);
}

/** Hides a project from the list. The data stays; archived_at only marks it. */
export async function archiveProject(id: string): Promise<void> {
  if (!projectId.safeParse(id).success) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("projects").update({ archived_at: new Date().toISOString() }).eq("id", id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/**
 * "Start at 16:31": moves the shoot to the golden hour the project page suggests,
 * keeping its length. Everything is recomputed here; the button sends only the id.
 */
export async function shiftToGoldenHour(id: string): Promise<void> {
  if (!projectId.safeParse(id).success) return;

  const project = await getProject(id);
  if (!project?.shoot_start) return;
  const coords = await getFreshCoords(project);
  if (!coords) return;

  const { date } = utcToZonedLocal(project.shoot_start, project.timezone);
  const light = getDayLight(date, coords.lat, coords.lng, project.timezone);
  const start = new Date(project.shoot_start);
  const end = project.shoot_end ? new Date(project.shoot_end) : null;
  const advice = goldenHourAdvice(light, start, end);
  if (!advice) return;

  const moved = moveShoot(start, end, advice.range.start);
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("projects")
    .update({ shoot_start: moved.start.toISOString(), shoot_end: moved.end?.toISOString() ?? null })
    .eq("id", id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${id}`);
}
