# CR-0052 - Vícestránkové PDF, duplicitní koncepty a logování chyb

## 0. Metadata
- ID: `CR-0052`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Code review při převzetí projektu (navazuje na CR-0051).
- PDF faktury s větším počtem položek vypsalo jen položky, které se vešly na jednu stranu, a zbytek nahradilo textem „… a dalších N položek“. Daňový doklad ale musí obsahovat všechna plnění.
- Když v editoru nové faktury prošlo uložení konceptu, ale vystavení selhalo (validace, síť), každý další klik na „Vystavit“ založil nový koncept a spotřeboval další číslo z řady.
- Neočekávané chyby (HTTP 500) globální exception filter nikam nelogoval, takže produkční chyby nebyly dohledatelné.

## 2. Aktuální vs. cílový stav
- PDF: tabulka položek pokračuje na dalších stranách s opakovanou hlavičkou; souhrn (QR + rekapitulace DPH + poznámka) se nedělí; patička `Strana X/Y` na každé straně. Popisek QR kódu je `QR Platba` (payload je standardní SPD bez fakturačních dat, tj. ne `QR Platba+F`).
- Editor: po prvním úspěšném vytvoření konceptu si editor pamatuje jeho ID a další pokusy koncept aktualizují. Chybová hláška uživateli sdělí, že koncept byl uložen.
- API: chyby se stavem ≥ 500 se logují (metoda, URL, `x-request-id`, zpráva, stack). Klientská odpověď se nemění.

## 3. Scope změny
- API: `InvoiceService.renderPdf`, `HttpExceptionFilter`.
- Web: `InvoiceEditorPage` (`persistDraft`, `onIssue`).
- Datový model: beze změny.
- Dokumentace: `doc/funkcni-specifikace.md` (4.4.3), `doc/tecnicka-specifikace.md` (8.2, 9.1).

## 4. Akceptační kritéria
1. PDF faktury s 80 položkami má více stran a obsahuje všechny položky; faktura s pár položkami má jednu stranu.
2. Opakované „Vystavit“ po chybě nevytvoří další koncept.
3. Neočekávaná chyba API se objeví v logu včetně request ID; 4xx chyby se nelogují jako error.

## 5. Rizika a poznámky
- Pro jednostránkové faktury zůstává layout beze změny (kromě popisku QR a formátu data v patičce `DD.MM.YYYY`).
- Souhrnný blok se při nedostatku místa přesune na novou stranu celý.

## 6. Implementace a ověření
- Commit(y): `fix: paginate invoice PDF, avoid duplicate drafts, log server errors`
- Test plan: `invoice.pdf.spec.ts` (počet stran pro 3 a 80 položek), `http-exception.filter.spec.ts`, vizuální kontrola vyrenderovaných stran (pdftoppm), typecheck API i webu.
- Výsledek: testy a typecheck prošly, vizuální kontrola OK.
