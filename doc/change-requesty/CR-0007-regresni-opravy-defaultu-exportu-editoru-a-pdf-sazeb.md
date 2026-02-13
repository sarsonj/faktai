# CR-0007 - Regresní opravy defaultů exportu, editoru a PDF sazeb

## 0. Metadata
- ID: `CR-0007`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Po předchozí várce změn zůstaly otevřené regresní připomínky v oblasti DPH exportu, editace faktur a finálního layoutu PDF. Cílem je sladit defaulty v UI s účetní praxí a odstranit poslední nekonzistence.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - Default období v DPH exportu nereflektovalo explicitně nastavení periodicity subjektu.
  - Požadovaný naming XML souborů nebyl v praxi jednoznačně ověřen.
  - U editace faktur nebyl potvrzený návrat na seznam po uložení.
  - V PDF se v souhrnu DPH u vyšších částek mohl zalomit sloupec `Celkem`.
- Cílový stav:
  - DPH obrazovka načte default periodu podle `vatPeriodType` subjektu a předvyplní předchozí období.
  - Exportované XML používá predikovatelné názvy:
    - `${ICO}_DPH_${YEAR}${PERIOD}M|Q.xml`
    - `${ICO}_DPHKH_${YEAR}${PERIOD}M|Q.xml`
  - Variabilní symbol zůstává u vydané faktury svázán s číslem faktury i po editaci.
  - Uložení editované faktury vrací uživatele na seznam.
  - PDF souhrn DPH nebalí částky v `Celkem` na dva řádky ani u větších částek.

## 3. Scope změny
- Funkční specifikace:
  - Scope 3 (workflow editoru v režimu edit)
  - Scope 4 (stabilita layoutu PDF souhrnu DPH)
  - Scope 5 (defaulty období a naming XML)
- Technická specifikace:
  - datový model subjektu (`vatPeriodType`)
  - API kontrakty `subject` a `tax-reports`
  - transakční pravidla pro `variableSymbol` u vystavených faktur
- Implementace:
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/20260213103500_subject_vat_period_type/migration.sql`
  - `apps/api/src/subject/dto/create-subject.dto.ts`
  - `apps/api/src/subject/dto/update-subject.dto.ts`
  - `apps/api/src/subject/subject.service.ts`
  - `apps/api/src/tax-reports/tax-reports.service.ts`
  - `apps/api/src/tax-reports/tax-reports.service.spec.ts`
  - `apps/api/src/invoice/invoice.service.ts`
  - `apps/web/src/types.ts`
  - `apps/web/src/components/SubjectForm.tsx`
  - `apps/web/src/pages/TaxReportsPage.tsx`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`

## 4. Návrh změn ve specifikaci
- Funkční:
  - doplnit default periodu dle nastavení subjektu (`měsíční/čtvrtletní`) a výchozí hodnotu na předchozí období,
  - zpřesnit naming XML o konkrétní tvar `PERIOD` (`01..12` / `1..4`),
  - potvrdit návrat na seznam po `Uložit` v režimu edit.
- Technická:
  - přidat `vatPeriodType` do modelu Subject (DB + DTO + API),
  - sjednotit chování backendu při editaci `issued` faktury: `variableSymbol = invoiceNumber`,
  - upravit šířky sloupců v PDF rekapitulaci DPH pro robustní rendering vyšších částek.

## 5. Akceptační kritéria
1. Po otevření `DPH podklady` je perioda předvyplněna dle `subject.vatPeriodType`.
2. Pro periodu `month` je default předchozí měsíc, pro `quarter` předchozí čtvrtletí.
3. Exportované XML soubory mají názvy dle formátu `${ICO}_DPH...` / `${ICO}_DPHKH...` včetně suffixu `M|Q`.
4. Při editaci vystavené faktury zůstává `variableSymbol` shodný s `invoiceNumber`.
5. Po `Uložit` v režimu edit se uživatel vrátí na seznam faktur.
6. V PDF souhrnu DPH se částky ve sloupci `Celkem` nezalamují na dva řádky při běžně očekávaných hodnotách.

## 6. Rizika a poznámky
- Riziko: Historické již vystavené faktury mohou mít starší hodnotu `variableSymbol`.
- Mitigace: Nově je hodnota přepsána při editaci a všech nových vystaveních.
- Riziko: Změna sloupců v PDF může ovlivnit extrémně dlouhé texty u jiných polí.
- Mitigace: Text je renderován jednřádkově s elipsou a layout zůstává stabilní.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test --runInBand`
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
  - smoke:
    - kontrola názvu XML v `Content-Disposition`,
    - kontrola `variableSymbol === invoiceNumber` po issue/edit,
    - PDF smoke s vyšší částkou (`>= 200 000 Kč`) bez zalomení v `Celkem`.
- Výsledek:
  - implementováno a ověřeno lokálními testy/buildy, API smoke testy a UI smoke testem v Playwright.
