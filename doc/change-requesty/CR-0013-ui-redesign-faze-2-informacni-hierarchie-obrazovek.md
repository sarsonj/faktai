# CR-0013 - UI redesign Fáze 2: informační hierarchie hlavních obrazovek

## 0. Metadata
- ID: `CR-0013`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po předchozích vizuálních úpravách bylo potřeba zlepšit hlavně informační architekturu obrazovek. Cílem je, aby uživatel okamžitě chápal rozdíl mezi globální navigací, stránkovými akcemi a samotným obsahem formulářů/tabulek.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - hlavní stránky měly nejednotnou strukturu (`h1 + mix toolbarů + obsah`),
  - lokální akce, filtry a data nebyly dostatečně oddělené,
  - rozsáhlé formuláře (subjekt, editor faktury) působily lineárně a hůře se skenovaly.
- Cílový stav:
  - každá klíčová stránka má konzistentní strukturu `page header -> sekce obsahu`,
  - akce stránky jsou v samostatné `page-actions` zóně,
  - obsah je rozdělen do tematických panelů (`ui-section`) s jasnými nadpisy.

## 3. Scope změny
- Frontend:
  - `apps/web/src/index.css`
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/pages/TaxReportsPage.tsx`
  - `apps/web/src/pages/SettingsSubjectPage.tsx`
  - `apps/web/src/pages/OnboardingSubjectPage.tsx`
  - `apps/web/src/components/SubjectForm.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit pravidla hierarchie stránky (page header, sekce, lokální akce a filtry).
- Technická specifikace:
  - rozšířit UI pravidla o nové layout utility (`page-head`, `ui-section`, `action-link`) a sekční strukturu formulářů.

## 5. Akceptační kritéria
1. Hlavní obrazovky používají jednotný `page header` se sekčním názvem a stručným popisem.
2. Lokální filtry a akce jsou vizuálně oddělené od datové části obrazovky.
3. Seznam faktur má oddělenou sekci filtrů a datovou tabulku v samostatném obsahovém panelu.
4. Editor faktury a formulář subjektu jsou členěné do tematických sekcí.
5. Frontend build projde bez chyby.

## 6. Rizika a poznámky
- Riziko: větší CSS zásah může změnit rozložení na menších displejích.
- Mitigace: breakpoint pravidla byly rozšířeny i pro nové layout bloky; ověřeno buildem a smoke kontrolou.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/invoices`, `/invoices/:id`, `/invoices/:id/edit`, `/tax-reports`, `/settings/subject`.
- Výsledek:
  - implementováno včetně aktualizace funkční a technické specifikace.
