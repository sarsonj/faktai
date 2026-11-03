import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  controllers: [AuthController, ApiKeyController],
  providers: [AuthService, ApiKeyService, SessionAuthGuard],
  exports: [AuthService, ApiKeyService, SessionAuthGuard],
})
export class AuthModule {}
