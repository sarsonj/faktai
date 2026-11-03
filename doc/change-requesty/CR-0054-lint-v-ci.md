# CR-0054 - Lint v CI a vyčištění lint chyb

## 0. Metadata
- ID: `CR-0054`
- Datum: `2026-11-03`
- Stav: `Implementováno`
- Priorita: `Should`
- Technický dopad: `T1`

## 1. Business kontext
- Code review při převzetí projektu: CI spouštělo jen build a testy. Lint hlásil v API 280 problémů a ve webu 2 chyby, takže nehlídal nic.
- Skript `pnpm lint` v API měl `--fix` a při spuštění tiše měnil soubory.
- CI instalovalo s `--frozen-lockfile=false` a lockfile tak nebyl závazný.

## 2. Cílový stav
- CI: `install --frozen-lockfile` → `build` → `typecheck` → `lint` → `test`.
- `pnpm lint` jen kontroluje; nový skript `lint:fix` v API.
- API i web jsou bez lint chyb.

## 3. Scope změny
- API:
  - Prettier formátování,
  - typované `@Transform` v DTO (`value: unknown`),
  - `getSessionToken()` místo přístupu k `request.cookies` typu `any`,
  - `NestExpressApplication` v `main.ts` a `void bootstrap()`,
  - synchronní `enableShutdownHooks`,
  - úpravy v `tax-offices.service`,
  - výjimky `no-unsafe-*` pro testy v `eslint.config.mjs`.
- Web:
  - hook `useAuth` přesunut do `auth/auth-context.ts` (pravidlo `react-refresh/only-export-components`),
  - `SiteHeader` zavírá menu při navigaci bez `setState` v efektu (stav otevření je vázaný na cestu).
- Dokumentace: `doc/tecnicka-specifikace.md` (1.4).
- Testy mapování XML na řádky přiznání a oddíly KH vznikly v CR-0053 (`tax-reports.mapping.spec.ts`, `fu-xsd-validator.spec.ts`).

## 4. Akceptační kritéria
1. `pnpm -r lint` projde bez chyb a nemění soubory.
2. CI selže při lint chybě nebo nesouladu s lockfile.
3. Chování aplikace se nemění: testy, typecheck a build projdou. Menu v hlavičce se po navigaci zavře.

## 5. Rizika a poznámky
- Formátovací změny se dotkly řady souborů. Jde čistě o whitespace a zalamování.
- Dockerfile dál instaluje s `--frozen-lockfile=false` a běží na Node 20, který je po konci podpory. Vyřešeno v CR-0056.

## 6. Implementace a ověření
- Commit(y): `chore: enforce lint in CI and fix lint errors`
- Test plan:
  - `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test` (57 testů), `pnpm -r build`, `pnpm install --frozen-lockfile`,
  - ruční ověření v prohlížeči (Playwright) proti dočasné PostgreSQL:
    - přihlášení,
    - nová faktura má výchozí dnešní datum,
    - režim přenesení zobrazí výběr kódu předmětu plnění a skryje DPH,
    - uživatelské menu se po navigaci zavře.
- Výsledek: vše prošlo.
