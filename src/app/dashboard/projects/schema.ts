import { z } from "zod";

import { isValidTimeZone, utcToZonedLocal, zonedLocalToUtc } from "@/lib/time/zoned";

/**
 * The project form: field names, validation and conversion to database rows.
 * Kept free of React and Supabase so it can be unit-tested on its own.
 */

/** Error codes shown under a field; texts live in messages under `ProjectForm.errors`. */
const FIELD_ERRORS = ["required", "tooLong", "invalid", "endBeforeStart", "outOfRange"] as const;
export type FieldError = (typeof FIELD_ERRORS)[number];

const isFieldError = (message: string): message is FieldError =>
  (FIELD_ERRORS as readonly string[]).includes(message);

/** Raw form values: every input is a string, exactly as the browser sends it. */
export type ProjectFormValues = {
  title: string;
  shootDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locationName: string;
  locationAddress: string;
  notes: string;
  retouchLimit: string;
  clientLocale: string;
  clientName: string;
  clientEmail: string;
};

export type ProjectField = keyof ProjectFormValues;

export const PROJECT_FIELDS = [
  "title",
  "shootDate",
  "startTime",
  "endTime",
  "timezone",
  "locationName",
  "locationAddress",
  "notes",
  "retouchLimit",
  "clientLocale",
  "clientName",
  "clientEmail",
] as const satisfies readonly ProjectField[];

const isDate = (value: string) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTime = (value: string) => value === "" || /^\d{2}:\d{2}$/.test(value);
const isEmail = (value: string) => value === "" || z.email().safeParse(value).success;

const schema = z
  .object({
    title: z.string().trim().min(1, "required").max(200, "tooLong"),
    shootDate: z.string().trim().refine(isDate, "invalid"),
    startTime: z.string().trim().refine(isTime, "invalid"),
    endTime: z.string().trim().refine(isTime, "invalid"),
    timezone: z.string().trim().refine(isValidTimeZone, "invalid"),
    locationName: z.string().trim().max(200, "tooLong"),
    locationAddress: z.string().trim().max(300, "tooLong"),
    notes: z.string().trim().max(4000, "tooLong"),
    retouchLimit: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, "invalid")
      .transform(Number)
      .pipe(z.number().max(500, "outOfRange")),
    clientLocale: z.enum(["ru", "en"], { error: "invalid" }),
    clientName: z.string().trim().max(200, "tooLong"),
    clientEmail: z.string().trim().max(320, "tooLong").refine(isEmail, "invalid"),
  })
  .superRefine((v, ctx) => {
    // A date needs a start time; a time without a date means nothing.
    if (v.shootDate && !v.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "required" });
    }
    if (!v.shootDate && (v.startTime || v.endTime)) {
      ctx.addIssue({ code: "custom", path: ["shootDate"], message: "required" });
    }
    // Both times are on the same day, so "HH:MM" strings compare correctly as text.
    if (v.startTime && v.endTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "endBeforeStart" });
    }
    // An email alone is not enough to know who the client is.
    if (v.clientEmail && !v.clientName) {
      ctx.addIssue({ code: "custom", path: ["clientName"], message: "required" });
    }
  });

/** Columns of public.projects the form writes. */
export type ProjectRow = {
  title: string;
  shoot_start: string | null;
  shoot_end: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  retouch_limit: number;
  client_locale: "ru" | "en";
};

export type ClientRow = { name: string; email: string | null };

export type ParseResult =
  | { ok: true; project: ProjectRow; client: ClientRow | null }
  | { ok: false; errors: Partial<Record<ProjectField, FieldError>> };

const orNull = (value: string) => (value === "" ? null : value);

/** Validates the raw values and turns them into rows ready for the database. */
export function parseProjectForm(input: Record<string, unknown>): ParseResult {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errors: Partial<Record<ProjectField, FieldError>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ProjectField | undefined;
      // Keep the first problem per field; our messages are always FieldError codes,
      // anything else (e.g. a field missing entirely) is reported as "invalid".
      if (field && !errors[field]) {
        errors[field] = isFieldError(issue.message) ? issue.message : "invalid";
      }
    }
    return { ok: false, errors };
  }

  const v = result.data;
  const toIso = (time: string) => zonedLocalToUtc(v.shootDate, time, v.timezone).toISOString();

  return {
    ok: true,
    project: {
      title: v.title,
      shoot_start: v.shootDate ? toIso(v.startTime) : null,
      shoot_end: v.shootDate && v.endTime ? toIso(v.endTime) : null,
      timezone: v.timezone,
      location_name: orNull(v.locationName),
      location_address: orNull(v.locationAddress),
      notes: orNull(v.notes),
      retouch_limit: v.retouchLimit,
      client_locale: v.clientLocale,
    },
    client: v.clientName ? { name: v.clientName, email: orNull(v.clientEmail.toLowerCase()) } : null,
  };
}

/** Reads the project fields out of a submitted form. Missing inputs become "". */
export function readProjectForm(formData: FormData): ProjectFormValues {
  const values = {} as ProjectFormValues;
  for (const field of PROJECT_FIELDS) {
    const raw = formData.get(field);
    values[field] = typeof raw === "string" ? raw : "";
  }
  return values;
}

/** Turns a saved project back into form values, for the edit screen. */
export function projectToFormValues(
  // client_locale comes back from the database as a plain string.
  project: Omit<ProjectRow, "client_locale"> & { client_locale: string },
  client: { name: string; email: string | null } | null,
): ProjectFormValues {
  const start = project.shoot_start ? utcToZonedLocal(project.shoot_start, project.timezone) : null;
  const end = project.shoot_end ? utcToZonedLocal(project.shoot_end, project.timezone) : null;

  return {
    title: project.title,
    shootDate: start?.date ?? "",
    startTime: start?.time ?? "",
    endTime: end?.time ?? "",
    timezone: project.timezone,
    locationName: project.location_name ?? "",
    locationAddress: project.location_address ?? "",
    notes: project.notes ?? "",
    retouchLimit: String(project.retouch_limit),
    clientLocale: project.client_locale,
    clientName: client?.name ?? "",
    clientEmail: client?.email ?? "",
  };
}
