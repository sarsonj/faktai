import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { THROTTLER_OPTIONS } from './throttling';

@Controller()
class ProbeController {
  @Get('regular')
  regular() {
    return { ok: true };
  }

  @Get('strict')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  strict() {
    return { ok: true };
  }
}

describe('THROTTLER_OPTIONS', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_OPTIONS)],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not apply the strict auth limit to regular routes', async () => {
    for (let i = 0; i < 30; i += 1) {
      await request(app.getHttpServer()).get('/regular').expect(200);
    }
  });

  it('applies route-level @Throttle override', async () => {
    await request(app.getHttpServer()).get('/strict').expect(200);
    await request(app.getHttpServer()).get('/strict').expect(200);
    await request(app.getHttpServer()).get('/strict').expect(429);
  });
});
