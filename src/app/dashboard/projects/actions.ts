"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPhotographerContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  parseProjectForm,
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

export async function createProject(prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = readProjectForm(formData);
  const fail = failWith(prev, values);

  const parsed = parseProjectForm(values);
  if (!parsed.ok) return fail({ errors: parsed.errors });

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
    .insert({ ...parsed.project, workspace_id: workspaceId })
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

export async function updateProject(
  id: string,
  prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const values = readProjectForm(formData);
  const fail = failWith(prev, values);

  if (!projectId.safeParse(id).success) return fail({ formError: "unexpected" });
  const parsed = parseProjectForm(values);
  if (!parsed.ok) return fail({ errors: parsed.errors });

  const supabase = await createSupabaseServerClient();

  // RLS makes another studio's project invisible, so "no row updated" covers both
  // "does not exist" and "not yours".
  const { data: project, error } = await supabase
    .from("projects")
    .update(parsed.project)
    .eq("id", id)
    .select("id, workspace_id")
    .maybeSingle();
  if (error || !project) return fail({ formError: "unexpected" });

  const clientResult = parsed.client
    ? await supabase
        .from("project_clients")
        .upsert(
          { project_id: id, workspace_id: project.workspace_id, ...parsed.client },
          { onConflict: "project_id" },
        )
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
