import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { SessionAuthGuard } from './session-auth.guard';
import type { RequestWithUser } from './session-auth.guard';

/** Správa vlastního API klíče – jen z přihlášené webové session, ne přes API klíč. */
@UseGuards(SessionAuthGuard)
@Controller('api-key')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  private requireSession(request: RequestWithUser): string {
    if (request.user?.authMethod !== 'session') {
      throw new ForbiddenException(
        'API klíč lze spravovat jen z přihlášené webové aplikace.',
      );
    }
    return request.user.id;
  }

  @Get()
  getStatus(@Req() request: RequestWithUser) {
    return this.apiKeyService.getStatus(this.requireSession(request));
  }

  @Post()
  regenerate(@Req() request: RequestWithUser) {
    return this.apiKeyService.regenerate(this.requireSession(request));
  }

  @Delete()
  @HttpCode(204)
  async revoke(@Req() request: RequestWithUser) {
    await this.apiKeyService.revoke(this.requireSession(request));
  }
}
