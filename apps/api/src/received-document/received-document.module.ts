import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentStorageService } from '../storage/attachment-storage.service';
import { ReceivedDocumentController } from './received-document.controller';
import { ReceivedDocumentService } from './received-document.service';

@Module({
  imports: [AuthModule],
  controllers: [ReceivedDocumentController],
  providers: [ReceivedDocumentService, AttachmentStorageService],
})
export class ReceivedDocumentModule {}
