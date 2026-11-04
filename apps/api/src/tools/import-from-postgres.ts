/**
 * Jednorázový převod dat z PostgreSQL do SQLite (CR-0061).
 *
 * Spuštění: `IMPORT_FROM_POSTGRES_URL=postgresql://… node dist/tools/import-from-postgres.js`
 * (v kontejneru ho spouští `start-with-migrations.sh`, pokud je proměnná nastavená).
 *
 * Postup:
 * 1. Cílová SQLite databáze musí být prázdná (bez uživatelů) – jinak import nic nedělá,
 *    takže proměnnou lze nechat nastavenou i pro další restarty.
 * 2. Zdrojová databáze se nejdřív dorovná historickými migracemi pro PostgreSQL
 *    (`prisma/postgres-legacy`), aby odpovídala aktuálnímu schématu – včetně datových migrací.
 * 3. Všechny tabulky se zkopírují v jedné transakci; před potvrzením se porovnají
 *    počty řádků a součty částek. Při neshodě se nic neuloží a skript skončí chybou.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Client, types } from 'pg';

/** Pořadí tabulek respektuje cizí klíče. */
export const IMPORT_ORDER = [
  'User',
  'Subject',
  'UserSession',
  'PasswordResetToken',
  'ApiKey',
  'IdempotencyRecord',
  'Invoice',
  'InvoiceItem',
  'InvoiceNumberSequence',
  'PdfExportMetadata',
  'TaxReportRun',
  'TaxReportRunEntry',
  'ReceivedDocument',
  'ReceivedDocumentLine',
  'ReceivedDocumentAttachment',
] as const;

/** Částky, jejichž součty se po převodu kontrolují. */
const MONEY_CHECKS: Array<{ model: string; field: string }> = [
  { model: 'Invoice', field: 'totalWithVat' },
  { model: 'Invoice', field: 'totalVat' },
  { model: 'InvoiceItem', field: 'lineTotalWithVat' },
  { model: 'ReceivedDocument', field: 'totalPayable' },
  { model: 'ReceivedDocument', field: 'totalVat' },
  { model: 'ReceivedDocumentLine', field: 'vat' },
];

const BATCH_SIZE = 200;

type Row = Record<string, unknown>;
type ModelMeta = { name: string; fields: Prisma.DMMF.Field[] };

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function modelsInImportOrder(): ModelMeta[] {
  const models = Prisma.dmmf.datamodel.models;
  const known = new Set<string>(IMPORT_ORDER);
  const missing = models.filter((model) => !known.has(model.name));
  if (missing.length > 0) {
    throw new Error(
      `Import nezná tabulky: ${missing.map((m) => m.name).join(', ')} – doplňte je do IMPORT_ORDER.`,
    );
  }
  return IMPORT_ORDER.map((name) => {
    const model = models.find((candidate) => candidate.name === name);
    if (!model) throw new Error(`Tabulka ${name} ve schématu není.`);
    return {
      name,
      fields: model.fields.filter(
        (field) => field.kind === 'scalar' || field.kind === 'enum',
      ),
    };
  });
}

/** Převod řádku z PostgreSQL na data pro Prisma (jen sloupce ze schématu). */
export function toPrismaRow(row: Row, fields: Prisma.DMMF.Field[]): Row {
  const data: Row = {};
  for (const field of fields) {
    const value = row[field.name];
    if (value === undefined) {
      throw new Error(`Ve zdrojové tabulce chybí sloupec ${field.name}.`);
    }
    if (value === null) {
      data[field.name] = field.type === 'Json' ? Prisma.DbNull : null;
    } else if (field.type === 'Decimal') {
      data[field.name] = new Prisma.Decimal(value as Prisma.Decimal.Value);
    } else {
      data[field.name] = value;
    }
  }
  return data;
}

function moneySum(rows: Row[], field: string): string {
  return rows
    .reduce(
      (sum, row) =>
        row[field] === null || row[field] === undefined
          ? sum
          : sum.add(row[field] as Decimal.Value),
      new Decimal(0),
    )
    .toFixed(2);
}

export type ImportReport = {
  skipped: boolean;
  counts: Record<string, number>;
  sums: Record<string, string>;
};

/**
 * Zkopíruje data ze zdroje do cíle. Zdroj musí mít aktuální schéma
 * (viz `upgradeLegacySchema`).
 */
