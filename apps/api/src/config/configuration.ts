export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    appEnv: process.env.APP_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    // CORS_ORIGINS (comma-separated) takes precedence over legacy CORS_ORIGIN
    corsOrigins: process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    trustProxy: process.env.TRUST_PROXY === 'true',
    apiPublicBaseUrl:
      process.env.API_PUBLIC_BASE_URL ?? 'http://127.0.0.1:4000/api',
    webPublicBaseUrl:
      process.env.WEB_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000',
    assetStorageRoot: process.env.ASSET_STORAGE_ROOT ?? 'storage',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  rateLimit: {
    store: process.env.RATE_LIMIT_STORE ?? 'redis',
    redisPrefix: process.env.RATE_LIMIT_REDIS_PREFIX ?? 'certiva:rate-limit',
    authLogin: {
      limit: parseInt(process.env.RATE_LIMIT_AUTH_LOGIN_MAX ?? '5', 10),
      windowSeconds: parseInt(
        process.env.RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS ?? '60',
        10,
      ),
    },
    verification: {
      limit: parseInt(process.env.RATE_LIMIT_VERIFY_MAX ?? '30', 10),
      windowSeconds: parseInt(
        process.env.RATE_LIMIT_VERIFY_WINDOW_SECONDS ?? '60',
        10,
      ),
    },
    verificationUpload: {
      limit: parseInt(process.env.RATE_LIMIT_VERIFY_UPLOAD_MAX ?? '10', 10),
      windowSeconds: parseInt(
        process.env.RATE_LIMIT_VERIFY_UPLOAD_WINDOW_SECONDS ?? '60',
        10,
      ),
    },
    admin: {
      limit: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '100', 10),
      windowSeconds: parseInt(
        process.env.RATE_LIMIT_ADMIN_WINDOW_SECONDS ?? '60',
        10,
      ),
    },
  },
  blockchain: {
    polygonAmoyRpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    privateKey: process.env.PRIVATE_KEY,
    contractAddress: process.env.CONTRACT_ADDRESS,
    rpcTimeoutMs: parseInt(
      process.env.BLOCKCHAIN_RPC_TIMEOUT_MS ?? '12000',
      10,
    ),
  },
});
