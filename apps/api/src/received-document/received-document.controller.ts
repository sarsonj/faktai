import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { MAX_ATTACHMENT_BYTES } from '../storage/attachment-storage.service';
import {
  ListReceivedDocumentsQueryDto,
  UpsertReceivedDocumentDto,
} from './dto/upsert-received-document.dto';
import { ReceivedDocumentService } from './received-document.service';

/** Přijaté doklady (CR-0060). */
@UseGuards(SessionAuthGuard)
@Controller('received-documents')
export class ReceivedDocumentController {
  constructor(private readonly service: ReceivedDocumentService) {}

  @Get()
  list(
    @Req() request: RequestWithUser,
    @Query() query: ListReceivedDocumentsQueryDto,
  ) {
    return this.service.list(request.user!.id, query);
  }

  /** Založí přijatý doklad. Podporuje hlavičku `Idempotency-Key`. */
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @Req() request: RequestWithUser,
    @Body() dto: UpsertReceivedDocumentDto,
  ) {
    return this.service.create(request.user!.id, dto);
  }

  @Get(':id')
  get(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.service.get(request.user!.id, id);
  }

  @Patch(':id')
  update(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpsertReceivedDocumentDto,
  ) {
    return this.service.update(request.user!.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() request: RequestWithUser, @Param('id') id: string) {
    await this.service.remove(request.user!.id, id);
  }

  /** Nahraje přílohu (multipart, pole `file`; PDF/PNG/JPEG/WEBP/HEIC, max. 15 MB). */
  @Post(':id/attachments')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  addAttachment(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile()
    file: { originalname: string; buffer: Buffer; size: number } | undefined,
  ) {
    return this.service.addAttachment(request.user!.id, id, file);
  }

  @Get(':id/attachments/:attachmentId')
  async downloadAttachment(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.service.openAttachment(
      request.user!.id,
      id,
      attachmentId,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.stream, { length: file.size });
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(204)
  async removeAttachment(
    @Req() request: RequestWithUser,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.service.removeAttachment(request.user!.id, id, attachmentId);
  }
}
