/**
 * Fulltextové hledání v seznamech (CR-0061).
 *
 * SQLite `LIKE` porovnává bez ohledu na velikost písmen jen ASCII, takže
 * „Č“ ≠ „č“. Hledání proto řešíme v aplikaci: text normalizujeme (malá
 * písmena, bez diakritiky) a porovnáváme podřetězec. Hledá se tak i bez
 * háčků a čárek („cesky“ najde „Český“).
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Obsahuje některé z polí hledaný výraz? Prázdný výraz odpovídá všemu. */
export function matchesSearch(
  fields: Array<string | null | undefined>,
  query: string,
): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return fields.some(
    (field) => !!field && normalizeSearchText(field).includes(needle),
  );
}
