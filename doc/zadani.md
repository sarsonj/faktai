## Jednoduchý fakturační a daňový systém

Cílem tohoto projektu je vytvořit jednoduchý fakturační a daňový systém podobný např. systému Fakturoid nebo iDoklad. Systém bude sloužit interně živnostníkům ve firmě TappyTaps, aby nemuseli kupovat placené nástroje, které nevyužijí.

### Technická zadání

- pro vývoj použij nodejs / react
- vše musí běžet v dockeru
- databáze bude posgresql a musí se sama nainicializovat
- mělo by to mít rozumné GUI, aby se to dobře používalo

### Funkční zadání

- funkcionalita musí odpovídat účetním pravidlům v ČR

### Scope aplikace

- vytvoření nového živnostníka - zadání všech potřebných údajů, které jsou potřeba pro účely fakturace a účetnitví
- stránka s vydanými fakturami - seznam vydaných faktur (stránkovatelný seznam) - inspirace - sshots/vydane.png
- možnost vložení nové faktury
- možnost vytvoření kopie existující faktury a její editace
- možnost editace / smazání faktury
- export faktury do PDF - profesionální vzhled obvyklý v ČR včetně QR kódu pro platbu (QR platba)
- podklady pro DPH - aplikace bude umět vygenerovat podkady pro DPH z vydaných faktur - XML pro dataovou shránku pro DPH a souhrnné hlášení
