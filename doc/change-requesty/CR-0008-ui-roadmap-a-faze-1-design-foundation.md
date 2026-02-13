# CR-0008 - UI roadmap + Fáze 1 design foundation

## 0. Metadata
- ID: `CR-0008`
- Datum: `2026-02-13`
- Stav: `Ke schválení`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
Aplikace je funkčně stabilní, ale vizuálně nekonzistentní. Cílem je zvýšit důvěryhodnost produktu a snížit kognitivní zátěž uživatele sjednocením vzhledu a UX detailů.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - UI působí utilitárně, bez jednotného vizuálního systému.
  - Formuláře, tabulky a akce mají rozdílný vizuální rytmus.
  - Některé prvky působí nečitelně (např. stavy faktury, checkboxy, focus).
- Cílový stav:
  - UI používá jednotné design tokens (barvy, typografie, spacing, radius, stíny).
  - Základní komponenty mají konzistentní stavy (`default/hover/focus/disabled`).
  - Obrazovky působí profesionálně a čitelně bez zásahu do business logiky.

## 3. Scope změny
- Fáze 0 (audit): identifikace UX/UI problémů na klíčových obrazovkách.
- Fáze 1 (implementace):
  - `apps/web/src/index.css` (design foundation),
  - drobné úpravy prezentace stavů v:
    - `apps/web/src/pages/InvoicesPage.tsx`,
    - `apps/web/src/pages/InvoiceDetailPage.tsx`,
    - `apps/web/src/components/AuthLayout.tsx`.
- Další plánované fáze (navazující CR/iterace):
  1. Fáze 2: App shell + navigace.
  2. Fáze 3: Klíčové obrazovky fakturace (seznam/editor/detail).
  3. Fáze 4: DPH podklady + Nastavení subjektu + Auth obrazovky.
  4. Fáze 5: Micro-UX, přístupnost a interakční polish.
  5. Fáze 6: Final polish + vizuální regresní kontrola.

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit globální UX pravidla o design foundation a konzistenci interakcí.
- Technická specifikace:
  - doplnit frontend část o design tokens a implementační pravidla stylů.

## 5. Akceptační kritéria (Fáze 1)
1. Aplikace používá jednotný set design tokens pro barvy, typografii, spacing a stíny.
2. Form prvky mají čitelné focus stavy a konzistentní vzhled na desktopu i mobilu.
3. Primární/sekundární/danger akce jsou vizuálně jednoznačně odlišitelné.
4. Statusy faktur jsou zobrazeny jako konzistentní badge prvky.
5. Build web aplikace projde bez chyby.

## 6. Rizika a poznámky
- Riziko: subjektivní vkus může vyžadovat úpravu barev/typografie.
- Mitigace: CR je po Fázi 1 nastaven `Ke schválení` s checkpointem od uživatele.
- Riziko: globální CSS změny mohou ovlivnit všechny obrazovky.
- Mitigace: smoke kontrola hlavních rout + následné iterativní doladění.

## 7. Implementace a ověření
- Commit(y): `TBD`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - Playwright smoke: `auth`, `invoices`, `invoice detail`, `invoice editor`, `tax-reports`, `settings/subject`.
- Výsledek:
  - implementována Fáze 1, čeká na vizuální schválení uživatelem.
