import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const BACKUP_PREFIX = 'faktai-';
const BACKUP_SUFFIX = '.db';
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Datum zálohy podle pražského kalendáře (YYYY-MM-DD). */
export function backupDateStamp(now: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Názvy záloh ke smazání – ponecháme `keep` nejnovějších. */
export function backupsToPrune(fileNames: string[], keep: number): string[] {
  return fileNames
    .filter(
      (name) => name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX),
    )
    .sort()
    .reverse()
    .slice(keep);
}

/**
 * Denní zálohy SQLite databáze (CR-0061).
 *
 * Soubor databáze se nesmí kopírovat za běhu (WAL), proto zálohu dělá aplikace
 * příkazem `VACUUM INTO` – vznikne konzistentní samostatný soubor
 * `BACKUP_DIR/faktai-YYYY-MM-DD.db`. Kontrola běží při startu a pak každou hodinu,
 * nová záloha vznikne jednou denně, ponechá se `BACKUP_KEEP` posledních (výchozí 14).
 * Bez `BACKUP_DIR` jsou zálohy vypnuté (lokální vývoj).
 */
@Injectable()
export class DatabaseBackupService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly dir: string | null;
  private readonly keep: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const dir = config.get<string>('BACKUP_DIR');
    this.dir = dir ? resolve(dir) : null;
    const keep = Number(config.get<string>('BACKUP_KEEP') ?? 14);
    this.keep = Number.isInteger(keep) && keep > 0 ? keep : 14;
  }

  onApplicationBootstrap(): void {
    if (!this.dir) {
      this.logger.log(
        'Zálohy databáze jsou vypnuté (BACKUP_DIR není nastaven).',
      );
      return;
    }
    void this.runIfDue();
    this.timer = setInterval(() => void this.runIfDue(), CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Vytvoří dnešní zálohu, pokud ještě neexistuje. Vrací cestu nové zálohy. */
  async runIfDue(now = new Date()): Promise<string | null> {
    if (!this.dir || this.running) return null;
    this.running = true;
    try {
      await mkdir(this.dir, { recursive: true });
      const target = join(
        this.dir,
        `${BACKUP_PREFIX}${backupDateStamp(now)}${BACKUP_SUFFIX}`,
      );
      if (await exists(target)) return null;
      const tmp = `${target}.tmp`;
      await rm(tmp, { force: true });
      await this.prisma.$executeRawUnsafe(
        `VACUUM INTO '${tmp.replace(/'/g, "''")}'`,
      );
      await rename(tmp, target);
      for (const name of backupsToPrune(await readdir(this.dir), this.keep)) {
        await rm(join(this.dir, name), { force: true });
      }
      this.logger.log(`Záloha databáze: ${target}`);
      return target;
    } catch (error) {
      this.logger.error(
        `Záloha databáze selhala: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    } finally {
      this.running = false;
    }
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
