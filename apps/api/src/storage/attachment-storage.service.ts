import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/** Povolené typy příloh (PDF a obrázky). */
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
]);

/** Max. velikost přílohy (15 MB). */
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

/**
 * Úložiště příloh na disku (CR-0060). V produkci je `ATTACHMENTS_DIR`
 * perzistentní volume (CapRover „Persistent Directories“), lokálně `./storage/attachments`.
 * Soubory se ukládají pod náhodným klíčem bez přípony – název a typ jsou v DB.
 */
@Injectable()
export class AttachmentStorageService {
  private readonly logger = new Logger(AttachmentStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(
      config.get<string>('ATTACHMENTS_DIR') ??
        join(process.cwd(), 'storage', 'attachments'),
    );
  }

  private pathFor(storageKey: string): string {
    if (!/^[0-9a-f-]{36}$/.test(storageKey)) {
      throw new NotFoundException('Příloha nebyla nalezena.');
    }
    return join(this.root, storageKey);
  }

  async save(content: Buffer): Promise<string> {
    await mkdir(this.root, { recursive: true });
    const storageKey = randomUUID();
    await writeFile(this.pathFor(storageKey), content, { flag: 'wx' });
    return storageKey;
  }

  async open(storageKey: string): Promise<ReadStream> {
    const path = this.pathFor(storageKey);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Soubor přílohy chybí v úložišti.');
    }
    return createReadStream(path);
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await rm(this.pathFor(storageKey), { force: true });
    } catch (error) {
      // Smazání záznamu nesmí selhat kvůli chybějícímu souboru; jen zalogujeme.
      this.logger.warn(
        `Nepodařilo se smazat přílohu ${storageKey}: ${String(error)}`,
      );
    }
  }
}
