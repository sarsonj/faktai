export type BankDirectoryEntry = {
  code: string;
  name: string;
  bic?: string;
  certis: boolean;
};

// Zdroj: ČNB, Číselník kódů platebního styku v ČR (verze 250, platnost od 2026-02-01).
// Export držíme lokálně ve webu, aby formuláře nebyly závislé na dostupnosti externího zdroje.
export const BANK_DIRECTORY_SOURCE = {
  authority: 'ČNB',
  title: 'Číselník kódů platebního styku v České republice (ČKPS)',
  version: '250',
  validFrom: '2026-02-01',
  downloadedAt: '2026-03-13',
  url: 'https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/',
} as const;

export const BANK_DIRECTORY: readonly BankDirectoryEntry[] = [
  { code: '0100', name: 'Komerční banka, a.s.', bic: 'KOMBCZPP', certis: true },
  { code: '0300', name: 'Československá obchodní banka, a. s.', bic: 'CEKOCZPP', certis: true },
  { code: '0600', name: 'MONETA Money Bank, a.s.', bic: 'AGBACZPP', certis: true },
  { code: '0710', name: 'ČESKÁ NÁRODNÍ BANKA', bic: 'CNBACZPP', certis: true },
  { code: '0800', name: 'Česká spořitelna, a.s.', bic: 'GIBACZPX', certis: true },
  { code: '2010', name: 'Fio banka, a.s.', bic: 'FIOBCZPP', certis: true },
  { code: '2060', name: 'Citfin, spořitelní družstvo', bic: 'CITFCZPP', certis: true },
  { code: '2070', name: 'TRINITY BANK a.s.', bic: 'MPUBCZPP', certis: true },
  { code: '2100', name: 'ČSOB Hypoteční banka, a.s.', certis: true },
  { code: '2200', name: 'Peněžní dům, spořitelní družstvo', certis: true },
  { code: '2220', name: 'Artesa, spořitelní družstvo', bic: 'ARTTCZPP', certis: true },
  { code: '2250', name: 'Banka CREDITAS a.s.', bic: 'CTASCZ22', certis: true },
  { code: '2260', name: 'NEY spořitelní družstvo', certis: true },
  { code: '2600', name: 'Citibank Europe plc, organizační složka', bic: 'CITICZPX', certis: true },
  { code: '2700', name: 'UniCredit Bank Czech Republic and Slovakia, a.s.', bic: 'BACXCZPP', certis: true },
  { code: '3030', name: 'Air Bank a.s.', bic: 'AIRACZPP', certis: true },
  { code: '3060', name: 'PKO BP S.A., Czech Branch', bic: 'BPKOCZPP', certis: true },
  { code: '3500', name: 'ING Bank N.V.', bic: 'INGBCZPP', certis: true },
  { code: '4300', name: 'Národní rozvojová banka, a.s.', bic: 'NROZCZPP', certis: true },
  { code: '5500', name: 'Raiffeisenbank a.s.', bic: 'RZBCCZPP', certis: true },
  { code: '5800', name: 'J&T BANKA, a.s.', bic: 'JTBPCZPP', certis: true },
  { code: '6000', name: 'PPF banka a.s.', bic: 'PMBPCZPP', certis: true },
  { code: '6200', name: 'COMMERZBANK Aktiengesellschaft, pobočka Praha', bic: 'COBACZPX', certis: true },
  { code: '6210', name: 'mBank S.A., organizační složka', bic: 'BREXCZPP', certis: true },
  { code: '6300', name: 'BNP Paribas S.A., pobočka Česká republika', bic: 'GEBACZPP', certis: true },
  { code: '6363', name: 'Partners Banka, a.s.', certis: true },
  { code: '6600', name: 'Banking Circle S.A., Czech Republic', certis: false },
  { code: '6700', name: 'Všeobecná úverová banka a.s., pobočka Praha', bic: 'SUBACZPP', certis: true },
  { code: '6800', name: 'Sberbank CZ, a.s. v likvidaci', bic: 'VBOECZ2X', certis: true },
  { code: '7910', name: 'Deutsche Bank Aktiengesellschaft Filiale Prag, organizační složka', bic: 'DEUTCZPX', certis: true },
  { code: '7950', name: 'Raiffeisen stavební spořitelna a.s.', certis: true },
  { code: '7960', name: 'ČSOB Stavební spořitelna, a.s.', certis: true },
  { code: '7970', name: 'MONETA Stavební Spořitelna, a.s.', certis: true },
  { code: '7990', name: 'Modrá pyramida stavební spořitelna, a.s.', certis: true },
  { code: '8030', name: 'Volksbank Raiffeisenbank Nordoberpfalz eG pobočka Cheb', bic: 'GENOCZ21', certis: true },
  { code: '8040', name: 'Oberbank AG pobočka Česká republika', bic: 'OBKLCZ2X', certis: true },
  { code: '8060', name: 'Stavební spořitelna České spořitelny, a.s.', certis: true },
  { code: '8090', name: 'Česká exportní banka, a.s.', bic: 'CZEECZPP', certis: true },
  { code: '8150', name: 'HSBC Continental Europe, Czech Republic', bic: 'MIDLCZPP', certis: true },
  { code: '8190', name: 'Sparkasse Oberlausitz-Niederschlesien', certis: true },
  { code: '8198', name: 'FAS finance company s.r.o.', bic: 'FFCSCZP1', certis: false },
  { code: '8220', name: 'Payment execution s.r.o.', bic: 'PAERCZP1', certis: false },
  { code: '8250', name: 'Bank of China (CEE) Ltd. Prague Branch', bic: 'BKCHCZPP', certis: true },
  { code: '8255', name: 'Bank of Communications Co., Ltd., Prague Branch odštěpný závod', bic: 'COMMCZPP', certis: true },
  { code: '8265', name: 'Industrial and Commercial Bank of China Limited, Prague Branch, odštěpný závod', bic: 'ICBKCZPP', certis: true },
  { code: '8500', name: 'Multitude Bank p.l.c.', certis: true },
  { code: '8610', name: 'Devizová burza a.s.', certis: false },
  { code: '8660', name: 'PAYMONT, UAB', certis: true },
];

const BANK_DIRECTORY_BY_CODE = new Map(BANK_DIRECTORY.map((entry) => [entry.code, entry] as const));

export function normalizeBankCode(value: string): string {
  return value.replace(/\D+/g, '').slice(0, 4);
}

export function findBankByCode(value: string): BankDirectoryEntry | null {
  return BANK_DIRECTORY_BY_CODE.get(normalizeBankCode(value)) ?? null;
}

export type BankCodeFeedback =
  | { tone: 'neutral'; message: string }
  | { tone: 'valid'; message: string; bank: BankDirectoryEntry }
  | { tone: 'error'; message: string };

export function getBankCodeFeedback(value: string): BankCodeFeedback | null {
  const normalized = normalizeBankCode(value);
  if (!normalized) {
    return null;
  }
  if (normalized.length < 4) {
    return { tone: 'neutral', message: 'Kód banky má 4 číslice.' };
  }
  const bank = findBankByCode(normalized);
  if (!bank) {
    return { tone: 'error', message: 'Kód banky není v aktuálním číselníku ČNB.' };
  }
  return { tone: 'valid', message: `Banka: ${bank.name}`, bank };
}
