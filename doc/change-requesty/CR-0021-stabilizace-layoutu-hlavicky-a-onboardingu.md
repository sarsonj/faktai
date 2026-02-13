# CR-0021 - Stabilizace layoutu hlavičky a onboardingu

## 0. Metadata
- ID: `CR-0021`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Po nasazení globální hlavičky se ukázaly nekonzistence v rozložení: různá výška/odsazení hlavičky, rozdílné šířky obsahu a duplicitní hlavička v přihlášené části aplikace s levým menu.

## 2. Scope změny
- Frontend:
  - `apps/web/src/components/AppLayout.tsx`
  - `apps/web/src/components/SiteHeader.tsx`
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/src/pages/OnboardingStartPage.tsx`
  - `apps/web/src/pages/OnboardingSubjectPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 3. Akceptační kritéria
1. Veřejné/auth/onboarding stránky používají jednotné odsazení a šířku layoutu.
2. Hlavička na veřejných stránkách má konzistentní výšku.
3. V přihlášené části aplikace s levým menu se v content topbaru zobrazuje pouze avatar menu (bez duplicity loga/sekce).
4. Kliknutí na logo v sidebaru přihlášené části vede na `/invoices`.
5. Onboarding start i onboarding subjektu mají konzistentní šířku obsahu (`card-narrow`).

## 4. Implementace a ověření
- Commit(y): `viz git historie (CR-0021)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/`
    - `/onboarding/start`
    - `/onboarding/subject`
    - `/invoices`
- Výsledek:
  - implementováno dle zadání.
