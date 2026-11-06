import { z } from "zod";

/**
 * What may be uploaded. Shared by the browser (to say "no" before sending anything) and
 * the server (which decides). The database repeats the type and size checks.
 */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Files signed per request; the uploader splits bigger drops into several requests. */
export const MAX_FILES_PER_SIGN = 20;

const ALLOWED_TYPE = /^(image\/[a-z0-9.+-]+|application\/pdf)$/;

export type FileProblem = "empty" | "tooLarge" | "type";

/** Why a file cannot be uploaded, or null if it can. */
export function checkFile(file: { size: number; type: string }): FileProblem | null {
  if (file.size <= 0) return "empty";
  if (file.size > MAX_UPLOAD_BYTES) return "tooLarge";
  if (!ALLOWED_TYPE.test(file.type)) return "type";
  return null;
}

/** POST /api/uploads/sign */
export const signRequestSchema = z.object({
  projectId: z.uuid(),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        type: z.string().regex(ALLOWED_TYPE),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .min(1)
    .max(MAX_FILES_PER_SIGN),
});

export type SignRequest = z.infer<typeof signRequestSchema>;

/** One answer per requested file, in the same order. */
export type SignedFile = { id: string; url: string } | { error: "quota" | "failed" };

/** POST /api/uploads/complete */
export const completeRequestSchema = z.object({ id: z.uuid() });
