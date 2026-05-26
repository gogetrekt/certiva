const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'jwt',
  'jwtsecret',
  'jwt_secret',
  'secret',
  'authorization',
  'cookie',
  'cookies',
  'databaseurl',
  'database_url',
  'redisurl',
  'redis_url',
  'privatekey',
  'private_key',
  'signingkey',
  'signing_key',
  'walletkey',
  'wallet_key',
  'mnemonic',
  'seedphrase',
  'seed_phrase',
  'apikey',
  'api_key',
  'clientsecret',
  'client_secret',
  'connectionstring',
  'connection_string',
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[-_\s]/g, ''));
}

export function redact(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) return '[...]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = isSensitiveKey(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return result;
  }

  return value;
}

export function redactHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'authorization' || lower === 'cookie' || lower === 'set-cookie') {
      result[k] = '[REDACTED]';
    } else {
      result[k] = v;
    }
  }
  return result;
}
