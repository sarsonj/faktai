# Technická specifikace projektu FakturAI

## 0. Stav dokumentu
- Verze: `1.3`
- Datum: `2026-02-13`
- Stav: `Rozpracováno`
- Vazba na funkční specifikaci: `doc/funkcni-specifikace.md` (verze `1.10`)

## 1. Technologický stack

### 1.1 Povinné technologie ze zadání
- Backend: `Node.js`
- Frontend: `React`
- Databáze: `PostgreSQL`
- Provoz: `Docker` (všechny části aplikace)

### 1.2 Navržený stack v1
- Jazyk: `TypeScript` (backend + frontend)
- Backend framework: `NestJS` (REST API)
- Frontend build: `Vite`
- Frontend routing: `React Router`
- Frontend data fetching: `TanStack Query`
- Formuláře + validace: `React Hook Form` + `Zod`
- ORM/migrace: `Prisma`
- Auth: `argon2` (hash hesel) + session cookie (httpOnly)
- PDF: `pdfkit`
- QR (SPD): knihovna generující QR PNG/SVG + vlastní builder SPD payloadu
- XML: `fast-xml-parser` + XSD validace
- Testy backend: `Jest` + `Supertest`
- Testy frontend: `Vitest` + `Testing Library`
- E2E: `Playwright`

### 1.3 Lokální tooling pro PDF QA (macOS/Homebrew)
- V prostředí projektu jsou dostupné CLI nástroje pro kontrolu kvality PDF faktur:
  - `poppler`: `pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`
  - `imagemagick`: `magick` (včetně `magick compare` pro vizuální diff)
  - `ghostscript`: podpůrné renderovací utility pro práci s PDF/fonty
- Tyto nástroje se používají při ladění vzhledu faktur, zejména pro:
  - kontrolu vložených fontů a podpory české diakritiky,
  - render PDF do PNG pro vizuální porovnání s referenčním vzorem,
  - extrakci textu pro ověření, že se diakritika nedegraduje už při exportu.

## 2. Architektura systému

### 2.1 Logická architektura
1. `web` (React SPA)
2. `api` (Node.js REST API)
3. `db` (PostgreSQL)
4. `smtp` (odeslání e-mailu pro reset hesla)

V1 běží synchronně přes REST API; samostatný worker/queue není povinný.

### 2.2 Návrh repozitářové struktury
1. `apps/web` - React aplikace
2. `apps/api` - Node API
3. `packages/shared` - sdílené typy/schéma (DTO, enumy)
4. `infra/docker` - Dockerfile, compose, init skripty
5. `doc` - funkční + technická dokumentace

### 2.3 Komunikační pravidla
- Frontend komunikuje pouze s API (`/api/v1/*`).
- API komunikuje s DB přes ORM.
- Žádný přímý přístup z frontend do DB.

## 3. Docker a runtime

### 3.1 Služby v docker-compose
1. `web` - port `3000`
2. `api` - port `4000`
3. `db` - port `5432`

### 3.2 Inicializace databáze
- Při startu `api` proběhne:
1. kontrola připojení na DB,
2. aplikace migrací,
3. seed minimálních referenčních dat (sazby DPH, enum mapování).

### 3.3 Persistované svazky
- `postgres_data` pro data DB.
- Volitelně `tmp_exports` pro dočasné generované soubory během requestu (pokud generátor nepoužívá stream v paměti).

### 3.4 Základní env proměnné
- `DATABASE_URL`
- `TZ=Europe/Prague`
- `API_PORT`
- `WEB_PORT`
- `APP_BASE_URL`
- `INVOICE_NUMBER_FORMAT`
- `XML_SCHEMA_DPH_VERSION`
- `XML_SCHEMA_KH_VERSION`
- `SESSION_SECRET`
- `SESSION_TTL_HOURS`
- `RESET_TOKEN_TTL_MINUTES`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `REGISTRY_TIMEOUT_MS`
- `REGISTRY_USER_AGENT`

## 4. Datový model (PostgreSQL)

