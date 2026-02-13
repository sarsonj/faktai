# CR-0024 - Pokročilé zásahy do faktury (zanořený režim)

## 0. Metadata
- ID: `CR-0024`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Uživatel požaduje možnost výjimečných zásahů do faktur (změna čísla dokladu, editace uhrazené faktury, změna stavu uhrazená/neuhrazená), ale nechce tyto akce v primárním workflow.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - uhrazenou fakturu nešlo editovat,
  - neexistovala akce `uhrazená -> neuhrazená`,
  - číslo dokladu nešlo měnit.
- Cílový stav:
  - pokročilé akce dostupné jen v zanořené sekci `Více / Pokročilé zásahy`,
  - možnost změny čísla dokladu,
  - možnost přepnout uhrazenou fakturu zpět na neuhrazenou,
  - možnost odemknout editaci uhrazené faktury.

## 3. Scope změny
- Backend:
  - `apps/api/src/invoice/invoice.controller.ts`
  - `apps/api/src/invoice/invoice.service.ts`
  - `apps/api/src/invoice/dto/change-invoice-number.dto.ts`
- Frontend:
  - `apps/web/src/invoice-api.ts`
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. V detailu faktury je zanořená sekce s pokročilými akcemi.
2. Uhrazenou fakturu lze přepnout na neuhrazenou (`paid -> issued`).
3. Číslo dokladu lze změnit přes pokročilou akci; unikátnost je validována serverem.
4. U uhrazené faktury je dostupná odemčená editace přes speciální odkaz z pokročilé sekce.

## 5. Rizika a poznámky
- Pokročilé zásahy mohou ovlivnit návazné výstupy (PDF/XML), proto zůstávají mimo primární akce.
- Změna čísla dokladu může změnit i VS podle volby `synchronizovat VS`.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0024)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api typecheck`
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/api test`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: detail faktury -> pokročilé zásahy
- Výsledek:
  - implementováno dle zadání.
