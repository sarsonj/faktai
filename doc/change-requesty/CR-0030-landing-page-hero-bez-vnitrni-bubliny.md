# CR-0030 - Landing page: hero bez vnitřní „bubliny“

## 0. Metadata
- ID: `CR-0030`
- Datum: `2026-02-13`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Po integraci grafiky landing page (`CR-0029`) je hero obrázek vizuálně příliš oddělený od zbytku sekce (efekt „obrázek v bublině“). Cílem je vizuál více propojit s hero blokem.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - hero obrázek má vlastní výrazný rámeček a působí jako samostatná karta.
- Cílový stav:
  - obrázek je přirozenou součástí hero sekce,
  - zmizí efekt oddělené bubliny,
  - desktop i mobil zůstane vizuálně stabilní.

## 3. Scope změny
- Frontend:
  - `apps/web/src/index.css`
- Dokumentace:
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Hero vizuál nemá samostatný „kartový“ rámeček.
2. Kompozice hero působí jako jeden celek (text + ilustrace).
3. Na mobilu se hero nesesype a obrázek má kontrolovanou výšku.

## 5. Rizika a poznámky
- Je potřeba vyvážit čitelnost textu a sílu obrázku (gradient overlay).
- Při změně hero assetu může být potřeba upravit `object-position`.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0030)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - `docker compose up -d --build web`
- Výsledek:
  - implementováno dle zadání.
