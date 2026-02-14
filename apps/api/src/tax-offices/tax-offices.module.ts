import { Module } from '@nestjs/common';
import { TaxOfficesService } from './tax-offices.service';

@Module({
  providers: [TaxOfficesService],
  exports: [TaxOfficesService],
})
export class TaxOfficesModule {}

