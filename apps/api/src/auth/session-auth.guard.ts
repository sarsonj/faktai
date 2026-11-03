import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export type RequestWithUser = Request & {
  user?: {
    id: string;
    email: string;
  };
};

export const SESSION_COOKIE_NAME = 'tf_session';

export function getSessionToken(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = getSessionToken(request);

    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = {
      id: user.id,
      email: user.email,
    };

    return true;
  }
}
