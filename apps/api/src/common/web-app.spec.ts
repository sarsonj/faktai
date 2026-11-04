import { isApiPath } from './web-app';

describe('isApiPath', () => {
  it('separates API routes from client routes', () => {
    expect(isApiPath('/api')).toBe(true);
    expect(isApiPath('/api/v1/invoices')).toBe(true);
    expect(isApiPath('/api/docs')).toBe(true);
    expect(isApiPath('/apiary')).toBe(false);
    expect(isApiPath('/invoices/123')).toBe(false);
    expect(isApiPath('/')).toBe(false);
  });
});
