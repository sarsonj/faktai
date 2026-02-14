# CR-0036 - Vlastní číslo dokladu při vytváření faktury

## 0. Metadata
- ID: `CR-0036`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Při migraci starších dokladů je potřeba zadat původní čísla faktur z jiného systému.
- Běžné automatické číslování podle roční řady je správné pro standardní workflow, ale nestačí pro migrace.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - při vytváření faktury je číslo dokladu pouze automatické,
  - vlastní číslo lze nastavit až následně přes pokročilé zásahy v detailu.
- Cílový stav:
  - při vytváření faktury je v pokročilé sekci volba pro vlastní číslo dokladu,
  - při aktivní volbě se použije ručně zadané číslo (bez formátové validace),
  - validuje se jen neprázdnost a unikátnost čísla v rámci subjektu.

## 3. Scope změny
- Dotčené obrazovky/routy:
  - `GET /invoices/new` (editor nové faktury)
- Dotčené API endpointy:
  - `POST /api/v1/invoices`
  - `PATCH /api/v1/invoices/:id`
  - `POST /api/v1/invoices/:id/issue`
- Dotčené moduly:
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/index.css`
  - `apps/api/src/invoice/dto/upsert-invoice.dto.ts`
  - `apps/api/src/invoice/dto/change-invoice-number.dto.ts`
  - `apps/api/src/invoice/invoice.service.ts`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit, že při vytváření faktury lze v pokročilé sekci zapnout vlastní číslo dokladu,
  - upřesnit, že formát čísla se v pokročilém režimu nekontroluje.
- Technická specifikace:
  - upravit pravidla endpointů pro změnu čísla a create/update/issue tok tak, aby nevyžadovaly formát `YYYYNN` pro ruční čísla.

## 5. Akceptační kritéria
1. V editoru nové faktury je v pokročilé sekci přepínač pro vlastní číslo dokladu.
2. Po zapnutí přepínače lze uložit/vystavit fakturu s vlastním číslem dokladu i mimo formát `YYYYNN`.
3. Při ručním čísle se validuje neprázdnost a unikátnost v rámci subjektu.
4. Při vypnuté volbě zůstává automatické číslování beze změny.

## 6. Rizika a poznámky
- Riziko: nekonzistentní číselné formáty po migraci.
- Mitigace: ruční číslo je schované v pokročilé sekci a není součástí běžného workflow.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0036)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - implementováno dle zadání.
