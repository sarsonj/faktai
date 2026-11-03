import { NotFoundException } from '@nestjs/common';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AttachmentStorageService } from './attachment-storage.service';

describe('AttachmentStorageService', () => {
  let dir: string;
  let storage: AttachmentStorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'faktai-attachments-'));
    storage = new AttachmentStorageService({ get: () => dir } as any);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('saves, reads and removes a file', async () => {
    const key = await storage.save(Buffer.from('%PDF-1.4 test'));
    const stream = await storage.open(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('%PDF-1.4 test');
    await storage.remove(key);
    expect(await readdir(dir)).toEqual([]);
  });

  it('rejects keys that could escape the storage directory', async () => {
    await expect(storage.open('../../etc/passwd')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
