# CR-0014 - UI redesign Fáze 3: fakturační workflow polish (seznam/detail/editor)

## 0. Metadata
- ID: `CR-0014`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po odsouhlasení Fáze 2 je cílem dál zvýšit použitelnost klíčového fakturačního toku. Priorita je rychlá orientace v seznamu, lepší čitelnost detailu a efektivnější práce v dlouhém editoru faktury.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - základní hierarchie obrazovek byla sjednocená, ale chyběly workflow prvky pro rychlé rozhodování,
  - detail/editor neměl zřetelnou kontextovou navigaci (breadcrumb),
  - v editoru nebyly průběžné řádkové součty položek a hlavní akce nebyly při scrollu vždy po ruce.
- Cílový stav:
  - seznam faktur ukazuje rychlý statusový souhrn,
  - detail faktury zobrazuje finanční KPI na první pohled,
  - editor má breadcrumb, per-item součty a sticky akční lištu.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`

## 4. Návrh změn ve specifikaci
- Scope 2:
  - doplnit statusový souhrn nad tabulkou.
- Scope 3:
  - doplnit breadcrumb v editoru/detailu,
  - doplnit průběžný řádkový součet položek v editoru,
  - doplnit sticky akční lištu editoru.

## 5. Akceptační kritéria
1. Seznam faktur zobrazuje statusový souhrn (`Celkem`, `Koncepty`, `Neuhrazené`, `Po splatnosti`, `Uhrazené`).
2. Detail faktury obsahuje breadcrumb a KPI karty (`Celkem k úhradě`, `Základ daně`, `DPH`).
3. Editor faktury obsahuje breadcrumb a u každé položky zobrazuje řádkový součet.
4. Hlavní akce editoru jsou dostupné ve sticky panelu při scrollu.
5. Frontend build projde bez chyby.

## 6. Rizika a poznámky
- Riziko: sticky akční panel může na menších displejích konkurovat prostoru obsahu.
- Mitigace: panel je kompaktní, responzivní a obsahuje pouze klíčové akce.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/invoices`, `/invoices/:id`, `/invoices/:id/edit`.
- Výsledek:
  - implementováno včetně aktualizace funkční a technické specifikace.
