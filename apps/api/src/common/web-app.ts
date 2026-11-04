import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Cesty, které patří API – nikdy je neobsluhuje frontend. */
export function isApiPath(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

/**
 * Servírování sestaveného webu z API (CR-0061): jedna aplikace, jedna adresa,
 * bez CORS. Statické soubory z `WEB_DIST_DIR`, ostatní GET požadavky mimo `/api`
 * dostanou `index.html` (klientský routing). Bez `WEB_DIST_DIR` (lokální vývoj
 * s Vite) se nic neregistruje.
 */
export function setupWebApp(
  app: NestExpressApplication,
  distDir: string | undefined,
): void {
  const logger = new Logger('WebApp');
  if (!distDir) return;
  const root = resolve(distDir);
  const indexFile = join(root, 'index.html');
  if (!existsSync(indexFile)) {
    logger.warn(
      `WEB_DIST_DIR=${root} neobsahuje index.html – web se neservíruje.`,
    );
    return;
  }

  app.useStaticAssets(root, {
    index: false,
    setHeaders: (res: Response, filePath: string) => {
      // Soubory z Vite mají hash v názvu – lze je cachovat napořád.
      if (filePath.includes(`${join(root, 'assets')}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      isApiPath(req.path)
    ) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  logger.log(`Web se servíruje z ${root}`);
}
