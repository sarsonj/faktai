import { UnauthorizedException } from '@nestjs/common';
import { SessionAuthGuard } from './session-auth.guard';

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

describe('SessionAuthGuard', () => {
  const user = { id: 'u1', email: 'a@b.cz', isActive: true };
  const authService = { getSessionUser: jest.fn() };
  const apiKeyService = { resolveUser: jest.fn() };
  const guard = new SessionAuthGuard(authService as any, apiKeyService as any);

  beforeEach(() => jest.clearAllMocks());

  it('authenticates with a valid API key in Authorization header', async () => {
    apiKeyService.resolveUser.mockResolvedValue(user);
    const request: any = { headers: { authorization: 'Bearer fai_abc' } };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(apiKeyService.resolveUser).toHaveBeenCalledWith('fai_abc');
    expect(request.user).toEqual({
      id: 'u1',
      email: 'a@b.cz',
      authMethod: 'api_key',
    });
    expect(authService.getSessionUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid API key even when a session cookie is present', async () => {
    apiKeyService.resolveUser.mockResolvedValue(null);
    const request: any = {
      headers: { authorization: 'Bearer fai_wrong' },
      cookies: { tf_session: 'valid' },
    };
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falls back to the session cookie', async () => {
    authService.getSessionUser.mockResolvedValue(user);
    const request: any = { headers: {}, cookies: { tf_session: 'token' } };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user.authMethod).toBe('session');
  });

  it('rejects requests without credentials', async () => {
    const request: any = { headers: {}, cookies: {} };
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
