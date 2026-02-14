# CR-0039 - XML FU: adresa, místní příslušnost a číselník finančních úřadů

## 0. Metadata
- ID: `CR-0039`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
- Export XML pro finanční úřad má regresi: adresa subjektu není mapována do správných polí (`ulice`, `c_pop`, `c_orient`) a místní příslušnost FÚ (`c_pracufo`, `c_ufo`) není vyplněná.
- Bez korektních údajů může být podání na straně finanční správy odmítnuto nebo vyžaduje ruční zásah.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - adresa jde celá do `ulice`, `c_pop` a `c_orient` zůstávají prázdné,
  - `c_pracufo` a `c_ufo` jsou prázdné,
  - onboarding ani `Nastavení subjektu` neobsahují volbu místní příslušnosti FÚ.
- Cílový stav:
  - adresa se při exportu rozpadá na `ulice`, `c_pop`, `c_orient` (např. `Žerotínova 1510/12` -> `ulice=Žerotínova`, `c_pop=1510`, `c_orient=12`),
  - v profilu subjektu je uložen kód místní příslušnosti FÚ (`k_ufo_vema`),
  - export DPH i KH vyplňuje `c_pracufo` a páruje k němu `c_ufo` z číselníku,
  - číselník FÚ je načítán z dodaného `c_ufo.xml`.

## 3. Scope změny
- Dotčené obrazovky/routy:
  - `/onboarding/subject`
  - `/settings/subject`
- Dotčené API endpointy:
  - `GET /subject`
  - `POST /subject`
  - `PATCH /subject`
  - `GET /subject/tax-offices` (nový)
  - `POST /tax-reports/export`
- Dotčený datový model/migrace:
  - `Subject.taxOfficePracufo` (nullable; povinné v business validaci pro plátce DPH)
- Dotčené runtime assety:
  - `apps/api/assets/tax/c_ufo.xml`
  - `apps/api/assets/xsd/*.xsd.xml` (referenční validační podklady)

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit pole `Místní příslušnost finančního úřadu` do onboarding kroku DPH a do `Nastavení subjektu`,
  - doplnit pravidla mapování adresy do FU XML (`ulice`, `c_pop`, `c_orient`),
  - doplnit pravidla mapování `c_pracufo` + `c_ufo` pro DPH i KH.
- Technická specifikace:
  - doplnit model subjektu o `taxOfficePracufo`,
  - doplnit endpoint pro číselník FÚ,
  - popsat parser adresy a mapování číselníku `c_ufo.xml`.

## 5. Akceptační kritéria
1. U plátce DPH nelze uložit subjekt bez vybrané místní příslušnosti FÚ.
2. V onboarding i nastavení subjektu je dostupný dropdown místní příslušnosti FÚ naplněný z číselníku.
3. XML `Přiznání k DPH` i `Kontrolní hlášení` obsahuje ve `VetaP` správně vyplněné `c_pracufo` a odpovídající `c_ufo`.
4. XML `VetaP` správně mapuje adresu do `ulice`, `c_pop`, `c_orient` při adrese s čísly ve formátu `ulice čp/čo`.
5. Změna je pokrytá minimálně unit testy exportu XML.

## 6. Rizika a poznámky
- Riziko: různé formáty adres mohou mít nejednoznačné parsování.
- Mitigace: deterministický parser s bezpečným fallbackem (neparsovat -> celé do `ulice`, čísla prázdná).
- Riziko: historické vs. aktuální úřady v číselníku.
- Mitigace: mapování podle explicitně zvoleného `k_ufo_vema`; bez heuristiky.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0039)`
- Test plan:
  - API testy exportu XML (`tax-reports.service.spec.ts`),
  - build API + build web,
  - ruční smoke: onboarding -> nastavení subjektu -> export DPH/KH.
- Výsledek:
  - Implementováno.
  - U plátce DPH je vyžadován výběr místní příslušnosti FÚ v onboarding i nastavení subjektu.
  - XML export DPH/KH mapuje `c_pracufo` + `c_ufo` z číselníku a adresu do `ulice`/`c_pop`/`c_orient`.
