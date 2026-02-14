# CR-0040 - Mapování nadřazeného finančního úřadu pro DPH XML

## 0. Metadata
- ID: `CR-0040`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- U výstupu XML pro finanční správu je nutné mapovat `c_ufo` na nadřazený (krajský) úřad, nikoliv na územní pracoviště.
- Chybná hodnota `c_ufo` vede k odmítnutí podání nebo zbytečným manuálním opravám.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - `c_ufo` se přebíral přímo z vybraného `k_ufo_vema` (`user_pracufo`), tj. nebyla aplikována nadřazená logika.
- Cílový stav:
  - `c_pracufo` zůstává původní uživatelský výběr (např. `2705`),
  - `c_ufo` se odvozuje dle pravidla:
    1. prefix = první 2 číslice `user_pracufo`,
    2. lookup key = `prefix + "00"` (např. `2700`),
    3. hledat v `c_ufo.xml` záznam s `k_ufo_vema=lookupKey` a `d_zaniku=""`,
    4. vzít `c_ufo` z nalezeného záznamu.

## 3. Scope změny
- Dotčené API služby:
  - `apps/api/src/tax-offices/tax-offices.service.ts`
  - `apps/api/src/tax-reports/tax-reports.service.ts`
- Dotčené testy:
  - `apps/api/src/tax-reports/tax-reports.service.spec.ts`
- Dotčená dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit explicitní pravidlo mapování `c_ufo` přes nadřazený lookup (`XX00`, aktivní řádek).
- Technická specifikace:
  - doplnit algoritmus lookupu (`prefix`, `lookupKey`, `d_zaniku=""`) a mapování do `VetaP`.

## 5. Akceptační kritéria
1. Při `user_pracufo=2705` je v exportu `c_pracufo=2705` a `c_ufo=458`.
2. `c_ufo` se určuje pouze z řádku s `k_ufo_vema=XX00` a `d_zaniku=""`.
3. Pokud lookup nenajde aktivní nadřazený řádek, export vrátí validační chybu.

## 6. Rizika a poznámky
- Riziko: změna může ovlivnit všechny DPH/KH exporty.
- Mitigace: unit testy na parser a export + explicitní validační chyba při nenalezení.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0040)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test -- src/tax-reports/tax-reports.service.spec.ts`
  - `pnpm --filter @tappyfaktur/api build`
- Výsledek:
  - Implementováno.
