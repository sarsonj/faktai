import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoicePdfRenderer } from './pdf/invoice-pdf.renderer';

@Module({
  imports: [AuthModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfRenderer],
  exports: [InvoiceService],
})
export class InvoiceModule {}
