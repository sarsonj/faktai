# CR-0009 - SaaS app shell: oddělená navigace a uživatelské menu

## 0. Metadata
- ID: `CR-0009`
- Datum: `2026-02-13`
- Stav: `Ke schválení`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
Po Fázi 1 redesignu zůstala připomínka k informační architektuře UI: globální navigace se vizuálně míchala s lokálními filtry/akcemi stránky. Uživatel požaduje standardní SaaS pattern s odděleným menu a profilem uživatele v pravém horním rohu.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - linky mezi hlavními moduly byly na stránkách vedle lokálních filtrů,
  - orientace mezi „globální navigací“ a „obsahovými ovládacími prvky“ byla nejasná.
- Cílový stav:
  - globální navigace je samostatná (app shell),
  - stránka obsahuje pouze lokální ovládací prvky,
  - vpravo nahoře je uživatelský profil (avatar) s dropdown menu a akcí `Odhlásit`.

## 3. Scope změny
- Frontend layout:
  - nový komponent `apps/web/src/components/AppLayout.tsx`,
  - úprava routingu v `apps/web/src/App.tsx` na nested protected layout.
- Úprava stránek:
  - odstranění globálních navigačních linků ze stránkového obsahu (`invoices`, `tax-reports`, `settings`),
  - zachování pouze lokálních akcí/filtrů.
- Stylování:
  - rozšíření `apps/web/src/index.css` o `app-frame`, `app-sidebar`, `app-topbar`, `app-user-menu`.

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - Scope 6: zpřesnit rozdělení globální navigace vs. lokální akce stránky.
- Technická specifikace:
  - Frontend návrh: doplnit implementaci app shell komponenty a nested routing.

## 5. Akceptační kritéria
1. Hlavní moduly (`Vydané faktury`, `DPH podklady`, `Nastavení subjektu`) jsou dostupné přes samostatnou globální navigaci mimo obsah stránky.
2. Lokální filtry faktur nejsou vizuálně zaměnitelné s globální navigací.
3. V topbaru je vpravo uživatelský avatar/identita.
4. Po kliknutí na avatar se otevře menu s položkou `Odhlásit`.
5. Výše uvedené funguje na desktopu i mobilním viewportu bez rozbití layoutu.

## 6. Rizika a poznámky
- Riziko: změna layoutu může ovlivnit vnímání hustoty obsahu na menších displejích.
- Mitigace: responsive fallback sidebaru a topbaru + mobile smoke test.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke:
    - `/invoices` (oddělení globální navigace vs. filtry),
    - `/tax-reports`, `/settings/subject` (aktivní položky menu),
    - klik na avatar -> dropdown -> dostupné `Odhlásit`,
    - mobilní viewport (`390x844`) bez kolize layoutu.
- Výsledek:
  - implementováno, čeká na vizuální schválení uživatelem.
