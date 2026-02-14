import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaxOfficesModule } from '../tax-offices/tax-offices.module';
import { TaxReportsController } from './tax-reports.controller';
import { TaxReportsService } from './tax-reports.service';

@Module({
  imports: [AuthModule, TaxOfficesModule],
  controllers: [TaxReportsController],
  providers: [TaxReportsService],
  exports: [TaxReportsService],
})
export class TaxReportsModule {}
