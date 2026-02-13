# TappyFaktur Release Candidate 0.1.0-rc1

Datum: 2026-02-13

## Funkční rozsah
- Auth lifecycle: registrace, login, logout, reset hesla, session cookie.
- Onboarding a správa subjektu.
- Seznam vydaných faktur: filtry, hledání, stránkování, řádkové akce.
- Editor faktury: create/edit/copy, issue, mark-paid, delete draft.
- PDF export faktury se SPD QR a verzováním `pdfVersion`.
- DPH podklady: preview, XML export, historie běhů a verzování `runVersion`.

## Provoz a hardening
- Docker stack: `db`, `api`, `web`.
- API security headers (`helmet`).
- Rate limiting (globální + přísnější auth throttling).
- Request ID middleware + JSON access logy.
- Konsolidované JSON chybové odpovědi přes globální exception filter.

## Ověření RC
- `pnpm build` zelené.
- `pnpm test` zelené.
- `pnpm --filter @tappyfaktur/api test:e2e` zelené.
- Docker smoke:
  - create -> issue -> paid -> copy -> delete draft.
  - PDF export `draft=409`, `issued=200`, verzování `1 -> 1 -> 2`.
  - DPH export `runVersion` stabilní při stejném datasetu, inkrement po změně (`1 -> 1 -> 2`).

## Otevřená rizika
- XML validace je v RC realizovaná jako well-formed validace + whitelist verzí, bez napojení na externí XSD soubory finanční správy.
- FE automatické testy zatím nejsou implementované (zatím pouze backend testy + manuální smoke).
