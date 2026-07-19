export const RATE_LIMIT_RULE = {
  AUTH_LOGIN: 'auth-login',
  VERIFICATION: 'verification',
  VERIFICATION_UPLOAD: 'verification-upload',
  ADMIN: 'admin',
} as const;

export type RateLimitRuleName =
  (typeof RATE_LIMIT_RULE)[keyof typeof RATE_LIMIT_RULE];

export const RATE_LIMIT_RULE_METADATA = Symbol('CERTIVA_RATE_LIMIT_RULE');
