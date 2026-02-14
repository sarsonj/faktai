# Odhad realizace a nacenění projektu FaktAI (od začátku do aktuálního stavu)

## 0. Metadata
- Datum: `2026-02-14`
- Stav: `Retrospektivní odhad`
- Sazba: `8 000 Kč / MD`
- Jednotka: `1 MD = 1 člověkoden`

## 1. Metodika odhadu
- Odhad vychází z průběhu projektu zdokumentovaného v:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/implementacni-backlog.md` (Iterace 0-7)
  - `doc/change-requesty/README.md` (CR-0001 až CR-0045)
- Jde o retrospektivní obchodní odhad pro nacenění rozsahu, ne o timesheet.
- Cena je uvedena bez DPH (pokud není domluveno jinak).

## 2. Rozpad na hlavní fáze

| Fáze | Popis | Odhad (MD) | Sazba (Kč/MD) | Cena (Kč) |
|---|---|---:|---:|---:|
| `F1` | Analýza a specifikace (funkční + technická + backlog + proces CR) | 12 | 8 000 | 96 000 |
| `F2` | Implementace jádra (Iterace 0-7: platforma, auth, subjekt, faktury, PDF, DPH XML, stabilizace) | 42 | 8 000 | 336 000 |
| `F3` | Implementace change requestů (CR-0002 až CR-0030, vlny úprav UX/UI a business logiky) | 54 | 8 000 | 432 000 |
| `F4` | Implementace navazujících change requestů (CR-0031 až CR-0045, deploy/branding, číslování, FU XML, reporting) | 20 | 8 000 | 160 000 |
|  | **Celkem** | **128 MD** |  | **1 024 000 Kč** |

## 3. Detailní rozpad

### 3.1 F1 - Analýza a specifikace (12 MD)

| Část | Odhad (MD) | Cena (Kč) |
|---|---:|---:|
| Převod hrubého zadání do scope 1-7 + workflow a obrazovky | 5 | 40 000 |
| Technická specifikace (architektura, datový model, API, provoz) | 4 | 32 000 |
| Implementační backlog (iterace 0-7, milníky, DoD) | 2 | 16 000 |
| Nastavení procesu change requestů + šablony + evidence | 1 | 8 000 |
| **Součet F1** | **12** | **96 000** |

### 3.2 F2 - Implementace jádra (42 MD)

| Iterace | Odhad (MD) | Cena (Kč) |
|---|---:|---:|
| Iterace 0 - foundation (monorepo, docker, DB migrace, skeleton) | 3.5 | 28 000 |
| Iterace 1 - auth/session | 6 | 48 000 |
| Iterace 2 - správa subjektu + onboarding | 4.5 | 36 000 |
| Iterace 3 - seznam faktur + filtry | 5 | 40 000 |
| Iterace 4 - editor faktury + lifecycle | 8 | 64 000 |
| Iterace 5 - PDF + QR | 4.5 | 36 000 |
| Iterace 6 - DPH podklady + XML exporty | 7 | 56 000 |
| Iterace 7 - stabilizace + release kandidát | 3.5 | 28 000 |
| **Součet F2** | **42** | **336 000** |

### 3.3 F3 - Implementace change requestů (54 MD)

| Vlna CR | CR rozsah | Odhad (MD) | Cena (Kč) |
|---|---|---:|---:|
| `CR-vlna A` | CR-0002 až CR-0007 (registrace, ARES/adresy, validace, PDF, XML) | 13 | 104 000 |
| `CR-vlna B` | CR-0008 až CR-0016 (UI roadmap + redesign hlavních obrazovek) | 12 | 96 000 |
| `CR-vlna C` | CR-0017 až CR-0021 (landing, onboarding, hlavička, branding) | 10 | 80 000 |
| `CR-vlna D` | CR-0022 až CR-0028 (číslování, detail/editace, seznam faktur, UX úpravy) | 15 | 120 000 |
| `CR-vlna E` | CR-0029 až CR-0030 (grafika landing page, hero iterace) | 4 | 32 000 |
| **Součet F3** |  | **54** | **432 000** |

### 3.4 F4 - Navazující change requesty (20 MD)

| Vlna CR | CR rozsah | Odhad (MD) | Cena (Kč) |
|---|---|---:|---:|
| `CR-vlna F` | CR-0031 až CR-0034 (odhad, deploy, rebranding a logo iterace) | 5 | 40 000 |
| `CR-vlna G` | CR-0035 až CR-0038 (číslování faktur, custom čísla, copy flow, koncept -> vystavení) | 5 | 40 000 |
| `CR-vlna H` | CR-0039 až CR-0043 (FU XML mapování, kontakty, datum úhrady, fix číselné řady) | 8 | 64 000 |
| `CR-vlna I` | CR-0044 až CR-0045 (časový výkaz z commitů, root README a AI vs ruční porovnání) | 2 | 16 000 |
| **Součet F4** |  | **20** | **160 000** |

## 4. Finální výpočet

1. `F1 = 12 MD x 8 000 Kč = 96 000 Kč`
2. `F2 = 42 MD x 8 000 Kč = 336 000 Kč`
3. `F3 = 54 MD x 8 000 Kč = 432 000 Kč`
4. `F4 = 20 MD x 8 000 Kč = 160 000 Kč`
5. `Celkem = 128 MD x 8 000 Kč = 1 024 000 Kč`

## 5. Poznámky k interpretaci
- Odhad zahrnuje i opakované iterace na základě uživatelského feedbacku.
- Nezahrnuje externí náklady (hosting, domény, placené API služby, licence).
- Pro další etapy doporučuji používat stejný model: každý nový požadavek jako CR s vlastním MD odhadem před implementací.
