# CR-0031 - Odhad realizace a nacenění projektu

## 0. Metadata
- ID: `CR-0031`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T0`

## 1. Business kontext
Byl požadován souhrnný dokument s retrospektivním odhadem rozsahu realizace projektu od začátku do aktuálního stavu, včetně rozpadů na fáze a finančního vyčíslení při sazbě 1 500 Kč/MD.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - projekt měl funkční a technickou specifikaci a evidenci CR, ale chyběl jednotný dokument s rozpočtovým souhrnem.
- Cílový stav:
  - v dokumentaci je dostupný odhad po fázích:
    - specifikace,
    - implementace jádra,
    - implementace change requestů,
  - u každé části je uveden výpočet MD i cena.

## 3. Scope změny
- Dokumentace:
  - `doc/odhad-realizace-a-naceneni.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Existuje samostatný dokument s rozpadem na fáze a mezisoučty.
2. Dokument používá sazbu `1 500 Kč/MD`.
3. Dokument obsahuje finální celkovou cenu.

## 5. Rizika a poznámky
- Jde o retrospektivní odhad, ne o účetní timesheet.
- Odhad je vhodný jako obchodní podklad; pro závaznou nabídku je vhodné jej potvrdit objednatelem.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0031)`
- Test plan:
  - kontrola struktury dokumentu a aritmetiky součtů
- Výsledek:
  - implementováno dle zadání.
