# CR-0025 - Refaktor vzhledu detailu faktury

## 0. Metadata
- ID: `CR-0025`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Detail faktury byl vizuálně nepřehledný: akce byly roztříštěné do více bloků, sekce metadata působila technicky a souhrn částek nebyl účetně čitelný.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - akce k dokladu byly rozdělené do více samostatných sekcí,
  - pokročilé zásahy působily jako oddělený velký blok,
  - metadata byla prezentována technicky,
  - částky v tabulce/souhrnu nebyly konzistentně zarovnané vpravo.
- Cílový stav:
  - sjednocený detail s jasnou akční lištou,
  - pokročilé zásahy schované pod `Další možnosti`,
  - metadata převedená na srozumitelný blok `Informace o dokladu`,
  - numerické částky zarovnané doprava.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Detail faktury má sjednocený horní blok s hlavními akcemi.
2. Pokročilé zásahy jsou dostupné přes zanořenou volbu `Další možnosti`.
3. Sekce `Informace o dokladu` je rozdělena na čitelné datové karty.
4. Částky v tabulce položek a v souhrnu jsou zarovnané doprava.

## 5. Rizika a poznámky
- Změna je čistě prezentační (bez zásahu do API a business logiky).
- Pokročilé akce zůstávají funkčně zachované, jen jsou lépe zanořené.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0025)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: detail faktury + rozbalení `Další možnosti`
- Výsledek:
  - implementováno dle zadání.