### 4.1 Přehled tabulek
1. `users`
2. `user_sessions`
3. `password_reset_tokens`
4. `subjects`
5. `invoice_number_sequences`
6. `invoices`
7. `invoice_items`
8. `pdf_export_metadata`
9. `tax_report_runs`
10. `tax_report_run_entries`

### 4.2 Klíčové tabulky

#### 4.2.1 users
- `id` UUID PK
- `email` unique (case-insensitive)
- `password_hash`
- `is_active` bool default true
- `last_login_at` nullable
- `created_at`, `updated_at`

#### 4.2.2 user_sessions
- `id` UUID PK
- `user_id` FK -> users
- `session_token_hash` unique
- `user_agent` nullable
- `ip_address` nullable
- `expires_at`
- `revoked_at` nullable
- `created_at`

Poznámka:
- Do cookie se ukládá pouze opaque session token, v DB je uložen pouze jeho hash.

#### 4.2.3 password_reset_tokens
- `id` UUID PK
- `user_id` FK -> users
- `token_hash` unique
- `expires_at`
- `used_at` nullable
- `created_at`

Pravidla:
- Token je jednorázový.
- Po úspěšném resetu hesla se všechny aktivní session uživatele revokují.

#### 4.2.4 subjects
- `id` UUID PK
- `user_id` FK -> users (1:1 v1)
- Identita: `first_name`, `last_name`, `business_name`, `ico`, `dic`
- Adresa: `street`, `city`, `postal_code`, `country_code`
- DPH: `is_vat_payer`, `vat_registration_date`, `vat_period_type` (`month|quarter`, default `quarter`)
- Banka: `bank_account_prefix`, `bank_account_number`, `bank_code`
- Výchozí nastavení: `default_variable_symbol_type`, `default_variable_symbol_value`, `default_due_days`
- Unikátní constraint: `user_id` (v1 jen 1 subjekt na účet)

#### 4.2.5 invoice_number_sequences
- `id` UUID PK
- `subject_id` FK unique
- `period_year` int
- `current_value` int
- Unikátní constraint: (`subject_id`, `period_year`)

#### 4.2.6 invoices
- `id` UUID PK
- `subject_id` FK
- `status` enum: `draft | issued | paid | cancelled`
- `invoice_number` nullable, unique per subject when not null
- `variable_symbol`
- `issue_date`, `taxable_supply_date`, `due_date`
- `payment_method` enum: `bank_transfer`
- `tax_classification` enum:
  - `domestic_standard`
  - `domestic_reverse_charge`
  - `eu_service`
  - `eu_goods`
  - `export_third_country`
  - `exempt_without_credit`
- Odběratel snapshot:
  - `customer_name`, `customer_ico`, `customer_dic`
  - `customer_street`, `customer_city`, `customer_postal_code`, `customer_country_code`
- Dodavatel snapshot (JSONB): `supplier_snapshot`
- Součty:
  - `total_without_vat`
  - `total_vat`
  - `total_with_vat`
- Platební metadata:
  - `paid_at` nullable
- Poznámka: `note`
- PDF metadata:
  - `pdf_version` int default 0
  - `pdf_payload_hash` nullable
- Audit:
  - `created_at`, `updated_at`

Poznámka ke stavu `overdue`:
- V DB se neukládá fyzicky.
- API vrací vypočtený `effectiveStatus`:
  - `overdue`, pokud `status='issued'` a `due_date < local_today`.
  - jinak hodnota `status`.

#### 4.2.7 invoice_items
- `id` UUID PK
- `invoice_id` FK (ON DELETE CASCADE)
- `position` int
- `description`
- `quantity` numeric(15,3)
- `unit` varchar(20)
- `unit_price` numeric(15,2)
- `vat_rate` smallint (`0|12|21`)
- `line_total_without_vat` numeric(15,2)
- `line_vat_amount` numeric(15,2)
- `line_total_with_vat` numeric(15,2)

#### 4.2.8 pdf_export_metadata
- `id` UUID PK
- `invoice_id` FK
- `exported_at`
- `exported_by_user_id` FK
- `pdf_version`
- `payload_hash`

