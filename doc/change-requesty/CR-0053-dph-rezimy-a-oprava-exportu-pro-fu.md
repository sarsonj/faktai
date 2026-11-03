# CR-0053 - DPH režimy faktur a oprava exportů pro FÚ

## 0. Metadata
- ID: `CR-0053`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T3`

## 1. Business kontext
- Code review při převzetí projektu odhalilo, že exporty pro finanční úřad jsou mimo čistě tuzemská plnění věcně chybné a faktury nerespektují DPH režim ani plátcovství dodavatele.
- Chybné XML podané do datové schránky = chybné daňové přiznání / kontrolní hlášení s rizikem sankcí.

## 2. Zjištěné vady (aktuální stav)
1. Přiznání DPH (DP3):
   - všechny položky se sazbou 0 % (služby a zboží do EU, vývoz, osvobozená plnění) šly do `p_zb23` = ř. 3 „pořízení zboží z jiného členského státu“ (vstupní řádek),
   - přenesení daňové povinnosti na straně dodavatele šlo do `rez_pren23/5` = ř. 10/11 (řádky pro příjemce) místo `pln_rez_pren` (ř. 25),
   - věta 2 (ř. 20–26) a ř. 50 byly natvrdo nulové,
   - ř. 62 se počítal z nezaokrouhlené sumy, ne ze součtu zaokrouhlených řádků.
2. Kontrolní hlášení:
   - všechny tuzemské faktury šly do A.4 bez ohledu na limit 10 000 Kč (správně A.5),
   - bez DIČ odběratele se jako `dic_odb` použilo IČO,
   - celá částka faktury šla do `zakl_dane1/dan1` (21 %) bez ohledu na sazbu položek,
   - faktury v režimu přenesení daňové povinnosti šly do A.4 místo A.1 (a chyběl `kod_pred_pl`).
3. Faktura v režimu přenesení / EU / vývoz / osvobozeno účtovala DPH podle sazby položky (DPH na PDF i v QR platbě) a PDF neobsahovalo povinnou doložku (§ 29 ZDPH, např. „daň odvede zákazník“).
4. Neplátce DPH vystavoval „Faktura – daňový doklad“ s DPH (výchozí sazba 21 %).
5. XML se kontrolovalo jen na well-formed, ne proti XSD – i proto prošly výše uvedené vady a navíc neplatné hodnoty `c_okec=""` a telefon delší než 14 znaků.

## 3. Cílový stav
- DPH se účtuje jen plátcem v režimu `domestic_standard`; jinak API přepočítá položky na 0 % (plátcovství u vystavené faktury se bere ze snapshotu dodavatele).
- Vystavení validuje: neplátce bez DPH; plátce má režim; tuzemské plnění jen se sazbami 21/12 %; přenesení vyžaduje české DIČ a kód předmětu plnění; režimy bez DPH nemají DPH (staré koncepty je třeba uložit znovu).
- Nové pole faktury `reverseChargeCode` (kód předmětu plnění pro KH A.1) – výběr v editoru u režimu přenesení.
- PDF: neplátce → nadpis `Faktura`, bez DPH sloupců a rekapitulace, text „Dodavatel není plátcem DPH.“; režimy bez DPH → povinná doložka.
- Mapování DP3 a KH podle funkční specifikace 5.7.1 a 5.7.2 (A.1 / A.4 / A.5, rozpad podle sazeb, ř. 20/21/22/25/50).
- XML se validuje proti XSD finanční správy (`xmllint-wasm`); prázdné atributy se nevypisují, telefon se normalizuje.
- Do podání se nezahrnují faktury vystavené v době, kdy dodavatel nebyl plátcem.
- Editor: neplátce nevidí daňový režim ani sazby DPH; u režimů bez DPH se sazby skryjí a součty počítají bez DPH.

## 4. Scope změny
- API: `tax/vat-regime.ts` (nové), `InvoiceService` (výpočet, validace vystavení, PDF), `UpsertInvoiceDto`, `TaxReportsService` (DP3, KH, preview), `tax-reports/fu-xsd-validator.ts` (nové), závislost `xmllint-wasm`.
- Web: `InvoiceEditorPage`, `types.ts`, `vat-regime.ts` (nové).
- Datový model: `Invoice.reverseChargeCode VARCHAR(4) NULL` (migrace `20261103110000_invoice_reverse_charge_code`).
- Preview endpoint: struktura `summary` se mění na řádky přiznání (`rows.r1_base`…) resp. oddíly KH (`a1`, `a4`, `a5`); web ji nepoužívá.
- Dokumentace: funkční specifikace 5.6–5.8, technická specifikace 4.2.5, 10.1, 10.2.

## 5. Akceptační kritéria
1. Přiznání DPH: každý režim se promítne do správného řádku (testy `tax-reports.mapping.spec.ts`).
2. KH: rozdělení A.1 / A.4 / A.5, rozpad sazeb, žádné IČO v `dic_odb`, pořadí vět dle XSD.
3. Každé vygenerované XML v testech projde XSD validací; validátor zachytí chybné pořadí vět i porušení facet.
4. Faktura v režimu bez DPH nebo od neplátce má nulové DPH; vystavení nekonzistentní faktury je odmítnuto s česky popsanou chybou.
5. PDF neplátce a PDF v režimu přenesení obsahují správný nadpis a doložku (vizuální kontrola).

## 6. Rizika a poznámky
- Číselník kódů předmětu plnění byl ověřen a opraven v CR-0055 (původní výběr měl u kódů 6, 7, 11–15 nesprávné významy). Faktura s více kódy předmětu plnění není podporována (jeden kód na fakturu).
- Již vystavené faktury se nepřepočítávají. Pokud mají nekonzistentní data (např. DPH v režimu přenesení, `domestic_standard` se sazbou 0 %), export DPH/KH skončí srozumitelnou chybou s číslem faktury, aby se špatná data nepodala.
- Řádky na vstupu (přijaté faktury, odpočet) aplikace nadále neřeší – `odp_zocelk = 0`.
- Opravné daňové doklady (dobropisy) nejsou podporovány.
- Doporučení: před podáním ověřit první exporty v aplikaci EPO finanční správy (kontrola) – automatické testy pokrývají XSD, ne věcné kontroly EPO.

## 7. Implementace a ověření
- Commit(y): `fix(tax): VAT regimes on invoices and correct FU export mapping`
- Test plan: `tax-reports.mapping.spec.ts`, `fu-xsd-validator.spec.ts`, `invoice.vat-regime.spec.ts`, rozšířený `invoice.pdf.spec.ts`; vizuální kontrola PDF (neplátce, přenesení); end-to-end smoke test proti PostgreSQL (registrace → subjekt → faktura v režimu přenesení → vystavení bez kódu odmítnuto → s kódem vystaveno → export KH: A1/A4/A5/C, export DP3: ř. 1, 25, 62); typecheck API i webu.
- Výsledek: vše prošlo.
