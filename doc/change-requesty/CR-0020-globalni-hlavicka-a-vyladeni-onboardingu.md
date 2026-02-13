# CR-0020 - Globální hlavička a vyladění onboardingu

## 0. Metadata
- ID: `CR-0020`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T2`

## 1. Business kontext
Zákaznická zpětná vazba požaduje konzistentní hlavičku napříč aplikací, méně technické texty na onboarding obrazovkách a lepší čitelnost prvního kroku registrace.

## 2. Scope změny
- Frontend:
  - `apps/web/src/components/SiteHeader.tsx` (nové)
  - `apps/web/src/components/AppLayout.tsx`
  - `apps/web/src/components/AuthLayout.tsx`
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/src/pages/OnboardingStartPage.tsx`
  - `apps/web/src/pages/OnboardingSubjectPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 3. Akceptační kritéria
1. Na veřejných stránkách i v aplikaci je viditelná hlavička s logem `FakturAI`.
2. Kliknutí na logo směruje podle stavu uživatele:
   - nepřihlášený -> `/`,
   - přihlášený + subjekt -> `/invoices`,
   - přihlášený bez subjektu -> `/onboarding/subject`.
3. Hlavička zobrazuje:
   - nepřihlášený: `Přihlášení` + `Vytvořit účet`,
   - přihlášený: avatar + menu s akcí `Odhlásit`.
4. Onboarding texty nepoužívají technický výraz `onboarding` v titulcích.
5. Krok `Vytvoření účtu` je ve vertikálním (jednosloupcovém) layoutu.
6. CTA na landing page není `Začít zdarma`, ale `Vytvořit účet`.

## 4. Implementace a ověření
- Commit(y): `viz git historie (CR-0020)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/` (hlavička + CTA),
    - `/onboarding/start` (jednosloupcový krok 1),
    - `/onboarding/subject` (hlavička + přátelský text),
    - `/auth/login` (hlavička + auth akce).
- Výsledek:
  - implementováno dle zadání.
