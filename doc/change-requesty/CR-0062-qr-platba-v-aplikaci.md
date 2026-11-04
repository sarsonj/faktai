# CR-0062 - Zobrazení QR platby vystavené faktury v aplikaci

## 0. Metadata
- ID: `CR-0062`
- Datum: `2026-11-04`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
- Vlastník často platí vystavené faktury sám sobě (z jiného účtu). Dosud musel kvůli QR kódu stahovat a otevírat PDF.

## 2. Cílový stav
- **Tlačítko `QR platba`:**
  - v detailu vystavené faktury (`issued|overdue|paid`),
  - v menu řádku seznamu faktur (jen neuhrazené).
- **Dialog s QR kódem:** stejný SPD obsah jako v PDF.
- **Údaje s kopírováním:** částka, účet, IBAN, VS; vedle nich splatnost.
- **Tlačítko `Zaplaceno dnes`:** označí fakturu jako uhrazenou k dnešnímu datu.
- **API pro skripty:** `GET /invoices/:id/payment-qr` (JSON včetně `spdPayload` a SVG).

## 3. Rozsah změn
- **API:**
  - `invoice/payment/payment-qr.ts` – `invoicePayment()`, sdílené pro PDF i nové API,
  - `InvoiceService.getPaymentQr`,
  - endpoint `GET /invoices/:id/payment-qr`.
- **Web:**
  - `features/invoice-payment/PaymentQrDialog.tsx`,
  - napojení v `InvoiceDetailPage` a `InvoicesPage`,
  - `getInvoicePaymentQr` v `invoice-api.ts`.
- **Dokumentace:** funkční specifikace 4.5, technická specifikace 5.4.

## 4. Test plan
- **Jednotkové testy:**
  - IBAN podle vzoru ČNB (`19-2000145399/0800` → `CZ6508000000192000145399`),
  - SPD payload a formát účtu,
  - `getPaymentQr` pro vystavenou a uhrazenou fakturu,
  - `getPaymentQr` u konceptu vrací 409.
- **Ruční test v prohlížeči na kopii ostrých dat:**
  - dialog z detailu i ze seznamu,
  - `Zaplaceno dnes` změní stav na Uhrazená,
  - QR kód přečtený ze snímku obrazovky (`zbarimg`) obsahuje správný IBAN, částku a VS.
