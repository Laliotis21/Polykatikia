import { z } from "zod";

const ocrProviderSchema = z.enum(["mock", "document_ai", "textract"]);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  OCR_PROVIDER: ocrProviderSchema.default("mock"),
  ANOMALY_MARGIN_BPS: z.coerce.number().int().default(3000),
  RESEND_API_KEY: z.string().optional().default(""),
  RESEND_FROM: z.string().optional().default("noreply@example.com"),
  INNGEST_EVENT_KEY: z.string().optional().default(""),
  INNGEST_SIGNING_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Parse and cache process.env. Call once at request boundaries / app boot. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when public Supabase URL + anon key are configured. */
export function hasSupabasePublicConfig(env: Env = getEnv()): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Reset cache (tests only). */
export function resetEnvCache(): void {
  cached = null;
}
