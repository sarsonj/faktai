import { Prisma } from '@prisma/client';

/**
 * Rok ze sloupce DateTime v SQLite (CR-0061). Prisma ukládá DateTime jako
 * milisekundy od epochy (INTEGER); pro jistotu zvládneme i textový ISO zápis.
 * `column` je vždy konstanta z kódu, nikdy vstup uživatele.
 */
export function sqliteYearOf(column: string): Prisma.Sql {
  const ref = `"${column}"`;
  return Prisma.raw(
    `CAST(CASE typeof(${ref}) WHEN 'integer' THEN strftime('%Y', ${ref} / 1000, 'unixepoch') ELSE strftime('%Y', ${ref}) END AS INTEGER)`,
  );
}
