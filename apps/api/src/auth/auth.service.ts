import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordResetToken, User } from '@prisma/client';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export type MeResponse = {
  id: string;
  email: string;
  hasSubject: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private getSessionTtlHours(): number {
    return Number(this.config.get('SESSION_TTL_HOURS') ?? 24);
  }

  private getResetTokenTtlMinutes(): number {
    return Number(this.config.get('RESET_TOKEN_TTL_MINUTES') ?? 30);
  }

  getSessionCookieMaxAgeMs(): number {
    return this.getSessionTtlHours() * 60 * 60 * 1000;
  }

  private assertPasswordConfirm(
    password: string,
    passwordConfirm: string,
  ): void {
    if (password !== passwordConfirm) {
      throw new BadRequestException('Potvrzení hesla se neshoduje.');
    }
  }

  private async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + this.getSessionCookieMaxAgeMs());

    await this.prisma.userSession.create({
      data: {
        userId,
        sessionTokenHash: tokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return rawToken;
  }

  async register(
    dto: RegisterDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ sessionToken: string; me: MeResponse }> {
    this.assertPasswordConfirm(dto.password, dto.passwordConfirm);
    const email = this.normalizeEmail(dto.email);

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('Uživatel s tímto e-mailem již existuje.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const sessionToken = await this.createSession(
      user.id,
      userAgent,
      ipAddress,
    );
    return {
      sessionToken,
      me: {
        id: user.id,
        email: user.email,
        hasSubject: false,
      },
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ sessionToken: string; me: MeResponse }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Neplatné přihlašovací údaje.');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Neplatné přihlašovací údaje.');
    }

    const sessionToken = await this.createSession(
      user.id,
      userAgent,
      ipAddress,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const hasSubject = Boolean(
      await this.prisma.subject.findUnique({ where: { userId: user.id } }),
    );
    return {
      sessionToken,
      me: {
        id: user.id,
        email: user.email,
        hasSubject,
      },
    };
  }

  async revokeCurrentSession(rawToken: string): Promise<void> {
    const tokenHash = this.hashOpaqueToken(rawToken);
    await this.prisma.userSession.updateMany({
      where: {
        sessionTokenHash: tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async getSessionUser(rawToken: string): Promise<User | null> {
    const tokenHash = this.hashOpaqueToken(rawToken);
    const session = await this.prisma.userSession.findFirst({
      where: {
        sessionTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session || !session.user.isActive) {
      return null;
    }

    return session.user;
  }

  async getMeFromSession(rawToken: string): Promise<MeResponse> {
    const user = await this.getSessionUser(rawToken);
    if (!user) {
      throw new UnauthorizedException('Uživatel není přihlášen.');
    }

    const hasSubject = Boolean(
      await this.prisma.subject.findUnique({ where: { userId: user.id } }),
    );
    return {
      id: user.id,
      email: user.email,
      hasSubject,
    };
  }

  private async createResetToken(
    userId: string,
  ): Promise<{ rawToken: string; record: PasswordResetToken }> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashOpaqueToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.getResetTokenTtlMinutes() * 60 * 1000,
    );

    const record = await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { rawToken, record };
  }

  private async sendResetEmail(email: string, rawToken: string): Promise<void> {
    const appBaseUrl =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appBaseUrl}/auth/reset-password?token=${rawToken}`;

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = Number(this.config.get<string>('SMTP_PORT') ?? 25);
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    const smtpFrom =
      this.config.get<string>('SMTP_FROM') ?? 'no-reply@tappyfaktur.local';

    if (!smtpHost) {
      this.logger.log(`Password reset requested for ${email}: ${resetUrl}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'TappyFaktur: reset hesla',
      text: `Pro reset hesla použijte tento odkaz: ${resetUrl}`,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return;
    }

    const { rawToken } = await this.createResetToken(user.id);
    await this.sendResetEmail(email, rawToken);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    this.assertPasswordConfirm(dto.password, dto.passwordConfirm);
    const tokenHash = this.hashOpaqueToken(dto.token);

    const token = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      throw new BadRequestException('Token je neplatný nebo expiroval.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
