# Nasazení FakturAI na CapRover

## 1. Cílová topologie
- `fakturai-api` (NestJS API)
- `fakturai-web` (React SPA)
- `postgres` (CapRover One-Click App)

Poznámka:
- Jedna CapRover app = jeden kontejner/služba.
- Pro tento projekt je správné nasazení minimálně na 2 appky (`api`, `web`) + DB zvlášť.

## 2. Co je v projektu připraveno
- Dockerfile pro API: `infra/docker/api.Dockerfile`
- Dockerfile pro WEB: `infra/docker/web.Dockerfile`
- Captain definition soubory:
  - `captain-definition-api.json`
  - `captain-definition-web.json`
- Runtime API konfigurace webu přes env `WEB_API_URL` (není nutný rebuild při změně URL API)
- Start skript webu: `infra/docker/start-web-with-runtime-config.sh`
- Env šablony:
  - `infra/caprover/api.env.example`
  - `infra/caprover/web.env.example`

## 3. Předpoklady
1. Funkční CapRover server.
2. DNS záznamy pro:
   - `api.tvoje-domena.cz`
   - `app.tvoje-domena.cz`
3. Zapnuté HTTPS certifikáty v CapRoveru.
4. Deploy je veden přes `Captain Definition Path`.

Poznámka:
- CapRover bere build context podle umístění `captain-definition` souboru.
- Proto jsou `captain-definition-*.json` umístěny v rootu repozitáře, aby byl v build contextu celý projekt (včetně `package.json`).

## 4. Krok za krokem

### 4.1 Vytvoření Postgres
1. V CapRoveru otevři `One-Click Apps/Databases`.
2. Nainstaluj `PostgreSQL`.
3. Poznamenej si:
   - název služby (např. `srv-captain--postgres`)
   - user/password/db name.

### 4.2 Vytvoření appky API
1. Vytvoř app `fakturai-api`.
2. V `App Configs` nastav:
   - `Container HTTP Port = 4000`
3. V `HTTP Settings` připoj doménu `api.tvoje-domena.cz` + HTTPS.
4. V `App Configs > Environmental Variables` vlož hodnoty podle `infra/caprover/api.env.example`:
   - minimálně: `NODE_ENV`, `API_PORT`, `TRUST_PROXY`, `WEB_ORIGIN`, `APP_BASE_URL`, `DATABASE_URL`, `SESSION_SECRET`.
5. V `Deployment` zvol `Deploy from GitHub/GitLab/Bitbucket` (nebo tar upload) a nastav `Captain Definition Path`:
   - `captain-definition-api.json`
6. Deployni app.

### 4.3 Vytvoření appky WEB
1. Vytvoř app `fakturai-web`.
2. V `App Configs` nastav:
   - `Container HTTP Port = 3000`
3. V `HTTP Settings` připoj doménu `app.tvoje-domena.cz` + HTTPS.
4. V `App Configs > Environmental Variables` vlož hodnoty podle `infra/caprover/web.env.example`:
   - `NODE_ENV=production`
   - `WEB_API_URL=https://api.tvoje-domena.cz/api/v1`
5. V `Deployment` nastav `Captain Definition Path`:
   - `captain-definition-web.json`
6. Deployni app.

## 5. Ověření po nasazení
1. API health:
   - otevři `https://api.tvoje-domena.cz/api/v1/health`
2. Web:
   - otevři `https://app.tvoje-domena.cz`
   - vytvoř účet, přihlas se, dokonči onboarding.
3. Funkční smoke test:
   - vytvoření faktury,
   - export PDF,
   - export XML.

## 6. Důležité provozní poznámky
- `TRUST_PROXY=1` je důležité kvůli throttlingu a IP adresám za reverse proxy.
- Web používá runtime config přes `WEB_API_URL`; změna API URL nevyžaduje nový build image (stačí restart appky).
- Pokud nenastavíš SMTP, reset hesla se nevypne, ale reset odkaz bude jen v logu API.

## 7. Nejčastější problémy
- `401/403` po loginu:
  - zkontroluj, že `WEB_ORIGIN` přesně odpovídá URL webu.
- CORS chyba:
  - opět `WEB_ORIGIN` + správné HTTPS domény.
- API nedostupné z webu:
  - zkontroluj `WEB_API_URL` ve web appce.
- DB migration fail při startu:
  - zkontroluj `DATABASE_URL` a dostupnost postgres služby v CapRover síti.
