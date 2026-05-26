import { z } from 'zod';

const WEAK_SECRET_PLACEHOLDERS = [
  'secret',
  'password',
  'replace-me',
  'change-me',
  'your-secret-here',
  'replace-with-at-least-16-characters',
  'replace-with-at-least-32-characters',
  'changeme',
  'supersecret',
  'mysecret',
  'certiva_super_secret_production_key_2026',
];

const jwtSecretSchema = z
  .string()
  .min(64, 'JWT_SECRET must be at least 64 characters')
  .refine(
    (val) => {
      const appEnv = process.env.APP_ENV;
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv === 'development' && appEnv !== 'staging' && appEnv !== 'production') {
        return true;
      }
      return !WEAK_SECRET_PLACEHOLDERS.some((p) =>
        val.toLowerCase().includes(p.toLowerCase()),
      );
    },
    { message: 'JWT_SECRET must not be a placeholder value in staging/production' },
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: jwtSecretSchema,
  JWT_EXPIRES_IN: z.string().optional(),

  PORT: z.coerce.number().default(4000),

  // CORS_ORIGINS replaces CORS_ORIGIN — comma-separated list
  CORS_ORIGINS: z.string().optional(),

  // Legacy single-origin key still accepted; CORS_ORIGINS takes precedence
  CORS_ORIGIN: z.string().optional(),

  API_PUBLIC_BASE_URL: z.string().url().optional(),
  WEB_PUBLIC_BASE_URL: z.string().url().optional(),
  ASSET_STORAGE_ROOT: z.string().optional(),

  // Storage driver: "local" (default) or "r2"
  STORAGE_DRIVER: z.enum(["local", "r2"]).optional(),

  // Cloudflare R2 (required when STORAGE_DRIVER=r2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  R2_FORCE_PATH_STYLE: z
    .enum(["true", "false", ""])
    .optional()
    .transform((v) => v === "true"),

  COOKIE_SECURE: z
    .enum(['true', 'false', ''])
    .optional()
    .transform((v) => v === 'true'),

  TRUST_PROXY: z
    .enum(['true', 'false', ''])
    .optional()
    .transform((v) => v === 'true'),

  BLOCKCHAIN_ENABLED: z
    .enum(['true', 'false', ''])
    .optional()
    .transform((v) => v === 'true'),
  POLYGON_AMOY_RPC_URL: z.string().url().optional(),
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  ISSUER_WALLET: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  BLOCKCHAIN_RPC_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

  RATE_LIMIT_STORE: z.enum(['redis', 'memory']).optional(),
  RATE_LIMIT_REDIS_PREFIX: z.string().min(1).optional(),
  RATE_LIMIT_AUTH_LOGIN_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_WINDOW_SECONDS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_UPLOAD_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_UPLOAD_WINDOW_SECONDS: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_ADMIN_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_ADMIN_WINDOW_SECONDS: z.coerce.number().int().positive().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const data = parsed.data;
  const isExposed = data.NODE_ENV === 'production' || data.APP_ENV === 'staging' || data.APP_ENV === 'production';

  // Resolve effective CORS origins (CORS_ORIGINS preferred over legacy CORS_ORIGIN)
  const rawCorsOrigins = data.CORS_ORIGINS ?? data.CORS_ORIGIN ?? '';
  const corsOrigins = rawCorsOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isExposed) {
    if (corsOrigins.length === 0) {
      throw new Error(
        'CORS_ORIGINS must be set and non-empty when NODE_ENV=production, APP_ENV=staging, or APP_ENV=production. ' +
        'Set CORS_ORIGINS to a comma-separated list of allowed origins.',
      );
    }
    if (corsOrigins.includes('*')) {
      throw new Error(
        'CORS_ORIGINS must not contain wildcard (*) in staging or production environments.',
      );
    }
  }

  if (data.BLOCKCHAIN_ENABLED) {
    const missing: string[] = [];
    if (!data.POLYGON_AMOY_RPC_URL) missing.push('POLYGON_AMOY_RPC_URL');
    if (!data.PRIVATE_KEY) missing.push('PRIVATE_KEY');
    if (!data.CONTRACT_ADDRESS) missing.push('CONTRACT_ADDRESS');
    if (missing.length > 0) {
      throw new Error(
        `BLOCKCHAIN_ENABLED=true requires the following env vars: ${missing.join(', ')}`,
      );
    }

    if (isExposed && data.PRIVATE_KEY) {
      const knownDevKeys = ['0x' + '0'.repeat(64), '0x' + 'a'.repeat(64)];
      if (knownDevKeys.includes(data.PRIVATE_KEY.toLowerCase())) {
        throw new Error(
          'PRIVATE_KEY appears to be a development placeholder. Do not use test keys in production.',
        );
      }
    }
  }

  if (data.STORAGE_DRIVER === "r2") {
    const missingR2: string[] = [];
    if (!data.R2_ACCOUNT_ID) missingR2.push("R2_ACCOUNT_ID");
    if (!data.R2_BUCKET) missingR2.push("R2_BUCKET");
    if (!data.R2_ACCESS_KEY_ID) missingR2.push("R2_ACCESS_KEY_ID");
    if (!data.R2_SECRET_ACCESS_KEY) missingR2.push("R2_SECRET_ACCESS_KEY");
    if (!data.R2_ENDPOINT) missingR2.push("R2_ENDPOINT");
    if (missingR2.length > 0) {
      throw new Error(
        `STORAGE_DRIVER=r2 requires the following env vars: ${missingR2.join(", ")}`,
      );
    }
  }

  return data;
}
