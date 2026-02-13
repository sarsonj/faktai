# Funkční specifikace projektu FakturAI

## 0. Stav dokumentu
- Verze: `1.11`
- Datum: `2026-02-13`
- Stav: `Rozpracováno`
- Aktuálně zpracovaný rozsah: `Scope 1-7`

## 1. Scope 1 - Správa živnostníka

### 1.1 Cíl
Umožnit založení a správu profilu živnostníka (fakturačního subjektu), bez kterého není možné vystavovat faktury ani správně generovat daňové podklady.

### 1.2 Funkční rozsah
#### In scope
- Založení profilu živnostníka při prvním vstupu do aplikace (onboarding).
- Zobrazení detailu profilu.
- Editace profilu.
- Validace vstupních údajů podle CZ fakturační praxe.
- Vyhledání subjektu z registru ARES podle IČO nebo názvu firmy.
- Vyhledání adresy z veřejné databáze a předvyplnění adresních polí.
- Automatická normalizace vstupů (např. IČO bez mezer, PSČ bez mezer).
- Blokace tvorby faktury do doby, než je profil kompletní.
- Uložení výchozích fakturačních parametrů (bankovní účet, výchozí VS, splatnost).

#### Out of scope (pro další iterace)
- Správa více živnostníků pod jedním uživatelem.
- Správa více bankovních účtů a jejich priorit.
- Historie změn profilu (audit log s diffem změn).

### 1.3 Navigace a tok uživatele
1. Nový uživatel otevře onboarding start (`/onboarding/start`) a vytvoří účet.
2. Po registraci systém naváže na obrazovku `Onboarding živnostníka`.
3. Po úspěšném uložení je uživatel přesměrován na `Vydané faktury`.
4. Z hlavní navigace je trvale dostupná položka `Nastavení subjektu`.
5. V `Nastavení subjektu` může uživatel:
   - zobrazit `Detail profilu`,
   - přejít do `Editace profilu`,
   - uložit změny a vrátit se na detail.

### 1.4 Obrazovky

#### 1.4.1 Onboarding živnostníka
Účel: jednorázové založení povinných údajů subjektu.

Prvky obrazovky:
- Nadpis: `Nastavení fakturačního subjektu`.
- Stručné vysvětlení: bez vyplnění údajů nelze vystavit fakturu.
- Krokový průvodce o 3 krocích:
  - `Krok 1: Subjekt` (ARES + základní identifikace),
  - `Krok 2: Adresa` (lookup adresy + ruční doplnění),
  - `Krok 3: DPH a platby`.
- Blok `Načíst firmu z ARES`:
  - vstup `IČO nebo název firmy`,
  - akce `Vyhledat`,
  - seznam výsledků s akcí `Použít`.
- Blok `Načíst adresu`:
  - vstup `Ulice a číslo`,
  - akce `Vyhledat adresu`,
  - seznam výsledků s akcí `Použít`.
- Navigační akce průvodce:
  - `Pokračovat`,
  - `Zpět`.
- Primární akce v posledním kroku: `Dokončit onboarding`.
- Sekundární akce mimo průvodce: `Odhlásit`.

Pravidla:
- V každém kroku se validují pouze relevantní pole pro daný krok.
- Uživatel může pokračovat ručním vyplněním i bez výsledku z ARES/adresního registru.
- Krok `Vytvoření účtu` je v onboarding startu řešen jednokolonovým formulářem (pole pod sebou).
- Po úspěchu toast/hláška `Profil byl uložen`.
- Po chybě API se zobrazí obecná chyba a formulář zůstane vyplněný.
- Po validační/API chybě se tlačítko vrací ze stavu `Ukládám...` zpět do aktivního stavu, aby šlo formulář znovu odeslat.
- Ruční editace polí je možná i po použití předvyplnění z registru.
- V uživatelských titulcích se používají srozumitelné názvy (`První kroky`, `Nastavení profilu`) místo technického termínu `onboarding`.

#### 1.4.2 Detail profilu
Účel: rychlý přehled všech uložených údajů.

Prvky obrazovky:
- Sekce `Identifikace`.
- Sekce `Sídlo`.
- Sekce `Daňový režim`.
- Sekce `Platební údaje a výchozí fakturační nastavení`.
- Akce: `Upravit`.

Pravidla:
- Read-only režim.
- Data se zobrazují v přesném formátu vhodném pro faktury (např. účet `prefix-cislo/kod`).

#### 1.4.3 Editace profilu
Účel: úprava existujících údajů.

Prvky obrazovky:
- Stejná pole jako onboarding.
- Bez bloků `Načíst firmu z ARES` a `Načíst adresu`.
- Akce: `Uložit změny`, `Zrušit`.

Pravidla:
- `Zrušit` vrátí uživatele na detail bez uložení.
- Při neuložených změnách a pokusu o opuštění obrazovky se zobrazí potvrzení.
- Po uložení se uživatel vrací na `Detail profilu`.

### 1.5 Datový model profilu a validace

| Pole | Povinné | Validace / pravidlo | Poznámka |
|---|---|---|---|
| `firstName` | Ano | 1-100 znaků | Jméno podnikatele |
| `lastName` | Ano | 1-100 znaků | Příjmení podnikatele |
| `businessName` | Ne | max 150 znaků | Obchodní označení |
| `ico` | Ano | přesně 8 číslic, kontrola formátu IČO; při vstupu se automaticky odstraňují mezery | Pro identifikaci na faktuře |
| `dic` | Podmíněně | pokud `isVatPayer=true`, pole je povinné | DIČ včetně prefixu země, např. `CZ...` |
| `isVatPayer` | Ano | boolean | Plátce / neplátce DPH |
| `vatRegistrationDate` | Podmíněně | povinné pokud `isVatPayer=true`, nesmí být v budoucnu | Datum registrace k DPH |
| `street` | Ano | 1-150 znaků | Ulice a číslo popisné |
| `city` | Ano | 1-100 znaků | Obec |
| `postalCode` | Ano | formát `123 45` nebo `12345` | PSČ |
| `countryCode` | Ano | ISO-2, default `CZ` | Země sídla |
| `bankAccountPrefix` | Ne | 0-6 číslic | Prefix účtu |
| `bankAccountNumber` | Ano | 2-10 číslic | Číslo účtu |
| `bankCode` | Ano | přesně 4 číslice | Kód banky |
| `defaultVariableSymbolType` | Ano | enum: `ico` / `custom` | Výchozí strategie VS |
| `defaultVariableSymbolValue` | Podmíněně | povinné pokud typ `custom`, 1-10 číslic | Výchozí VS |
| `defaultDueDays` | Ano | celé číslo 1-90 | Výchozí splatnost faktur |

Poznámky:
- Ukládají se pouze číslice pro číselná pole, formátování se řeší až při zobrazení.
- Pro faktury se používá snapshot údajů v čase vystavení faktury (pozdější změna profilu nemění historické faktury).
- Registry lookup je asistivní funkce; při výpadku registru zůstává plně dostupné ruční vyplnění formuláře.

