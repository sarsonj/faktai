# Change Requesty

## Pravidla
1. Každý CR je samostatný soubor `CR-XXXX-popis.md`.
2. Číslování je sekvenční (`CR-0001`, `CR-0002`, ...).
3. Stav CR se řídí životním cyklem z `doc/funkcni-specifikace.md`.

## Stavový model
- `Navrženo`
- `Analyzováno`
- `Ke schválení`
- `Schváleno`
- `Implementováno`
- `Ověřeno`
- `Uzavřeno`

## Přehled CR
| ID | Název | Stav | Priorita |
|---|---|---|---|
| `CR-0001` | Zavedení procesu řízení změn | `Schváleno` | `Must` |
| `CR-0002` | Zlepšení registrace a onboardingu | `Ověřeno` | `Must` |
| `CR-0003` | Vyhledání odběratele při zadání faktury | `Ověřeno` | `Must` |
| `CR-0004` | Redesign PDF vzhledu faktury | `Ověřeno` | `Must` |
| `CR-0005` | FU XML export pro přiznání DPH a kontrolní hlášení | `Ověřeno` | `Must` |
| `CR-0006` | Úpravy XML exportu, editoru faktur a kvality PDF | `Ověřeno` | `Must` |
| `CR-0007` | Regresní opravy defaultů exportu, editoru a PDF sazeb | `Ověřeno` | `Must` |
| `CR-0008` | UI roadmap + Fáze 1 design foundation | `Implementováno` | `Should` |
| `CR-0009` | SaaS app shell: oddělená navigace a uživatelské menu | `Ke schválení` | `Must` |
| `CR-0010` | Seznam faktur: ikonové akce a proklik čísla dokladu | `Implementováno` | `Should` |
| `CR-0011` | Seznam faktur: tooltipy, PDF ikona, mazání feedback a kompaktní paginace | `Implementováno` | `Should` |
| `CR-0012` | Seznam faktur: dropdown filtr a mazání bez omezení stavu | `Implementováno` | `Must` |
| `CR-0013` | UI redesign Fáze 2: informační hierarchie hlavních obrazovek | `Implementováno` | `Should` |
| `CR-0014` | UI redesign Fáze 3: fakturační workflow polish (seznam/detail/editor) | `Implementováno` | `Should` |
| `CR-0015` | UI redesign Fáze 4: DPH podklady, nastavení subjektu a auth obrazovky | `Implementováno` | `Should` |
| `CR-0016` | DPH podklady: zjednodušení UI | `Implementováno` | `Should` |
| `CR-0017` | Landing page, onboarding refresh a zjednodušení nastavení subjektu | `Implementováno` | `Should` |
| `CR-0018` | Rebranding názvu aplikace na FakturAI | `Implementováno` | `Should` |
| `CR-0019` | Onboarding start s registrací a guard na dokončení subjektu | `Implementováno` | `Must` |
| `CR-0020` | Globální hlavička a vyladění onboardingu | `Implementováno` | `Should` |
| `CR-0021` | Stabilizace layoutu hlavičky a onboardingu | `Implementováno` | `Must` |
| `CR-0022` | Číslování dokladů a zjednodušení VS | `Implementováno` | `Must` |
| `CR-0023` | Fix regrese čísla faktury a UX nové faktury | `Implementováno` | `Must` |
| `CR-0024` | Pokročilé zásahy do faktury (zanořený režim) | `Implementováno` | `Must` |
| `CR-0025` | Refaktor vzhledu detailu faktury | `Implementováno` | `Should` |
| `CR-0026` | Detail faktury: akce, pokročilé volby a konzistence layoutu | `Implementováno` | `Must` |
| `CR-0027` | Zjednodušení akcí editoru faktury | `Implementováno` | `Must` |
| `CR-0028` | Seznam faktur: dvouřádkový layout a filtr roku | `Implementováno` | `Must` |
| `CR-0029` | Landing page: integrace grafiky hero a feature sekcí | `Implementováno` | `Should` |
| `CR-0030` | Landing page: hero bez vnitřní „bubliny“ | `Implementováno` | `Should` |
| `CR-0031` | Odhad realizace a nacenění projektu | `Implementováno` | `Should` |
| `CR-0032` | CapRover nasazení a příprava runtime konfigurace | `Implementováno` | `Must` |
| `CR-0033` | Rebranding názvu aplikace na FaktAI | `Implementováno` | `Must` |
| `CR-0034` | Aktualizace loga z dodaného assetu `logo_new.png` | `Implementováno` | `Should` |
| `CR-0035` | Zrušení formátové validace při pokročilé změně čísla faktury | `Implementováno` | `Must` |
| `CR-0036` | Vlastní číslo dokladu při vytváření faktury | `Implementováno` | `Must` |
| `CR-0037` | Formát automatického číslování faktur `YYYYNNNNNN` | `Implementováno` | `Must` |
| `CR-0038` | Fix kopie faktury a vystavení konceptu v editoru | `Implementováno` | `Must` |
| `CR-0039` | XML FU: adresa, místní příslušnost a číselník finančních úřadů | `Implementováno` | `Must` |
