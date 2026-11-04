import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
    // SQLite (CR-0061): WAL umožní čtení během zápisu; režim se uloží
    // přímo do souboru databáze, stačí ho nastavit jednou.
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL');
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