### 1.6 Funkční pravidla
1. Bez existujícího a validního profilu není dostupná akce `Nová faktura`.
2. V jednom účtu je právě jeden aktivní profil živnostníka.
3. Změna daňového režimu (`isVatPayer`) ovlivní pouze nově vystavené faktury.
4. Profil nelze smazat, pouze upravit.
5. Při změně bankovních údajů se změna použije od další nově vystavené faktury.

### 1.7 Stavy a chování UI
- `Loading`: skeleton nebo spinner při načítání profilu.
- `Empty`: onboarding při neexistenci profilu.
- `Validation error`: chybová hláška přímo u pole + souhrn nahoře formuláře.
- `API error`: obecná hláška, data formuláře zůstávají beze změny.
- `Success`: toast po uložení.

### 1.8 Akceptační kritéria (Scope 1)
1. Uživatel bez profilu je vždy přesměrován na onboarding.
2. Po uložení kompletního profilu může uživatel vystavit fakturu.
3. Povinná a podmíněně povinná pole se validují před odesláním.
4. Editace profilu se projeví při předvyplnění nové faktury.
5. Historická faktura zůstane beze změny i po úpravě profilu.
6. Uživatel může načíst subjekt z ARES podle IČO i názvu firmy a předvyplnit pole.
7. Po neúspěšném odeslání onboarding formuláře lze formulář okamžitě znovu odeslat.
8. V `Nastavení subjektu` není lookup z ARES/adresy zobrazen; změny se provádějí přímou editací polí.

### 1.9 Potvrzená rozhodnutí
1. V první verzi je povolen pouze 1 subjekt na 1 účet.
2. `DIČ` u neplátce DPH je nepovinné pole.
3. Výchozí splatnost je `14` dní.

## 2. Scope 2 - Vydané faktury (seznam)

### 2.1 Cíl
Poskytnout přehledný seznam vydaných faktur s rychlým vyhledáním, filtrováním a stránkováním, aby uživatel snadno našel konkrétní doklad a provedl navazující akce (detail, editace, kopie, smazání, PDF).

### 2.2 Funkční rozsah
#### In scope
- Hlavní obrazovka `Vydané faktury` dostupná z levé navigace.
- Tabulkový seznam vydaných faktur.
- Stránkování seznamu.
- Rychlé stavové filtry (`Všechny`, `Uhrazené`, `Neuhrazené`, `Po splatnosti`).
- Detail řádku s hlavními metadaty faktury.
- Řádkové akce: `Upravit`, `Kopie`, `PDF`, `Smazat` (ikonové ovladače).
- Trvalé zobrazení počtu položek a celkového počtu výsledků.

#### Out of scope (pro další iterace)
- Hromadné akce nad více fakturami.
- Uložitelné vlastní pohledy/sloupce.
- Pokročilé kombinované filtrování (např. více stavů současně + intervaly částek).
- Uživatelská personalizace pořadí sloupců.
- Fulltextové vyhledávání je ve v1 dočasně vypnuto.

### 2.3 Navigace a tok uživatele
1. Uživatel otevře položku `Vydané faktury` v hlavní navigaci.
2. Systém zobrazí výchozí pohled `Všechny` se stránkou `1`.
3. Uživatel může:
   - filtrovat podle stavu,
   - přejít na další stránku,
   - spustit akci nad konkrétní fakturou.
4. Akce `Nová faktura` přesměruje na editor faktury (Scope 3).
5. Návrat z detailu nebo editace vrací uživatele zpět na naposledy použitý stav seznamu (filtr, hledání, stránka).

### 2.4 Obrazovka `Vydané faktury`

#### 2.4.1 Hlavní layout
- Nadpis obrazovky: `Vydané faktury`.
- Primární CTA: `Nová faktura`.
- Blok rychlého filtru stavu (dropdown): `Všechny`, `Uhrazené`, `Neuhrazené`, `Po splatnosti`.
- Rychlý statusový souhrn (pilulky): `Celkem`, `Koncepty`, `Neuhrazené`, `Po splatnosti`, `Uhrazené`.
- Tabulka výsledků.
- Patička tabulky: `počet výsledků`, `stránkování`, `počet položek na stránku`.

#### 2.4.2 Sloupce tabulky
1. `Číslo dokladu`
2. `Stav`
3. `Popis`
4. `Odběratel`
5. `Vystaveno`
6. `Splatnost`
7. `Cena bez DPH`
8. `Cena s DPH`
9. `Uhrazena dne`
10. `Akce`

Poznámky:
- `Číslo dokladu` je klikací odkaz na detail faktury.
- `Cena bez DPH` a `Cena s DPH` jsou formátovány v měně CZK (`1 234,56 Kč`).
- Datum je ve formátu `DD.MM.YYYY`.
- `Stav` je zobrazen textově + barevným indikátorem.

#### 2.4.3 Řádkové akce
- `Upravit`: otevře editor faktury v režimu editace.
- `Kopie`: vytvoří novou fakturu předvyplněnou z vybrané faktury.
- `PDF`: stáhne/otevře PDF faktury.
- `Smazat`: vyžaduje potvrzení v modálním okně.

Pravidla:
- U smazání je povinný potvrzovací dialog s textem dopadu.
- Po smazání se zobrazí toast a seznam se refreshne bez ztráty kontextu stránky (pokud existuje).
- Akce, které selžou na API, vrátí uživateli srozumitelnou chybu.

### 2.5 Datový model řádku faktury

| Pole | Typ | Popis |
|---|---|---|
| `invoiceId` | UUID/string | Interní identifikátor faktury |
| `invoiceNumber` | string | Číslo dokladu z číselné řady |
| `status` | enum | `draft` / `issued` / `paid` / `overdue` / `cancelled` |
| `description` | string | Stručný text předmětu faktury |
| `customerName` | string | Název/jméno odběratele |
| `issueDate` | date | Datum vystavení |
| `dueDate` | date | Datum splatnosti |
| `totalWithoutVat` | decimal | Celkem bez DPH |
| `totalWithVat` | decimal | Celkem s DPH |
| `currency` | string | Pro v1 `CZK` |

### 2.6 Vyhledávání, filtrování, řazení

#### 2.6.1 Vyhledávání
- Vyhledávání běží nad poli: `invoiceNumber`, `description`, `customerName`.
- Trigger vyhledání: `Enter` nebo debounce `400 ms`.
- Vyhledávání je case-insensitive.

#### 2.6.2 Stavové filtry
- `Všechny`: bez omezení na stav.
- `Uhrazené`: `status=paid`.
- `Neuhrazené`: `status in (issued, overdue)`.
- `Po splatnosti`: `status=overdue`.

#### 2.6.3 Řazení
- Výchozí řazení: `issueDate desc`, sekundárně `invoiceNumber desc`.
- V první verzi bez interaktivního přepínání řazení v hlavičce sloupců.

