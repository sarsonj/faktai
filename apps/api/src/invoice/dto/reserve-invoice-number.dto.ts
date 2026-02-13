import { IsDateString, IsOptional } from 'class-validator';

export class ReserveInvoiceNumberDto {
  @IsOptional()
  @IsDateString({}, { message: 'Datum vystavení musí být platné datum.' })
  issueDate?: string;
}
