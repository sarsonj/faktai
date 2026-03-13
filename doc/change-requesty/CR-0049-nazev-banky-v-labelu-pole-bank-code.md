# CR-0049 - Název banky v labelu pole `bankCode`

## 0. Metadata
- ID: `CR-0049`
- Datum: `2026-03-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
- Pomocný text pod polem `Kód banky` rušil layout formuláře.
- Uživatel chce jednodušší chování: název banky se má propsat přímo do labelu pole a chyba má zůstat až na submit validaci.

## 2. Cílový stav
- Pokud `bankCode` není vyplněn, label je `Kód banky`.
- Pokud `bankCode` odpovídá záznamu v lokálním číselníku ČNB, label je `Kód banky (Název banky)`.
- Pokud `bankCode` neodpovídá číselníku, label zůstává `Kód banky`.
- Uložení stále blokuje až submit validace s chybovou hláškou nahoře formuláře.

## 3. Scope změny
- Frontend:
  - odstranění helper textu pod polem `bankCode`,
  - dynamický label v onboardingu i v nastavení subjektu.
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Label pole `bankCode` se mění podle nalezené banky.
2. Při neznámém kódu se nezobrazuje inline chyba u pole.
3. Při submitu s neznámým kódem zůstává validace blokující.
