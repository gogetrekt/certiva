import { SetMetadata } from '@nestjs/common';

import {
  RATE_LIMIT_RULE_METADATA,
  type RateLimitRuleName,
} from './rate-limit.constants';

export const RateLimit = (ruleName: RateLimitRuleName) =>
  SetMetadata(RATE_LIMIT_RULE_METADATA, ruleName);