#### 4.2.9 tax_report_runs
- `id` UUID PK
- `subject_id` FK
- `report_type` enum: `vat_return | summary_statement | control_statement` (v1 používá jen `vat_return` a `control_statement`)
- `period_type` enum: `month | quarter`
- `period_year` int
- `period_value` int
- `run_version` int
- `dataset_hash`
- `generated_by_user_id` FK
- `generated_at`

#### 4.2.10 tax_report_run_entries
- `id` UUID PK
- `run_id` FK -> tax_report_runs (ON DELETE CASCADE)
- `invoice_id` FK -> invoices
- `invoice_updated_at_snapshot`

### 4.3 Indexy a constrainty
- Unique index na `lower(users.email)`.
- Index `user_sessions(user_id, expires_at)`.
- Index `password_reset_tokens(user_id, expires_at)`.
- Index `invoices(subject_id, issue_date desc)`
- Index `invoices(subject_id, due_date)`
- Index `invoices(subject_id, status)`
- Index `invoices(subject_id, taxable_supply_date)`
- Fulltext-like index pro hledání (trigram) nad:
  - `invoice_number`
  - `customer_name`
  - `note`
- Constraint: `due_date >= issue_date`
- Constraint: `default_due_days between 1 and 90`
- Constraint: `vat_rate in (0,12,21)`

## 5. API kontrakty (REST, /api/v1)

