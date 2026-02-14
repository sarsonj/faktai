# CR-0032 - CapRover nasazení a příprava runtime konfigurace

## 0. Metadata
- ID: `CR-0032`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
Byla vyžádána připravenost projektu pro nasazení na CapRover, včetně praktické dokumentace a technických úprav, aby deployment byl opakovatelný a snadno konfigurovatelný přes prostředí CapRoveru.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - projekt měl Dockerfile pro `api` a `web`,
  - chyběl deployment runbook pro CapRover,
  - konfigurace API URL ve webu byla primárně build-time.
- Cílový stav:
  - existuje dokumentovaný postup nasazení na CapRover (API + WEB + Postgres),
  - web umí načítat API URL i runtime z env (`WEB_API_URL`),
  - dostupné env šablony pro obě appky.

## 3. Scope změny
- Backend:
  - `apps/api/src/main.ts`
- Frontend:
  - `apps/web/index.html`
  - `apps/web/public/runtime-config.js`
  - `apps/web/src/global.d.ts`
  - `apps/web/src/lib-api.ts`
- Docker:
  - `infra/docker/web.Dockerfile`
  - `infra/docker/start-web-with-runtime-config.sh`
- Konfigurace:
  - `.env.example`
  - `infra/caprover/api.env.example`
  - `infra/caprover/web.env.example`
- Dokumentace:
  - `doc/nasazeni-caprover.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Existuje kompletní návod nasazení na CapRover.
2. Web lze nakonfigurovat na API URL přes runtime env (`WEB_API_URL`) bez nutnosti rebuildu.
3. API je připravené na běh za reverse proxy (`TRUST_PROXY`).
4. V repozitáři jsou env šablony pro `api` a `web` nasazení.

## 5. Rizika a poznámky
- Projekt stále vyžaduje oddělené appky `api` a `web` (jedna appka není cílová produkční topologie).
- Při změně domén je nutné synchronně upravit `WEB_ORIGIN`, `APP_BASE_URL` a `WEB_API_URL`.

## 6. Implementace a ověření
- Commit(y): `viz git historie (CR-0032)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web typecheck`
  - `pnpm --filter @tappyfaktur/web build`
  - `pnpm --filter @tappyfaktur/api build`
- Výsledek:
  - implementováno dle zadání.
