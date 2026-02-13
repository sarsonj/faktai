import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DefaultVariableSymbolType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isValidIco } from '../utils/czech-validators';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePostalCode(postalCode: string): string {
    return postalCode.replace(/\s+/g, '');
  }

  private validateBusinessRules(payload: {
    ico?: string;
    dic?: string | null;
    isVatPayer?: boolean;
    vatRegistrationDate?: Date | null;
    defaultVariableSymbolType?: DefaultVariableSymbolType;
    defaultVariableSymbolValue?: string | null;
  }) {
    if (payload.ico && !isValidIco(payload.ico)) {
      throw new BadRequestException('Invalid ICO checksum');
    }

    if (payload.isVatPayer) {
      if (!payload.dic) {
        throw new BadRequestException('DIC is required for VAT payer');
      }
      if (!payload.vatRegistrationDate) {
        throw new BadRequestException('VAT registration date is required for VAT payer');
      }
    }

    if (payload.defaultVariableSymbolType === 'custom' && !payload.defaultVariableSymbolValue) {
      throw new BadRequestException('Custom variable symbol value is required');
    }
  }

  async getSubject(userId: string) {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  async createSubject(userId: string, dto: CreateSubjectDto) {
    const exists = await this.prisma.subject.findUnique({ where: { userId } });
    if (exists) {
      throw new ConflictException('Subject already exists');
    }

    const payload: Prisma.SubjectCreateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      businessName: dto.businessName,
      ico: dto.ico,
      dic: dto.dic,
      isVatPayer: dto.isVatPayer,
      vatRegistrationDate: dto.vatRegistrationDate ? new Date(dto.vatRegistrationDate) : null,
      street: dto.street,
      city: dto.city,
      postalCode: this.normalizePostalCode(dto.postalCode),
      countryCode: dto.countryCode,
      bankAccountPrefix: dto.bankAccountPrefix,
      bankAccountNumber: dto.bankAccountNumber,
      bankCode: dto.bankCode,
      defaultVariableSymbolType: dto.defaultVariableSymbolType,
      defaultVariableSymbolValue:
        dto.defaultVariableSymbolType === 'custom' ? dto.defaultVariableSymbolValue ?? null : null,
      defaultDueDays: dto.defaultDueDays,
      user: { connect: { id: userId } },
    };

    this.validateBusinessRules({
      ico: payload.ico,
      dic: payload.dic,
      isVatPayer: payload.isVatPayer,
      vatRegistrationDate: payload.vatRegistrationDate as Date | null | undefined,
      defaultVariableSymbolType: payload.defaultVariableSymbolType,
      defaultVariableSymbolValue: payload.defaultVariableSymbolValue,
    });

    return this.prisma.subject.create({ data: payload });
  }

  async updateSubject(userId: string, dto: UpdateSubjectDto) {
    const current = await this.prisma.subject.findUnique({ where: { userId } });
    if (!current) {
      throw new NotFoundException('Subject not found');
    }

    const merged = {
      ...current,
      ...dto,
      postalCode: dto.postalCode ? this.normalizePostalCode(dto.postalCode) : current.postalCode,
      vatRegistrationDate: dto.vatRegistrationDate
        ? new Date(dto.vatRegistrationDate)
        : dto.isVatPayer === false
          ? null
          : current.vatRegistrationDate,
    };

    const defaultVariableSymbolValue =
      merged.defaultVariableSymbolType === 'custom'
        ? dto.defaultVariableSymbolValue ?? current.defaultVariableSymbolValue
        : null;

    this.validateBusinessRules({
      ico: merged.ico,
      dic: merged.dic,
      isVatPayer: merged.isVatPayer,
      vatRegistrationDate: merged.vatRegistrationDate,
      defaultVariableSymbolType: merged.defaultVariableSymbolType,
      defaultVariableSymbolValue,
    });

    return this.prisma.subject.update({
      where: { userId },
      data: {
        ...dto,
        postalCode: dto.postalCode ? this.normalizePostalCode(dto.postalCode) : undefined,
        vatRegistrationDate: dto.vatRegistrationDate
          ? new Date(dto.vatRegistrationDate)
          : dto.isVatPayer === false
            ? null
            : undefined,
        defaultVariableSymbolValue,
      },
    });
  }
}
