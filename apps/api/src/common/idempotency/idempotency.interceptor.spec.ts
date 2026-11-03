import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/** Jednoduchá in-memory náhrada tabulky IdempotencyRecord. */
function createFakePrisma() {
  const rows = new Map<string, any>();
  const id = (w: any) => `${w.userId_key.userId}:${w.userId_key.key}`;
  return {
    rows,
    idempotencyRecord: {
      deleteMany: jest.fn(async ({ where }: any) => {
        for (const [k, row] of rows) {
          if (where.createdAt && row.createdAt < where.createdAt.lt)
            rows.delete(k);
          if (
            where.key &&
            row.key === where.key &&
            row.userId === where.userId &&
            row.responseStatus === null
          )
            rows.delete(k);
        }
      }),
      findUnique: jest.fn(
        async ({ where }: any) => rows.get(id(where)) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        const k = `${data.userId}:${data.key}`;
        if (rows.has(k)) {
          throw new Prisma.PrismaClientKnownRequestError('dup', {
            code: 'P2002',
            clientVersion: 'x',
          });
        }
        rows.set(k, {
          ...data,
          responseStatus: null,
          responseBody: null,
          createdAt: new Date(),
        });
      }),
      update: jest.fn(async ({ where, data }: any) => {
        Object.assign(rows.get(id(where)), data);
      }),
    },
  };
}

function context(body: unknown, key?: string, path = '/api/v1/invoices') {
  const headers: Record<string, string> = {};
  if (key) headers['idempotency-key'] = key;
  const response = { statusCode: 201, setHeader: jest.fn() };
  return {
    response,
    ctx: {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          body,
          method: 'POST',
          path,
          user: { id: 'u1' },
        }),
        getResponse: () => response,
      }),
    } as any,
  };
}

describe('IdempotencyInterceptor', () => {
  it('passes through requests without the header', async () => {
    const prisma = createFakePrisma();
    const interceptor = new IdempotencyInterceptor(prisma as any);
    const handler = { handle: jest.fn(() => of({ id: 'inv-1' })) };
    const { ctx } = context({ a: 1 });
    await expect(
      lastValueFrom(interceptor.intercept(ctx, handler)),
    ).resolves.toEqual({ id: 'inv-1' });
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it('replays the stored response for a repeated request', async () => {
    const prisma = createFakePrisma();
    const interceptor = new IdempotencyInterceptor(prisma as any);
    let created = 0;
    const handler = { handle: jest.fn(() => of({ id: `inv-${++created}` })) };

    const first = context({ a: 1 }, 'k1');
    await expect(
      lastValueFrom(interceptor.intercept(first.ctx, handler)),
    ).resolves.toEqual({ id: 'inv-1' });
    const second = context({ a: 1 }, 'k1');
    await expect(
      lastValueFrom(interceptor.intercept(second.ctx, handler)),
    ).resolves.toEqual({ id: 'inv-1' });

    expect(handler.handle).toHaveBeenCalledTimes(1);
    expect(second.response.setHeader).toHaveBeenCalledWith(
      'Idempotency-Replayed',
      'true',
    );
  });

  it('rejects the same key with a different body', async () => {
    const prisma = createFakePrisma();
    const interceptor = new IdempotencyInterceptor(prisma as any);
    const handler = { handle: () => of({ id: 'inv-1' }) };
    await lastValueFrom(
      interceptor.intercept(context({ a: 1 }, 'k1').ctx, handler),
    );
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ a: 2 }, 'k1').ctx, handler),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a concurrent request while the first is in progress', async () => {
    const prisma = createFakePrisma();
    prisma.rows.set('u1:k1', {
      userId: 'u1',
      key: 'k1',
      scope: 'POST /api/v1/invoices',
      requestHash: 'x',
      responseStatus: null,
      createdAt: new Date(),
    });
    const interceptor = new IdempotencyInterceptor(prisma as any);
    const handler = { handle: () => of({}) };
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ a: 1 }, 'k1').ctx, handler),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    // stejný hash → 409 „zpracovává se“
    const sameHash = context({ a: 1 }, 'k2');
    await lastValueFrom(
      interceptor.intercept(sameHash.ctx, { handle: () => of({}) }),
    );
    prisma.rows.get('u1:k2').responseStatus = null;
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ a: 1 }, 'k2').ctx, handler),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not store failed requests so the key can be retried', async () => {
    const prisma = createFakePrisma();
    const interceptor = new IdempotencyInterceptor(prisma as any);
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ a: 1 }, 'k1').ctx, {
          handle: () => throwError(() => new Error('validation failed')),
        }),
      ),
    ).rejects.toThrow('validation failed');
    expect(prisma.rows.size).toBe(0);
    await expect(
      lastValueFrom(
        interceptor.intercept(context({ a: 1 }, 'k1').ctx, {
          handle: () => of({ id: 'ok' }),
        }),
      ),
    ).resolves.toEqual({ id: 'ok' });
  });
});
