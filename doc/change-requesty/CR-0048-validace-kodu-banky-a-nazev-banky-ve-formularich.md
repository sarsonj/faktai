# CR-0048 - Validace kódu banky a název banky ve formulářích

## 0. Metadata
- ID: `CR-0048`
- Datum: `2026-03-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Uživatel může při zadání bankovního účtu snadno udělat překlep v kódu banky.
- Samotné pole `bankCode` bez okamžité zpětné vazby nezaručuje, že zadaný kód odpovídá očekávané bance.
- Cílem je zjednodušit onboarding i následnou editaci nastavení subjektu bez zavedení složitého výběrového widgetu.

## 2. Cílový stav
- Ve wizardu i v nastavení subjektu uživatel zadává dál 4místný kód banky.
- Formulář okamžitě zobrazí název banky podle oficiálního číselníku ČNB.
- Pokud kód banky není v aktuálním číselníku ČNB, formulář nedovolí uložení.
- V přehledu nastavení subjektu je vedle účtu vidět i rozpoznaný název banky.

## 3. Scope změny
- Frontend:
  - nový lokální číselník bank `apps/web/src/bank-codes.ts`,
  - průběžná nápověda názvu banky ve `OnboardingSubjectWizard`,
  - průběžná nápověda názvu banky v `SubjectForm`,
  - blokace odeslání při neznámém kódu banky,
  - doplnění názvu banky do KPI karty v `SettingsSubjectPage`.
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Při zadání platného 4místného kódu banky formulář zobrazí odpovídající název banky.
2. Při zadání neexistujícího kódu banky formulář zobrazí chybovou nápovědu a nepovolí uložení.
3. Implementace nepřidává novou backendovou závislost ani nové pole do databáze.
4. Bankovní údaje se dál ukládají ve stejném modelu (`prefix`, `číslo`, `kód banky`).