### 2.7 Stránkování
- Výchozí velikost stránky: `10`.
- Volby velikosti stránky: `10`, `20`, `50`.
- Při změně filtru nebo hledání se stránka resetuje na `1`.
- Pokud po smazání položky aktuální stránka zanikne, systém přejde na nejbližší předchozí existující stránku.

### 2.8 Funkční pravidla
1. Seznam je dostupný jen uživateli s existujícím profilem subjektu (Scope 1).
2. Koncept (`draft`) se zobrazuje v seznamu, ale do DPH podkladů (Scope 5) nevstupuje.
3. Smazání je fyzické (hard delete) a faktura po smazání již v systému neexistuje.
4. Stav `Po splatnosti` se určuje podle `dueDate < dnes` a současně `status != paid`.
5. Po návratu z detailu/editace se obnoví předchozí kontext seznamu.

### 2.9 Stavy a chování UI
- `Loading`: skeleton tabulky.
- `Empty (bez faktur)`: prázdný stav s CTA `Vystavit první fakturu`.
- `Empty (bez výsledků filtru)`: text `Pro zadaný filtr nebyly nalezeny výsledky`.
- `API error`: chybový panel + akce `Zkusit znovu`.
- `Success`: toast po úspěšné akci (`smazání`, `kopie`).

### 2.10 Akceptační kritéria (Scope 2)
1. Uživatel vidí stránkovatelný seznam vydaných faktur.
2. Filtr `Uhrazené`, `Neuhrazené`, `Po splatnosti` vrací správné záznamy.
3. Vyhledávání vrací odpovídající faktury podle čísla, popisu a odběratele.
4. Řádkové akce fungují pro každou fakturu dle oprávnění/stavu.
5. Při návratu z detailu/editace je zachován kontext seznamu.

### 2.11 Potvrzená rozhodnutí
1. Stav `draft` nemá vlastní samostatný filtr v horní liště.
2. `Smazat` je fyzické smazání (hard delete).
3. Sloupec `Uhrazena dne` se v první verzi zobrazuje.

### 2.12 Rozšíření sloupců tabulky
10. `Uhrazena dne`

Pravidla:
- Sloupec je vyplněn pouze pokud `status=paid`.
- U neuhrazených faktur se zobrazuje `-`.

## 3. Scope 3 - Fakturační editor (nová, kopie, editace, smazání)

### 3.1 Cíl
Umožnit uživateli vytvořit novou fakturu, vytvořit kopii existující faktury, upravit rozpracovanou fakturu a smazat fakturu v souladu s pravidly verze v1.

### 3.2 Funkční rozsah
#### In scope
- Vytvoření nové faktury z prázdné šablony.
- Vytvoření nové faktury kopií existující faktury.
- Editace faktury.
- Smazání faktury.
- Výpočet částek (bez DPH, DPH, s DPH).
- Práce se stavy faktury `draft`, `issued`, `paid`, `overdue`.
- Automatické předvyplnění údajů z profilu živnostníka (Scope 1).
- Vyhledání odběratele z registru ARES podle IČO nebo názvu a předvyplnění odběratele.

#### Out of scope (pro další iterace)
- Dobropisy / opravné daňové doklady.
- Zálohové faktury.
- Cizí měny.
- Ceník položek.
- Adresář odběratelů s full CRUD.

### 3.3 Navigace a vstupní cesty
1. `Vydané faktury` -> tlačítko `Nová faktura` -> editor v režimu create.
2. `Vydané faktury` -> akce `Kopie` -> editor v režimu copy.
3. `Vydané faktury` -> akce `Upravit` -> editor v režimu edit.
4. `Vydané faktury` -> akce `Smazat` -> potvrzovací dialog.

### 3.4 Obrazovka editoru faktury

#### 3.4.1 Sekce formuláře
- `Breadcrumb` (`Vydané faktury / Nová faktura` nebo `Vydané faktury / Editace dokladu`)
- `Hlavička dokladu`
- `Dodavatel` (snapshot z profilu subjektu)
- `Odběratel` (včetně asistenta vyhledání podle IČO/názvu)
- `Položky faktury`
  - každá položka zobrazuje průběžný řádkový součet `Celkem`.
- `Součty`
- `Poznámka`
- `Sticky akční lišta` s hlavními akcemi (`Uložit`, `Vystavit`, `Smazat`, `Zrušit`) dostupná i při scrollu.

#### 3.4.2 Akce editoru
- Režim `create`:
  - `Uložit koncept` (status `draft`)
  - `Vystavit fakturu` (status `issued`)
- Režim `edit`:
  - `Uložit` (uložení změn existující faktury)
  - po úspěšném uložení návrat na seznam faktur se zachováním aktivních filtrů
- `Zrušit` (návrat na seznam)
- `Smazat` (hard delete, dostupné ze seznamu faktur)

#### 3.4.3 Chování dle režimu
- Režim `create`:
  - číslo faktury se přidělí až při `Vystavit fakturu`,
  - při `Vystavit fakturu` se číslo faktury i variabilní symbol nastaví na stejnou hodnotu z roční číselné řady (`YYYYNN`, např. `202601`),
  - `issueDate` default dnešní datum,
  - `dueDate` default `issueDate + defaultDueDays` (Scope 1, aktuálně 14 dní),
  - dodavatel je předvyplněn ze subjektu.
- Režim `copy`:
  - přenesou se odběratel, položky, poznámka, sazby DPH,
  - nepřenáší se číslo dokladu,
  - `issueDate` se nastaví na dnešní datum,
  - `dueDate` se přepočte z výchozí splatnosti.
- Režim `edit`:
  - `draft`: plná editace všech polí,
  - `issued`: plná editace všech polí,
  - `paid`: editace zakázána, povolen pouze náhled.

### 3.5 Datový model faktury a validace

| Pole | Povinné | Validace / pravidlo |
|---|---|---|
| `status` | Ano | enum `draft/issued/paid/overdue/cancelled` |
| `invoiceNumber` | Podmíněně | povinné pro `issued/paid/overdue`, unikátní v číselné řadě |
| `variableSymbol` | Ano | 1-10 číslic; při vystavení se automaticky nastaví na hodnotu čísla faktury z roční řady |
| `issueDate` | Ano | datum, nesmí být prázdné |
| `taxableSupplyDate` | Ano | datum, default `issueDate` |
| `dueDate` | Ano | datum >= `issueDate` |
| `paymentMethod` | Ano | enum `bank_transfer` (v1) |
| `supplierSnapshot` | Ano | immutable snapshot dodavatele v čase vystavení |
| `customerName` | Ano | 1-150 znaků |
| `customerIco` | Ne | 8 číslic, pokud vyplněno validovat IČO |
| `customerDic` | Ne | max 14 znaků |
| `customerStreet` | Ano | 1-150 znaků |
| `customerCity` | Ano | 1-100 znaků |
| `customerPostalCode` | Ano | `123 45` nebo `12345` |
| `customerCountryCode` | Ano | ISO-2, default `CZ` |
| `items[]` | Ano | min. 1 položka |
| `items[].description` | Ano | 1-255 znaků |
| `items[].quantity` | Ano | > 0, max 3 desetinná místa |
| `items[].unit` | Ano | volný text, 1-20 znaků |
| `items[].unitPrice` | Ano | >= 0, max 2 desetinná místa |
| `items[].vatRate` | Ano | enum `0`, `12`, `21` |
| `note` | Ne | max 2000 znaků |

