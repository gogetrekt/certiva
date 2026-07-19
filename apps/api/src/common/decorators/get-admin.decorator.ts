import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '../../modules/auth/types/jwt-payload';

export const GetAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
