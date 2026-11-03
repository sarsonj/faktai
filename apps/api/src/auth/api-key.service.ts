import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Prefix API klíčů – podle něj guard pozná klíč v hlavičce Authorization. */
export const API_KEY_PREFIX = 'fai_';

/** `lastUsedAt` se zapisuje nejvýš jednou za minutu, ať nezatěžujeme DB. */
const LAST_USED_RESOLUTION_MS = 60_000;

export type ApiKeyStatus = {
  exists: boolean;
  prefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

/**
 * API klíč uživatele (CR-0058). Jeden klíč na uživatele s plným přístupem
 * jako přihlášený uživatel. V DB je jen SHA-256 hash; celý klíč se ukáže
 * jen jednou při vytvoření.
 */
@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  async getStatus(userId: string): Promise<ApiKeyStatus> {
    const key = await this.prisma.apiKey.findUnique({ where: { userId } });
    return {
      exists: Boolean(key),
      prefix: key?.prefix ?? null,
      createdAt: key?.createdAt.toISOString() ?? null,
      lastUsedAt: key?.lastUsedAt?.toISOString() ?? null,
    };
  }

  /** Vytvoří nový klíč; případný starý tím přestane platit. */
  async regenerate(userId: string): Promise<ApiKeyStatus & { key: string }> {
    const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
    const prefix = rawKey.slice(0, API_KEY_PREFIX.length + 6);
    const keyHash = this.hash(rawKey);

    const saved = await this.prisma.apiKey.upsert({
      where: { userId },
      create: { userId, keyHash, prefix },
      update: { keyHash, prefix, createdAt: new Date(), lastUsedAt: null },
    });

    return {
      key: rawKey,
      exists: true,
      prefix: saved.prefix,
      createdAt: saved.createdAt.toISOString(),
      lastUsedAt: null,
    };
  }

  async revoke(userId: string): Promise<void> {
    await this.prisma.apiKey.deleteMany({ where: { userId } });
  }

  /** Uživatel podle klíče z hlavičky; `null` = neplatný klíč nebo neaktivní účet. */
  async resolveUser(rawKey: string): Promise<User | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: this.hash(rawKey) },
      include: { user: true },
    });
    if (!key || !key.user.isActive) {
      return null;
    }

    const now = Date.now();
    if (
      !key.lastUsedAt ||
      now - key.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    ) {
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date(now) },
      });
    }

    return key.user;
  }
}
