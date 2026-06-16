import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Centralised, validated environment access.
 * Fails fast at boot if a required variable is missing or malformed, so we never
 * discover a misconfiguration deep inside a request handler in production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be >= 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be >= 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('hrms-files'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REFRESH_COOKIE_NAME: z.string().default('hrms_rt'),
  COOKIE_DOMAIN: z.string().optional(),

  /**
   * Business timezone for DTR/attendance day-keying + late/undertime math.
   * MUST match where employees actually work — otherwise a UTC host (e.g. Render)
   * computes the wrong "day" and the wrong late minutes. Default: Philippines.
   */
  APP_TIMEZONE: z.string().default('Asia/Manila'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Pin the process timezone so all Date math (attendance day boundaries, late /
// undertime) is computed in the business timezone — not the host's (UTC on Render).
// Node honours runtime changes to process.env.TZ for subsequent Date operations.
process.env.TZ = env.APP_TIMEZONE;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/** Allowed CORS origins (comma-separated list supported). */
export const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
