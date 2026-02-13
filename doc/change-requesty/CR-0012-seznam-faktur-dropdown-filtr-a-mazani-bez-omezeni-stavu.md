# CR-0012 - Seznam faktur: dropdown filtr a mazání bez omezení stavu

## 0. Metadata
- ID: `CR-0012`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Uživatel požaduje čistší ovládání seznamu faktur a méně restriktivní mazání dokladů. Cílem je snížit vizuální šum a zjednodušit administrativní workflow.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - stavový filtr byl řešen výraznými chip tlačítky,
  - v UI byl zbytečný informační text o vypnutém fulltextu,
  - mazání bylo v UI/backendu omezeno jen na `draft` (v poslední iteraci s chybovou hláškou).
- Cílový stav:
  - stavový filtr je nenápadný dropdown (`Všechny/Uhrazené/Neuhrazené/Po splatnosti`),
  - pomocný text o fulltextu je odstraněn,
  - mazání je povoleno i pro vystavené faktury (bez blokace podle stavu).

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/index.css`
- Backend:
  - `apps/api/src/invoice/invoice.service.ts`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`

## 4. Návrh změn ve specifikaci
- Scope 2/3:
  - mazání faktur není omezeno pouze na `draft`.
- UI seznamu:
  - stavový filtr přes dropdown místo chip tlačítek.

## 5. Akceptační kritéria
1. Na stránce `/invoices` je stavový filtr zobrazen jako dropdown.
2. Text „Zobrazeny jsou poslední doklady...“ se na stránce nezobrazuje.
3. Tlačítko smazání je aktivní pro vydané faktury.
4. API `DELETE /invoices/:id` nevrací konflikt jen kvůli stavu faktury.
5. Po smazání faktury se seznam obnoví bez ztráty kontextu stránky.

## 6. Rizika a poznámky
- Riziko: mazání vystavených/uhrazených faktur může být z účetního pohledu citlivé.
- Mitigace: zachován potvrzovací dialog před smazáním; případné auditní zpřísnění lze vrátit v další iteraci.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test --runInBand`
  - `pnpm --filter @tappyfaktur/web build`
  - UI smoke `/invoices`: dropdown filtr + smazání issued faktury.
- Výsledek:
  - implementováno a nasazeno v lokálním prostředí.
