import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type RegistryCompanyResult = {
  name: string;
  ico: string;
  dic: string | null;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

export type RegistryAddressResult = {
  id: string;
  displayName: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

type AresSubject = {
  ico?: string;
  icoId?: string;
  obchodniJmeno?: string;
  dic?: string;
  sidlo?: {
    kodStatu?: string;
    nazevObce?: string;
    nazevUlice?: string;
    cisloDomovni?: number | string;
    cisloOrientacni?: number | string;
    cisloOrientacniPismeno?: string;
    textovaAdresa?: string;
    psc?: number | string;
    pscTxt?: string;
  };
};

type AresSearchResponse = {
  ekonomickeSubjekty?: AresSubject[];
};

type NominatimRecord = {
  place_id: number;
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    hamlet?: string;
    postcode?: string;
    country_code?: string;
  };
};

@Injectable()
export class RegistryService {
  private readonly aresBaseUrl =
    'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private readonly config: ConfigService) {}

  private getRegistryTimeoutMs(): number {
    return Number(this.config.get('REGISTRY_TIMEOUT_MS') ?? 6000);
  }

  private getRegistryUserAgent(): string {
    return (
      this.config.get<string>('REGISTRY_USER_AGENT') ??
      'tappyfaktur/1.0 (+https://tappytaps.cz)'
    );
  }

  private normalizeIco(value: string): string {
    return value.replace(/\s+/g, '');
  }

  private normalizePostalCode(value?: string | number | null): string {
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'string') {
      return value.replace(/\s+/g, '');
    }
    return '';
  }

  private normalizeOptionalText(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.getRegistryTimeoutMs(),
    );

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 404) {
          throw new NotFoundException('Záznam nebyl nalezen.');
        }
        throw new ServiceUnavailableException(
          'Veřejný registr je dočasně nedostupný.',
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new ServiceUnavailableException(
        'Veřejný registr je dočasně nedostupný.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveAresStreet(sidlo?: AresSubject['sidlo']): string {
    if (!sidlo) {
      return '';
    }

    const street = this.normalizeOptionalText(sidlo.nazevUlice) ?? '';
    const house = this.normalizeOptionalText(
      sidlo.cisloDomovni !== undefined ? String(sidlo.cisloDomovni) : undefined,
    );
    const orient = this.normalizeOptionalText(
      sidlo.cisloOrientacni !== undefined
        ? String(sidlo.cisloOrientacni)
        : undefined,
    );
    const orientLetter =
      this.normalizeOptionalText(sidlo.cisloOrientacniPismeno) ?? '';

    const orientation = orient ? `${orient}${orientLetter}` : '';
    const housePart =
      house && orientation ? `${house}/${orientation}` : (house ?? orientation);

    if (street && housePart) {
      return `${street} ${housePart}`;
    }
    if (street) {
      return street;
    }
    if (housePart) {
      return housePart;
    }

    const fallback = this.normalizeOptionalText(sidlo.textovaAdresa);
    if (!fallback) {
      return '';
    }
    return fallback.split(',')[0]?.trim() ?? '';
  }

  private resolveAresIco(subject: AresSubject): string | null {
    const direct = this.normalizeOptionalText(subject.ico);
    if (direct && /^\d{8}$/.test(direct)) {
      return direct;
    }

    const maybeIcoId = this.normalizeOptionalText(subject.icoId);
    if (maybeIcoId && /^\d{8}$/.test(maybeIcoId)) {
      return maybeIcoId;
    }

    return null;
  }

  private mapAresSubject(subject: AresSubject): RegistryCompanyResult | null {
    const ico = this.resolveAresIco(subject);
    const name = this.normalizeOptionalText(subject.obchodniJmeno);
    if (!ico || !name) {
      return null;
    }

    return {
      name,
      ico,
      dic: this.normalizeOptionalText(subject.dic),
      street: this.resolveAresStreet(subject.sidlo),
      city: this.normalizeOptionalText(subject.sidlo?.nazevObce) ?? '',
      postalCode: this.normalizePostalCode(
        subject.sidlo?.psc ?? subject.sidlo?.pscTxt,
      ),
      countryCode: (
        this.normalizeOptionalText(subject.sidlo?.kodStatu) ?? 'CZ'
      ).toUpperCase(),
    };
  }

  async findCompanyByIco(rawIco: string): Promise<RegistryCompanyResult> {
    const ico = this.normalizeIco(rawIco);
    if (!/^\d{8}$/.test(ico)) {
      throw new BadRequestException('IČO musí obsahovat přesně 8 číslic.');
    }

    const url = `${this.aresBaseUrl}/${ico}`;
    const subject = await this.fetchJson<AresSubject>(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    const mapped = this.mapAresSubject(subject);
    if (!mapped) {
      throw new NotFoundException('Subjekt nebyl nalezen.');
    }

    return mapped;
  }

  async searchCompanies(query: string): Promise<RegistryCompanyResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException(
        'Vyhledávací dotaz musí mít alespoň 2 znaky.',
      );
    }

    const sanitizedIco = this.normalizeIco(trimmed);
    if (/^\d{8}$/.test(sanitizedIco)) {
      try {
        const company = await this.findCompanyByIco(sanitizedIco);
        return [company];
      } catch (err) {
        if (err instanceof NotFoundException) {
          return [];
        }
        throw err;
      }
    }

    const response = await this.fetchJson<AresSearchResponse>(
      `${this.aresBaseUrl}/vyhledat`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ obchodniJmeno: trimmed }),
      },
    );

    const items = (response.ekonomickeSubjekty ?? [])
      .map((item) => this.mapAresSubject(item))
      .filter((item): item is RegistryCompanyResult => Boolean(item));

    const deduped = new Map<string, RegistryCompanyResult>();
    for (const item of items) {
      if (!deduped.has(item.ico)) {
        deduped.set(item.ico, item);
      }
    }

    return Array.from(deduped.values()).slice(0, 10);
  }

  private mapAddressRecord(
    record: NominatimRecord,
  ): RegistryAddressResult | null {
    const streetBase = this.normalizeOptionalText(record.address?.road) ?? '';
    const houseNumber =
      this.normalizeOptionalText(record.address?.house_number) ?? '';
    const street = [streetBase, houseNumber].filter(Boolean).join(' ').trim();
    const city =
      this.normalizeOptionalText(record.address?.city) ??
      this.normalizeOptionalText(record.address?.town) ??
      this.normalizeOptionalText(record.address?.village) ??
      this.normalizeOptionalText(record.address?.municipality) ??
      this.normalizeOptionalText(record.address?.suburb) ??
      this.normalizeOptionalText(record.address?.hamlet) ??
      '';
    const postalCode = this.normalizePostalCode(record.address?.postcode);
    const countryCode = (
      this.normalizeOptionalText(record.address?.country_code) ?? 'CZ'
    ).toUpperCase();
    const displayName = this.normalizeOptionalText(record.display_name) ?? '';

    if (!displayName || (!street && !city && !postalCode)) {
      return null;
    }

    return {
      id: String(record.place_id),
      displayName,
      street,
      city,
      postalCode,
      countryCode,
    };
  }

  async searchAddresses(query: string): Promise<RegistryAddressResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException(
        'Vyhledávací dotaz adresy musí mít alespoň 3 znaky.',
      );
    }

    const url = new URL(this.nominatimUrl);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'cz');
    url.searchParams.set('limit', '8');
    url.searchParams.set('q', trimmed);

    const records = await this.fetchJson<NominatimRecord[]>(url.toString(), {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'cs',
        'User-Agent': this.getRegistryUserAgent(),
      },
    });

    return records
      .map((record) => this.mapAddressRecord(record))
      .filter((item): item is RegistryAddressResult => Boolean(item));
  }
}
