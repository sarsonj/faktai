# CR-0023 - Fix regrese čísla faktury a UX nové faktury

## 0. Metadata
- ID: `CR-0023`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Po CR-0022 vznikla regrese: při otevření stránky nové faktury nebylo ihned vyplněné číslo dokladu ani variabilní symbol. Současně uživatel upřesnil, že číslo faktury nechce editovat jako formulářové pole.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - číslo faktury i VS byly dostupné až po prvním uložení,
  - číslo faktury bylo v editoru jako editovatelné pole.
- Cílový stav:
  - při otevření nové faktury se číslo dokladu okamžitě přidělí,
  - nadpis stránky je `Nová faktura {číslo}`,
  - VS je defaultně vyplněn stejnou hodnotou,
  - číslo dokladu není v editoru jako input field.

## 3. Scope změny
- Backend:
  - `apps/api/src/invoice/invoice.controller.ts`
  - `apps/api/src/invoice/invoice.service.ts`
  - `apps/api/src/invoice/dto/reserve-invoice-number.dto.ts`
- Frontend:
  - `apps/web/src/invoice-api.ts`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Po otevření nové faktury je přiděleno číslo dokladu bez nutnosti prvního uložení.
2. Nadpis stránky obsahuje přidělené číslo (`Nová faktura {číslo}`).
3. VS je automaticky předvyplněn stejnou hodnotou jako číslo dokladu.
4. Číslo faktury není v UI editovatelné pole.
5. Při změně roku v `Datum vystavení` se přidělí číslo z odpovídající roční řady.

## 5. Rizika a poznámky
- Rezervace čísla probíhá při otevření formuláře a při změně roku; nevyužité rezervace mohou vytvářet mezery v řadě.
- Backend má zachované validační guardy na unikátnost čísla dokladu.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0023)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api typecheck`
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/api test`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/invoices/new` (nadpis + default VS)
    - změna roku v `Datum vystavení` (nové číslo roční řady)
- Výsledek:
  - implementováno dle zadání.
