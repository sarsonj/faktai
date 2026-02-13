import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'api' as const,
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
    };
  }
}
