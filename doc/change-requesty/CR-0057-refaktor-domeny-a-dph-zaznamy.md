# CR-0057 - Refaktor domény a vrstva DPH záznamů

## 0. Metadata
- ID: `CR-0057`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
- Před dalšími funkcemi (API klíče, přijaté doklady, dobropisy) je potřeba připravit architekturu, na které půjdou postavit bez přepisování.
- `InvoiceService` měl 2 245 řádků. Míchal číslování, výpočty, životní cyklus, PDF, IBAN/QR a mapování odpovědí.
- Daňová podání četla přímo tabulku faktur. S přijatými doklady by se celé mapování přiznání a KH muselo přepsat.

## 2. Cílový stav
- Čistá doména bez Nestu a DB:
  - výpočty faktury,
  - validace vystavení,
  - číslování,
  - snapshot dodavatele,
  - QR platba.
- Samostatný `InvoicePdfRenderer` a `invoice.mapper.ts`.
- `InvoiceService` (917 řádků) obsahuje jen životní cyklus dokladu a práci s DB.
- Vrstva **DPH záznamů** (`tax/vat-entries.ts`): doklad → záznamy po sazbách se směrem `output`/`input`, režimem, základem, daní, DUZP, dokladem a protistranou.
- Mapování přiznání k DPH a kontrolního hlášení jsou čisté funkce nad DPH záznamy. `TaxReportsService` jen načte doklady, převede je na záznamy a sestaví XML.
- Záznamy `input` mapování zatím ignoruje. Zapojí se s přijatými doklady (ř. 40–41, KH B.1–B.3).

## 3. Scope změny
- API – nové soubory:
  - `invoice/domain/*`,
  - `invoice/payment/payment-qr.ts`,
  - `invoice/pdf/invoice-pdf.renderer.ts`,
  - `invoice/invoice.mapper.ts`,
  - `tax/vat-entries.ts`,
  - `tax-reports/mapping/*`.
- API – upravené soubory:
  - `InvoiceService`,
  - `InvoiceModule` (registrace rendereru),
  - `TaxReportsService`.
- Chování, API, datový model ani XML výstupy se nemění.
- Jediná drobná změna je v náhledu KH (preview endpoint, web ho nepoužívá): `a5` je `null`, pokud je oddíl prázdný, a částky jsou formátované stringy.
- Dokumentace: `doc/tecnicka-specifikace.md` 2.3.

## 4. Akceptační kritéria
1. Všechny stávající testy projdou beze změny očekávání, včetně XSD validovaných exportů DP3/KH a PDF testů.
2. Testy pravidel DPH volají čisté funkce přímo (bez přístupu k privátním metodám služby).
3. Nové unit testy:
   - převod faktury na DPH záznamy (seskupení po sazbách, chybějící režim, faktury před registrací k DPH),
   - mapování ignoruje záznamy `input`,
   - hranice 10 000 Kč pro A.4 a A.5.

## 5. Rizika a poznámky
- Refaktor je mechanický, provedený přesunem kódu. Riziko regrese kryjí stávající testy exportů, které porovnávají konkrétní hodnoty řádků a validují XML proti XSD.
- `createDraft`, `updateInvoice` a `copyInvoice` mají stále podobné bloky mapování DTO → DB. Sjednotí se s přijatými doklady, až bude jasný společný tvar dokladu.

## 6. Implementace a ověření
- Commit(y): `refactor(api): extract invoice domain modules and VAT entry layer`
- Test plan: `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` (64 testů), `pnpm -r build`.
- Výsledek: vše prošlo.
