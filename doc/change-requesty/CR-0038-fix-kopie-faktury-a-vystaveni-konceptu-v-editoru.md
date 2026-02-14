# CR-0038 - Fix kopie faktury a vystavení konceptu v editoru

## 0. Metadata
- ID: `CR-0038`
- Datum: `2026-02-14`
- Stav: `Implementováno`
- Priorita: `Must`
- Technický dopad: `T1`

## 1. Business kontext
- Kopie faktury se po kliknutí otevírala jako editace již vytvořené kopie, což neodpovídá očekávanému workflow nové faktury.
- V editaci konceptu chyběla možnost fakturu rovnou vystavit.

## 2. Aktuální vs. cílový stav
- Aktuální stav:
  - `Kopie` směřovala na editaci (`/invoices/:id/edit`) a nebyla k dispozici stejná zkušenost jako u nové faktury.
  - U konceptu v režimu edit bylo dostupné pouze tlačítko `Uložit`.
- Cílový stav:
  - `Kopie` otevírá stránku nové faktury (`/invoices/new`) s předvyplněnými daty z vybrané faktury.
  - V editaci konceptu jsou dostupné akce `Vystavit fakturu` i `Uložit`.

## 3. Scope změny
- Dotčené obrazovky/routy:
  - `/invoices/:invoiceId/copy`
  - `/invoices/new`
  - `/invoices/:invoiceId/edit`
- Dotčené FE soubory:
  - `apps/web/src/pages/InvoiceCopyPage.tsx`
  - `apps/web/src/pages/InvoiceEditorPage.tsx`
- Dotčené specifikace:
  - `doc/funkcni-specifikace.md`
  - `doc/change-requesty/README.md`

## 4. Návrh změn ve specifikaci
- Funkční specifikace:
  - upřesnit, že workflow `Kopie` otevírá stejný editor jako `Nová faktura`,
  - upřesnit dostupnost akce `Vystavit fakturu` při editaci konceptu.
- Technická specifikace:
  - beze změny API kontraktů.

## 5. Akceptační kritéria
1. Po kliknutí na `Kopie` se otevře stránka nové faktury s předvyplněnými údaji ze zdroje.
2. Na stránce nové faktury po kopii je dostupná pokročilá volba pro vlastní číslo dokladu.
3. V editaci faktury ve stavu `draft` jsou k dispozici akce `Vystavit fakturu` i `Uložit`.

## 6. Rizika a poznámky
- Riziko: nechtěné přenesení list context query parametrů do editoru.
- Mitigace: parametr `copyFrom` se při návratu na seznam odstraňuje z query.

## 7. Implementace a ověření
- Commit(y): `viz git historie (CR-0038)`
- Test plan:
  - `pnpm --filter @tappyfaktur/web build`
  - ručně: seznam/detail -> `Kopie` -> ověření nové faktury s prefill.
  - ručně: otevřít `draft` v editaci -> ověřit `Vystavit fakturu`.
- Výsledek:
  - implementováno dle zadání.
