# CR-0022 - Číslování dokladů a zjednodušení VS

## 0. Metadata
- ID: `CR-0022`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Uživatel požaduje předvídatelné číslování dokladů po rocích a jednodušší práci s variabilním symbolem. Stávající chování přidělovalo číslo až při vystavení a vynucovalo VS podle interní strategie subjektu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - číslo faktury se přidělovalo při `issue`,
  - v nastavení subjektu byla volba `Strategie VS`,
  - backend v některých scénářích přepisoval VS na číslo faktury.
- Cílový stav:
  - nový doklad dostane číslo při vytvoření (`YYYY` + pořadí v roce),
  - pro každý rok se pořadí počítá samostatně od `1`,
  - číslo dokladu je editovatelné a unikátní,
  - VS je defaultně předvyplněn číslem dokladu, ale zůstává editovatelný,
  - volba `Strategie VS` je z UI odstraněna.

## 3. Scope změny
- Backend:
  - `apps/api/src/invoice/dto/upsert-invoice.dto.ts`
  - `apps/api/src/invoice/invoice.service.ts`
- Frontend:
  - `apps/web/src/types.ts`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/components/SubjectForm.tsx`
  - `apps/web/src/components/OnboardingSubjectWizard.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Nový doklad po uložení vždy dostane číslo dle formátu `YYYYNN` jako `max(pro rok) + 1`.
2. Při práci s jiným rokem se pořadí čísluje samostatně od `1`.
3. Číslo dokladu je v editoru editovatelné a server validuje unikátnost.
4. VS je v editoru předvyplněn hodnotou čísla dokladu a lze ho ručně upravit.
5. V nastavení subjektu není viditelná volba `Strategie VS`.

## 5. Rizika a poznámky
- U historických draftů bez čísla se číslo doplní při editaci/vystavení.
- Při souběžném vytváření dokladů může dojít ke kolizi čísla; backend má retry a conflict fallback.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0022)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api typecheck`
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/api test`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - implementováno dle zadání.
