# CR-0005 - FU XML export pro přiznání DPH a kontrolní hlášení

## 0. Metadata
- ID: `CR-0005`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Stávající XML export má interní obecný formát a není přímo použitelný pro finanční správu. Cílem je generovat XML strukturu kompatibilní s očekávaným FU formátem pro přiznání DPH a kontrolní hlášení.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - Export vrací obecnou XML strukturu `TaxReport`.
  - Formát není ve struktuře vět `Veta*` dle vzoru FU.
- Cílový stav:
  - `vat_return` exportuje XML ve struktuře `Pisemnost/DPHDP3/VetaD,VetaP,Veta1..Veta6`.
  - `control_statement` exportuje XML ve struktuře `Pisemnost/DPHKH1/VetaD,VetaP,VetaA4,VetaC`.
  - Výstup odpovídá ukázkám:
    - `doc/examples/iDoklad_DPH3_2025Q04B`
    - `doc/examples/iDoklad_DPHKH_2025Q04B`

## 3. Scope změny
- Funkční specifikace:
  - Scope 5 (`XML export`, `Akceptační kritéria`)
- Technická specifikace:
  - XML mappery a exportní kontrakt
- Implementace:
  - `apps/api/src/tax-reports/tax-reports.service.ts`
  - testy `apps/api/src/tax-reports/tax-reports.service.spec.ts`

## 4. Návrh změn ve specifikaci
- Funkční: upřesnit, že DPH a KH export používají FU-compatible strukturu vět.
- Technická: doplnit mapování polí faktur na `Veta*` elementy.

## 5. Akceptační kritéria
1. Export `Přiznání k DPH` má kořen `Pisemnost` a uzel `DPHDP3`.
2. Export `Kontrolní hlášení` má kořen `Pisemnost` a uzel `DPHKH1`.
3. Export obsahuje identifikaci subjektu a období ve `VetaD`/`VetaP`.
4. Export obsahuje data z faktur v číselných větách (`Veta1..6`, `VetaA4`, `VetaC`).
5. Historie běhů a verzování `runVersion` zůstávají zachovány.

## 6. Rizika a poznámky
- Riziko: neúplná data partnera mohou znemožnit plné vyplnění některých vět.
- Mitigace: konzervativní mapování, fallback hodnoty a validační chyby pro zásadní nedostatky.

## 7. Implementace a ověření
- Commit(y): `4a0c895`
- Test plan:
  - export `vat_return` a kontrola struktury `DPHDP3`,
  - export `control_statement` a kontrola struktur `VetaA4` + `VetaC`,
  - regresní kontrola preview + historie běhů.
- Výsledek:
  - implementováno mapování FU XML struktur pro DPH a KH,
  - ověřeno průchodem `typecheck`, `test`, `build`.
