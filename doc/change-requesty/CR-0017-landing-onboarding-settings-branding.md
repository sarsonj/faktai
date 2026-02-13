# CR-0017 - Landing page, onboarding refresh a zjednodušení nastavení subjektu

## 0. Metadata
- ID: `CR-0017`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T2`

## 1. Business kontext
Po stabilizaci klíčových toků je potřeba zlepšit vstupní dojem z produktu a zpříjemnit založení subjektu. Zároveň je žádoucí odlehčit pokročilé obrazovky od prvků, které uživatel v daném kontextu nepotřebuje.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - chyběla veřejná landing page projektu,
  - onboarding byl technický a měl podobu jednoho rozsáhlého formuláře,
  - `Nastavení subjektu` obsahovalo registry lookupy, které při běžné editaci rušily.
- Cílový stav:
  - veřejná landing page s jasným positioningem projektu,
  - onboarding jako 3-krokový průvodce (ARES -> adresa -> DPH/platby),
  - `Nastavení subjektu` pouze pro přímou editaci bez lookup sekcí.

## 3. Scope změny
- Frontend:
  - `apps/web/src/App.tsx`
  - `apps/web/src/brand.ts`
  - `apps/web/src/components/AppLayout.tsx`
  - `apps/web/src/components/AuthLayout.tsx`
  - `apps/web/src/components/OnboardingSubjectWizard.tsx`
  - `apps/web/src/components/SubjectForm.tsx`
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/src/pages/OnboardingSubjectPage.tsx`
  - `apps/web/src/pages/SettingsSubjectPage.tsx`
  - `apps/web/src/index.css`
  - `apps/web/index.html`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Existuje veřejná landing page na route `/` s popisem cílové skupiny, charakteru projektu a highlighty.
2. Onboarding subjektu je 3-krokový průvodce se samostatnými kroky a lokální validací.
3. V onboardingu je dostupné načtení firmy z ARES a načtení adresy z veřejné databáze.
4. `Nastavení subjektu` neobsahuje bloky `Načíst firmu z ARES` a `Načíst adresu`.
5. Branding aplikace je sjednocen na nový název `SoloFaktura AI`.
6. Frontend build projde bez chyby.

## 5. Implementace a ověření
- Commit(y): `viz git historie (CR-0017)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/`
    - `/auth/login`
    - `/onboarding/subject` (nově registrovaný uživatel bez subjektu)
    - `/settings/subject` (existující uživatel se subjektem)
- Výsledek:
  - implementováno dle zadání.