### 3.6 Výpočty
1. `lineTotalWithoutVat = quantity * unitPrice`
2. `lineVatAmount = lineTotalWithoutVat * vatRate/100`
3. `lineTotalWithVat = lineTotalWithoutVat + lineVatAmount`
4. `invoiceTotalWithoutVat = suma lineTotalWithoutVat`
5. `invoiceTotalVat = suma lineVatAmount`
6. `invoiceTotalWithVat = invoiceTotalWithoutVat + invoiceTotalVat`
7. Zaokrouhlení na 2 desetinná místa (bankovní zaokrouhlení).

### 3.7 Funkční pravidla
1. Fakturu lze vystavit jen pokud má všechny povinné údaje a alespoň 1 položku.
2. Číslo faktury se přiděluje atomicky při přechodu do stavu `issued` v roční řadě `YYYYNN`.
3. Variabilní symbol se při vystavení nastaví na stejné číslo jako `invoiceNumber`.
4. `overdue` se může počítat automaticky dávkou nebo při načtení (dle implementace), ale pravidlo je `dueDate < dnes` a `status != paid`.
5. Hard delete je ve v1 povolen i pro vystavené a uhrazené faktury.
6. Po vystavení se uloží snapshot dodavatele i odběratele pro historickou konzistenci.
7. Faktura ve stavu `issued` je ve v1 plně editovatelná.
8. V režimu `edit` je hlavní akce pouze `Uložit`; vystavení faktury je samostatná akce mimo editor.
9. Předvyplnění odběratele z registru lze před uložením kdykoliv ručně upravit.
10. Po `Uložit` v režimu `edit` se uživatel vrací na seznam faktur (`/invoices`) ve stejném kontextu filtrů/stránkování.

### 3.8 Stavy a chování UI
- `Loading`: načítání editoru / faktury.
- `Validation error`: zvýraznění polí + souhrnná hláška.
- `Unsaved changes`: potvrzení při odchodu bez uložení.
- `Save success`: toast po uložení konceptu.
- `Issue success`: toast + návrat do seznamu.
- `Forbidden action`: hláška při pokusu editovat nepovolený stav.

### 3.9 Akceptační kritéria (Scope 3)
1. Uživatel dokáže vytvořit koncept faktury a později jej dokončit.
2. Uživatel dokáže vytvořit fakturu kopií existující faktury.
3. Vystavení faktury vytvoří číslo dokladu; faktura ve stavu `issued` zůstává editovatelná.
4. Při vystavení faktury se `variableSymbol` automaticky nastaví na stejné číslo jako `invoiceNumber` (`YYYYNN`).
5. Výpočty součtů odpovídají položkám a sazbám DPH.
6. Fakturu lze smazat ze seznamu faktur i mimo stav `draft`.
7. Uživatel může vyhledat odběratele podle IČO i názvu a jedním klikem předvyplnit pole odběratele.

### 3.10 Potvrzená rozhodnutí
1. Faktura ve stavu `issued` je plně editovatelná.
2. V první verzi je povolena pouze platební metoda `bankovní převod`.
3. Jednotka položky faktury je volný text.

## 4. Scope 4 - Export faktury do PDF + QR platba

### 4.1 Cíl
Umožnit vygenerovat profesionální PDF faktury v českém formátu včetně QR platby (SPD) tak, aby dokument byl použitelný pro běžnou obchodní a účetní komunikaci.

### 4.2 Funkční rozsah
#### In scope
- Generování PDF z existující faktury.
- Dostupnost exportu z:
  - seznamu faktur (`PDF` akce v řádku),
  - detailu faktury,
  - editoru faktury po uložení.
- Vložení QR platby do PDF.
- Podpora stavů faktury: `issued`, `paid`, `overdue`.
- Řešení verzování PDF při editaci `issued` faktury.

#### Out of scope (pro další iterace)
- Vlastní grafické šablony na míru.
- Vícejazyčné PDF.
- Hromadný export více faktur do ZIP.
- Digitální podpis PDF certifikátem.

### 4.3 Navigace a tok uživatele
1. Uživatel klikne na akci `PDF` v seznamu nebo detailu faktury.
2. Systém vygeneruje aktuální verzi PDF dokumentu.
3. Uživatel:
   - PDF stáhne, nebo
   - PDF otevře v nové kartě (dle klientské implementace).
4. Pokud PDF nelze vytvořit (např. chybějící platební údaje), systém zobrazí srozumitelnou chybu s navedením.

### 4.4 Obsah a struktura PDF

#### 4.4.1 Hlavička dokumentu
- Název dokumentu: `FAKTURA - daňový doklad`.
- Číslo dokladu.
- Datum vystavení.
- Datum uskutečnění zdanitelného plnění.
- Datum splatnosti.
- Variabilní symbol.

#### 4.4.2 Strany dokladu
- Sekce `Dodavatel`:
  - jméno/název,
  - IČO, DIČ (pokud existuje),
  - adresa sídla,
  - bankovní účet.
- Sekce `Odběratel`:
  - jméno/název,
  - IČO, DIČ (pokud vyplněno),
  - adresa.

#### 4.4.3 Položková tabulka
- Sloupce:
  1. `Popis`
  2. `Množství`
  3. `Jednotka`
  4. `Cena za jednotku`
  5. `DPH %`
  6. `Celkem bez DPH`
  7. `Celkem s DPH`
- Souhrnné řádky:
  - základ DPH dle sazeb,
  - výše DPH dle sazeb,
  - celkem k úhradě.

#### 4.4.4 Platební blok
- Platební metoda: `Bankovní převod`.
- Číslo účtu ve formátu `prefix-cislo/kod`.
- Variabilní symbol.
- Částka k úhradě.
- QR kód pro platbu (SPD).

#### 4.4.5 Doplňkové části
- Volitelná poznámka z faktury.
- Text `Faktura je vedena elektronicky` (informační patička).

#### 4.4.6 Vizuální layout (v1)
- PDF má dvousloupcovou horní část (`Dodavatel` vlevo, hlavička dokladu + `Odběratel` vpravo).
- Pod horní částí je samostatný blok platebních údajů (`Způsob úhrady`, bankovní účet, symboly, data).
- Položky dokladu jsou v tabulce se záhlavím a oddělenými sloupci.
- V dolní části je blok QR platby a samostatná tabulka souhrnu DPH podle sazeb.
- Finální částka `Celkem k úhradě` je vizuálně zvýrazněna.
- Referenční vizuální vzor pro v1: `doc/examples/Vydaná faktura - 0126.pdf`.