export async function importData(
  source: Client,
  target: PrismaClient,
  log: (message: string) => void = console.log,
): Promise<ImportReport> {
  const existingUsers = await target.user.count();
  if (existingUsers > 0) {
    log(
      `[import] Cílová databáze už obsahuje data (${existingUsers} uživatelů) – import se přeskakuje.`,
    );
    return { skipped: true, counts: {}, sums: {} };
  }

  const models = modelsInImportOrder();
  const sourceRows = new Map<string, Row[]>();
  for (const model of models) {
    const result = await source.query<Row>(`SELECT * FROM "${model.name}"`);
    sourceRows.set(model.name, result.rows);
  }

  const counts: Record<string, number> = {};
  const sums: Record<string, string> = {};
  await target.$transaction(
    async (tx) => {
      for (const model of models) {
        const rows = sourceRows.get(model.name) ?? [];
        const delegate = (
          tx as unknown as Record<
            string,
            { createMany: (args: { data: Row[] }) => Promise<unknown> }
          >
        )[delegateName(model.name)];
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await delegate.createMany({
            data: rows
              .slice(i, i + BATCH_SIZE)
              .map((row) => toPrismaRow(row, model.fields)),
          });
        }
        counts[model.name] = rows.length;
      }

      // Kontrola: počty řádků a součty částek musí sedět.
      const problems: string[] = [];
      for (const model of models) {
        const delegate = (
          tx as unknown as Record<string, { count: () => Promise<number> }>
        )[delegateName(model.name)];
        const copied = await delegate.count();
        if (copied !== counts[model.name]) {
          problems.push(
            `${model.name}: zdroj ${counts[model.name]}, cíl ${copied} řádků`,
          );
        }
      }
      for (const check of MONEY_CHECKS) {
        const key = `${check.model}.${check.field}`;
        const expected = moneySum(
          sourceRows.get(check.model) ?? [],
          check.field,
        );
        const delegate = (
          tx as unknown as Record<
            string,
            { findMany: (args: unknown) => Promise<Row[]> }
          >
        )[delegateName(check.model)];
        const copiedRows = await delegate.findMany({
          select: { [check.field]: true },
        });
        const actual = moneySum(copiedRows, check.field);
        sums[key] = actual;
        if (actual !== expected) {
          problems.push(`${key}: zdroj ${expected}, cíl ${actual}`);
        }
      }
      if (problems.length > 0) {
        throw new Error(
          `Kontrola převodu selhala, nic se neuložilo:\n- ${problems.join('\n- ')}`,
        );
      }
    },
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 },
  );

  for (const model of models) {
    log(`[import] ${model.name}: ${counts[model.name]}`);
  }
  for (const [key, value] of Object.entries(sums)) {
    log(`[import] součet ${key}: ${value}`);
  }
  return { skipped: false, counts, sums };
}

/**
 * Dorovná zdrojovou PostgreSQL databázi historickými migracemi
 * (`prisma/postgres-legacy`). Mění zdrojovou databázi – před importem ji zálohujte.
 */
export function upgradeLegacySchema(sourceUrl: string, apiRoot: string): void {
  const prismaCli = require.resolve('prisma/build/index.js', {
    paths: [apiRoot],
  });
  execFileSync(
    process.execPath,
    [
      prismaCli,
      'migrate',
      'deploy',
      '--schema',
      join(apiRoot, 'prisma', 'postgres-legacy', 'schema.prisma'),
    ],
    {
      cwd: apiRoot,
      stdio: 'inherit',
      env: { ...process.env, LEGACY_POSTGRES_URL: sourceUrl },
    },
  );
}

async function main(): Promise<void> {
  const sourceUrl = process.env.IMPORT_FROM_POSTGRES_URL;
  if (!sourceUrl) {
    throw new Error(
      'Nastavte IMPORT_FROM_POSTGRES_URL (adresa staré PostgreSQL databáze).',
    );
  }
  // PostgreSQL `timestamp` bez zóny = UTC (tak ho ukládá Prisma); bez tohoto
  // by ho node-postgres četl v lokální časové zóně procesu.
  types.setTypeParser(1114, (value) => new Date(`${value.replace(' ', 'T')}Z`));

  const apiRoot = join(__dirname, '..', '..');
  const target = new PrismaClient();
  try {
    if ((await target.user.count()) > 0) {
      console.log(
        '[import] Cílová databáze už obsahuje data – import se přeskakuje.',
      );
      return;
    }
    console.log('[import] Dorovnávám schéma zdrojové PostgreSQL databáze…');
    upgradeLegacySchema(sourceUrl, apiRoot);
    const source = new Client({ connectionString: sourceUrl });
    await source.connect();
    try {
      console.log('[import] Kopíruji data…');
      const report = await importData(source, target);
      if (!report.skipped)
        console.log('[import] Hotovo, kontrola počtů a součtů prošla.');
    } finally {
      await source.end();
    }
  } finally {
    await target.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      `[import] Chyba: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
