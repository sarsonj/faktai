# CR-0034 - Aktualizace loga z dodaného assetu `logo_new.png`

## 0. Metadata
- ID: `CR-0034`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Byl dodán nový návrh loga (`doc/graphics/logo_new.png`) a požadavek použít jej napříč aplikací tak, aby seděl do všech míst, kde se používá současný branding.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - aplikace používala předchozí logo `FaktAI`.
- Cílový stav:
  - aplikace používá nový dodaný návrh loga,
  - existuje varianta pro světlé i tmavé pozadí,
  - není potřeba měnit odkazy v komponentách (zachované názvy souborů).

## 3. Scope změny
- Assety:
  - `apps/web/public/branding/faktai-logo.png`
  - `apps/web/public/branding/faktai-logo-dark.png`
- Dokumentace:
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. V hlavičce (public stránky) je nové logo.
2. V app shellu (tmavé levé menu) je čitelná varianta loga.
3. Komponenty nevyžadují změnu cest k logu.

## 5. Rizika a poznámky
- Zdrojový soubor obsahoval světlé pozadí; při přípravě assetu byla použita transparentizace pozadí.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0034)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - implementováno dle zadání.

## 7. Iterace (doplnění)
- Iterace 2:
  - logo assety přegenerovány do vyššího rozlišení (`189x80`) pro lepší ostrost při větším zobrazení,
  - zvětšena render výška loga:
    - veřejná hlavička: `28px -> 34px`,
    - logo v levém menu aplikace: `32px -> 40px`.
- Iterace 3:
  - logo znovu připraveno ze zdroje `doc/graphics/logo_new.png` s korektním ořezem obsahu (`173x40`),
  - dark varianta opravena na transparentní PNG s bílým logem a zachovanou alfa maskou (bez plné bílé plochy),
  - výstup sjednocen s chováním původních assetů `fakturai-logo.png` a `fakturai-logo-dark.png`.
- Iterace 4:
  - branding assety přegenerovány ze zdrojů `doc/graphics/logo_new_main.png` (light) a `doc/graphics/logo_new_dark.png` (dark),
  - aplikován ořez transparentních okrajů (`-trim`) a sjednocení na finální render rozměr `173x40`,
  - zachována stejná vizuální výška loga jako u původních `fakturai` assetů.
