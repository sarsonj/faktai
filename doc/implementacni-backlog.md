# Implementační backlog projektu FakturAI

## 0. Stav dokumentu
- Verze: `0.1`
- Datum: `2026-02-12`
- Stav: `Návrh k realizaci`
- Vstupní dokumenty:
  - `doc/funkcni-specifikace.md` (verze `1.2`)
  - `doc/tecnicka-specifikace.md` (verze `0.4`)

## 1. Princip plánování
- Iterace jsou navržené sekvenčně s možností dílčí paralelizace FE/BE.
- Každá iterace má jasné `Exit kritérium` (Definition of Done pro iteraci).
- Odhad je orientační ve `story points` (SP), bez kapacitního kalendáře týmu.

## 2. Milníky (high-level)
1. `M1`: Běžící skeleton aplikace v Dockeru + autentizace.
2. `M2`: End-to-end fakturace (onboarding -> faktura -> seznam).
3. `M3`: PDF + QR export.
4. `M4`: DPH XML exporty (DPH přiznání, SH, KH).
5. `M5`: Hardening, UAT, release kandidát.

## 3. Iterační plán

## Iterace 0 - Platforma a foundation
- Cíl:
  - Připravit repozitář, CI základ, Docker runtime, DB migrace a sdílené typy.
- Scope:
  - Monorepo struktura `apps/web`, `apps/api`, `packages/shared`, `infra/docker`.
  - Docker Compose (`web`, `api`, `db`), healthchecke.
  - Inicializace DB migrací při startu API.
  - Lint/format/test skripty.
  - Základní app shell a routing placeholdery.
- Technické tasky:
  - `BE-0001`: NestJS bootstrap + modulární struktura.
  - `FE-0001`: React + router + query client + základ layoutu.
  - `INF-0001`: `docker-compose.yml`, multi-stage Dockerfile.
  - `DB-0001`: Prisma inicializace + první migrace.
  - `QA-0001`: smoke testy startu stacku.
- Odhad: `24 SP`
- Závislosti: žádné
- Exit kritérium:
  - `docker compose up` spustí všechny služby bez manuálních zásahů.
  - FE i BE mají funkční health endpoint/page.

## Iterace 1 - Scope 7 (Auth + session)
- Cíl:
  - Dodat plný auth lifecycle: registrace, login, logout, reset hesla.
- Scope:
  - API endpointy `POST /auth/register|login|logout|forgot-password|reset-password`, `GET /auth/me`.
  - DB tabulky `users`, `user_sessions`, `password_reset_tokens`.
  - FE obrazovky auth flow.
  - Guardy na chráněné routy.
- Technické tasky:
  - `DB-0101`: migrace auth tabulek + indexy.
  - `BE-0101`: hash hesel (`argon2id`) + session cookie.
  - `BE-0102`: forgot/reset flow + SMTP adaptér.
  - `FE-0101`: login/registrace/forgot/reset stránky.
  - `FE-0102`: auth guard + redirect logic.
  - `QA-0101`: integrační testy auth lifecycle.
- Odhad: `38 SP`
- Závislosti: Iterace 0
- Exit kritérium:
  - Nový uživatel se zaregistruje a dostane se do onboardingu subjektu.
  - Logout ukončí pouze aktuální session.

## Iterace 2 - Scope 1 (Správa subjektu)
- Cíl:
  - Zprovoznit onboarding živnostníka a správu profilu subjektu.
- Scope:
  - `GET/POST/PATCH /subject`.
  - Onboarding, detail, editace.
  - Validace IČO/DIČ, bankovních údajů, DPH příznaku.
- Technické tasky:
  - `DB-0201`: tabulka `subjects` + 1:1 vazba na user.
  - `BE-0201`: Subject service + validace.
  - `FE-0201`: onboarding flow + form state.
  - `FE-0202`: settings stránky (`/settings/subject`).
  - `QA-0201`: testy guardu bez subjektu.
- Odhad: `26 SP`
- Závislosti: Iterace 1
- Exit kritérium:
  - Bez subjektu nelze otevřít fakturační moduly.
  - Po uložení subjektu redirect na `/invoices`.

## Iterace 3 - Scope 2 (Seznam vydaných faktur)
- Cíl:
  - Dodat list faktur s filtrováním, hledáním a stránkováním.
- Scope:
  - `GET /invoices` + query (`status`, `q`, `page`, `pageSize`).
  - FE tabulka s kontextem v URL.
  - Základní řádkové akce (navigace na detail/edit/copy).
- Technické tasky:
  - `DB-0301`: tabulky `invoices`, `invoice_items` + indexy.
  - `BE-0301`: list endpoint + effective status `overdue`.
  - `FE-0301`: tabulka, filtry, vyhledávání, paging.
  - `FE-0302`: stavové a prázdné stavy obrazovky.
  - `QA-0301`: integrační test listování a filtrů.
- Odhad: `34 SP`
- Závislosti: Iterace 2
- Exit kritérium:
  - Seznam vrací správně `uhrazené/neuhrazené/po splatnosti`.
  - Kontext listu se drží v query parametrech.

## Iterace 4 - Scope 3 (Editor faktury + lifecycle)
- Cíl:
  - Dodat plný editor faktur v režimech create/copy/edit a lifecycle stavů.
- Scope:
  - `POST /invoices`, `POST /invoices/:id/copy`, `PATCH /invoices/:id`.
  - `POST /invoices/:id/issue`, `POST /invoices/:id/mark-paid`, `DELETE /invoices/:id`.
  - Číselná řada `YYYYNNNN`.
  - Výpočty DPH/součtů na backendu.
