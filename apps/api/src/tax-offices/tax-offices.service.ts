import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

export type TaxOfficeCodebookItem = {
  pracufo: string;
  ufo: string;
  name: string;
};

type ParsedCodebook = {
  Ciselnik?: {
    Veta?: Array<Record<string, unknown>> | Record<string, unknown>;
  };
};

@Injectable()
export class TaxOfficesService {
  private cache: TaxOfficeCodebookItem[] | null = null;

  private resolveCodebookPath(): string {
    const candidates = [
      join(__dirname, '../../assets/tax/c_ufo.xml'),
      join(process.cwd(), 'assets/tax/c_ufo.xml'),
      join(process.cwd(), 'apps/api/assets/tax/c_ufo.xml'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Číselník finančních úřadů (c_ufo.xml) nebyl nalezen.',
    );
  }

  private loadCodebook(): TaxOfficeCodebookItem[] {
    if (this.cache) {
      return this.cache;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      trimValues: true,
    });
    const xml = readFileSync(this.resolveCodebookPath(), 'utf8');
    const parsed = parser.parse(xml) as ParsedCodebook;
    const rows = parsed.Ciselnik?.Veta;
    const vetas = Array.isArray(rows) ? rows : rows ? [rows] : [];

    const uniqueByPracufo = new Map<string, TaxOfficeCodebookItem>();

    for (const row of vetas) {
      const pracufo = String(row.k_ufo_vema ?? '').trim();
      const ufo = String(row.c_ufo ?? '').trim();
      const name = String(row.nazu_ufo ?? '').trim();

      if (!/^\d+$/.test(pracufo) || !/^\d+$/.test(ufo) || !name) {
        continue;
      }

      if (!uniqueByPracufo.has(pracufo)) {
        uniqueByPracufo.set(pracufo, { pracufo, ufo, name });
      }
    }

    const values = [...uniqueByPracufo.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'cs'),
    );

    if (values.length === 0) {
      throw new InternalServerErrorException(
        'Číselník finančních úřadů je prázdný nebo neplatný.',
      );
    }

    this.cache = values;
    return values;
  }

  listTaxOffices(): TaxOfficeCodebookItem[] {
    return this.loadCodebook().map((item) => ({ ...item }));
  }

  findByPracufo(pracufo: string): TaxOfficeCodebookItem | null {
    return (
      this.loadCodebook().find((item) => item.pracufo === pracufo) ?? null
    );
  }
}

