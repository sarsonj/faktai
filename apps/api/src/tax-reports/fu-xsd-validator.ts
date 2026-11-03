import { InternalServerErrorException } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateXML } from 'xmllint-wasm';

export type FuXmlDocument = 'DP3' | 'KH1';

const XSD_FILES: Record<FuXmlDocument, string> = {
  DP3: 'dphdp3_epo2.xsd.xml',
  KH1: 'dphkh1_epo2.xsd.xml',
};

const schemaCache = new Map<FuXmlDocument, string>();

function loadSchema(document: FuXmlDocument): string {
  const cached = schemaCache.get(document);
  if (cached) {
    return cached;
  }

  const candidates = [
    join(__dirname, '../../assets/xsd'),
    join(process.cwd(), 'assets/xsd'),
    join(process.cwd(), 'apps/api/assets/xsd'),
  ];
  for (const base of candidates) {
    const path = join(base, XSD_FILES[document]);
    if (existsSync(path)) {
      const contents = readFileSync(path, 'utf8');
      schemaCache.set(document, contents);
      return contents;
    }
  }

  throw new InternalServerErrorException(
    `XSD schéma pro ${document} nebylo nalezeno.`,
  );
}

/**
 * Validuje XML podání proti XSD Finanční správy (EPO).
 * Vrací seznam chyb; prázdné pole = validní.
 */
export async function validateFuXml(
  xml: string,
  document: FuXmlDocument,
): Promise<string[]> {
  const result = await validateXML({
    xml: { fileName: `${document}.xml`, contents: xml },
    schema: { fileName: XSD_FILES[document], contents: loadSchema(document) },
  });
  return result.valid ? [] : result.errors.map((error) => error.message);
}