### 4.5 Pravidla QR platby (SPD)
1. QR kód se generuje podle standardu `SPD 1.0`.
2. Minimální povinné hodnoty:
   - `ACC` (účet v IBAN formátu),
   - `AM` (částka),
   - `CC=CZK`,
   - `X-VS` (variabilní symbol).
3. Pokud nelze účet převést do validního vstupu pro SPD, export je blokován s chybou.
4. QR se generuje z aktuálních údajů faktury v okamžiku exportu.

### 4.6 Verze PDF a chování při editaci `issued`
1. Při každém exportu se vygeneruje PDF z aktuálního stavu faktury.
2. Systém eviduje metadatum `pdfVersion` na faktuře:
   - první export = verze `1`,
   - každý další export po změně faktury zvýší verzi o `+1`.
3. `pdfVersion` je interní technické metadatum, v PDF se uživateli nezobrazuje.
4. Historie starších PDF verzí se ve v1 neuchovává jako samostatné soubory, uchovává se jen číslo poslední verze.

### 4.7 Funkční pravidla
1. Export je povolen pouze pro stavy `issued`, `paid`, `overdue`.
2. U stavu `draft` export PDF ve v1 není povolen.
3. Měna PDF je ve v1 vždy `CZK`.
4. Částky se v PDF formátují v CZ zápisu (`1 234,56 Kč`).
5. Pokud faktura obsahuje nevalidní data pro platební blok, uživatel dostane konkrétní validační chybu.
6. PDF musí používat font s podporou české diakritiky.
7. Textové bloky se nesmí vzájemně překrývat.
8. Exportované PDF nesmí obsahovat nechtěné prázdné stránky.

### 4.8 Stavy a chování UI
- `Generating`: krátký stav generování po kliknutí na `PDF`.
- `Success`: soubor stažen / otevřen.
- `Validation error`: nelze exportovat kvůli neúplným datům (např. účet, VS).
- `API error`: obecná chyba generování + možnost opakovat akci.

### 4.9 Akceptační kritéria (Scope 4)
1. Uživatel umí vygenerovat PDF faktury ze seznamu i detailu.
2. PDF obsahuje všechny klíčové účetní údaje faktury v CZ formátu.
3. QR kód je validní pro mobilní bankovnictví podporující SPD.
4. Při změně `issued` faktury a opětovném exportu se zvýší `pdfVersion`.
5. Export `draft` faktury je zamítnut.
6. Výstup PDF má čitelný blokový layout dle referenční šablony v dokumentaci.
7. PDF je jednopage pro běžný doklad v1 a neobsahuje prázdné přidané stránky.

### 4.10 Potvrzená rozhodnutí
1. Export `draft` faktury je ve v1 zakázán.
2. Interní údaj verze dokumentu se v PDF uživateli nezobrazuje.
3. Ve v1 se ukládá jen číslo poslední verze bez archivace starších PDF souborů.

## 5. Scope 5 - DPH podklady (XML pro datovou schránku)

### 5.1 Cíl
Automaticky připravit podklady pro daňová podání z vydaných faktur tak, aby uživatel mohl za zvolené období vygenerovat XML soubory pro `Přiznání k DPH` a `Kontrolní hlášení`.

### 5.2 Funkční rozsah
#### In scope
- Obrazovka `DPH podklady` dostupná z hlavní navigace.
- Volba období pro podání.
- Výpočet podkladových částek z faktur.
- Generování XML:
  - `Přiznání k DPH`,
  - `Kontrolní hlášení`.
- Přímý export XML bez mezikroku preview.

#### Out of scope (pro další iterace)
- Přímé odeslání do datové schránky (v1 pouze export XML).
- Podání za více DIČ v jednom účtu.
- Automatické párování plateb z banky.

### 5.3 Navigace a tok uživatele
1. Uživatel otevře `DPH podklady`.
2. Vybere typ podání:
   - `Přiznání k DPH`,
   - `Kontrolní hlášení`.
3. Vybere období (`rok` + konkrétní `měsíc` nebo `kvartál` dle režimu).
4. Klikne `Export XML`.
5. Systém stáhne XML soubor připravený pro podání.

### 5.4 Podmínky přístupu
1. Modul je dostupný pouze pro subjekt s `isVatPayer=true`.
2. Pokud je subjekt neplátce DPH:
   - obrazovka se otevře,
   - zobrazí se informační stav `Subjekt není plátce DPH`,
   - export je zablokován.

### 5.5 Datový vstup a pravidla zahrnutí faktur
1. Do výpočtu vstupují faktury se stavem `issued`, `paid`, `overdue`.
2. Faktury `draft` se nikdy nezahrnují.
3. Rozhodné datum pro zařazení do období je `taxableSupplyDate`.
4. Hard deleted faktury se do výpočtu nezahrnují.
5. Všechny výpočty běží nad aktuální verzí dat faktury v okamžiku výpočtu.

### 5.6 Daňová klasifikace faktury (pro výstupy DPH)
Pro správné zařazení do přiznání a kontrolního hlášení je na faktuře evidováno pole `taxClassification`.

Povolené hodnoty:
- `domestic_standard` (tuzemské zdanitelné plnění),
- `domestic_reverse_charge` (režim přenesení daňové povinnosti v tuzemsku),
- `eu_service` (služba do EU),
- `eu_goods` (dodání zboží do EU),
- `export_third_country` (plnění mimo EU),
- `exempt_without_credit` (osvobozené bez nároku).

Pravidla:
1. `taxClassification` je povinné při vystavení faktury.
2. `eu_service` a `eu_goods` vyžadují vyplněné DIČ odběratele.
3. Klasifikace určuje, zda se faktura promítá do `Přiznání k DPH`, `Kontrolního hlášení`, nebo do jejich kombinace.

### 5.7 Výpočet podkladů

#### 5.7.1 Přiznání k DPH
- Systém agreguje základy daně a DPH podle sazeb a typu plnění.
- Výstupem je datová struktura odpovídající řádkům přiznání (vnitřní mapování).
- Částky se zaokrouhlují dle daňových pravidel na celé Kč při exportu tam, kde to schéma vyžaduje.

#### 5.7.2 Kontrolní hlášení
- Zahrnují se tuzemská zdanitelná plnění a další položky požadované strukturou kontrolního hlášení.
- Výstup respektuje členění kontrolního hlášení podle oddílů a typů plnění.
- Systém validuje povinné identifikační údaje partnera tam, kde je to pro daný oddíl nutné.

### 5.8 XML export
1. XML se generuje podle aktuálního technického schématu finanční správy podporovaného aplikací.
2. Název souboru:
   - `${ICO}_DPH_${YEAR}${PERIOD}M|Q.xml`,
   - `${ICO}_DPHKH_${YEAR}${PERIOD}M|Q.xml`.
   - `PERIOD` je `01..12` pro měsíční periodu a `1..4` pro čtvrtletní periodu.
   - příklad: `24755851_DPH_202601M.xml`, `24755851_DPHKH_20254Q.xml`.
