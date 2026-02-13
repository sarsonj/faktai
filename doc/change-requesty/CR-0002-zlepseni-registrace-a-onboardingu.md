# CR-0002 - Zlepšení registrace a onboardingu

## 0. Metadata
- ID: `CR-0002`
- Datum: `2026-02-13`
- Stav: `Ověřeno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Zákaznické testy ukázaly vysoké tření při registraci a prvním vyplnění subjektu. Cílem je zrychlit onboarding, snížit počet ručních přepisů a odstranit blokující chybu při opakovaném odeslání formuláře.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - Subjekt se vyplňuje ručně bez napojení na registry.
  - Adresa se nevyhledává z veřejných dat.
  - Heslová politika je přísná (10+ znaků + speciální znak).
  - Validační zprávy jsou částečně v angličtině.
  - Po validační chybě v onboardingu může zůstat tlačítko ve stavu `Ukládám`.
- Cílový stav:
  - Možnost načíst subjekt z ARES podle IČO nebo názvu.
  - Možnost dohledat adresu z veřejné databáze a předvyplnit pole.
  - Heslová politika: min. 8 znaků bez povinného speciálního znaku, nebo 12+ znaků jako heslová fráze.
  - Uživatelské validační zprávy v češtině.
  - Onboarding formulář je po chybě znovu odeslatelný.

## 3. Scope změny
- Funkční specifikace:
  - Scope 1 (onboarding živnostníka)
  - Scope 7 (registrace a hesla)
- Technická specifikace:
  - API kontrakty (nové lookup endpointy)
  - validace a integrační služby
- Implementace:
  - FE onboarding formulář
  - FE registrace/reset hesla
  - BE auth validace a validační pipeline
  - BE registry lookup API (ARES + adresa)

## 4. Návrh změn ve specifikaci
- Funkční: přidat lookup ARES/adresy, normalizaci vstupů a chování po validační chybě.
- Technická: přidat interní endpointy pro lookup + popsat externí zdroje.

## 5. Akceptační kritéria
1. Uživatel dokáže dohledat subjekt podle IČO i názvu a předvyplnit onboarding.
2. Uživatel dokáže dohledat adresu a kliknutím ji vyplnit do formuláře.
3. Po neúspěšném submitu v onboardingu je možné formulář znovu odeslat.
4. Heslo splní nové pravidlo (8+ nebo 12+ fráze) a registrace/reset ho přijmou.
5. Validační texty vracené API jsou v češtině.

## 6. Rizika a poznámky
- Riziko: výpadek externích veřejných služeb (ARES/adresní vyhledávání).
- Mitigace: lookup je pomocná funkce; ruční vyplnění formuláře zůstává dostupné.

## 7. Implementace a ověření
- Commit(y): `de7050b`
- Test plan:
  - registrace a reset hesla s novým pravidlem,
  - onboarding lookup firmy (ARES),
  - onboarding lookup adresy,
  - validační chyby v češtině,
  - opakovaný submit po chybě (`Ukládám...` se odblokuje).
- Výsledek:
  - implementováno v API + web části,
  - ověřeno průchodem `typecheck`, `test`, `build`.
