import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { RequestWithUser } from '../auth/session-auth.guard';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectService } from './subject.service';

@UseGuards(SessionAuthGuard)
@Controller('subject')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  async getSubject(@Req() request: RequestWithUser) {
    return this.subjectService.getSubject(request.user!.id);
  }

  @Post()
  async createSubject(@Req() request: RequestWithUser, @Body() dto: CreateSubjectDto) {
    return this.subjectService.createSubject(request.user!.id, dto);
  }

  @Patch()
  async updateSubject(@Req() request: RequestWithUser, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(request.user!.id, dto);
  }
}