3. Export obsahuje:
   - identifikaci subjektu (IČO/DIČ),
   - období,
   - agregované hodnoty,
   - technické metainformace požadované schématem.
4. Aplikace pouze generuje soubor; podání do datové schránky provádí uživatel.
5. `Přiznání k DPH` používá strukturu `Pisemnost/DPHDP3` s větami `VetaD`, `VetaP`, `Veta1` až `Veta6`.
6. `Kontrolní hlášení` používá strukturu `Pisemnost/DPHKH1` s větami `VetaD`, `VetaP`, `VetaA4`, `VetaC`.
7. Referenční příklady formátu jsou v:
   - `doc/examples/iDoklad_DPH3_2025Q04B`
   - `doc/examples/iDoklad_DPHKH_2025Q04B`

### 5.9 Bez historie exportů (v1)
1. XML soubory se ve v1 nearchivují.
2. Export se vždy generuje z aktuálních dat v okamžiku požadavku.
3. Historie exportů se v UI nezobrazuje.

### 5.10 Obrazovka `DPH podklady`

#### 5.10.1 Prvky obrazovky
- Výběr `Typ podání`.
- Výběr `Perioda` (`Měsíc`/`Kvartál`) s defaultem z nastavení subjektu (`vatPeriodType`).
- Výběr `Rok`.
- Výběr `Měsíc` nebo `Kvartál` dle vybrané periody.
- Výchozí hodnota období:
  - při `Měsíc` je předchozí kalendářní měsíc,
  - při `Kvartál` je předchozí kalendářní čtvrtletí.
- Tlačítko `Export XML`.

#### 5.10.2 Stavy UI
- `Loading`: probíhá export.
- `Validation error`: nevalidní vstup období nebo chybějící daňová klasifikace na fakturách.
- `API error`: obecná chyba.
- `Success`: XML soubor stažen.

### 5.11 Akceptační kritéria (Scope 5)
1. Plátce DPH může vygenerovat XML pro `Přiznání k DPH` za zvolené období.
2. Plátce DPH může vygenerovat XML pro `Kontrolní hlášení` za zvolené období.
3. `Souhrnné hlášení` není ve v1 dostupné.
4. Faktury `draft` nejsou nikdy zahrnuty do výpočtu.
5. Neplátce DPH nemůže export spustit a vidí srozumitelný informační stav.
6. XML `Přiznání k DPH` a `Kontrolní hlášení` je ve FU-compatible struktuře vět.
7. Název souboru exportu odpovídá formátu `${ICO}_DPH...` / `${ICO}_DPHKH...` podle typu podání.
8. Perioda exportu se po načtení obrazovky předvyplní z nastavení subjektu (`vatPeriodType`) a jako hodnota použije předchozí měsíc/čtvrtletí.

### 5.12 Potvrzená rozhodnutí
1. Ve v1 se podporuje měsíční i čtvrtletní období.
2. `Kontrolní hlášení` je součástí v1.
3. `Souhrnné hlášení` není ve v1 součástí exportu.
4. XML soubory se ve v1 nearchivují; aplikace je generuje vždy z aktuálních dat.
5. Default perioda na obrazovce `DPH podklady` se řídí `vatPeriodType` subjektu.

## 6. Scope 6 - Globální navigace, struktura obrazovek a hlavní flow

### 6.1 Cíl
Definovat jednotnou navigaci a informační architekturu aplikace tak, aby byly jednotlivé funkce (Scope 1-5) konzistentně propojené na desktopu i mobilu.

### 6.2 Funkční rozsah
#### In scope
- Struktura hlavních modulů aplikace.
- Routing a URL adresy.
- Pravidla přístupu na obrazovky (guardy).
- App shell (hlavička, boční menu, obsah).
- Chování navigace při návratu mezi seznamem a detailem/editací.
- Globální stavy UI (loading/error/empty/not found).

#### Out of scope (pro další iterace)
- Role/permission model pro více typů uživatelů.
- Pokročilá personalizace menu.
- White-label branding per tenant.

### 6.3 Informační architektura (IA)
Hlavní moduly:
1. `Vydané faktury`
2. `DPH podklady`
3. `Nastavení subjektu`

Sekundární obrazovky:
1. `Detail faktury`
2. `Editor faktury` (nová/kopie/editace)
3. `Onboarding subjektu`
4. `Landing page`

### 6.4 Routy a URL mapování
1. `/` -> veřejná landing page projektu.
2. `/onboarding/start` -> onboarding start (registrace + navázání na onboarding subjektu).
3. `/onboarding/subject` -> onboarding subjektu (Scope 1).
4. `/invoices` -> seznam vydaných faktur (Scope 2).
5. `/invoices/new` -> editor nová faktura (Scope 3).
6. `/invoices/:invoiceId` -> detail faktury.
7. `/invoices/:invoiceId/edit` -> editor faktury v režimu edit.
8. `/invoices/:invoiceId/copy` -> editor faktury v režimu copy.
9. `/tax-reports` -> DPH podklady (Scope 5).
10. `/settings/subject` -> detail/editace subjektu (Scope 1).
11. `/auth/login`, `/auth/register` (redirect na `/onboarding/start`), `/auth/forgot-password`, `/auth/reset-password`.
12. `*` -> stránka `404`.

### 6.5 Guardy a podmínky vstupu
1. Bez autentizace jsou dostupné veřejné routy (`/`, `/auth/*`, `/onboarding/start`); ostatní routy vyžadují přihlášení.
2. `/tax-reports` je dostupná jen pro `isVatPayer=true`; neplátce vidí informační stav bez možnosti exportu.
3. Pokud je uživatel přihlášen, ale nemá dokončený onboarding subjektu, všechny aplikační routy (`/invoices`, `/tax-reports`, `/settings/*`) jej přesměrují zpět na `/onboarding/subject`.
4. `/invoices/:invoiceId/*` vrací `404`, pokud faktura neexistuje (např. byla smazána).
5. Přímý vstup na chráněnou URL řeší guard před vykreslením stránky.

### 6.6 App shell a layout

#### 6.6.1 Desktop
- Levý sidebar:
  - `Vydané faktury`,
  - `DPH podklady`,
  - `Nastavení subjektu`.
- Horní lišta:
  - v přihlášené části aplikace je kompaktní topbar pouze s uživatelským profilem vpravo (avatar/počáteční písmeno),
  - dropdown menu profilu obsahuje akci `Odhlásit`.
