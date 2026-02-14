# CR-0033 - Rebranding názvu aplikace na FaktAI

## 0. Metadata
- ID: `CR-0033`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Původní název `FakturAI` byl obsazen. Je potřeba přejmenovat značku aplikace na `FaktAI` napříč běžící aplikací a sjednotit základní branding (UI + PDF + logo assety).

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - aplikace používala název `FakturAI`,
  - hlavička a sidebar používaly logo s původním názvem.
- Cílový stav:
  - aplikace používá název `FaktAI`,
  - branding assety jsou přepnuté na logo `FaktAI`,
  - PDF patička používá nový název.

## 3. Scope změny
- Frontend:
  - `apps/web/src/brand.ts`
  - `apps/web/index.html`
  - `apps/web/src/components/SiteHeader.tsx`
  - `apps/web/src/components/AppLayout.tsx`
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/public/branding/faktai-logo.png`
  - `apps/web/public/branding/faktai-logo-dark.png`
- Backend:
  - `apps/api/src/invoice/invoice.service.ts`
- Deploy config:
  - `infra/caprover/api.env.example`
- Dokumentace:
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Název aplikace v UI je `FaktAI`.
2. Header/sidebar používají logo `FaktAI`.
3. PDF patička obsahuje text `Vystaveno v aplikaci FaktAI`.

## 5. Rizika a poznámky
- Ilustrační grafika na landing page může obsahovat staré interní texty v obrázku; to není součást tohoto CR.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0033)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - `pnpm --filter @tappyfaktur/api build`
- Výsledek:
  - implementováno dle zadání.
