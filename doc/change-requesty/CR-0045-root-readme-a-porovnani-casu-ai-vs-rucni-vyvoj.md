# CR-0045 - Root README a porovnání času AI vs ruční vývoj

## 0. Metadata
- ID: `CR-0045`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T0`

## 1. Business kontext
- V repozitáři chyběl hlavní `README.md` s jasným popisem cíle projektu.
- Uživatel chce v README průběžně sledovat čas vývoje a porovnávat AI přístup proti ručnímu odhadu.

## 2. Cílový stav
- Root `README.md` stručně a srozumitelně vysvětluje cíl projektu a aktuální stav.
- README obsahuje aktuální tabulku času vývoje z commitů.
- README obsahuje orientační porovnání „ručně vs AI“.
- Je definované pravidlo, že při aktualizaci časů v README se současně aktualizuje zdrojový výkaz.

## 3. Scope změny
- Nový soubor `README.md` v rootu.
- Update procesu v `AGENTS.md`.
- Drobné doplnění `doc/vykaz-vyvoje.md` kvůli synchronizaci s README.
- Update indexu CR.

## 4. Akceptační kritéria
1. README obsahuje popis projektu, odkazy na specifikace a CR.
2. README obsahuje denní přehled času vývoje a celkový součet.
3. README obsahuje orientační srovnání času AI vs ruční odhad.
4. V dokumentaci je explicitně uvedeno, že při update časů v README se aktualizuje i `doc/vykaz-vyvoje.md`.

## 5. Implementace
- Přidán root `README.md`.
- Aktualizován `AGENTS.md` o pravidlo synchronizace časů.
- Aktualizován `doc/vykaz-vyvoje.md` o pravidlo synchronizace s README.
- Aktualizován index `doc/change-requesty/README.md`.

