import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

export type TaxOfficeCodebookItem = {
  pracufo: string;
  ufo: string;
  name: string;
};

type TaxOfficeRawRow = TaxOfficeCodebookItem & {
  endedAt: string;
};

type ParsedCodebook = {
  Ciselnik?: {
    Veta?: Array<Record<string, unknown>> | Record<string, unknown>;
  };
};

@Injectable()
export class TaxOfficesService {
  private cache: TaxOfficeCodebookItem[] | null = null;
  private rawRowsCache: TaxOfficeRawRow[] | null = null;

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

  private loadRawRows(): TaxOfficeRawRow[] {
    if (this.rawRowsCache) {
      return this.rawRowsCache;
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

    const rowsOut: TaxOfficeRawRow[] = [];

    for (const row of vetas) {
      const pracufo = String(row.k_ufo_vema ?? '').trim();
      const ufo = String(row.c_ufo ?? '').trim();
      const name = String(row.nazu_ufo ?? '').trim();
      const endedAt = String(row.d_zaniku ?? '').trim();

      if (!/^\d+$/.test(pracufo) || !/^\d+$/.test(ufo) || !name) {
        continue;
      }

      rowsOut.push({ pracufo, ufo, name, endedAt });
    }

    if (rowsOut.length === 0) {
      throw new InternalServerErrorException(
        'Číselník finančních úřadů je prázdný nebo neplatný.',
      );
    }

    this.rawRowsCache = rowsOut;
    return rowsOut;
  }

  private loadCodebook(): TaxOfficeCodebookItem[] {
    if (this.cache) {
      return this.cache;
    }

    const uniqueByPracufo = new Map<string, TaxOfficeRawRow>();
    for (const row of this.loadRawRows()) {
      const existing = uniqueByPracufo.get(row.pracufo);
      if (!existing) {
        uniqueByPracufo.set(row.pracufo, row);
        continue;
      }

      if (existing.endedAt && !row.endedAt) {
        uniqueByPracufo.set(row.pracufo, row);
      }
    }

    const values = [...uniqueByPracufo.values()].map(({ endedAt: _endedAt, ...item }) => item).sort((a, b) =>
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

  resolveParentUfoByPracufo(pracufo: string): string | null {
    if (!/^\d{4}$/.test(pracufo)) {
      return null;
    }

    const lookupKey = `${pracufo.slice(0, 2)}00`;
    const parent = this.loadRawRows().find(
      (item) => item.pracufo === lookupKey && item.endedAt === '',
    );

    return parent?.ufo ?? null;
  }
}
