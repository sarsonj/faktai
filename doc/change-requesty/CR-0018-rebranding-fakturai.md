# CR-0018 - Rebranding názvu aplikace na FakturAI

## 0. Metadata
- ID: `CR-0018`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po výběru názvu zákazníkem je potřeba sjednotit branding napříč aplikací a dokumentací na název `FakturAI`.

## 2. Scope změny
- Frontend:
  - `apps/web/src/brand.ts`
  - `apps/web/index.html`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/implementacni-backlog.md`
  - `doc/release-notes-rc.md`
  - `doc/change-requesty/CR-0017-landing-onboarding-settings-branding.md`
  - `doc/change-requesty/README.md`

## 3. Akceptační kritéria
1. Název aplikace v UI je `FakturAI`.
2. HTML title je `FakturAI`.
3. Hlavní dokumentace projektu používá název `FakturAI`.

## 4. Implementace a ověření
- Commit(y): `viz git historie (CR-0018)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/` (ověření title a brandingu)
- Výsledek:
  - implementováno dle zadání.
