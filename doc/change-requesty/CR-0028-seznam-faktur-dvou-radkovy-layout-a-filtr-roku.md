# CR-0028 - Seznam faktur: dvouřádkový layout a filtr roku

## 0. Metadata
- ID: `CR-0028`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
V tabulkovém seznamu faktur docházelo k nežádoucím zalamováním textu a částek, což zhoršovalo čitelnost. Současně chyběl praktický filtr na rok, který je pro denní práci s doklady klíčový.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - více sloupců vedlo k zalamování hodnot na více řádků,
  - v některých šířkách vznikal horizontální overflow tabulky,
  - nebylo možné filtrovat seznam podle roku.
- Cílový stav:
  - seznam používá čitelný dvouřádkový layout v každém řádku,
  - částky a akce se nezalamují nevhodně,
  - filtr `Rok` je vedle filtru stavu,
  - výchozí výběr roku je aktuální rok,
  - dropdown roku nabízí jen roky, pro které existují doklady.

## 3. Scope změny
- Backend:
  - `apps/api/src/invoice/dto/list-invoices.query.dto.ts`
  - `apps/api/src/invoice/invoice.service.ts`
  - `apps/api/src/invoice/invoice.service.spec.ts`
- Frontend:
  - `apps/web/src/invoice-api.ts`
  - `apps/web/src/types.ts`
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Seznam faktur má dvouřádkový layout řádků bez nežádoucího horizontálního scrollu v běžném desktop layoutu aplikace.
2. Částky jsou v seznamu pravostranně zarovnané a používají tabulkové číslice.
3. Filtr `Rok` je dostupný v horním filtru seznamu a defaultně vybírá aktuální rok.
4. Dropdown `Rok` zobrazuje jen roky, pro které existují doklady daného subjektu.
5. Při změně roku se resetuje stránkování na stranu `1`.

## 5. Rizika a poznámky
- Pro získání `availableYears` je použit SQL dotaz přes `EXTRACT(YEAR FROM issueDate)`.
- Vyhledávání (`q`) je nadále v API zachováno, i když je ve UI v1 vypnuté.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0028)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api typecheck`
  - `pnpm --filter @tappyfaktur/api test`
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: seznam faktur (`/invoices`) + změna filtru roku
- Výsledek:
  - implementováno dle zadání.