- Hlavní obsah:
  - každá obrazovka začíná `page header` blokem:
    - sekční štítek (kicker),
    - název obrazovky,
    - krátký popis kontextu stránky,
    - stránkové akce vpravo (`page-actions`),
  - obsah obrazovky je rozdělený do tematických panelů (`ui-section`) s lokálním nadpisem,
  - stránka modulu,
  - lokální akce/filtry stránky jsou pouze v obsahu modulu (nemísí se s globální navigací),
  - breadcrumb pouze na detailních obrazovkách (detail/editace faktury).

#### 6.6.2 Mobil
- Kompaktní horní navigační blok:
  - `Vydané faktury`,
  - `DPH podklady`,
  - `Nastavení subjektu`.
- Vpravo v topbaru je avatar uživatele s dropdown menu `Odhlásit`.
- Detailní stránky (`/invoices/:id`, editor) otevírané přes full-screen view s tlačítkem zpět.

#### 6.6.3 Globální hlavička
- Na veřejných a onboarding/auth obrazovkách je viditelná jednotná hlavička s logem `FakturAI`.
- V přihlášené části s levým menu se hlavička v obsahu neduplikuje; logo zůstává v levém sidebaru.
- Kliknutí na logo:
  - nepřihlášený uživatel -> `/`,
  - přihlášený uživatel s dokončeným subjektem -> `/invoices`,
  - přihlášený uživatel bez subjektu -> `/onboarding/subject`.
- Vpravo v hlavičce:
  - nepřihlášený uživatel -> `Přihlášení` + `Vytvořit účet`,
  - přihlášený uživatel -> avatar s menu a akcí `Odhlásit`.
- Rozvržení veřejných/onboarding obrazovek používá sjednocený kontejner šířky, aby obsah mezi kroky „nelétal“.

### 6.7 Pravidla navigace mezi seznamem, detailem a editací
1. Při přechodu ze seznamu na detail/editaci se uloží kontext seznamu:
   - filtr,
   - hledaný text,
   - stránka,
   - velikost stránky.
2. Po návratu na seznam se kontext obnoví.
3. Kontext je reprezentován query parametry URL:
   - `status`,
   - `q`,
   - `page`,
   - `pageSize`.
4. Detail a editor faktury zobrazují breadcrumb s návratem na seznam faktur.

### 6.8 Globální UX pravidla
1. Primární akce stránky je vždy vizuálně dominantní (např. `Nová faktura`, `Export XML`).
2. Destruktivní akce (`Smazat`) vyžadují potvrzení.
3. Všechny úspěšné akce mají toast potvrzení.
4. Všechny API chyby mají user-readable zprávu + možnost opakovat akci.
5. Aplikace používá jednotný vizuální základ (typografie, barvy, spacing, stavy komponent).
6. Formulářové prvky mají konzistentní stavy `default/hover/focus/disabled`.
7. Statusy dokladů jsou vizuálně odlišeny konzistentní sadou badge prvků.
8. Rozhraní je responzivní a zachovává čitelnost na desktopu i mobilu.
9. Globální navigace je vizuálně oddělená od lokálních filtrů a ovládacích prvků stránky.
10. Dlouhé formuláře (např. subjekt, editor faktury) jsou členěny do logických sekcí místo jedné lineární plochy.
11. Akční tlačítka stránky jsou seskupena v hlavičce nebo v patě relevantní sekce, ne mezi datovými bloky.

### 6.9 Globální stavy obrazovek
1. `Loading`:
   - skeleton pro tabulky/listy,
   - spinner pro krátké jednorázové akce.
2. `Empty`:
   - modulově specifický text + CTA.
3. `Error`:
   - chybový panel s `Zkusit znovu`.
4. `Not found`:
   - stránka 404 s CTA zpět na `/invoices`.

### 6.10 Notifikace a potvrzovací dialogy
1. Toasty:
   - úspěšné uložení,
   - úspěšný export,
   - úspěšné smazání.
2. Dialogy:
   - potvrzení smazání faktury,
   - potvrzení odchodu s neuloženými změnami.
3. Chybové notifikace:
   - validační chyby u formulářových polí,
   - obecné chyby v globálním alertu.

### 6.11 Cross-scope integrační pravidla
1. Scope 1 -> Scope 2/3:
   - bez subjektu nelze fakturovat.
2. Scope 3 -> Scope 4:
   - PDF lze exportovat jen pro `issued/paid/overdue`.
3. Scope 3 -> Scope 5:
   - do daňových podkladů nevstupuje `draft`,
   - vstupují pouze faktury v rozhodném období dle `taxableSupplyDate`.
4. Scope 2 <-> Scope 3:
   - akce v seznamu musí respektovat pravidla stavů faktury a povolené operace.

### 6.12 Akceptační kritéria (Scope 6)
1. Uživatel se dostane ke všem hlavním modulům z jednoho konzistentního menu.
2. Přímý vstup na URL respektuje guardy a nevede k nekonzistentním stavům.
3. Návrat z detailu/editace faktury obnoví kontext seznamu.
4. Mobilní i desktop navigace pokrývá stejné funkce.
5. Při chybě API uživatel vždy obdrží srozumitelnou zpětnou vazbu.
6. Vizuální jazyk hlavních obrazovek je konzistentní a používá jednotné stavy ovládacích prvků.

### 6.13 Potvrzená rozhodnutí
1. Breadcrumb se ve v1 používá pouze na detailních stránkách.
2. Mobil používá hamburger menu (ne bottom navigation).
3. Veřejná vstupní stránka projektu je `/`; po přihlášení systém směruje uživatele dle stavu onboardingu.

## 7. Scope 7 - Autentizace, registrace účtu a správa session

### 7.1 Cíl
Zajistit bezpečný vstup do aplikace, vytvoření uživatelského účtu a navázání na onboarding živnostníka tak, aby každý uživatel pracoval pouze se svými daty.

### 7.2 Funkční rozsah
#### In scope
- Registrace nového účtu.
- Přihlášení a odhlášení.
- Obnova hesla.
- Udržení přihlášené session.
- Přesměrování po přihlášení podle stavu účtu:
  - bez subjektu -> onboarding subjektu,
  - se subjektem -> seznam faktur.

#### Out of scope (pro další iterace)
- SSO (Google, Microsoft, Apple).
- MFA (dvoufaktorové přihlášení).
- Správa týmů/rolí (více uživatelů na jeden subjekt).

### 7.3 Navigace a tok uživatele
1. Nepřihlášený uživatel otevře aplikaci a může pokračovat přes onboarding start (`/onboarding/start`) nebo přihlášení.
2. Uživatel bez účtu vytvoří účet na onboarding startu (ve stejném UX jako onboarding).
3. Po úspěšné registraci je automaticky přihlášen.
4. Pokud nemá založený subjekt, systém jej přesměruje na `Onboarding živnostníka` (Scope 1).
5. Po dokončení onboardingu je přesměrován na `Vydané faktury`.
6. Pokud onboarding nedokončí, po dalším přihlášení je vždy vrácen na `Onboarding živnostníka`.
7. Pokud už subjekt existuje, po přihlášení jde rovnou na `Vydané faktury`.

