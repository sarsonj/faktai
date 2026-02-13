# CR-0004 - Redesign PDF vzhledu faktury

## 0. Metadata
- ID: `CR-0004`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Zákazník v UAT vyhodnotil stávající PDF faktury jako vizuálně slabé a hůře čitelné. Cílem je přiblížit vzhled profesionálnímu účetnímu dokladu podle referenční ukázky.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - PDF obsahuje základní textový výpis bez jasné blokové struktury.
  - Položky a souhrny nejsou oddělené tabulkovým layoutem.
- Cílový stav:
  - PDF má strukturované bloky `Dodavatel`, `Odběratel`, `Platební údaje`, `Položky`, `Souhrn DPH`, `Celkem k úhradě`.
  - Rozvržení odpovídá vizuálnímu vzoru v `doc/examples/Vydaná faktura - 0126.pdf`.
  - QR kód zůstane zachován v platební části.

## 3. Scope změny
- Funkční specifikace:
  - Scope 4 (obsah a vizuální layout PDF)
- Technická specifikace:
  - PDF renderer, layout pravidla
- Implementace:
  - `apps/api/src/invoice/invoice.service.ts` (`renderPdf`)

## 4. Návrh změn ve specifikaci
- Funkční: doplnit explicitní layout pravidla PDF podle referenčního vzoru.
- Technická: popsat strukturu rendereru a tabulkové sekce.

## 5. Akceptační kritéria
1. PDF obsahuje oddělené bloky dodavatel/odběratel/platební údaje/položky/souhrn.
2. Položky i souhrn DPH jsou vykresleny v tabulkové formě.
3. QR platba zůstává funkční a vizuálně integrovaná do platební sekce.
4. Export je stále dostupný pouze pro `issued|paid|overdue`.

## 6. Rizika a poznámky
- Riziko: složitější layout může přetékat při dlouhých textech.
- Mitigace: limitovat délky buněk a používat zalomení + konzervativní font sizing.

## 7. Implementace a ověření
- Commit(y): `4a0c895`
- Test plan:
  - export PDF pro `issued`,
  - kontrola čitelnosti bloků a tabulek,
  - kontrola QR a celkových částek.
- Výsledek:
  - implementováno v rendereru PDF faktury,
  - ověřeno průchodem `typecheck`, `test`, `build`.
