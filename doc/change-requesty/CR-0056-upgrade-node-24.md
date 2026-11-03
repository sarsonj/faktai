# CR-0056 - Upgrade Node.js na 24 LTS a reprodukovatelné Docker buildy

## 0. Metadata
- ID: `CR-0056`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T2`

## 1. Business kontext
- CI i Docker image běžely na Node 20, kterému v dubnu 2026 skončila podpora, takže už nedostává bezpečnostní opravy.
- Docker buildy instalovaly závislosti s `--frozen-lockfile=false` a bez `pnpm-lock.yaml`. Produkční image tak mohl obsahovat jiné verze závislostí, než jaké prošly testy.
- Web image instaloval nepinovaný `serve`.

## 2. Cílový stav
- Node.js 24 LTS (podpora do 04/2028):
  - `.nvmrc`,
  - `engines.node >= 24` v root `package.json`,
  - CI bere verzi z `.nvmrc`,
  - Docker image `node:24-alpine`,
  - `@types/node` v API `^24`.
- Docker buildy (API i web) kopírují `pnpm-lock.yaml` a instalují s `--frozen-lockfile`.
- `serve` ve web image je pinovaný na `14.2.4`.

## 3. Scope změny
- `.nvmrc`, `package.json`, `apps/api/package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`.
- `infra/docker/api.Dockerfile`, `infra/docker/web.Dockerfile`.
- Dokumentace: `doc/tecnicka-specifikace.md` (1.2, 1.4).

## 4. Akceptační kritéria
1. Typecheck, lint, testy a build projdou na Node 24.
2. Docker image API i webu se sestaví se striktním lockfile.
3. Kontejnery se spustí a fungují:
   - migrace,
   - registrace (nativní `argon2`),
   - PDF export,
   - export KH s XSD validací (`xmllint-wasm`),
   - runtime config webu.

## 5. Rizika a poznámky
- Nasazení (CapRover) postaví nové image z Dockerfile, takže není potřeba nic měnit ručně. Lokální vývojáři potřebují Node 24 (`nvm use`).
- Node 26 je od 10/2026 také LTS. Zvolil jsem 24, protože na něm je celý stack ověřený a podporu má do 04/2028. Přechod na 26 lze udělat později samostatným CR.

## 6. Implementace a ověření
- Commit(y): `chore: upgrade to Node.js 24 LTS and freeze Docker installs`
- Test plan:
  - lokálně na Node 24.20: `pnpm -r typecheck`, `lint`, `test` (59 testů), `build`,
  - `docker build` obou image (`node:24-alpine`, Node 24.21),
  - spuštění kontejnerů proti čisté PostgreSQL 16 s ověřením:
    - migrací,
    - registrace,
    - vytvoření a vystavení faktury v režimu přenesení s kódem `4a`,
    - PDF (HTTP 200, `application/pdf`),
    - exportu KH (`VetaA1 … kod_pred_pl="4a"`),
    - webu (HTTP 200, runtime config).
- Výsledek: vše prošlo.
