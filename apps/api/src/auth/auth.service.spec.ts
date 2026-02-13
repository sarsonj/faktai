import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    subject: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as any;

  const config = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'SESSION_TTL_HOURS':
          return 24;
        case 'RESET_TOKEN_TTL_MINUTES':
          return 30;
        default:
          return undefined;
      }
    }),
  } as unknown as ConfigService;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, config);
  });

  it('registers new user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });
    prisma.userSession.create.mockResolvedValue({});

    const result = await service.register(
      {
        email: 'USER@example.com',
        password: 'Password!123',
        passwordConfirm: 'Password!123',
      },
      'test-agent',
      '127.0.0.1',
    );

    expect(result.me.email).toBe('user@example.com');
    expect(result.me.hasSubject).toBe(false);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.userSession.create).toHaveBeenCalled();
  });

  it('fails login with invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'none@example.com', password: 'Password!123' }, 'ua', 'ip'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fails register for duplicate user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register(
        {
          email: 'user@example.com',
          password: 'Password!123',
          passwordConfirm: 'Password!123',
        },
        'ua',
        'ip',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
