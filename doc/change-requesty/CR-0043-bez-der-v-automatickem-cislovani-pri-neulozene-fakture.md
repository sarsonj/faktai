# CR-0043 - Bez děr v automatickém číslování při neuložené faktuře

## 0. Metadata
- ID: `CR-0043`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Otevření stránky `Nová faktura` zvyšovalo číselnou řadu i bez uložení dokladu.
- To vedlo ke vzniku nežádoucích děr v číslování.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - náhled čísla (`reserve-number`) prováděl mutační rezervaci v sekvenci.
- Cílový stav:
  - náhled čísla pouze dopočítá další číslo bez rezervace,
  - skutečné přidělení proběhne až při ukládání/vystavení faktury,
  - řada se odvozuje z nejvyššího existujícího automatického čísla pro rok (`YYYYNNNNNN`).

## 3. Scope změny
- Dotčené API:
  - `POST /invoices/reserve-number` (změna chování na nemutační preview)
  - interní přidělení čísla při create/update/issue/copy
- Dotčený frontend:
  - editor faktury v režimu `create` (neposílat auto-preview číslo jako explicitní hodnotu)
- Dotčená dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit pravidlo „žádné děry při neuložené nové faktuře“.
- Technická specifikace:
  - `reserve-number` popsat jako read-only preview,
  - skutečná alokace čísla při persist operaci.

## 5. Akceptační kritéria
1. Otevření nové faktury bez uložení nezvýší číselnou řadu.
2. Při uložení nové faktury se přidělí číslo jako `max(auto YYYYNNNNNN v roce) + 1`.
3. Náhled čísla (`reserve-number`) vrací očekávanou hodnotu, ale neprovádí rezervaci.

## 6. Rizika a poznámky
- Riziko: souběh dvou uživatelů může při preview ukázat stejné číslo.
- Mitigace: finální číslo přiděluje backend až při persistenci s retry na unikátnost.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0043)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test -- src/invoice/invoice.service.spec.ts`
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - Implementováno.
