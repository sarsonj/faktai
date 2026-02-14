# CR-0044 - Denní výkaz času vývoje z Git commitů

## 0. Metadata
- ID: `CR-0044`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T0`

## 1. Business kontext
- Uživatel chce průběžně sledovat čas strávený vývojem FaktAI.
- Zdroj pravdy mají být Git commity, výstup po dnech.

## 2. Cílový stav
- V dokumentaci existuje samostatný denní výkaz.
- Výkaz obsahuje jen dny, ve kterých byl commit.
- Pro každý den je uveden vypočtený čas a krátké lidské shrnutí, co se ten den implementovalo.
- Je popsán opakovatelný výpočet času podle stejného pravidla.

## 3. Scope změny
- Nový dokument s denním výkazem času a metodikou výpočtu.
- Aktualizace indexu change requestů.

## 4. Akceptační kritéria
1. Existuje tabulka po dnech s časem a shrnutím.
2. Výpočet odpovídá pravidlu 15 minut před commitem se slučováním souvislých úseků.
3. V dokumentu je jasně popsáno, jak výpočet zopakovat.

## 5. Implementace
- Přidán dokument: `doc/vykaz-vyvoje.md`.
- Aktualizován index: `doc/change-requesty/README.md`.

