import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SubjectModule } from './subject/subject.module';
import { InvoiceModule } from './invoice/invoice.module';
import { TaxReportsModule } from './tax-reports/tax-reports.module';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { RegistryModule } from './registry/registry.module';
import { ReceivedDocumentModule } from './received-document/received-document.module';
import { THROTTLER_OPTIONS } from './common/throttling';
import { DatabaseBackupService } from './storage/database-backup.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
    PrismaModule,
    AuthModule,
    SubjectModule,
    InvoiceModule,
    RegistryModule,
    TaxReportsModule,
    ReceivedDocumentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseBackupService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
