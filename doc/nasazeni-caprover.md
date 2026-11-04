# Nasazení FaktAI na CapRover

## 1. Cílová topologie (od CR-0061)
- **Jedna appka** `faktai`: API servíruje i sestavený web, obojí na jedné doméně (`https://app.tvoje-domena.cz`, API pod `/api/v1`).
- Data leží v perzistentním adresáři `/data`:
  - `/data/faktai.db` – databáze SQLite,
  - `/data/attachments/` – přílohy přijatých dokladů,
  - `/data/backups/` – denní zálohy databáze (posledních 14).
- Samostatná databázová appka ani druhá appka pro web nejsou potřeba. Odpadá CORS a nastavování `WEB_ORIGIN` / `WEB_API_URL`.

## 2. Co je v projektu připraveno
- Dockerfile: `infra/docker/app.Dockerfile`
- Captain definition: `captain-definition` v kořeni repozitáře (výchozí cesta CapRoveru)
- Env šablona: `infra/caprover/app.env.example`
- Start skript: `apps/api/scripts/start-with-migrations.sh`:
  1. aplikuje migrace,
  2. volitelně převede data ze staré PostgreSQL databáze,
  3. spustí aplikaci.

## 3. Nová instalace

### 3.1 Vytvoření appky
1. V CapRoveru vytvořte appku `faktai` a **zaškrtněte „Has Persistent Data“**. Dodatečně to zapnout nejde.
2. V *App Configs* nastavte:
   - **Container HTTP Port:** `3000`,
   - **Persistent Directories:** *Path in App* `/data`, *Label* např. `faktai-data`,
   - **Environmental Variables** podle `infra/caprover/app.env.example`. Minimálně:
     - `NODE_ENV=production`,
     - `TRUST_PROXY=1`,
     - `APP_BASE_URL=https://app.tvoje-domena.cz`,
     - `SESSION_SECRET`,
     - `TZ=Europe/Prague`.
3. V *HTTP Settings* připojte doménu a zapněte HTTPS + *Force HTTPS*.
4. V *Deployment* nasaďte z repozitáře. *Captain Definition Path* nechte výchozí (`./captain-definition`).

### 3.2 Ověření
1. Otevřete `https://app.tvoje-domena.cz` a přihlaste se.
2. Vyzkoušejte:
   - otevření a stažení PDF faktury,
   - náhled DPH podkladů,
   - nahrání přílohy u přijatého dokladu.
3. Restartujte appku a ověřte, že data i příloha zůstaly.
4. V logu má být při startu řádek `Záloha databáze: /data/backups/faktai-RRRR-MM-DD.db`.

## 4. Přechod ze staré instalace (API + web + PostgreSQL)

Převod dat dělá aplikace sama při prvním startu, pokud dostane adresu staré databáze.

**Jak převod probíhá:**
1. Nejdřív dorovná starou PostgreSQL databázi chybějícími migracemi (včetně normalizace dat faktur z CR-0051). Tím **mění starou databázi**, proto ji předem zálohujte.
2. Zkopíruje všechny tabulky v jedné transakci.
3. Porovná počty řádků a součty částek. Při neshodě se nic neuloží a appka nenastartuje (chyba je v logu).
4. Do databáze, která už data obsahuje, se nic nepřevádí. Proměnná proto po převodu ničemu nevadí, ale je lepší ji smazat.

**Postup:**
1. **Záloha Postgresu.** Ve starém Postgres kontejneru na serveru:
   ```bash
   docker exec $(docker ps -q -f name=srv-captain--postgres) \
     pg_dump -U <user> -d <db> -Fc > faktai-pred-sqlite.dump
   ```
   (název služby, uživatele a databáze najdete v `DATABASE_URL` staré API appky).
2. **Nová appka.** Založte appku `faktai` podle kapitoly 3.1:
   - env proměnné zkopírujte ze staré API appky (*Bulk Edit*),
   - smažte z nich `DATABASE_URL`, `API_PORT`, `WEB_ORIGIN` a `ATTACHMENTS_DIR`,
   - přidejte:
     ```
     IMPORT_FROM_POSTGRES_URL=<hodnota DATABASE_URL ze staré API appky>
     ```
   - `SESSION_SECRET` ponechte stejný.
3. **Nasazení.** Nasaďte appku a sledujte log. Musí v něm být:
   ```
   [import] Hotovo, kontrola počtů a součtů prošla.
   ```
   Před tímto řádkem jsou vypsané počty řádků a součty částek.
4. **Kontrola.** Ověřte data na dočasné adrese appky (`faktai.<captain-doména>`):
   - seznam faktur a jejich počty,
   - PDF faktury,
   - DPH podklady za poslední období.
   
   Přihlášení funguje se stávajícím heslem.
5. **Přepnutí domény:**
   - u staré web appky odeberte doménu `app.tvoje-domena.cz`,
   - přidejte ji k appce `faktai`,
   - zapněte HTTPS + *Force HTTPS*.
6. **Úklid:**
   - smažte `IMPORT_FROM_POSTGRES_URL` a uložte,
   - po pár dnech bez problémů smažte staré appky (API, web, PostgreSQL),
   - doménu `api.tvoje-domena.cz` můžete zrušit. Pokud ji používají skripty s API klíčem, změňte v nich adresu na `https://app.tvoje-domena.cz/api/v1`.

**Pokud se převod nepovede:**
- Stará instalace běží dál beze změny dat. Změnilo se jen schéma, nové sloupce staré verze aplikace ignorují.
- Opravte chybu z logu a postup zopakujte. Před dalším pokusem smažte soubor `/data/faktai.db`, nebo appku založte znovu.

## 5. Provozní poznámky
- **Zálohy:**
  - Aplikace jednou denně vytvoří konzistentní kopii databáze do `/data/backups` (`VACUUM INTO`) a ponechá posledních `BACKUP_KEEP` (výchozí 14).
  - Do externí zálohy kopírujte **`/data/backups` a `/data/attachments`**.
  - Samotný `/data/faktai.db` za běhu nekopírujte, kopie by nemusela být konzistentní (WAL).
- **Obnova:**
  1. Zastavte appku (*Instance Count* 0).
  2. Nahraďte `/data/faktai.db` zálohou a smažte `faktai.db-wal` a `faktai.db-shm`.
  3. Appku znovu spusťte.
- **Škálování:** appka musí běžet v jedné instanci (SQLite). Persistent Data appky v CapRoveru víc instancí stejně nepovolují.
- **`TRUST_PROXY=1`** je důležité kvůli throttlingu a IP adresám za reverse proxy.
- **SMTP:** pokud ho nenastavíte, reset hesla funguje dál, ale odkaz bude jen v logu aplikace.

## 6. Nejčastější problémy
- **Po nasazení se ztratila data:** appka nemá *Persistent Directory* `/data` (nebo nebyla založena s „Has Persistent Data“).
- **Převod skončil chybou `Kontrola převodu selhala`:** v logu je, která tabulka nebo součet nesedí. Nic se neuložilo, stará instalace je beze změny.
- **Převod skončil chybou připojení:** zkontrolujte `IMPORT_FROM_POSTGRES_URL`. V síti CapRoveru má host tvar `srv-captain--<název-appky>`.
- **Odkaz pro reset hesla vede jinam:** zkontrolujte `APP_BASE_URL`.