### 5.1 Auth (Scope 7)
1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/logout`
4. `POST /auth/forgot-password`
5. `POST /auth/reset-password`
6. `GET /auth/me`

Pravidla:
- `register`:
  - vytvoří uživatele,
  - založí session,
  - vrací profil `me`,
  - validuje heslo minimálně na 8 znaků.
- `login`:
  - validuje credentials,
  - zakládá novou session pro aktuální zařízení.
- `logout`:
  - ruší pouze aktuální session (potvrzené rozhodnutí Scope 7).
- `forgot-password`:
  - vždy vrací obecnou odpověď bez prozrazení existence účtu.
- `reset-password`:
  - ověří reset token,
  - uloží nové heslo,
  - revokuje všechny aktivní session uživatele.
- session je přenášena přes `httpOnly` cookie.
- validační zprávy jsou v češtině.

### 5.2 Subject (Scope 1)
1. `GET /subject`
2. `POST /subject`
3. `PATCH /subject`

Backend validace:
- IČO checksum.
- DIČ povinné jen když `isVatPayer=true`.
- `vatPeriodType` povoluje jen `month|quarter`.
- Bankovní účet validace délky/povolených znaků.
- normalizace vstupů (IČO/PSČ bez mezer, země uppercase).
- lookup endpointy pro ARES a adresy:
  1. `GET /registry/company/:ico`
  2. `GET /registry/company-search?q=...`
  3. `GET /registry/address-search?q=...`

### 5.3 Invoices (Scope 2 + 3)
1. `GET /invoices`
2. `POST /invoices` (create draft)
3. `POST /invoices/:id/copy`
4. `GET /invoices/:id`
5. `PATCH /invoices/:id`
6. `POST /invoices/:id/issue`
7. `POST /invoices/:id/mark-paid`
8. `DELETE /invoices/:id`

`GET /invoices` query:
- `status=all|paid|unpaid|overdue`
- `q=string`
- `page=int`
- `pageSize=10|20|50`

Pravidla:
- `DELETE` je povoleno pro všechny stavy faktury.
- `issue` běží transakčně včetně přidělení čísla faktury.
- `mark-paid` nastaví `status=paid` + `paid_at`.
- `customerIco` se před uložením normalizuje bez mezer.
- FE může využít `GET /registry/company-search` pro předvyplnění odběratele.

### 5.4 PDF export (Scope 4)
1. `GET /invoices/:id/pdf`

Pravidla:
- Povolené stavy: `issued|paid|overdue`.
- `draft` vrací `409`.
- Export vrací `application/pdf` stream.
- Pokud se payload změnil od posledního exportu, zvýší se `pdf_version`.
- Renderer používá blokový layout:
  - hlavička + identifikace stran,
  - platební tabulka,
  - položková tabulka,
  - QR + tabulka souhrnu DPH + zvýrazněný grand total.

### 5.5 Tax reports (Scope 5)
1. `POST /tax-reports/preview`
2. `POST /tax-reports/export`

`POST /tax-reports/preview` vstup:
- `reportType`: `vat_return|control_statement`
- `periodType`: `month|quarter`
- `year`
- `value` (1-12 nebo 1-4)

`POST /tax-reports/export`:
- stejné vstupy jako preview
- odpověď: `application/xml`
- soubor se vždy generuje z aktuálních dat (bez historie exportů v UI).
- `vat_return` exportuje FU strukturu `Pisemnost/DPHDP3`.
- `control_statement` exportuje FU strukturu `Pisemnost/DPHKH1`.
- názvy souborů:
  - `${ICO}_DPH_${YEAR}${PERIOD}M|Q.xml`
  - `${ICO}_DPHKH_${YEAR}${PERIOD}M|Q.xml`
  - `PERIOD=01..12` pro `month`, `PERIOD=1..4` pro `quarter`
  - příklad: `24755851_DPH_202601M.xml`, `24755851_DPHKH_20254Q.xml`

## 6. Klíčové transakční scénáře

### 6.1 Registrace uživatele
1. Validace vstupu (`email`, `heslo`, `potvrzení hesla`).
2. V DB transakci:
   - kontrola unikátnosti e-mailu,
   - vytvoření uživatele s `password_hash`,
   - vytvoření session.
3. Nastavení auth cookie.

Poznámka:
- Heslo: min. 8 znaků, speciální znak není povinný.

### 6.2 Přihlášení uživatele
1. Ověření credentials.
2. Vytvoření session záznamu (`user_sessions`).
3. Nastavení auth cookie.
4. Aktualizace `users.last_login_at`.

### 6.3 Reset hesla
1. `forgot-password`: vytvoření jednorázového tokenu a odeslání e-mailu.
2. `reset-password`:
   - validace tokenu,
   - update `users.password_hash`,
   - označení tokenu jako použitý,
   - revokace všech aktivních session uživatele.

### 6.4 Vystavení faktury
1. Validace draftu.
2. DB transakce:
   - lock sekvence (`FOR UPDATE`),
   - inkrement sekvence,
   - výpočet čísla faktury,
   - update faktury na `issued`,
   - `variableSymbol` je při vystavení vždy shodný s `invoiceNumber`.
3. Commit.

### 6.4.1 Editace vystavené faktury
1. `PATCH /invoices/:id` je povoleno i pro stav `issued`.
2. Pokud má faktura `invoiceNumber`, backend ignoruje ručně zadaný `variableSymbol` a nastaví jej na `invoiceNumber`.
3. Frontend po úspěšném `PATCH` v režimu edit přesměruje uživatele zpět na `/invoices` se stejným query stringem.

### 6.5 Kopie faktury
1. Načíst zdrojovou fakturu + položky.
2. Vytvořit novou `draft` fakturu bez `invoice_number`.
3. Přepočítat datumy (`issueDate=today`, `dueDate=+defaultDueDays`).
4. Zkopírovat položky.

### 6.6 Mazání faktury
1. Ověřit `status=draft`.
2. Smazat fakturu (cascade položek).
3. Vrátit `204`.

### 6.7 Export PDF
1. Načíst fakturu + položky + subject snapshot.
2. Ověřit pravidla exportu.
3. Sestavit render payload + hash.
4. Pokud hash != `pdf_payload_hash`:
   - `pdf_version += 1`,
   - uložit nový hash.
5. Vyrenderovat sekce dokumentu v pořadí:
   - hlavička dokladu,
   - strany dokladu,
   - platební tabulka,
   - položková tabulka,
   - QR + souhrn DPH + grand total,
   - patička.
6. Streamovat PDF.

### 6.8 Export XML daňových podkladů
1. Spočítat dataset pro období.
2. Sestavit XML dle typu podání:
   - `vat_return` -> `DPHDP3` + `VetaD/VetaP/Veta1..Veta6`,
   - `control_statement` -> `DPHKH1` + `VetaD/VetaP/VetaA4/VetaC`.
3. Validovat proti XSD.
4. Vrátit XML stream.

### 6.9 Registry lookup (ARES + adresa)
1. FE odešle dotaz na interní `registry` endpoint.
2. API validuje vstup a zavolá externí službu:
   - ARES pro firmy,
   - Nominatim/OpenStreetMap pro adresy.
3. API odpověď normalizuje na interní datový model.
4. FE použije výsledek pro předvyplnění formuláře; uživatel může hodnoty ručně upravit.
5. Při výpadku externí služby API vrátí kontrolovanou chybu, ruční vstup zůstává dostupný.

## 7. Frontend technický návrh

### 7.1 Routing
- React Router routes odpovídají funkční mapě:
  - `/`
  - `/onboarding/start`
  - `/auth/login`
  - `/auth/register`
  - `/auth/forgot-password`
  - `/auth/reset-password`
  - `/onboarding/subject`
  - `/invoices`
  - `/invoices/new`
  - `/invoices/:invoiceId`
  - `/invoices/:invoiceId/edit`
  - `/invoices/:invoiceId/copy`
  - `/tax-reports`
  - `/settings/subject`
- Chráněné routy aplikace jsou seskupeny do společného layoutu (`AppLayout`) přes nested routing.

### 7.2 Stav a data
- Server state: `TanStack Query`.
- Form state: `React Hook Form`.
- Validace formulářů: `Zod` schema shodná s backend DTO.
- Kontext seznamu faktur držený v URL query parametrech.
- Asistované vyhledávání subjektu/odběratele přes `registry-api.ts`.
- Auth guard:
  - veřejné routy: `/`, `/auth/*`, `/onboarding/start`,
  - ostatní routy vyžadují validní session (`/auth/me`).
  - aplikační routy pod `AppLayout` vyžadují navíc existující subjekt (`me.hasSubject=true`), jinak redirect na `/onboarding/subject`.

### 7.3 UI komponenty
- Tabulka faktur: server-side pagination.
- Formulář položek: dynamické řádky.
- Globální toast provider.
- Confirm modal pro destruktivní akce.
- Breadcrumb navigace na detailu a editoru faktury.
- KPI karty v detailu faktury (`celkem`, `základ daně`, `DPH`).
- Editor položek s průběžným výpočtem řádkového součtu.
- Sticky action bar v editoru faktury (akce dostupné i při delším scrollu).
- Landing page (`LandingPage`) jako veřejný vstup do produktu.
- Onboarding start stránka (`OnboardingStartPage`) pro registraci ve stejném UX toku jako onboarding subjektu.
- Auth layout (`auth-layout`) se dvěma zónami: informační panel + formulářový panel.
- Subject summary karty v onboardingu a nastavení subjektu.
- Onboarding (`OnboardingSubjectWizard`) jako 3-krokový průvodce.

### 7.4 Design foundation (UI)
- Design tokens jsou definované centrálně v `apps/web/src/index.css`:
  - barvy (`--primary`, `--secondary`, `--danger`, neutrals),
  - typografie (`--font-body`, `--font-heading`),
  - spacing/radius/stíny.
- Komponentní stavy:
  - formulářové prvky: `default/hover/focus/disabled`,
  - tlačítka: `primary/secondary/danger` + disabled,
  - stavové badge pro faktury: `draft/issued/overdue/paid/cancelled`.
- Responsivní pravidla:
  - breakpointy pro mobil/tablet jsou řešené přes media query v globálním stylesheetu,
  - tabulky mají mobilní fallback se scroll kontejnerem.
- App shell:
  - `AppLayout` obsahuje globální sidebar navigaci a topbar.
  - topbar používá sdílenou komponentu `SiteHeader` (logo + sekce + uživatelské menu).
  - stránkové filtry/akce se renderují pouze v obsahu modulu, nikoliv v globální navigaci.
- Veřejné a onboarding obrazovky:
  - používají stejnou komponentu `SiteHeader` pro konzistentní hlavičku (logo + auth akce / avatar).
- Layout hierarchy (Fáze 2):
  - `page-head`: jednotná hlavička stránky (kicker + title + subtitle + page actions),
  - `ui-section`: konzistentní obsahový panel pro logické bloky stránky,
  - `ui-section-head`: lokální hlavička sekce pro kombinaci nadpisu a ovládacích prvků (filtry/sekční akce),
  - `action-link`: link-styled CTA odpovídající vizuální logice tlačítek,
  - `subject-form` a editor faktury používají sekční členění (`Základní údaje`, `Adresa`, `Položky`, ...).
- Fakturační polish (Fáze 3):
  - `breadcrumb` je samostatný prvek nad page headerem na detailu/editoru,
  - `invoice-stats` poskytuje rychlý vizuální souhrn stavů v seznamu faktur,
  - `invoice-item-total` zobrazuje per-item částku s DPH v editoru,
  - `editor-action-bar` je sticky panel s primárními workflow akcemi.
- Podpůrné moduly polish (Fáze 4):
  - `auth-card`, `auth-layout`, `auth-aside`, `auth-panel` sjednocují vzhled auth sekce,
  - `kpi-grid`/`kpi-card` jsou znovupoužité v onboardingu a správě subjektu.
- Onboarding UX refresh:
  - kroková navigace (`onboarding-steps`, `onboarding-step`) s lokální validací po krocích,
  - registry lookup je dostupný v onboardingu, ale není součástí editace subjektu.
  - onboarding start krok `Vytvoření účtu` má jednokolonový layout formuláře (`onboarding-account-form`).

## 8. Výpočty a formátování

### 8.1 Finanční výpočty
- Výpočty probíhají na backendu.
- Frontend jen zobrazuje výsledky.
- Decimal aritmetika přes knihovnu (`decimal.js`), nikdy `float`.

### 8.2 Datum a čas
- Ukládání timestampů v UTC.
- Business pravidla (splatnost, overdue) podle `Europe/Prague`.
- Formát zobrazení: `DD.MM.YYYY`.

### 8.3 Měna
- V1 pouze `CZK`.
- Formát částek: `1 234,56 Kč`.

## 9. PDF a QR (SPD)

### 9.1 PDF renderer
- Server-side render do PDF.
- Embedded font s podporou češtiny.
- Layout odpovídá funkční specifikaci Scope 4.
- Vizuální baseline pro v1 odpovídá referenci `doc/examples/Vydaná faktura - 0126.pdf`.

### 9.2 SPD payload
- Povinná pole: `ACC`, `AM`, `CC`, `X-VS`.
- `ACC` se skládá z IBAN.
- Převod CZ účtu (`prefix/number/bankCode`) -> `CZ IBAN` probíhá backendově.

### 9.3 Chybové stavy
- Chybějící bankovní údaje: `422 Unprocessable Entity`.
- Nevalidní IBAN/SPD payload: `422`.

## 10. XML výstupy pro daňová podání

### 10.1 Obecně
- Každý typ podání má vlastní mapper dat -> XML model.
- Nad výsledkem probíhá XSD validace.
- Chyby mapování/validace vrací `422` s detailním listem problémů.
- Pro `vat_return` a `control_statement` se používá FU-compatible struktura atributových vět (`Veta*`).

### 10.2 Typy exportu v1
1. `Přiznání k DPH`
2. `Kontrolní hlášení`

Mapování v1:
1. `Přiznání k DPH` -> `Pisemnost/DPHDP3`
2. `Kontrolní hlášení` -> `Pisemnost/DPHKH1`
3. Referenční struktury: `doc/examples/iDoklad_DPH3_2025Q04B`, `doc/examples/iDoklad_DPHKH_2025Q04B`

### 10.3 Strategie verzování běhů
- Verze běhu je interní metadata.
- XML soubor se nearchivuje, vždy se generuje z aktuálních dat.

## 11. Bezpečnost a audit

### 11.1 API bezpečnost
- `helmet`, `cors`, size limits.
- Basic rate limit na write endpointy.
- Validace všech vstupů na DTO vrstvě.
- Hesla hashovaná přes `argon2id`.
- Session cookie:
  - `httpOnly`,
  - `secure` (mimo local dev),
  - `sameSite=lax`.
- Přísnější rate limiting na auth endpointy (`/auth/login`, `/auth/forgot-password`).

### 11.2 Auditní logika
- `created_at`, `updated_at` na hlavních tabulkách.
- `pdf_export_metadata` jako audit PDF exportů.
- `user_sessions` a `password_reset_tokens` jako audit auth operací.

### 11.3 Přístupový model v1
- 1 uživatel = 1 subjekt.
- Multi-user role model je mimo v1.

## 12. Testovací strategie

### 12.1 Unit testy
- Výpočet DPH a součtů.
- IČO validace.
- IBAN/SPD builder.
- Mappery pro XML.
- Validace hesla.
- Hash/verify auth helpery.

### 12.2 Integrační testy
- Auth lifecycle: register -> login -> me -> logout.
- Forgot/reset password včetně revokace session.
- CRUD Subject.
- Subject onboarding včetně lookupu přes interní `registry` API.
- Invoice lifecycle: create -> issue -> paid.
- Invoice editor: lookup odběratele + ruční editace po předvyplnění.
- Delete draft vs. zákaz delete issued.
- PDF export a verze včetně layout smoke kontroly.
- Tax report export (přímý export XML bez historie v UI).
- Kontrola, že `vat_return` export obsahuje `DPHDP3` a `Veta1..Veta6`.
- Kontrola, že `control_statement` export obsahuje `DPHKH1` a `VetaA4/VetaC`.

### 12.3 E2E testy
- Registrace -> onboarding subjektu -> invoices landing.
- Onboarding -> vytvoření faktury -> export PDF.
- Seznam faktur: filtry + stránkování + návrat kontextu.
- DPH podklady: přímý export XML.

## 13. Nefunkční požadavky

### 13.1 Výkonové cíle v1
- `GET /invoices` p95 < 500 ms pro dataset do 10k faktur/subjekt.
- `GET /invoices/:id/pdf` p95 < 2 s.
- `POST /tax-reports/export` p95 < 5 s pro běžné období.

### 13.2 Dostupnost a provoz
- Lokální provoz přes Docker Compose.
- Produkční deploy mimo rozsah této verze specifikace.

### 13.3 Logging a observabilita
- Strukturované logy JSON.
- Request ID korelace mezi web/api.
- Error tracking hook (Sentry-compatible).

## 14. Potvrzená rozhodnutí
1. Číselná řada faktur používá formát `YYYYNN` (např. `202601`).
2. V1 používá login (single-user bez autentizace se nepoužije).
3. PDF renderer pro v1 je `pdfkit`.
4. Registrace ve v1 nevyžaduje ověření e-mailu před prvním přihlášením.
5. Ve v1 je povolena samoregistrace bez pozvánky.
6. Odhlášení ukončí pouze aktuální session.

## 15. Potvrzené rozhodnutí k XSD verzím
1. XML schémata jsou konfigurovatelná přes env.
2. Aplikace povolí pouze whitelist podporovaných verzí.
3. V kódu je definována výchozí pinned verze pro každý typ podání.

## 16. Technický proces Change Request

### 16.1 Vazba CR -> kód
1. Každý CR má vlastní záznam v `doc/change-requesty/`.
2. V commitu implementace se uvádí odkaz na CR ID v textu commit message nebo v popisu PR.
3. Pokud CR mění API/DB, musí obsahovat explicitní seznam dotčených endpointů/migrací.

### 16.2 Implementační pravidla
1. Změny datového modelu jsou pouze forward přes Prisma migrace.
2. Breaking změny kontraktu se řeší verzováním endpointu nebo kompatibilní přechodovou vrstvou.
3. Každý CR musí mít minimálně:
   - build zelený,
   - unit/integration testy zelené,
   - smoke ověření dotčeného flow.

### 16.3 Klasifikace dopadu CR
Technický dopad CR se značí:
1. `T0` - pouze textace/UI copy, bez dopadu na API/DB.
2. `T1` - změna FE/BE logiky bez migrace DB.
3. `T2` - změna API nebo DB migrace.
4. `T3` - architektonická změna (security/performance/provoz).

### 16.4 Povinná technická část CR
Každý CR musí obsahovat:
1. Dotčené soubory/moduly.
2. Rizika a fallback plán.
3. Test plan (co přesně ověřit).
4. Rollout poznámku (nutnost migrace, env změn, restartu služeb).
