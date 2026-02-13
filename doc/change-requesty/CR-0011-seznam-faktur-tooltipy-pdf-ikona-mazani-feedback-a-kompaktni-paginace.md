# CR-0011 - Seznam faktur: tooltipy, PDF ikona, mazání feedback a kompaktní paginace

## 0. Metadata
- ID: `CR-0011`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po zavedení ikonových akcí v seznamu faktur byla potřeba zlepšit srozumitelnost akcí a ergonomii tabulky. Uživatel požaduje jasné tooltipy, konzistentnější PDF ikonu, vysvětlení chování mazání a kompaktnější spodní paginaci.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - ikonové akce bez dostatečné kontextové nápovědy,
  - PDF ikona působila vizuálně odlišně,
  - akce smazání mohla působit „nefunkčně“ při ne-draft stavu,
  - vyhledávání a paginace zabíraly zbytečně mnoho prostoru.
- Cílový stav:
  - všechny ikonové akce mají tooltipy a přístupnost (`aria-label`),
  - PDF akce používá konzistentní ikonografii,
  - při pokusu o smazání ne-draft faktury uživatel dostane jasnou hlášku proč to nejde,
  - spodní paginace je kompaktní a fulltextové hledání je dočasně skryté.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoicesPage.tsx`
  - `apps/web/src/index.css`
- Funkční specifikace:
  - Scope 2 (`Vydané faktury`) - dočasné vypnutí fulltextu v UI.

## 4. Návrh změn ve specifikaci
- Scope 2:
  - fulltextové hledání přes UI je dočasně vypnuto,
  - zůstávají stavové filtry + kompaktní paginace,
  - řádkové akce jsou ikonové s tooltipy.

## 5. Akceptační kritéria
1. Ikonové akce v seznamu faktur zobrazují tooltip (hover/focus).
2. PDF akce používá stejný ikonografický styl jako ostatní akce.
3. Klik na smazání u non-draft faktury vrátí srozumitelnou chybovou hlášku.
4. Smazání draft faktury zůstává funkční.
5. Paginace a volba počtu položek na stránku jsou ve zhuštěném spodním panelu.
6. Fulltextové pole není v UI seznamu faktur zobrazeno.

## 6. Rizika a poznámky
- Riziko: tooltipy nejsou na touch zařízeních tak výrazné jako na desktopu.
- Mitigace: zachované `aria-label` + `title` atributy + konzistentní ikony.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke na `/invoices`:
    - kontrola tooltip textů,
    - kontrola nové PDF ikony,
    - klik na smazání non-draft -> validační hláška,
    - klik na smazání draft -> standardní mazací flow.
- Výsledek:
  - implementováno a nasazeno v lokálním prostředí.
