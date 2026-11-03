# CR-0058 - API klíče, OpenAPI dokumentace a idempotence

## 0. Metadata
- ID: `CR-0058`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
- Vlastník chce zadávat doklady (vydané, později přijaté) a stahovat PDF ze svých skriptů.
- API bude používat jen on. Stačí tedy jeden klíč na uživatele bez oprávnění. Stávající endpointy `/api/v1` jsou dostatečné, samostatná veřejná vrstva není potřeba.

## 2. Cílový stav
- **API klíč:**
  - jeden na uživatele, generuje se, mění a ruší v aplikaci (`/settings/api`),
  - autentizace hlavičkou `Authorization: Bearer fai_…`,
  - v DB je jen hash.
- **Idempotence:** hlavička `Idempotency-Key` u vytvoření a kopie faktury chrání skript před duplicitní fakturou při opakování po timeoutu.
- **Pohodlí pro skripty:**
  - `POST /invoices?issue=true` (vytvořit a vystavit jedním voláním),
  - `GET /invoices/by-number/:invoiceNumber`.
- **OpenAPI dokumentace** na `/api/docs` (JSON `/api/docs-json`).
- `GET /auth/me` funguje i s klíčem.
- Mimo hlavní scope: GitHub Actions `checkout`/`setup-node` zvednuty na v5 (upozornění na Node 20 v CI).

## 3. Scope změny
- **API:**
  - `ApiKeyService`, `ApiKeyController`,
  - rozšíření `SessionAuthGuard` (Bearer, `authMethod`),
  - `AuthService.getMe`,
  - `IdempotencyInterceptor`,
  - `InvoiceService.createAndIssue` a `getInvoiceDetailByNumber`,
  - typ `IssuableInvoice` v `invoice-issue-validation.ts`,
  - `common/openapi.ts`, `main.ts` (helmet bez CSP jen pro `/api/docs`, expose `Idempotency-Replayed`),
  - `nest-cli.json` (swagger plugin), závislost `@nestjs/swagger`.
- **Datový model:** tabulky `ApiKey` a `IdempotencyRecord`. Migrace `20261103200000_api_keys_and_idempotency` obsahuje i přejmenování dříve zkráceného indexu `TaxReportRun_…`, které vygenerovala Prisma ke srovnání s historickým stavem.
- **Web:**
  - stránka `SettingsApiKeyPage` s položkou menu `API klíč`,
  - `api-key-api.ts`.
- **Dokumentace:** funkční specifikace 7a, technická specifikace 5.1.1 a 5.3.

## 4. Akceptační kritéria
1. S platným klíčem jdou volat chráněné endpointy. Neplatný klíč vrací 401, a to i když je přítomná platná cookie.
2. Klíčem nejde spravovat klíč (403). Celý klíč se zobrazí jen jednou.
3. Opakovaný `POST /invoices` se stejným `Idempotency-Key` a tělem nevytvoří druhou fakturu a vrátí původní odpověď. Jiné tělo vrací 422, souběžný požadavek 409.
4. `?issue=true` s neplatnými daty (např. přenesení bez kódu předmětu plnění) vrátí 400 a nezaloží koncept.
5. `/api/docs` se zobrazí a JSON obsahuje schémata DTO.

## 5. Rizika a poznámky
- **Klíč má plný přístup:** únik klíče = přístup k účtu. Mitigace: klíč jde kdykoli vyměnit nebo zrušit a stránka ukazuje poslední použití.
- **Rate limit** zůstává podle IP (150 požadavků/min na route), což pro jednoho uživatele stačí.
- **Odpovědi v OpenAPI** zatím nemají schémata (služby vracejí TS typy, ne třídy). Doplní se postupně dekorátory `@ApiOkResponse`.
- **Dokumentace API je veřejná.** Popisuje jen strukturu, data jsou chráněná autentizací. Vypnout ji jde přes `API_DOCS_ENABLED=0`.

## 6. Implementace a ověření
- Commit(y): `feat(api): personal API keys, Idempotency-Key and OpenAPI docs`
- Test plan:
  - unit testy `session-auth.guard.spec.ts` a `idempotency.interceptor.spec.ts` (replay, jiné tělo, souběh, neukládání chyb),
  - end-to-end proti PostgreSQL 16 (curl):
    - vygenerování klíče, `me` přes klíč, 403 a 401,
    - vytvoření a vystavení s `Idempotency-Key` dvakrát → jedna faktura a hlavička `Idempotency-Replayed`,
    - jiné tělo → 422,
    - neplatné `?issue=true` → 400 bez konceptu,
    - PDF podle čísla dokladu,
    - `/api/docs` (200) a JSON (26 cest),
  - ruční kontrola stránky API klíč v prohlížeči,
  - typecheck, lint, testy (73) a build.
- Výsledek: vše prošlo.

- Následná oprava: `actions/setup-node@v5` ve výchozím stavu zapíná cache pro pnpm ještě před `corepack enable` a CI selhávalo („Unable to locate executable file: pnpm“) → `package-manager-cache: false`.
