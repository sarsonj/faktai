# CR-0047 - Aktualizace dodavatelského snapshotu na faktuře

## 0. Metadata
- ID: `CR-0047`
- Datum: `2026-03-13`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Uživatel může po vystavení faktury opravit číslo účtu v nastavení subjektu.
- Již vystavené faktury ale dál používají historický dodavatelský snapshot, takže PDF i detail ukazují původní účet.
- Požadavek je zachovat historiku jako default, ale umožnit vědomou aktualizaci snapshotu na konkrétní faktuře.

## 2. Cílový stav
- Detail faktury zobrazuje účet dodavatele použitý pro danou fakturu.
- V pokročilé sekci detailu existuje akce pro aktualizaci dodavatelských údajů z aktuálního nastavení subjektu.
- Akce je explicitní a není součástí běžné editace faktury.

## 3. Scope změny
- API:
  - rozšíření `GET /invoices/:id` o údaje dodavatelského účtu,
  - nový endpoint `POST /invoices/:id/refresh-supplier-snapshot`
- Frontend:
  - zobrazení účtu dodavatele v detailu faktury,
  - nová pokročilá akce v detailu faktury.
- Dokumentace:
  - `doc/funkcni-specifikace.md`
  - `doc/tecnicka-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Akceptační kritéria
1. Detail faktury ukazuje účet dodavatele použitý pro fakturu.
2. U vystavené / uhrazené / po splatnosti lze v pokročilé sekci explicitně aktualizovat dodavatelský snapshot z nastavení subjektu.
3. Po aktualizaci snapshotu používá další PDF export nové údaje.

