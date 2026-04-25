# CR-0050 - Pořadí vět v kontrolním hlášení

## 0. Metadata
- ID: `CR-0050`
- Datum: `2026-04-25`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Export kontrolního hlášení vytvořil XML, které validátor finanční správy odmítl s chybou `Věta "A4" nebyla očekávána. Očekávané typy vět: C.`
- Problém není v datech faktur, ale v pořadí elementů v XML.

## 2. Příčina
- XML generátor skládal `VetaC` před `VetaA4`.
- XSD pro `DPHKH1` očekává věty `VetaA4` před souhrnnou větou `VetaC`.
- Interní kontrola ověřovala pouze well-formed XML, ne pořadí podle XSD.

## 3. Cílový stav
- Kontrolní hlášení se generuje v pořadí:
  - `VetaD`
  - `VetaP`
  - `VetaA4...`
  - `VetaC`
- Regresní test ověřuje, že `VetaA4` je v XML před `VetaC`.

## 4. Scope změny
- API:
  - oprava pořadí elementů v mapperu kontrolního hlášení,
  - regresní test pořadí `VetaA4` před `VetaC`.
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 5. Akceptační kritéria
1. Export kontrolního hlášení obsahuje `VetaA4` před `VetaC`.
2. Test `TaxReportsService` toto pořadí explicitně kontroluje.
3. Stávající název souboru a mapování dat zůstává beze změny.
