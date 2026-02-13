import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistryService } from './registry.service';

describe('RegistryService', () => {
  const config = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'REGISTRY_TIMEOUT_MS':
          return 1000;
        case 'REGISTRY_USER_AGENT':
          return 'tappyfaktur-test/1.0';
        default:
          return undefined;
      }
    }),
  } as unknown as ConfigService;

  let service: RegistryService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new RegistryService(config);
  });

  it('normalizes ICO and maps ARES response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ico: '27074358',
        obchodniJmeno: 'Asseco Central Europe, a.s.',
        dic: 'CZ27074358',
        sidlo: {
          kodStatu: 'CZ',
          nazevObce: 'Praha',
          nazevUlice: 'Budějovická',
          cisloDomovni: 778,
          cisloOrientacni: 3,
          cisloOrientacniPismeno: 'a',
          psc: 14000,
        },
      }),
    });

    const result = await service.findCompanyByIco('2707 4358');

    expect(fetchMock).toHaveBeenCalled();
    expect(result.ico).toBe('27074358');
    expect(result.city).toBe('Praha');
    expect(result.street).toBe('Budějovická 778/3a');
  });

  it('rejects invalid company search query', async () => {
    await expect(service.searchCompanies('x')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps address records from nominatim', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 1,
          display_name: 'Budějovická 778/3a, Praha, Česko',
          address: {
            road: 'Budějovická',
            house_number: '778/3a',
            city: 'Praha',
            postcode: '140 00',
            country_code: 'cz',
          },
        },
      ],
    });

    const result = await service.searchAddresses('Budějovická 778');

    expect(result).toHaveLength(1);
    expect(result[0].street).toBe('Budějovická 778/3a');
    expect(result[0].postalCode).toBe('14000');
  });
});
