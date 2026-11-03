# CR-0059 - Redesign UI aplikace (varianta A, Tailwind + shadcn/ui)

## 0. Metadata
- ID: `CR-0059`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T2`

## 1. Business kontext
- Vlastník vybral variantu A „Klidná přehlednost“ ze tří návrhů (artefakt s variantami vzhledu):
  - světlý vzhled,
  - písmo Inter,
  - bílý sidebar se sekcemi,
  - záložky stavů s počty,
  - jemná tabulka,
  - akce v řádku omezené na „PDF“ a menu „⋯“,
  - teal akcent `#0f766e`.
- Redesign předchází přijatým dokladům, aby nové obrazovky vznikly rovnou v novém vzhledu.
- Rozsah je jen UI aplikace. PDF faktury se nemění.

## 2. Technické řešení
- **Tailwind CSS v4** (`@tailwindcss/vite`) a **shadcn/ui** (styl new-york, Radix UI, lucide ikony, sonner toasty).
- Komponenty jsou v `src/components/ui`, aplikační v `src/components/app`. Alias `@/` vede na `src/`.
- Design tokeny (CSS proměnné) jsou v `src/index.css`.
- **Přechodné soužití se starým CSS:**
  - původní `index.css` → `legacy.css`, importovaný do cascade vrstvy `legacy` pod Tailwind komponentami a utilitami,
  - proměnné původního CSS mají prefix `--legacy-*`,
  - elementové selektory (`button`, `input`, `label`…) neplatí uvnitř oblastí s atributem `data-ui` (nové komponenty),
  - po převedení všech obrazovek se `legacy.css` smaže.
- `useConfirm()` (AlertDialog) nahrazuje `window.confirm`. Hlášení o výsledku akcí zobrazují toasty (sonner).

## 3. Fáze
1. Základ: Tailwind, shadcn/ui, tokeny, nový layout (sidebar se sekcemi Doklady/Daně, nastavení a uživatelské menu dole, mobilní menu), stránka API klíč.
2. Seznam a detail faktury.
3. Editor faktury.
4. Nastavení subjektu, DPH podklady, přihlášení a onboarding, odstranění `legacy.css`.

## 4. Akceptační kritéria
1. Všechny obrazovky aplikace odpovídají variantě A a fungují i na šířce telefonu.
2. Žádné `window.confirm` / nativní dialogy.
3. Funkce aplikace se nemění.
4. `legacy.css` je odstraněný.

## 5. Doprovodné změny a opravy (z code review)
- **API `GET /invoices`:**
  - nový filtr `status=draft`,
  - odpověď obsahuje `statusCounts`, tedy počty za celý rok bez filtru stavu (dříve web počítal jen aktuální stránku).
- **Frontend:**
  - TanStack Query (dříve nepoužitý) s cache a zrušením zastaralých požadavků; odstraňuje race conditions při přepínání filtrů,
  - výpočty v editoru zaokrouhlují po řádcích stejně jako API a přijímají desetinnou čárku,
  - chyby akcí na detailu faktury se zobrazují jako toast a nenahradí stránku.
- **Sjednocení `SubjectForm` a `OnboardingSubjectWizard`:**
  - sdílené sekce a validace, 1 222 → 619 řádků,
  - DIČ je vždy editovatelné a povinné jen pro plátce.
- **Úklid:**
  - odstraněn nepoužívaný `RegisterPage` (registrace probíhá na `/onboarding/start`),
  - po uložení editoru se přejde na detail faktury.
- **První testy webu:** Vitest pro výpočty editoru.

## 6. Implementace a ověření
- Commit(y):
  - fáze 1: `feat(web): Tailwind + shadcn/ui foundation and new app layout`,
  - fáze 2: `feat(web): redesign invoice list and detail`,
  - fáze 3: `feat(web): redesign invoice editor`,
  - fáze 4: `feat(web): redesign settings, tax reports, auth and onboarding; drop legacy CSS`.
- Test plan:
  - typecheck, lint, Vitest a build webu; API testy včetně nového testu `statusCounts`,
  - ruční průchod v prohlížeči proti PostgreSQL s ukázkovými daty:
    - seznam: záložky s počty, menu akcí, potvrzení smazání,
    - detail: úhrada přes dialog, toast,
    - editor: ARES, položky s desetinnou čárkou, vystavení; částky se shodují s API,
    - nastavení, DPH podklady s náhledem řádků přiznání, API klíč,
    - landing, přihlášení, celý onboarding (registrace → 3 kroky → seznam),
    - mobilní šířka 390 px (menu, seznam, prázdný stav).
- Výsledek: vše prošlo.
