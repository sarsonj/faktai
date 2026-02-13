# Odhad realizace a nacenění projektu FakturAI (od začátku do aktuálního stavu)

## 0. Metadata
- Datum: `2026-02-13`
- Stav: `Retrospektivní odhad`
- Sazba: `1 500 Kč / MD`
- Jednotka: `1 MD = 1 člověkoden`

## 1. Metodika odhadu
- Odhad vychází z průběhu projektu zdokumentovaného v:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/implementacni-backlog.md` (Iterace 0-7)
  - `doc/change-requesty/README.md` (CR-0001 až CR-0030)
- Jde o retrospektivní obchodní odhad pro nacenění rozsahu, ne o timesheet.
- Cena je uvedena bez DPH (pokud není domluveno jinak).

## 2. Rozpad na hlavní fáze

| Fáze | Popis | Odhad (MD) | Sazba (Kč/MD) | Cena (Kč) |
|---|---|---:|---:|---:|
| `F1` | Analýza a specifikace (funkční + technická + backlog + proces CR) | 12 | 1 500 | 18 000 |
| `F2` | Implementace jádra (Iterace 0-7: platforma, auth, subjekt, faktury, PDF, DPH XML, stabilizace) | 42 | 1 500 | 63 000 |
| `F3` | Implementace change requestů (CR-0002 až CR-0030, vlny úprav UX/UI a business logiky) | 54 | 1 500 | 81 000 |
|  | **Celkem** | **108 MD** |  | **162 000 Kč** |

## 3. Detailní rozpad

### 3.1 F1 - Analýza a specifikace (12 MD)

| Část | Odhad (MD) | Cena (Kč) |
|---|---:|---:|
| Převod hrubého zadání do scope 1-7 + workflow a obrazovky | 5 | 7 500 |
| Technická specifikace (architektura, datový model, API, provoz) | 4 | 6 000 |
| Implementační backlog (iterace 0-7, milníky, DoD) | 2 | 3 000 |
| Nastavení procesu change requestů + šablony + evidence | 1 | 1 500 |
| **Součet F1** | **12** | **18 000** |

### 3.2 F2 - Implementace jádra (42 MD)

| Iterace | Odhad (MD) | Cena (Kč) |
|---|---:|---:|
| Iterace 0 - foundation (monorepo, docker, DB migrace, skeleton) | 3.5 | 5 250 |
| Iterace 1 - auth/session | 6 | 9 000 |
| Iterace 2 - správa subjektu + onboarding | 4.5 | 6 750 |
| Iterace 3 - seznam faktur + filtry | 5 | 7 500 |
| Iterace 4 - editor faktury + lifecycle | 8 | 12 000 |
| Iterace 5 - PDF + QR | 4.5 | 6 750 |
| Iterace 6 - DPH podklady + XML exporty | 7 | 10 500 |
| Iterace 7 - stabilizace + release kandidát | 3.5 | 5 250 |
| **Součet F2** | **42** | **63 000** |

### 3.3 F3 - Implementace change requestů (54 MD)

| Vlna CR | CR rozsah | Odhad (MD) | Cena (Kč) |
|---|---|---:|---:|
| `CR-vlna A` | CR-0002 až CR-0007 (registrace, ARES/adresy, validace, PDF, XML) | 13 | 19 500 |
| `CR-vlna B` | CR-0008 až CR-0016 (UI roadmap + redesign hlavních obrazovek) | 12 | 18 000 |
| `CR-vlna C` | CR-0017 až CR-0021 (landing, onboarding, hlavička, branding) | 10 | 15 000 |
| `CR-vlna D` | CR-0022 až CR-0028 (číslování, detail/editace, seznam faktur, UX úpravy) | 15 | 22 500 |
| `CR-vlna E` | CR-0029 až CR-0030 (grafika landing page, hero iterace) | 4 | 6 000 |
| **Součet F3** |  | **54** | **81 000** |

## 4. Finální výpočet

1. `F1 = 12 MD x 1 500 Kč = 18 000 Kč`
2. `F2 = 42 MD x 1 500 Kč = 63 000 Kč`
3. `F3 = 54 MD x 1 500 Kč = 81 000 Kč`
4. `Celkem = 108 MD x 1 500 Kč = 162 000 Kč`

## 5. Poznámky k interpretaci
- Odhad zahrnuje i opakované iterace na základě uživatelského feedbacku.
- Nezahrnuje externí náklady (hosting, domény, placené API služby, licence).
- Pro další etapy doporučuji používat stejný model: každý nový požadavek jako CR s vlastním MD odhadem před implementací.
