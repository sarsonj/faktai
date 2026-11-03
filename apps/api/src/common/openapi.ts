import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_DOCS_PATH = 'api/docs';

/**
 * OpenAPI dokumentace (CR-0058): UI na `/api/docs`, JSON na `/api/docs-json`.
 * Schémata požadavků se odvozují z DTO tříd pluginem `@nestjs/swagger` (nest-cli.json).
 * Vypnout lze proměnnou `API_DOCS_ENABLED=0`.
 */
export function setupOpenApi(app: INestApplication): void {
  if (process.env.API_DOCS_ENABLED === '0') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('FaktAI API')
    .setDescription(
      [
        'REST API aplikace FaktAI. Stejné endpointy používá webová aplikace.',
        '',
        '**Autentizace:** hlavička `Authorization: Bearer fai_…` s API klíčem',
        '(vygenerujete v aplikaci v Nastavení → API klíč), nebo session cookie z webu.',
        '',
        '**Idempotence:** `POST /invoices` a `POST /invoices/{id}/copy` přijímají',
        'hlavičku `Idempotency-Key`. Opakovaný požadavek se stejným klíčem a tělem',
        'do 24 h vrátí původní odpověď a nevytvoří další doklad.',
        '',
        '**Datumy** dokladů jsou kalendářní dny (`YYYY-MM-DD`), **částky** se posílají',
        'jako řetězce s desetinnou tečkou (např. `"1250.50"`).',
      ].join('\n'),
    )
    .setVersion('1')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      description: 'API klíč fai_…',
    })
    .addCookieAuth('tf_session')
    .addSecurityRequirements('bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(API_DOCS_PATH, app, document, {
    jsonDocumentUrl: `${API_DOCS_PATH}-json`,
  });
}
