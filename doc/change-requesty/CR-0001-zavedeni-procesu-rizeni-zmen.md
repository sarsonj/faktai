# CR-0001 - Zavedení procesu řízení změn

## 0. Metadata
- ID: `CR-0001`
- Datum: `2026-02-13`
- Stav: `Schváleno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Vstupují první zákaznické připomínky po testech. Potřebujeme stabilní proces, aby byly změny jednoznačně zadávané, schvalované a implementované bez ztráty kontextu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - Neexistuje standardizovaný formát CR.
  - Není explicitně popsán schvalovací workflow `spec -> implementace`.
- Cílový stav:
  - Jednotný proces CR je definovaný ve specifikacích.
  - Každý CR má vlastní záznam, stav a akceptační kritéria.

## 3. Scope změny
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`
  - `doc/change-requesty/_sablona-change-request.md`
- Kód aplikace:
  - Bez změny runtime logiky.

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - přidána sekce `8. Řízení změn (Change Request)`.
- Technická specifikace:
  - přidána sekce `16. Technický proces Change Request`.

## 5. Akceptační kritéria
1. Existuje dokumentovaný CR proces se stavovým modelem.
2. Je definovaný minimální obsah vstupu pro každou dávku připomínek.
3. Existuje šablona CR pro další iterace.
4. Každá další změna bude evidována samostatným CR souborem.

## 6. Rizika a poznámky
- Riziko: příliš velké CR dávky smíchají více témat.
- Mitigace: 1 CR = 1 logicky konzistentní změna, i když dorazí v jedné zákaznické dávce.

## 7. Implementace a ověření
- Implementace: dokumentační změna.
- Ověření: kontrola konzistence odkazů a stavů CR.
- Další krok: po schválení CR-0001 použít šablonu pro první věcné zákaznické CR.