- Technické tasky:
  - `DB-0401`: `invoice_number_sequences`.
  - `BE-0401`: transakční issue flow (`FOR UPDATE`).
  - `BE-0402`: validace položek + taxClassification.
  - `FE-0401`: editor s dynamickými položkami.
  - `FE-0402`: stavy draft/issued/paid a povolené akce.
  - `QA-0401`: integrační testy create->issue->paid + delete draft.
- Odhad: `55 SP`
- Závislosti: Iterace 3
- Exit kritérium:
  - Lze vystavit fakturu s číslem dle formátu.
  - Mazání funguje pouze pro draft.

## Iterace 5 - Scope 4 (PDF + QR)
- Cíl:
  - Implementovat export PDF faktury včetně QR platby SPD.
- Scope:
  - `GET /invoices/:id/pdf`.
  - Render PDF přes `pdfkit`.
  - SPD payload + QR image.
  - Verzování `pdf_version` + hash payloadu.
- Technické tasky:
  - `DB-0501`: metadata PDF exportů.
  - `BE-0501`: PDF render modul + template.
  - `BE-0502`: CZ účet -> IBAN + SPD builder.
  - `FE-0501`: napojení PDF akcí ze seznamu/detailu/editoru.
  - `QA-0501`: validace PDF obsahu a QR scan smoke test.
- Odhad: `29 SP`
- Závislosti: Iterace 4
- Exit kritérium:
  - `issued/paid` faktura jde exportovat do PDF.
  - `draft` export je blokován.

## Iterace 6 - Scope 5 (DPH podklady + XML export)
- Cíl:
  - Dodat DPH modul včetně XML exportů pro tři typy podání.
- Scope:
  - `POST /tax-reports/preview`, `POST /tax-reports/export`, `GET /tax-reports/runs`.
  - Typy: DPH přiznání, souhrnné hlášení, kontrolní hlášení.
  - Perioda: měsíc i čtvrtletí.
  - XSD validace + version whitelist.
- Technické tasky:
  - `DB-0601`: `tax_report_runs`, `tax_report_run_entries`.
  - `BE-0601`: mappers pro 3 XML typy.
  - `BE-0602`: XSD validace + konfigurovatelné verze přes env.
  - `FE-0601`: DPH podklady obrazovka + preview.
  - `FE-0602`: historie exportů.
  - `QA-0601`: integrační testy runVersion a dataset hash.
- Odhad: `63 SP`
- Závislosti: Iterace 4
- Exit kritérium:
  - Plátce DPH dokáže exportovat všechny 3 XML typy.
  - XML prochází XSD validací.

## Iterace 7 - Stabilizace a release kandidát
- Cíl:
  - Uzavřít kvalitu, observabilitu, bezpečnost a provozní připravenost.
- Scope:
  - E2E coverage klíčových flow.
  - Performance tuning listu faktur a exportů.
  - Error handling, audit log review.
  - UAT checklist + release notes.
- Technické tasky:
  - `QA-0701`: rozšířené E2E scénáře.
  - `OPS-0701`: logging, request-id, error tracking.
  - `SEC-0701`: auth rate-limiting, security headers, cookie politika.
  - `REL-0701`: release candidate build.
- Odhad: `31 SP`
- Závislosti: Iterace 1-6
- Exit kritérium:
  - Všechny prioritní acceptance testy zelené.
  - Release candidate připravený pro pilotní provoz.

## 4. Prioritizovaný backlog (epiky)

| Epic ID | Název | Scope | Priorita | Odhad |
|---|---|---|---|---|
| `EP-01` | Platform foundation | 0 | Must | 24 SP |
| `EP-02` | Auth + Session | 7 | Must | 38 SP |
| `EP-03` | Subject onboarding | 1 | Must | 26 SP |
| `EP-04` | Invoice list | 2 | Must | 34 SP |
| `EP-05` | Invoice editor + lifecycle | 3 | Must | 55 SP |
| `EP-06` | PDF + QR export | 4 | Must | 29 SP |
| `EP-07` | DPH XML reports | 5 | Must | 63 SP |
| `EP-08` | Hardening + Release | Cross | Must | 31 SP |

## 5. Kritické závislosti
1. `EP-02` musí předcházet všem business modulům.
2. `EP-03` musí být dokončen před plnou fakturací (`EP-04`, `EP-05`).
3. `EP-05` je vstupní podmínka pro `EP-06` i `EP-07`.
4. `EP-07` vyžaduje finální `taxClassification` logiku z `EP-05`.

## 6. Rizika a mitigace

| Riziko | Dopad | Mitigace |
|---|---|---|
| Časté změny XSD schémat | Rework exportů | Verze přes env + whitelist + integrační validace v CI |
| Složitost KH mapování | Zpoždění Scope 5 | Dřívější prototyp mapperu v Iteraci 4/5 |
| Chyby ve výpočtech DPH | Kritická business chyba | Backend-only výpočty + unit testy nad hraničními daty |
| Nestabilní PDF layout | UAT blokace | Snapshot testy PDF + kontrolní checklist |
| Auth brute-force | Bezpečnostní incident | Rate limit + lockout strategie + audit log |

## 7. Definition of Done (globální)
1. Kód je v hlavní větvi, review schváleno.
2. Unit + integrační testy zelené.
3. Dokumentace API/DB aktualizována.
4. Chybové stavy pokryté a lokalizované.
5. Funkcionalita odpovídá příslušným akceptačním kritériím ve funkční specifikaci.
