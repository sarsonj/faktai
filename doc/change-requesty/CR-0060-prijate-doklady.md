# CR-0060 - Přijaté doklady s přílohami a odpočtem DPH

## 0. Metadata
- ID: `CR-0060`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T3`

## 1. Business kontext
- Vlastník potřebuje evidovat přijaté doklady (faktury od dodavatelů) včetně příloh a uplatňovat z nich odpočet DPH. Doklady chce zadávat i přes API.
- Bez strany vstupu bylo přiznání k DPH neúplné: chyběl odpočet a daň z plnění, u kterých daň přiznává příjemce (přenesení, EU).
- Přílohy mají ležet na perzistentním volume (rozhodnutí vlastníka), ne v S3.

## 2. Cílový stav
- Modul `Přijaté doklady` (web + API) s režimy DPH:
  - tuzemsko s DPH,
  - přenesení (příjemce),
  - pořízení zboží z EU,
  - služba z EU (§ 9/1),
  - bez nároku na odpočet.
- Rozpis DPH po sazbách:
  - tuzemsko: DPH z dokladu, případně dopočtená,
  - přenesení a EU: daň vyměřuje příjemce a nezapočítává se do částky k úhradě.
- Přílohy: PDF a obrázky do 15 MB, ověřené podle signatury souboru, uložené v `ATTACHMENTS_DIR`.
- Přiznání k DPH (přesné mapování ve funkční specifikaci 7b a 5.7):
  - ř. 3–6 a 10–11 (daň přiznaná příjemcem),
  - ř. 40/41 a 43/44 (odpočet v plné výši),
  - ř. 46,
  - ř. 62–65: daň na výstupu, odpočet, vlastní daňová povinnost / nadměrný odpočet.
- Kontrolní hlášení:
  - A.2 (kód státu + VAT ID),
  - B.1 (s kódem předmětu plnění),
  - B.2 (doklad nad 10 000 Kč vč. DPH, `pomer=N`),
  - B.3 (souhrn),
  - věta C: `celk_zd_a2`, `pln23/5`, `rez_pren23/5`.
- Tuzemský odpočet lze uplatnit v pozdějším období (`deductionDate`).
- Náhled DPH podkladů ukazuje výstup, odpočet a výsledek.

## 3. Scope změny
- **API:**
  - modul `received-document` (controller, service, DTO, mapper, doménové výpočty a validace),
  - `storage/attachment-storage.service.ts`,
  - `tax/vat-id.ts`,
  - rozšíření `tax/vat-entries.ts`, `tax-reports/mapping/*` a `TaxReportsService`.
- **Datový model:** `ReceivedDocument`, `ReceivedDocumentLine`, `ReceivedDocumentAttachment`, enum `ReceivedVatRegime`. Migrace `20261104090000_received_documents`.
- **Web:**
  - stránky `ReceivedDocumentsPage` a `ReceivedDocumentEditorPage`, položka menu „Přijaté doklady“,
  - `received-documents-api.ts`,
  - popisky režimů v `vat-regime.ts`,
  - náhled DPH podkladů.
- **Provoz:**
  - Docker image: `ATTACHMENTS_DIR=/data/attachments`, `VOLUME /data`,
  - docker-compose: volume `attachments`,
  - `infra/caprover/api.env.example`,
  - `doc/nasazeni-caprover.md` 4.2.1 (persistent directory).
- **Dokumentace:** funkční specifikace 7b, technická specifikace 2.3 a 5.4.1, README.

## 4. Akceptační kritéria
1. Doklad v každém režimu jde založit přes web i API. Validace odmítne:
   - tuzemský odpočet bez českého DIČ,
   - EU plnění bez VAT ID,
   - přenesení bez kódu,
   - jiný režim než „bez odpočtu“ u neplátce,
   - odpočet před DUZP.
2. Příloha se uloží a stáhne bajtově shodná. Soubor s jiným obsahem, než deklaruje, vrací 415. Smazání dokladu smaže i soubory.
3. DP3 a KH s přijatými doklady mají správné řádky a oddíly a projdou XSD validací (testy `tax-reports.mapping.spec.ts`).
4. ř. 64 a ř. 65 odpovídají rozdílu daně na výstupu a odpočtu.

## 5. Rizika a poznámky
- **Odpočet v plné výši:** krácený a poměrný odpočet (§ 75/76), dovoz (ř. 7/8, 42) ani majetek (ř. 45) nejsou podporovány. Kdo je potřebuje, musí podání doupravit v EPO.
- **Období přenesení a EU:** pro plnění s daní přiznanou příjemcem se období určuje podle DUZP. U pořízení zboží z EU vzniká povinnost přiznat daň dnem vystavení dokladu, nejpozději 15. dnem následujícího měsíce; zadejte proto do pole DUZP tento den.
- **Opravné doklady a záporné částky** nejsou podporovány.
- **Zálohování:** přílohy nejsou v databázi, je potřeba zálohovat i volume `/data`.
- **Bez perzistentního adresáře v CapRoveru se přílohy při nasazení ztratí.** Nastavení je popsané v `doc/nasazeni-caprover.md`.

## 6. Implementace a ověření
- Commit(y):
  - `feat(api): received documents with attachments and input VAT in tax reports`,
  - `feat(web): received documents module`.
- Test plan:
  - unit testy výpočtů a validací, VAT ID, úložiště příloh (včetně path traversal), mapování DP3/KH strany vstupu s XSD validací (celkem 88 testů API),
  - end-to-end proti PostgreSQL 16 přes curl:
    - validace (400) a idempotentní založení,
    - nahrání PDF a odmítnutí podvrženého souboru (415), stažení bajtově shodné,
    - náhled DPH (ř. 5, 40, 43, 62, 63, 65) a export KH (A.2, B.2, C),
    - smazání dokladu včetně souboru,
  - ruční test v prohlížeči:
    - založení dokladu s ARES, přílohou a dopočtem DPH,
    - seznam se sponkou příloh,
    - EU doklad s dopočtenou daní,
    - náhled DPH podkladů.
- Výsledek: vše prošlo.
