import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import type { Response } from 'express';
import type { RequestWithUser } from '../../auth/session-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
/** Jak dlouho platí uložená odpověď. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Podpora hlavičky `Idempotency-Key` (CR-0058) pro vytváření dokladů.
 *
 * - Bez hlavičky se nic nemění.
 * - Stejný klíč + stejný požadavek do 24 h → vrátí se uložená odpověď
 *   (hlavička `Idempotency-Replayed: true`), nic nového nevznikne.
 * - Stejný klíč s jiným tělem/cestou → 422.
 * - Stejný klíč, zatímco první požadavek ještě běží → 409.
 * - Chybové odpovědi se neukládají (po opravě lze klíč použít znovu).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const rawKey = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (!key || !request.user) {
      return next.handle();
    }
    if (key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key může mít maximálně 255 znaků.',
      );
    }

    const userId = request.user.id;
    const scope = `${request.method} ${request.path}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ scope, body: request.body as unknown }))
      .digest('hex');

    return from(this.begin(userId, key, scope, requestHash)).pipe(
      mergeMap((replay) => {
        if (replay) {
          response.setHeader('Idempotency-Replayed', 'true');
          return of(replay.body);
        }
        return next.handle().pipe(
          mergeMap((body) =>
            from(this.complete(userId, key, response.statusCode, body)).pipe(
              mergeMap(() => of(body)),
            ),
          ),
          catchError((error: unknown) =>
            from(this.abort(userId, key)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }

  /** Vrátí uloženou odpověď k přehrání, nebo založí záznam „zpracovává se“. */
  private async begin(
    userId: string,
    key: string,
    scope: string,
    requestHash: string,
  ): Promise<{ body: unknown } | null> {
    const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS);
    await this.prisma.idempotencyRecord.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (existing) {
      return this.replayOrReject(existing, scope, requestHash);
    }

    try {
      await this.prisma.idempotencyRecord.create({
        data: { userId, key, scope, requestHash },
      });
      return null;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Požadavek se stejným Idempotency-Key se právě zpracovává.',
        );
      }
      throw error;
    }
  }

  private replayOrReject(
    record: {
      scope: string;
      requestHash: string;
      responseStatus: number | null;
      responseBody: Prisma.JsonValue;
    },
    scope: string,
    requestHash: string,
  ): { body: unknown } {
    if (record.scope !== scope || record.requestHash !== requestHash) {
      throw new UnprocessableEntityException(
        'Idempotency-Key už byl použit pro jiný požadavek.',
      );
    }
    if (record.responseStatus === null) {
      throw new ConflictException(
        'Požadavek se stejným Idempotency-Key se právě zpracovává.',
      );
    }
    return { body: record.responseBody };
  }

  private async complete(
    userId: string,
    key: string,
    status: number,
    body: unknown,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.update({
      where: { userId_key: { userId, key } },
      data: {
        responseStatus: status,
        responseBody:
          body === undefined || body === null
            ? Prisma.JsonNull
            : (body as Prisma.InputJsonValue),
      },
    });
  }

  private async abort(userId: string, key: string): Promise<void> {
    await this.prisma.idempotencyRecord.deleteMany({
      where: { userId, key, responseStatus: null },
    });
  }
}
