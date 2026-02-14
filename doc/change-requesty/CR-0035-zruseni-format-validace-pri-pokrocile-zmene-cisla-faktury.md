# CR-0035 - Zrušení formátové validace při pokročilé změně čísla faktury

## 0. Metadata
- ID: `CR-0035`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Při migraci historických dokladů z jiných systémů se používají různé formáty čísel faktur (např. s lomítky nebo prefixy).
- V pokročilé akci změny čísla dokladu byla vynucena validace formátu `RRRR + pořadí`, která migraci blokuje.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - endpoint pro pokročilou změnu čísla faktury odmítá čísla mimo regex `^\d{5,10}$`,
  - uživatel dostává chybu: `Číslo faktury musí mít formát RRRR + pořadí (5 až 10 číslic).`
- Cílový stav:
  - pokročilá změna čísla dokladu nevaliduje formát čísla,
  - zachová se kontrola neprázdné hodnoty a unikátnosti čísla faktury v rámci subjektu.

## 3. Scope změny
- Dotčené API endpointy:
  - `PATCH /api/v1/invoices/:id/number`
- Dotčené backend části:
  - `apps/api/src/invoice/dto/change-invoice-number.dto.ts`
  - `apps/api/src/invoice/invoice.service.ts`
- Dotčené specifikace:
  - `doc/funkcni-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - upřesnit, že pokročilá změna čísla dokladu negarantuje formát `YYYYNN`, pouze neprázdnost a unikátnost.
- Technická specifikace:
  - beze změny (není nutná migrace ani změna datového modelu).

## 5. Akceptační kritéria
1. Při pokročilé změně čísla lze uložit i hodnotu mimo formát `RRRR + pořadí`.
2. Prázdná hodnota čísla faktury je nadále odmítnuta.
3. Duplicitní číslo faktury v rámci stejného subjektu je nadále odmítnuto.

## 6. Rizika a poznámky
- Riziko: nekonzistentní formáty čísel v datech po migraci.
- Mitigace: volba je dostupná jen v pokročilé sekci, běžné číslování nových dokladů zůstává automatické.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0035)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api build`
- Výsledek:
  - implementováno dle zadání.
