# CR-0051 - Výchozí datum dokladu a globální rate limit

## 0. Metadata
- ID: `CR-0051`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Code review při převzetí projektu odhalilo dvě chyby s velkým dopadem a malou opravou.
- Nová faktura měla v CET/CEST výchozí datum vystavení, DUZP i splatnost o den dříve (včera). 1. ledna se tak faktura navíc číslovala v řadě předchozího roku a DUZP spadalo do špatného období DPH.
- Pojmenovaný throttler `auth` (12 req/min) se uplatňoval na všechny API endpointy, ne jen na přihlášení – běžná práce (nebo více uživatelů za NATem) narážela na HTTP 429.

## 2. Příčina
- Web: `setHours(0,0,0,0)` + `toISOString().slice(0,10)` převádí lokální půlnoc do UTC, tj. na předchozí den.
- API: `startOfToday()` používal lokální půlnoc serveru; nasazení běží s `TZ=Europe/Prague`, takže výchozí datum (kopie faktury, chybějící datum v DTO) se ukládalo jako 23:00/22:00 UTC předchozího dne. Formátování dat v PDF a XML záviselo na `TZ` serveru.
- `@nestjs/throttler` v6 aplikuje každý pojmenovaný throttler z `forRoot` na každou route.

## 3. Cílový stav
- Datumy dokladů jsou kalendářní dny uložené jako UTC půlnoc; „dnes“ se počítá podle kalendáře `Europe/Prague`.
- Web počítá výchozí datum z lokálního kalendáře a zobrazuje datumy v UTC.
- Existuje jediný throttler `default` (150 req/min); auth endpointy mají přísnější limit přes `@Throttle({ default: ... })`.

## 4. Scope změny
- Web: `date-utils.ts`, `InvoiceEditorPage`, `InvoicesPage`, `InvoiceDetailPage`.
- API: `utils/date-only.ts`, `InvoiceService`, `TaxReportsService` (`d_poddp`, `dppd`), `common/throttling.ts`, `AppModule`, `AuthController`.
- Datový model: bez změny schématu; datová migrace `20261103100000_normalize_invoice_dates` převede existující `issueDate`, `taxableSupplyDate`, `dueDate`, `paidAt` s nenulovým časem na pražský kalendářní den uložený jako UTC půlnoc.
- Dokumentace: `doc/tecnicka-specifikace.md` (8.2, 11.1).

## 5. Akceptační kritéria
1. Nová faktura i kopie má výchozí datum vystavení a DUZP rovno dnešnímu dni v ČR, i těsně po půlnoci.
2. Datumy v seznamu, detailu, PDF a XML se nezávisle na `TZ` serveru zobrazují bez posunu.
3. Běžné endpointy nevracejí 429 po 12 požadavcích; login/registrace/reset hesla mají dál přísný limit.

## 6. Rizika a poznámky
- Záznamy uložené dříve jako lokální půlnoc (23:00/22:00 UTC) by se po přechodu na zobrazení v UTC ukázaly o den dříve – řeší to datová migrace (idempotentní, mění jen hodnoty s nenulovým časem).
- Faktury, kterým web dříve poslal už posunuté datum (`YYYY-MM-DD` předchozího dne), opravit automaticky nelze – data nejsou rozlišitelná od záměrně zadaného data.

## 7. Implementace a ověření
- Commit(y): `fix: correct invoice default dates and global rate limit`
- Test plan: `date-only.spec.ts` (přechod přes půlnoc v CET/CEST, DST), `throttling.spec.ts` (běžná route bez auth limitu, override na route), celé API testy v `TZ=America/New_York` i `TZ=Europe/Prague`, typecheck, ověření SQL převodu a `prisma migrate deploy` na čisté PostgreSQL 16.
- Výsledek: testy a typecheck prošly.
