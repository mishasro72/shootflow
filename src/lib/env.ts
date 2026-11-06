import { z } from "zod";

/**
 * Server environment, validated on first use. Each later step adds its keys here
 * (R2, Telegram, Google Maps, Resend...). Public values the browser needs live in
 * `public-env.ts`, because Next.js only inlines literal `process.env.NEXT_PUBLIC_*` reads.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Server-only key for Places API (New). Without it the place search is hidden and
  // locations are typed by hand.
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  // Server-only Supabase secret key (sb_secret_..., or the legacy service_role key). It
  // bypasses RLS, so only code that checked access first may use it: client portal and
  // calendar feed handlers, and the writes of portal secrets.
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  // Cloudflare R2 (S3-compatible) for photos and files. All four are needed to turn uploads on.
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  // Only for tests: another S3-compatible server (an emulator in CI) and its region.
  R2_ENDPOINT: z.url().optional(),
  R2_REGION: z.string().min(1).default("auto"),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
