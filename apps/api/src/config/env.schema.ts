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
];

const jwtSecretSchema = z
  .string()
  .min(32, 'JWT_SECRET must be at least 32 characters')
  .refine(
    (val) => {
      if (process.env.NODE_ENV !== 'production') return true;
      return !WEAK_SECRET_PLACEHOLDERS.some((p) =>
        val.toLowerCase().includes(p.toLowerCase()),
      );
    },
    { message: 'JWT_SECRET must not be a placeholder value in production' },
  );

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: jwtSecretSchema,
  JWT_EXPIRES_IN: z.string().optional(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().optional(),
  API_PUBLIC_BASE_URL: z.string().url().optional(),
  WEB_PUBLIC_BASE_URL: z.string().url().optional(),
  ASSET_STORAGE_ROOT: z.string().optional(),
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
  RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  RATE_LIMIT_VERIFY_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  RATE_LIMIT_VERIFY_UPLOAD_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_VERIFY_UPLOAD_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  RATE_LIMIT_ADMIN_MAX: z.coerce.number().int().positive().optional(),
  RATE_LIMIT_ADMIN_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
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

    if (process.env.NODE_ENV === 'production' && data.PRIVATE_KEY) {
      const knownDevKeys = ['0x' + '0'.repeat(64), '0x' + 'a'.repeat(64)];
      if (knownDevKeys.includes(data.PRIVATE_KEY.toLowerCase())) {
        throw new Error('PRIVATE_KEY appears to be a development placeholder. Do not use test keys in production.');
      }
    }
  }

  return data;
}
