import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export type RequestWithUser = Request & {
  user?: {
    id: string;
    email: string;
  };
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.tf_session;

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
