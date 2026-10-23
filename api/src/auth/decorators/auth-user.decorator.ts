import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User, Session } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentSessionId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const session: Session | undefined = request.session;
    return session ? session.id : '';
  },
);
