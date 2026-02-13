# CR-0019 - Onboarding start s registrací a guard na dokončení subjektu

## 0. Metadata
- ID: `CR-0019`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Registrace působila odděleně od onboarding flow. Požadavek je sjednotit první zkušenost uživatele a zároveň garantovat, že uživatel bez dokončeného subjektu bude po přihlášení vždy naváděn zpět do onboardingu.

## 2. Scope změny
- Frontend:
  - `apps/web/src/pages/OnboardingStartPage.tsx` (nové)
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/ProtectedRoute.tsx`
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/src/components/AuthLayout.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 3. Akceptační kritéria
1. Uživatel může vytvořit účet přes `/onboarding/start` ve stejném vizuálním stylu jako onboarding subjektu.
2. `/auth/register` přesměruje na `/onboarding/start`.
3. Uživatel bez dokončeného subjektu je po přihlášení vždy naveden na `/onboarding/subject`.
4. Chráněné aplikační routy (`/invoices`, `/tax-reports`, `/settings/*`) nejsou dostupné pro účet bez subjektu.
5. Build frontendu projde bez chyby.

## 4. Implementace a ověření
- Commit(y): `viz git historie (CR-0019)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/onboarding/start`
    - `/auth/register` (redirect)
    - scénář: registrace bez dokončení subjektu -> login -> redirect na `/onboarding/subject`
- Výsledek:
  - implementováno dle zadání.
