# CR-0037 - Formát automatického číslování faktur `YYYYNNNNNN`

## 0. Metadata
- ID: `CR-0037`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Uživatel požaduje fixní délku automaticky generovaných čísel faktur.
- Cílem je sjednotit vzhled čísel i při vyšším počtu dokladů a mít konzistentní formát řady.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - automatická řada používala kratší formát bez fixní délky pořadí.
- Cílový stav:
  - automatická řada používá formát `YYYYNNNNNN`,
  - první faktura roku 2026 má číslo `2026000001`.

## 3. Scope změny
- Dotčené backend části:
  - `apps/api/src/invoice/invoice.service.ts`
- Dotčené specifikace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/implementacni-backlog.md`
  - `doc/change-requesty/README.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - aktualizace formátu automatické řady z `YYYYNN` na `YYYYNNNNNN`.
- Technická specifikace:
  - potvrzené rozhodnutí o formátu číselné řady.

## 5. Akceptační kritéria
1. Nově rezervované/automaticky přidělené číslo faktury používá formát `YYYYNNNNNN`.
2. První číslo v roce 2026 je `2026000001`.
3. Pokročilé ruční číslo dokladu zůstává bez formátového omezení.

## 6. Rizika a poznámky
- Riziko: v datech mohou existovat historické doklady se starším kratším formátem.
- Mitigace: změna se týká pouze nově generovaných čísel; unikátnost v rámci subjektu zůstává zachována.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0037)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - implementováno dle zadání.
