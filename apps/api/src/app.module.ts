import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SubjectModule } from './subject/subject.module';
import { InvoiceModule } from './invoice/invoice.module';
import { TaxReportsModule } from './tax-reports/tax-reports.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, SubjectModule, InvoiceModule, TaxReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
