# CR-0041 - Kontaktní údaje pro FÚ v onboardingu a nastavení subjektu

## 0. Metadata
- ID: `CR-0041`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
- Pro XML podání na finanční úřad je vhodné uvádět kontaktní údaje pro zpětný kontakt.
- Tyto údaje mají být volitelné, ale snadno dostupné v onboardingu i v následné správě subjektu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - v subjektu se neeviduje kontakt pro FÚ,
  - do XML `VetaP` se `c_telef` a `email` vyplňují prázdně.
- Cílový stav:
  - subjekt má volitelná pole:
    - `contactPhone`
    - `contactEmail`
  - onboarding:
    - e-mail je předvyplněn z login účtu,
    - obě pole jsou editovatelná a volitelná.
  - nastavení subjektu:
    - obě pole jsou editovatelná a volitelná.
  - XML export:
    - `VetaP/@c_telef` a `VetaP/@email` používají tyto hodnoty.

## 3. Scope změny
- Dotčené obrazovky/routy:
  - `/onboarding/subject`
  - `/settings/subject`
- Dotčené API endpointy:
  - `GET /subject`
  - `POST /subject`
  - `PATCH /subject`
  - `POST /tax-reports/export`
- Dotčený datový model/migrace:
  - `Subject.contactPhone` (nullable)
  - `Subject.contactEmail` (nullable)

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit volitelná pole kontaktu pro FÚ do Scope 1.
  - doplnit použití v XML exportu (Scope 5).
- Technická specifikace:
  - doplnit sloupce do `subjects`.
  - doplnit mapování `VetaP/@c_telef` a `VetaP/@email`.

## 5. Akceptační kritéria
1. V onboardingu i nastavení subjektu lze uložit volitelná pole `Telefon` a `E-mail pro FÚ`.
2. V onboardingu je `E-mail pro FÚ` předvyplněn hodnotou z login účtu.
3. Uložení subjektu funguje i s prázdnými hodnotami těchto polí.
4. Při vyplnění se hodnoty promítají do XML (`VetaP/@c_telef`, `VetaP/@email`).

## 6. Rizika a poznámky
- Riziko: nechtěné přepsání uživatelsky upraveného e-mailu v onboardingu.
- Mitigace: prefill se použije pouze jako počáteční hodnota.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0041)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test -- src/tax-reports/tax-reports.service.spec.ts`
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - Implementováno.
