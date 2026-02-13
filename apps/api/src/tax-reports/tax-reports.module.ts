import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaxReportsController } from './tax-reports.controller';
import { TaxReportsService } from './tax-reports.service';

@Module({
  imports: [AuthModule],
  controllers: [TaxReportsController],
  providers: [TaxReportsService],
  exports: [TaxReportsService],
})
export class TaxReportsModule {}
