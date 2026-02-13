# CR-0026 - Detail faktury: akce, pokročilé volby a konzistence layoutu

## 0. Metadata
- ID: `CR-0026`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Po CR-0025 byl detail faktury čitelnější, ale akce stále působily přeplněně a pokročilé volby rušily hlavní workflow. Současně se po přihlášení rozpadla konzistence šířky layoutu oproti landing/onboarding stránkám.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - běžné akce byly stále vizuálně těžké,
  - `Další možnosti` byly příliš vysoko v primárním workflow,
  - přihlášená část aplikace byla na velkých obrazovkách příliš široká.
- Cílový stav:
  - běžné akce mají kompaktní ikonový quick bar,
  - pokročilé volby jsou přesunuté na konec detailu,
  - app shell po přihlášení má konzistentní max-width.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/InvoiceDetailPage.tsx`
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. V detailu faktury jsou běžné akce zobrazené jako kompaktní ikonové ovládání.
2. Pokročilé akce jsou dostupné až v závěrečné sekci stránky.
3. Na desktopu má přihlášená část aplikace jednotnou max šířku pro topbar i obsah.
4. Funkčně zůstávají zachované všechny předchozí akce (editace, kopie, PDF, změny stavu, pokročilé zásahy).

## 5. Rizika a poznámky
- Změna je prezentační; API a datový model se nemění.
- Při přesunu pokročilých voleb je nutné zachovat jejich discoverability přes jasný nadpis sekce.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0026)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: detail faktury, ikonové akce, sekce pokročilých voleb, změna stavu.
- Výsledek:
  - implementováno dle zadání.
