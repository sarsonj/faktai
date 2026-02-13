# CR-0010 - Seznam faktur: ikonové akce a proklik čísla dokladu

## 0. Metadata
- ID: `CR-0010`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
V tabulce vydaných faktur zabíraly textové akce příliš místa. Zároveň bylo zbytečné mít samostatnou akci `Zobrazit`, pokud je možné detail otevírat přímo přes číslo dokladu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - textové akce v posledním sloupci (`Zobrazit`, `Upravit`, `Kopie`, `PDF`, `Smazat`) byly vizuálně široké,
  - detail faktury se otevíral přes samostatný odkaz `Zobrazit`.
- Cílový stav:
  - akce v řádku jsou kompaktní ikonové ovladače,
  - číslo dokladu je hlavní viditelný proklik na detail faktury,
  - akce `Zobrazit` je odstraněna.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/index.css`
- Funkční specifikace:
  - Scope 2 (`Řádkové akce`, poznámka ke sloupci `Číslo dokladu`).

## 4. Návrh změn ve specifikaci
- Upravit Scope 2:
  - `Číslo dokladu` je odkaz na detail.
  - řádkové akce: `Upravit`, `Kopie`, `PDF`, `Smazat` (ikonově).

## 5. Akceptační kritéria
1. V tabulce faktur je `Číslo dokladu` klikací odkaz na detail.
2. Akce `Zobrazit` není v řádku přítomna.
3. `Upravit`, `Kopie`, `PDF`, `Smazat` jsou dostupné jako kompaktní ikonové akce.
4. Původní business pravidla akcí (`disabled`/`allowed`) zůstávají zachována.

## 6. Rizika a poznámky
- Riziko: ikonové akce mohou být méně čitelné bez popisku.
- Mitigace: každá akce má `title` a `aria-label` pro tooltip/assistive technologie.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke `/invoices`:
    - přítomnost prokliku na čísle dokladu,
    - přítomnost ikonových akcí,
    - absence textové akce `Zobrazit`.
- Výsledek:
  - implementováno a nasazeno v lokálním prostředí.
