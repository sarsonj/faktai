# CR-0029 - Landing page: integrace grafiky hero a feature sekcí

## 0. Metadata
- ID: `CR-0029`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Landing page byla funkční po textové stránce, ale chyběl jí výraznější vizuální prvek. Uživatel dodal konkrétní grafické podklady (`hero.png`, `features.png`) a požádal o jejich zapracování přímo do layoutu stránky.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - hero sekce byla textová bez vlastní produktové grafiky,
  - sekce se třemi highlighty obsahovala pouze textové karty bez ilustrací.
- Cílový stav:
  - hero sekce obsahuje hlavní vizuál vedle textu a CTA,
  - každá feature karta obsahuje vlastní ilustraci,
  - grafika je optimalizovaná pro web a responzivní layout.

## 3. Scope změny
- Frontend:
  - `apps/web/src/pages/LandingPage.tsx`
  - `apps/web/src/index.css`
- Assety:
  - `apps/web/public/graphics/landing-hero.webp`
  - `apps/web/public/graphics/landing-feature-1.webp`
  - `apps/web/public/graphics/landing-feature-2.webp`
  - `apps/web/public/graphics/landing-feature-3.webp`
- Dokumentace:
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Landing page zobrazuje v hero sekci nový hlavní obrázek dodaný uživatelem.
2. Sekce „Co už dnes umí“ zobrazuje ke každé ze 3 karet vlastní ilustraci.
3. Layout zůstává responzivní (desktop i mobil) bez rozbití CTA a textů.
4. Použité obrázky jsou optimalizované pro webový build.

## 5. Rizika a poznámky
- Zdrojový soubor `features.png` byl rozdělen na 3 samostatné assety pro stabilní mapování na jednotlivé feature karty.
- Při budoucí výměně textů/pořadí highlightů je potřeba zachovat vazbu mezi kartou a ilustrací.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0029)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - `docker compose up -d --build web`
- Výsledek:
  - implementováno dle zadání, grafika je zapracována do landing page.