### 7.4 Obrazovky

#### 7.4.1 Přihlášení
Prvky:
- Auth layout se dvěma zónami:
  - informační blok (co aplikace umí),
  - formulářový panel.
- Pole `E-mail`.
- Pole `Heslo`.
- Akce `Přihlásit se`.
- Odkazy:
  - `Začít onboarding`,
  - `Zapomenuté heslo`.

Pravidla:
- Nevalidní kombinace e-mail/heslo vrací obecnou chybu bez upřesnění pole.
- Po úspěchu vzniká session a dojde k redirectu dle 7.3.

#### 7.4.2 Onboarding start (registrace)
Prvky:
- Stejný vizuální jazyk jako onboarding subjektu.
- Krok `Vytvoření účtu` jako první krok onboarding flow.
- Pole `E-mail`.
- Pole `Heslo`.
- Pole `Potvrzení hesla`.
- Akce `Pokračovat na nastavení subjektu`.

Pravidla:
- E-mail musí být unikátní.
- Heslo musí splnit minimální bezpečnostní pravidla (viz 7.5).
- Po úspěšné registraci se vytvoří účet a session.
- Route `/auth/register` je alias, který přesměruje na `/onboarding/start`.
- Primární CTA na landing page i v hlavičce používá text `Vytvořit účet`.

#### 7.4.3 Zapomenuté heslo
Prvky:
- Stejný auth layout jako u přihlášení.
- Pole `E-mail`.
- Akce `Odeslat odkaz`.

Pravidla:
- Systém vždy vrátí stejnou odpověď (`Pokud účet existuje, poslali jsme instrukce`) kvůli bezpečnosti.
- Odeslaný odkaz má omezenou platnost.

#### 7.4.4 Nastavení nového hesla
Prvky:
- Stejný auth layout jako u přihlášení.
- Pole `Nové heslo`.
- Pole `Potvrzení hesla`.
- Akce `Uložit nové heslo`.

Pravidla:
- Token z odkazu musí být validní a neexpirovaný.
- Po úspěšné změně hesla jsou staré session zneplatněné.

### 7.5 Validační pravidla
1. `E-mail`:
   - validní formát,
   - max délka 254 znaků,
   - porovnání case-insensitive.
2. `Heslo`:
   - min. 8 znaků,
   - povinný speciální znak se nevyžaduje,
   - heslová fráze (12+ znaků) je povolená.
3. `Potvrzení hesla` musí přesně odpovídat poli `Heslo`.
4. Validační zprávy auth a onboarding formulářů jsou v češtině.

### 7.6 Session a přístup k aplikaci
1. Všechny aplikační routy mimo auth sekci jsou chráněné.
2. Po expiraci session je uživatel přesměrován na `Přihlášení`.
3. Odhlášení ukončí aktivní session na aktuálním zařízení.
4. Po přihlášení se obnoví poslední zamýšlená URL, pokud je validní.

### 7.7 Funkční pravidla
1. Účet uživatele vzniká v registračním kroku před onboardingem subjektu.
2. Jeden účet má ve v1 právě jeden subjekt (navazuje na Scope 1).
3. Bez přihlášení nelze načíst ani metadata faktur.
4. Chybové hlášky auth modulů nesmí prozrazovat existenci konkrétního účtu.
5. Obnova hesla je dostupná i pro uživatele bez dokončeného onboardingu subjektu.

### 7.8 Stavy a chování UI
- `Loading`: odesílání auth formuláře.
- `Validation error`: hláška u konkrétního pole.
- `Auth error`: obecná hláška (`Přihlášení se nezdařilo`).
- `Success`: potvrzení po registraci, odhlášení a změně hesla.

### 7.9 Akceptační kritéria (Scope 7)
1. Nový uživatel vytvoří účet a je přesměrován do onboardingu subjektu.
2. Existující uživatel se přihlásí a dostane se na `/invoices`.
3. Nepřihlášený uživatel se nedostane na chráněné routy.
4. Uživatel dokáže projít flow `zapomenuté heslo -> nové heslo`.
5. Po odhlášení už nelze volat chráněná API bez nové autentizace.
6. Registrace i reset hesla přijmou heslo délky 8+ znaků bez povinného speciálního znaku.

### 7.10 Potvrzená rozhodnutí
1. Registrace ve v1 nevyžaduje ověření e-mailu před prvním přihlášením.
2. Ve v1 je povolena samoregistrace bez pozvánky.
3. Odhlášení ukončí pouze aktuální session.

## 8. Řízení změn (Change Request)

### 8.1 Cíl
Zajistit, že každá změna požadavků je:
1. Jednoznačně popsána.
2. Odsouhlasena před implementací.
3. Dohledatelná od zadání až po commit.

### 8.2 Povinné artefakty změny
Každý Change Request (`CR`) musí mít:
1. Záznam v `doc/change-requesty/CR-XXXX-*.md`.
2. Aktualizaci funkční specifikace (`doc/funkcni-specifikace.md`), pokud mění chování aplikace.
3. Aktualizaci technické specifikace (`doc/tecnicka-specifikace.md`), pokud mění API, DB, bezpečnost, výkon nebo provoz.
4. Odkaz na implementační commit(y).

### 8.3 Životní cyklus CR
Stavy:
1. `Navrženo` - požadavek je zapsaný, čeká na analýzu.
2. `Analyzováno` - dopad na scope/specifikaci je popsán.
3. `Ke schválení` - scope je připravený k potvrzení zadavatelem.
4. `Schváleno` - lze implementovat.
5. `Implementováno` - kód je hotový.
6. `Ověřeno` - test/UAT hotové.
7. `Uzavřeno` - změna je finálně převzatá.

### 8.4 Pravidlo „Spec First“
1. Nejprve se aktualizuje funkční specifikace.
2. Poté technická specifikace (pokud je potřeba).
3. Až po odsouhlasení scope se zahájí implementace.

### 8.5 Minimální obsah zadání CR
Každý požadavek musí obsahovat:
1. `Název změny`.
2. `Business důvod`.
3. `Aktuální stav` vs. `Požadovaný stav`.
4. `Dotčené obrazovky/routy`.
5. `Akceptační kritéria`.
6. `Prioritu` (`Must/Should/Could`).

### 8.6 Číslování a dávkování
1. CR se číslují sekvenčně: `CR-0001`, `CR-0002`, ...
2. Jeden CR = jedna logicky konzistentní změna.
3. V jedné dávce může být více CR, každý má samostatný záznam.

### 8.7 Potvrzený proces spolupráce
1. Zadavatel pošle dávku připomínek.
2. Asistent vytvoří/aktualizuje CR záznamy se stavem `Navrženo`.
3. Asistent připraví návrh změn ve specifikacích a změní stav na `Ke schválení`.
4. Po potvrzení zadavatelem přepne CR na `Schváleno` a teprve pak implementuje.
5. Po nasazení a ověření uzavře CR stavem `Uzavřeno`.
