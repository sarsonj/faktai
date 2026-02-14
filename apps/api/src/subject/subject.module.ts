import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TaxOfficesModule } from '../tax-offices/tax-offices.module';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';

@Module({
  imports: [AuthModule, TaxOfficesModule],
  controllers: [SubjectController],
  providers: [SubjectService],
  exports: [SubjectService],
})
export class SubjectModule {}
