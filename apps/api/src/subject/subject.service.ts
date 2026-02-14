import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DefaultVariableSymbolType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TaxOfficesService } from '../tax-offices/tax-offices.service';
import { isValidIco } from '../utils/czech-validators';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxOfficesService: TaxOfficesService,
  ) {}

  private normalizeIco(ico: string): string {
    return ico.replace(/\s+/g, '');
  }

  private normalizePostalCode(postalCode: string): string {
    return postalCode.replace(/\s+/g, '');
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private validateBusinessRules(payload: {
    ico?: string;
    dic?: string | null;
    isVatPayer?: boolean;
    vatRegistrationDate?: Date | null;
    taxOfficePracufo?: string | null;
    defaultVariableSymbolType?: DefaultVariableSymbolType;
    defaultVariableSymbolValue?: string | null;
  }) {
    if (payload.ico && !isValidIco(payload.ico)) {
      throw new BadRequestException('IČO není platné (kontrolní součet).');
    }

    if (payload.isVatPayer) {
      if (!payload.dic) {
        throw new BadRequestException('DIČ je povinné pro plátce DPH.');
      }
      if (!payload.vatRegistrationDate) {
        throw new BadRequestException(
          'Datum registrace DPH je povinné pro plátce DPH.',
        );
      }
      if (!payload.taxOfficePracufo) {
        throw new BadRequestException(
          'Místní příslušnost finančního úřadu je povinná pro plátce DPH.',
        );
      }

      if (!this.taxOfficesService.findByPracufo(payload.taxOfficePracufo)) {
        throw new BadRequestException(
          'Vybraná místní příslušnost finančního úřadu není platná.',
        );
      }
    }

    if (
      payload.defaultVariableSymbolType === 'custom' &&
      !payload.defaultVariableSymbolValue
    ) {
      throw new BadRequestException(
        'Pro vlastní variabilní symbol musíte vyplnit jeho hodnotu.',
      );
    }
  }

  async getSubject(userId: string) {
    const subject = await this.prisma.subject.findUnique({ where: { userId } });
    if (!subject) {
      throw new NotFoundException('Subjekt nebyl nalezen.');
    }
    return subject;
  }

  async createSubject(userId: string, dto: CreateSubjectDto) {
    const exists = await this.prisma.subject.findUnique({ where: { userId } });
    if (exists) {
      throw new ConflictException('Subjekt již existuje.');
    }

    const payload: Prisma.SubjectCreateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      businessName: dto.businessName,
      ico: this.normalizeIco(dto.ico),
      dic: dto.dic,
      isVatPayer: dto.isVatPayer,
      vatPeriodType: dto.vatPeriodType ?? 'quarter',
      vatRegistrationDate: dto.vatRegistrationDate
        ? new Date(dto.vatRegistrationDate)
        : null,
      taxOfficePracufo: dto.isVatPayer ? (dto.taxOfficePracufo ?? null) : null,
      contactPhone: this.normalizeOptionalText(dto.contactPhone),
      contactEmail: this.normalizeOptionalText(dto.contactEmail),
      street: dto.street,
      city: dto.city,
      postalCode: this.normalizePostalCode(dto.postalCode),
      countryCode: dto.countryCode,
      bankAccountPrefix: dto.bankAccountPrefix,
      bankAccountNumber: dto.bankAccountNumber,
      bankCode: dto.bankCode,
      defaultVariableSymbolType: dto.defaultVariableSymbolType,
      defaultVariableSymbolValue:
        dto.defaultVariableSymbolType === 'custom'
          ? (dto.defaultVariableSymbolValue ?? null)
          : null,
      defaultDueDays: dto.defaultDueDays,
      user: { connect: { id: userId } },
    };

    this.validateBusinessRules({
      ico: payload.ico,
      dic: payload.dic,
      isVatPayer: payload.isVatPayer,
      vatRegistrationDate: payload.vatRegistrationDate as
        | Date
        | null
        | undefined,
      taxOfficePracufo: payload.taxOfficePracufo,
      defaultVariableSymbolType: payload.defaultVariableSymbolType,
      defaultVariableSymbolValue: payload.defaultVariableSymbolValue,
    });

    return this.prisma.subject.create({ data: payload });
  }

  async updateSubject(userId: string, dto: UpdateSubjectDto) {
    const current = await this.prisma.subject.findUnique({ where: { userId } });
    if (!current) {
      throw new NotFoundException('Subjekt nebyl nalezen.');
    }

    const merged = {
      ...current,
      ...dto,
      ico: dto.ico ? this.normalizeIco(dto.ico) : current.ico,
      postalCode: dto.postalCode
        ? this.normalizePostalCode(dto.postalCode)
        : current.postalCode,
      vatRegistrationDate: dto.vatRegistrationDate
        ? new Date(dto.vatRegistrationDate)
        : dto.isVatPayer === false
          ? null
          : current.vatRegistrationDate,
      taxOfficePracufo:
        dto.isVatPayer === false
          ? null
          : (dto.taxOfficePracufo ?? current.taxOfficePracufo),
      contactPhone:
        dto.contactPhone !== undefined
          ? this.normalizeOptionalText(dto.contactPhone)
          : current.contactPhone,
      contactEmail:
        dto.contactEmail !== undefined
          ? this.normalizeOptionalText(dto.contactEmail)
          : current.contactEmail,
    };

    const defaultVariableSymbolValue =
      merged.defaultVariableSymbolType === 'custom'
        ? (dto.defaultVariableSymbolValue ?? current.defaultVariableSymbolValue)
        : null;

    this.validateBusinessRules({
      ico: merged.ico,
      dic: merged.dic,
      isVatPayer: merged.isVatPayer,
      vatRegistrationDate: merged.vatRegistrationDate,
      taxOfficePracufo: merged.taxOfficePracufo,
      defaultVariableSymbolType: merged.defaultVariableSymbolType,
      defaultVariableSymbolValue,
    });

    return this.prisma.subject.update({
      where: { userId },
      data: {
        ...dto,
        ico: dto.ico ? this.normalizeIco(dto.ico) : undefined,
        postalCode: dto.postalCode
          ? this.normalizePostalCode(dto.postalCode)
          : undefined,
        vatRegistrationDate: dto.vatRegistrationDate
          ? new Date(dto.vatRegistrationDate)
          : dto.isVatPayer === false
            ? null
            : undefined,
        taxOfficePracufo:
          dto.isVatPayer === false
            ? null
            : (dto.taxOfficePracufo ?? undefined),
        contactPhone:
          dto.contactPhone !== undefined
            ? this.normalizeOptionalText(dto.contactPhone)
            : undefined,
        contactEmail:
          dto.contactEmail !== undefined
            ? this.normalizeOptionalText(dto.contactEmail)
            : undefined,
        defaultVariableSymbolValue,
        vatPeriodType: dto.vatPeriodType,
      },
    });
  }

  listTaxOffices() {
    return this.taxOfficesService.listTaxOffices();
  }
}
