# CR-0016 - DPH podklady: zjednodušení UI

## 0. Metadata
- ID: `CR-0016`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Obrazovka `DPH podklady` je po předchozí iteraci příliš informačně zatížená. Cílem je vrátit ji k jednodušší a praktičtější verzi, která ponechá jen nutné vstupy pro export XML.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - informační KPI blok (IČO, typ podání, výchozí perioda, název souboru),
  - akční tlačítka `Předchozí období` a `Aktuální období`.
- Cílový stav:
  - pouze základní formulářové prvky pro volbu exportu + akce `Export XML`,
  - bez doplňkových informačních bloků a rychlých periodických tlačítek.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/TaxReportsPage.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Na stránce `DPH podklady` nejsou zobrazeny KPI informační karty.
2. Na stránce `DPH podklady` nejsou zobrazena tlačítka `Předchozí období` ani `Aktuální období`.
3. Formulář exportu (typ podání, perioda, rok, měsíc/kvartál) a tlačítko `Export XML` zůstávají funkční.
4. Build frontendu projde bez chyby.

## 5. Implementace a ověření
- Commit(y): `viz git historie (CR-0016)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/tax-reports`
- Výsledek:
  - implementováno dle zadání.
