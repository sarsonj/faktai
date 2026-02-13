import { RequestContextMiddleware } from './request-context.middleware';

describe('RequestContextMiddleware', () => {
  it('adds request id header and logs request on finish', () => {
    const middleware = new RequestContextMiddleware();
    const headers = new Map<string, string>();
    let finishCallback: () => void = () => undefined;

    const request = {
      method: 'GET',
      originalUrl: '/api/v1/health',
      header: jest.fn(() => undefined),
    } as any;

    const response = {
      statusCode: 200,
      setHeader: jest.fn((name: string, value: string) => {
        headers.set(name.toLowerCase(), value);
      }),
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      }),
    } as any;

    const next = jest.fn();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    middleware.use(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(headers.get('x-request-id')).toBeTruthy();

    finishCallback();

    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });
});
