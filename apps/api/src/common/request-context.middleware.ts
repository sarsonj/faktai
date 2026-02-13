import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const existingRequestId = request.header('x-request-id');
    const requestId = existingRequestId && existingRequestId.length > 0 ? existingRequestId : randomUUID();

    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    response.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      const payload = {
        level: 'info',
        type: 'http_request',
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs,
      };

      // JSON log for easier ingestion in external log systems.
      console.log(JSON.stringify(payload));
    });

    next();
  }
}
