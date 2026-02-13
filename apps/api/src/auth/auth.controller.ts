import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionAuthGuard } from './session-auth.guard';
import type { RequestWithUser } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(response: Response, sessionToken: string): void {
    response.cookie('tf_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.authService.getSessionCookieMaxAgeMs(),
      path: '/',
    });
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie('tf_session', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  @Post('register')
  @Throttle({ auth: { limit: 6, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      dto,
      request.headers['user-agent'],
      request.ip,
    );

    this.setSessionCookie(response, result.sessionToken);
    return result.me;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ auth: { limit: 8, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      request.headers['user-agent'],
      request.ip,
    );

    this.setSessionCookie(response, result.sessionToken);
    return result.me;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.tf_session;
    if (token) {
      await this.authService.revokeCurrentSession(token);
    }

    this.clearSessionCookie(response);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      success: true,
      message: 'Pokud účet existuje, poslali jsme instrukce.',
    };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { success: true };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@Req() request: RequestWithUser) {
    const token = request.cookies?.tf_session;
    return this.authService.getMeFromSession(token);
  }
}
