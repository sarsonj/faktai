# CR-0061 - Jedna aplikace a SQLite místo PostgreSQL

## 0. Metadata
- ID: `CR-0061`
- Datum: `2026-11-04`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T3`

## 1. Business kontext
- Aplikaci používá jeden vlastník. Provoz tří CapRover appek (web, API, PostgreSQL) je zbytečně složitý: CORS, dvě domény, oddělené nasazení webu a API a zálohy na dvou místech.
- S přílohami přijatých dokladů (CR-0060) přibyl perzistentní adresář. API appku je stejně potřeba založit znovu s volbou „Has Persistent Data“, takže je to vhodná chvíle na zjednodušení.

## 2. Cílový stav
- **Jedna appka:**
  - API servíruje i sestavený web,
  - web a API jsou na jedné adrese (`/api/v1`), bez CORS a runtime konfigurace webu.
- **SQLite:** databáze je soubor `/data/faktai.db` vedle příloh. Všechna data aplikace jsou v jednom perzistentním adresáři `/data`.
- **Denní zálohy:** `/data/backups/faktai-YYYY-MM-DD.db` přes `VACUUM INTO`, ponechá se posledních 14.
- **Jednorázový převod ze stávající PostgreSQL databáze** při prvním startu nové appky:
  - zdroj se nejdřív dorovná historickými migracemi,
  - kopie proběhne v jedné transakci,
  - kontrolují se počty řádků a součty částek.
- **Hledání v seznamech** nerozlišuje velikost písmen ani diakritiku („ucetni“ najde „Účetní“).

## 3. Rozsah změn
- **Prisma:**
  - `provider = "sqlite"`, odstraněné atributy `@db.*`,
  - nová úvodní migrace `20261105000000_init`,
  - PostgreSQL migrace přesunuté do `prisma/postgres-legacy` (jen pro převod).
- **API:**
  - `common/web-app.ts`: statické soubory z `WEB_DIST_DIR`, SPA fallback mimo `/api`,
  - CORS jen při nastaveném `WEB_ORIGIN`,
  - CSP `img-src` doplněno o `blob:`.
- **Dotazy:**
  - seznam let přes `strftime` (`prisma/sqlite-sql.ts`),
  - hledání v aplikaci (`utils/search.ts`) místo `mode: 'insensitive'`.
- **Provoz:**
  - `PRAGMA journal_mode = WAL`,
  - `storage/database-backup.service.ts` (zálohy),
  - `tools/import-from-postgres.ts` + skript `import:postgres`,
  - start skript spouští převod při nastaveném `IMPORT_FROM_POSTGRES_URL`.
- **Web:**
  - `API_BASE_URL` výchozí `/api/v1`,
  - odstraněný `runtime-config.js`,
  - ukázka curl na stránce API klíče s absolutní adresou.
- **Infra:**
  - `infra/docker/app.Dockerfile` a `captain-definition` (místo dvou Dockerfile a `captain-definition-*.json`),
  - `docker-compose.yml` s jednou službou,
  - `infra/caprover/app.env.example`.
- **Dokumentace:**
  - `doc/nasazeni-caprover.md` (nová instalace + postup přechodu),
  - technická specifikace,
  - README.

## 4. Mimo rozsah
- Převod příloh: stará instalace přílohy neměla (CR-0060 ještě nebyl nasazen).
- Víc instancí aplikace (SQLite = jedna instance).

## 5. Rizika a opatření
- **Přesnost částek:** Prisma ukládá `Decimal` v SQLite jako REAL.
  - Ověřeno, že hodnoty v rozsahu `15,2` (i 16 platných číslic) projdou zápisem a čtením beze změny.
  - Součty se počítají v aplikaci (`decimal.js`), ne v SQL.
- **Převod dat:**
  - Běží v transakci a před potvrzením kontroluje počty a součty. Při chybě se nic neuloží.
  - Do neprázdné databáze se nepřevádí.
  - Zdrojová databáze se před převodem dorovná migracemi, proto je nutná záloha (postup v `doc/nasazeni-caprover.md`).
- **Konzistence záloh:** soubor databáze se za běhu nekopíruje, zálohy vytváří aplikace přes `VACUUM INTO`.

## 6. Test plan
- **Jednotkové testy:**
  - `search.spec.ts` (diakritika, velikost písmen),
  - `database-backup.service.spec.ts` (datum podle Prahy, rotace),
  - `web-app.spec.ts` (oddělení API a klientských cest),
  - celé API: 94 testů, web: testy prochází,
  - lint, typecheck a build jsou čisté.
- **Převod na kopii lokální vývojové databáze** (28 uživatelů, 36 faktur, schéma z února 2026), doplněné o 3 přijaté doklady s přílohou a idempotence záznamy:
  - dorovnání schématu proběhlo (4 migrace), počty i součty sedí,
  - druhé spuštění import přeskočí.
- **Srovnání stará verze (PostgreSQL) × nová verze (SQLite) na stejných datech:**
  - shoda ve 100 odpovědích API: seznamy faktur po letech, stavech a hledání; detaily; PDF všech faktur; přijaté doklady; náhledy DPH, KH a SH za všechny měsíce a čtvrtletí 2026; subjekt,
  - export XML přiznání k DPH i KH za Q4 2026 je bajtově shodný,
  - jediné rozdíly: hledání bez diakritiky (záměr) a `datasetHash` v náhledu kvůli `updatedAt`, které změnilo samo stažení PDF během testu.
- **Zápisy v nové verzi:**
  - kopie a vystavení faktury pokračuje v číselné řadě (2026000021),
  - smazání dokladu kaskádově smaže řádky (cizí klíče v SQLite zapnuté),
  - stažení převedené přílohy funguje.
- **Docker image:**
  - převod z PostgreSQL ve stavu před migracemi CR-0051+ přes `IMPORT_FROM_POSTGRES_URL`,
  - web i API na jednom portu, SPA routy, 401/404 v API,
  - po znovuvytvoření kontejneru zůstanou data na volume a import se přeskočí,
  - vznikla denní záloha.
- **Prohlížeč:**
  - přihlášení, seznam faktur s převedenými daty,
  - hledání přijatých dokladů bez diakritiky,
  - stránka API klíče (absolutní URL, odkaz na dokumentaci).
