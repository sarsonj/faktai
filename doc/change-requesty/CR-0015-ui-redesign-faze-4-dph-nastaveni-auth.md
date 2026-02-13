# CR-0015 - UI redesign Fáze 4: DPH podklady, nastavení subjektu a auth obrazovky

## 0. Metadata
- ID: `CR-0015`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po vyladění hlavního fakturačního toku je potřeba sjednotit i podpůrné moduly, které uživatel používá často: přihlášení/registrace, DPH export a nastavení subjektu. Cílem je lepší orientace a vyšší důvěra v aplikaci.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - auth obrazovky měly funkční, ale utilitární strukturu,
  - DPH podklady měly základní formulář bez kontextového souhrnu,
  - nastavení subjektu nemělo rychlý přehled klíčových údajů.
- Cílový stav:
  - auth modul má konzistentní dvousloupcový layout (benefity + formulář),
  - DPH obrazovka ukazuje souhrn exportu (IČO, typ podání, perioda, očekávaný název souboru),
  - nastavení subjektu i onboarding mají rychlý informační souhrn nahoře.

## 3. Scope změny
- Frontend:
  - `apps/web/src/components/AuthLayout.tsx`
  - `apps/web/src/pages/LoginPage.tsx`
  - `apps/web/src/pages/RegisterPage.tsx`
  - `apps/web/src/pages/ForgotPasswordPage.tsx`
  - `apps/web/src/pages/ResetPasswordPage.tsx`
  - `apps/web/src/pages/TaxReportsPage.tsx`
  - `apps/web/src/pages/SettingsSubjectPage.tsx`
  - `apps/web/src/pages/OnboardingSubjectPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`

## 4. Návrh změn ve specifikaci
- Scope 5 (`DPH podklady`):
  - doplnit informační souhrn exportu a rychlé akce pro volbu období.
- Scope 7 (`Auth`):
  - doplnit pravidla layoutu auth obrazovek (hero + formulářový panel).
- Scope 1 (`Nastavení subjektu` / onboarding):
  - doplnit přehledové KPI karty nad formulářem.

## 5. Akceptační kritéria
1. Auth sekce (`login/register/forgot/reset`) používá jednotný layout s informačním blokem a formulářovým panelem.
2. DPH podklady zobrazují očekávaný název exportovaného XML souboru dle aktuální volby.
3. DPH podklady obsahují rychlé přepínače `Předchozí období` a `Aktuální období`.
4. Nastavení subjektu i onboarding zobrazují nahoře přehled klíčových údajů/kroků.
5. Frontend build projde bez chyby.

## 6. Rizika a poznámky
- Riziko: delší texty (např. název XML souboru) mohou přetékat.
- Mitigace: přidáno zalamování textu v KPI kartách a responzivní chování layoutu.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0015 / UI redesign Fáze 4)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/auth/login`, `/auth/register`, `/tax-reports`, `/settings/subject`.
- Výsledek:
  - implementováno včetně aktualizace funkční a technické specifikace.
