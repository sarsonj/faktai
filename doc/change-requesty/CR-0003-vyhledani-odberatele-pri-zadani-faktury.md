# CR-0003 - Vyhledání odběratele při zadání faktury

## 0. Metadata
- ID: `CR-0003`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Při zadávání faktury je ruční vypisování odběratele pomalé a chybové. Cílem je umožnit dohledání firmy z veřejné databáze a automatické předvyplnění polí odběratele.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - Odběratel se v editoru faktury vyplňuje ručně.
- Cílový stav:
  - V editoru lze hledat odběratele podle IČO nebo názvu.
  - Výběr výsledku předvyplní jméno, IČO, DIČ a adresu odběratele.

## 3. Scope změny
- Funkční specifikace:
  - Scope 3 (fakturační editor)
- Technická specifikace:
  - využití lookup API
- Implementace:
  - FE editor faktury (sekce vyhledání odběratele)

## 4. Návrh změn ve specifikaci
- Funkční: doplnit lookup odběratele do Scope 3.
- Technická: doplnit FE/BE integrační tok lookupu.

## 5. Akceptační kritéria
1. Uživatel může vyhledat odběratele podle IČO nebo názvu.
2. Výběr výsledku předvyplní pole odběratele v editoru.
3. Ruční editace předvyplněných polí je stále možná.

## 6. Rizika a poznámky
- Riziko: vrácená data mohou být neúplná.
- Mitigace: uživatel může před uložením pole upravit.

## 7. Implementace a ověření
- Commit(y): `de7050b`
- Test plan:
  - vyhledání odběratele dle IČO,
  - vyhledání odběratele dle názvu,
  - předvyplnění polí odběratele a následná ruční editace.
- Výsledek:
  - lookup je dostupný v editoru faktury,
  - předvyplnění funguje bez blokace ručních úprav,
  - ověřeno průchodem `typecheck`, `test`, `build`.
