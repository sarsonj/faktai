import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost() {
  const json = jest.fn();
  const response = {
    status: jest.fn().mockReturnThis(),
    json,
    getHeader: jest.fn().mockReturnValue('req-1'),
  };
  const request = { method: 'GET', url: '/api/v1/invoices' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response, json };
}

describe('HttpExceptionFilter', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs unexpected errors and hides details from the client', () => {
    const { host, response, json } = createHost();
    new HttpExceptionFilter().catch(new Error('db is down'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('db is down');
    expect(errorSpy.mock.calls[0][0]).toContain('req-1');
  });

  it('does not log expected client errors', () => {
    const { host, response } = createHost();
    new HttpExceptionFilter().catch(new BadRequestException('bad'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
