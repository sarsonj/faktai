# CR-0042 - Datum úhrady při označení jako uhrazené a pokročilá změna

## 0. Metadata
- ID: `CR-0042`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Uživatel potřebuje při označení faktury jako uhrazené zvolit skutečné datum úhrady, ne vždy aktuální den.
- V pokročilých funkcích detailu faktury chybí možnost upravit datum úhrady již uhrazené faktury.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - primární akce `Označit jako uhrazené` nastavuje datum implicitně na dnešek bez možnosti volby,
  - u stavu `paid` není v pokročilých funkcích možnost změnit datum úhrady.
- Cílový stav:
  - po kliknutí na `Označit jako uhrazené` se zobrazí datumové pole (default dnes) a potvrzení akce,
  - v pokročilých funkcích je pro `paid` dostupná změna data úhrady,
  - backend akceptuje aktualizaci data úhrady i pro již uhrazenou fakturu.

## 3. Scope změny
- Dotčené obrazovky/routy:
  - `/invoices/:invoiceId` (detail faktury)
- Dotčené API:
  - `POST /invoices/:id/mark-paid` (rozšíření chování, bez změny kontraktu)
- Dotčené služby:
  - `apps/api/src/invoice/invoice.service.ts`
  - `apps/web/src/pages/InvoiceDetailPage.tsx`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - doplnit krok potvrzení data při akci `Označit jako uhrazené`,
  - doplnit pokročilou akci `Změnit datum úhrady`.
- Technická specifikace:
  - upřesnit, že `mark-paid` při `status=paid` může aktualizovat `paid_at` při poslaném datu.

## 5. Akceptační kritéria
1. U `issued/overdue` faktury se po kliknutí na `Označit jako uhrazené` zobrazí datumové pole s výchozí hodnotou dnešního dne.
2. Potvrzením akce se faktura přepne do stavu `paid` s vybraným datem.
3. U `paid` faktury lze v pokročilých funkcích změnit datum úhrady.
4. Pokud není při změně data poslána hodnota, backend nepřepisuje existující datum úhrady u `paid` faktury.

## 6. Rizika a poznámky
- Riziko: nechtěné přepsání data úhrady při opakovaném volání `mark-paid`.
- Mitigace: u `status=paid` měnit `paid_at` pouze při explicitně zadaném datu.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0042)`
- Test plan:
  - `pnpm --filter @tappyfaktur/api test -- src/invoice/invoice.service.spec.ts`
  - `pnpm --filter @tappyfaktur/api build`
  - `pnpm --filter @tappyfaktur/web build`
- Výsledek:
  - Implementováno.
