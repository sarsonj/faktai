# CR-0059 - Redesign UI aplikace (varianta A, Tailwind + shadcn/ui)

## 0. Metadata
- ID: `CR-0059`
- Datum: `2026-11-03`
- Stav: `Rozpracováno`
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

## 5. Implementace a ověření
- Commit(y): průběžně po fázích.
