# CR-0027 - Zjednodušení akcí editoru faktury

## 0. Metadata
- ID: `CR-0027`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Uživatel požaduje jednodušší a méně rušivý editor faktury: odstranit nadbytečné akce v hlavičce, ponechat v editu pouze základní dvojici akcí a sjednotit vizuální prezentaci součtů s detailem faktury.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - editace měla v hlavičce odkazy `Zpět na seznam`, `Detail faktury` a `PDF`,
  - spodní lišta obsahovala i vedlejší akce (`Označit jako uhrazené`, případně smazání konceptu),
  - součty v editoru byly jinak zarovnané než v detailu faktury.
- Cílový stav:
  - editace bez pomocných hlavičkových akcí,
  - v editu dole jen `Uložit` + `Zrušit`,
  - u nové faktury primárně `Vystavit fakturu` jako první akce,
  - součty v editoru zarovnané doprava jako v detailu.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. V režimu `edit` nejsou v hlavičce akce `Zpět na seznam`, `Detail faktury`, `PDF`.
2. V režimu `edit` jsou ve spodní liště pouze `Uložit` a `Zrušit`.
3. V režimu `create` je `Vystavit fakturu` primární a první akce.
4. Souhrn `Bez DPH / DPH / Celkem` v editoru je zarovnaný doprava.

## 5. Rizika a poznámky
- Změna je čistě UI/UX, bez změn API a datového modelu.
- Akce `Označit jako uhrazené` zůstává dostupná z detailu faktury, ne z editoru.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0027)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `/invoices/:id/edit`, `/invoices/new`
- Výsledek:
  - implementováno dle zadání.
