# CR-0055 - Oficiální číselník kódů předmětu plnění (KH A.1)

## 0. Metadata
- ID: `CR-0055`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- V CR-0053 vznikl výběr kódů předmětu plnění (`kod_pred_pl`) pro režim přenesení daňové povinnosti a mělo se ho před produkčním použitím ověřit.
- Ověření proti oficiálním Pokynům k vyplnění KH DPH ukázalo, že u kódů 6, 7 a 11–15 byly v číselníku nesprávné významy. Například `12` byl uveden jako „Mobilní telefony“, oficiálně jde o „Obiloviny a technické plodiny“. Chyběly také kódy 1a, 3a, 4a a 16–21.
- Uživatel by tak do KH podal kód jiného druhu plnění.

## 2. Zdroj
- Finanční správa: Pokyny k vyplnění elektronického formuláře kontrolního hlášení DPH, verze 2024, oddíl A.1.
- Pokyny jsou na `https://adisspr.mfcr.cz/dpr/adis/idpr_pub/dph/kh1/pokyny/pokyny_dphkh1_2024.pdf`.
- Číselník platí pro období od 1. 7. 2017.

## 3. Cílový stav
- Úplný číselník podle zdroje s doslovnými popisy, celkem 20 kódů:
  - 1, 1a, 3, 3a, 4, 4a, 5, 6, 7,
  - 11 až 21.
- Kód 4 (Stavební a montážní práce) je v nabídce první, protože je pro OSVČ nejčastější.
- Test hlídá úplnost číselníku a shodu zrcadlové kopie ve webu s API.
- Test KH ověřuje, že kód s písmenem (`4a`) projde XSD (atribut má `maxLength=3`).

## 4. Scope změny
- API: `src/tax/vat-regime.ts`, `src/tax/vat-regime.spec.ts`, `tax-reports.mapping.spec.ts`.
- Web: `src/vat-regime.ts`.
- Datový model: beze změny (`VARCHAR(4)` stačí).
- Datová migrace není potřeba: CR-0053 ještě nebylo nasazeno, takže v datech žádné chybně uložené kódy nejsou.

## 5. Akceptační kritéria
1. Nabídka v editoru odpovídá oficiálnímu číselníku včetně popisů.
2. Kódy s písmenem se uloží a projdou XSD validací kontrolního hlášení.

## 6. Rizika a poznámky
- Pokyny vyžadují číselník platný k období podání. Při budoucí změně zákona je třeba seznam aktualizovat na obou místech (API i web), na neshodu upozorní test.
- Faktura s více druhy plnění (různé kódy) stále není podporována. Pokyny v takovém případě vyžadují rozepsání do více řádků A.1.

## 7. Implementace a ověření
- Commit(y): `fix(tax): use official reverse charge subject codebook`
- Test plan: `vat-regime.spec.ts`, `tax-reports.mapping.spec.ts` (A.1 s kódy `4` a `4a`, XSD validace).
- Výsledek: testy prošly.
