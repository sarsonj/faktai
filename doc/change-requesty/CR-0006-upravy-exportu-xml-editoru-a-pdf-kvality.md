# CR-0006 - Úpravy XML exportu, editoru faktur a kvality PDF

## 0. Metadata
- ID: `CR-0006`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Uživatel požaduje vyšší použitelnost daňových exportů a profesionální kvalitu PDF faktur. Současně je potřeba zjednodušit workflow DPH podkladů a sjednotit číselnou řadu faktur/variabilního symbolu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - DPH modul obsahuje i `Souhrnné hlášení`, mezikrok preview a historii exportů.
  - Názvy XML souborů nejsou jednoznačné podle IČO a typu podání.
  - Editor existující faktury nabízí i akce pro koncept/vystavení.
  - PDF mělo problémy s diakritikou, překryvy textů a nechtěnými prázdnými stránkami.
- Cílový stav:
  - V1 podporuje pouze export `Přiznání k DPH` a `Kontrolní hlášení`.
  - Export běží přímo tlačítkem `Export XML` bez preview a bez historie exportů.
  - Názvy souborů:
    - `${ICO}_DPH_${YEAR}${PERIOD}M|Q.xml`
    - `${ICO}_DPHKH_${YEAR}${PERIOD}M|Q.xml`
  - Číslo faktury i variabilní symbol jsou při vystavení sjednoceny na roční řadu `YYYYNN`.
  - V režimu editace faktury je hlavní akce pouze `Uložit`.
  - PDF používá embedded font s českou diakritikou a negeneruje prázdné stránky.

## 3. Scope změny
- Funkční specifikace:
  - Scope 3 (editor faktury)
  - Scope 4 (PDF export)
  - Scope 5 (DPH podklady)
- Technická specifikace:
  - API kontrakty tax reports
  - transakční scénáře XML exportu
  - potvrzená rozhodnutí (číselná řada)
- Implementace:
  - `apps/web/src/pages/TaxReportsPage.tsx`
  - `apps/web/src/tax-reports-api.ts`
  - `apps/web/src/types.ts`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/api/src/tax-reports/tax-reports.controller.ts`
  - `apps/api/src/tax-reports/tax-reports.service.ts`
  - `apps/api/src/tax-reports/tax-reports.service.spec.ts`
  - `apps/api/src/invoice/invoice.service.ts`
  - `infra/docker/api.Dockerfile`
  - `apps/api/assets/fonts/NotoSans-Regular.ttf`
  - `apps/api/assets/fonts/NotoSans-Bold.ttf`

## 4. Návrh změn ve specifikaci
- Funkční:
  - odebrat `Souhrnné hlášení`, preview krok a historii exportů z Scope 5,
  - upravit akce editoru v režimu editace na `Uložit`,
  - doplnit pravidla kvality PDF (diakritika, bez překryvů, bez prázdných stran),
  - sjednotit pravidlo číselné řady a VS (`YYYYNN`).
- Technická:
  - odebrat endpoint `GET /tax-reports/runs`,
  - zpřesnit naming exportovaných XML souborů,
  - popsat přímý export XML bez perzistence historie běhů v UI.

## 5. Akceptační kritéria
1. V DPH podkladech je dostupný pouze export `Přiznání k DPH` a `Kontrolní hlášení`.
2. `Souhrnné hlášení` je na API odmítnuto s `400`.
3. Exportované XML má názvy ve formátu `${ICO}_DPH_...` / `${ICO}_DPHKH_...`.
4. Obrazovka DPH podkladů používá specifický dropdown `Měsíc`/`Kvartál` podle zvolené periody.
5. UI neobsahuje historii exportů ani tlačítko `Vypočítat podklady`.
6. Při vystavení faktury se `invoiceNumber` i `variableSymbol` nastaví na stejnou hodnotu roční řady (`YYYYNN`).
7. Editor existující faktury nabízí hlavní akci pouze `Uložit`.
8. PDF export používá embedded font s podporou češtiny, neobsahuje překryvy textu a negeneruje prázdné stránky.

## 6. Rizika a poznámky
- Riziko: v DB zůstává enum hodnota `summary_statement` z předchozího návrhu.
- Mitigace: API ji explicitně blokuje a UI ji nenabízí.
- Riziko: při extrémně dlouhých položkách může docházet k ořezu textu na jeden řádek.
- Mitigace: text je záměrně elipsovaný, aby nepoškodil layout a negeneroval přetečení stránek.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test --runInBand`
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
  - smoke přes API:
    - `tax-reports/export` názvy souborů (`DPH`, `DPHKH`),
    - `summary_statement` vrací `400`,
    - `issue` nastaví `invoiceNumber=variableSymbol` (`202601`),
    - PDF kontrola přes `pdfinfo` (`Pages: 1`) a `pdffonts` (embedded `NotoSans`).
- Výsledek:
  - implementováno a ověřeno lokálními testy/buildy a smoke kontrolou exportů/PDF.
