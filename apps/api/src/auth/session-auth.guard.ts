import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from './api-key.service';
import { AuthService } from './auth.service';

export type AuthMethod = 'session' | 'api_key';

export type RequestWithUser = Request & {
  user?: {
    id: string;
    email: string;
    authMethod: AuthMethod;
  };
};

export const SESSION_COOKIE_NAME = 'tf_session';

export function getBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== 'string') {
    return undefined;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}

export function getSessionToken(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

/**
 * Ověření uživatele: session cookie (web) nebo `Authorization: Bearer fai_…`
 * (API klíč, CR-0058). Oba způsoby mají stejná oprávnění.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const bearer = getBearerToken(request);
    if (bearer) {
      const user = await this.apiKeyService.resolveUser(bearer);
      if (!user) {
        throw new UnauthorizedException('Neplatný API klíč.');
      }
      request.user = { id: user.id, email: user.email, authMethod: 'api_key' };
      return true;
    }

    const token = getSessionToken(request);
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = { id: user.id, email: user.email, authMethod: 'session' };
    return true;
  }
}
