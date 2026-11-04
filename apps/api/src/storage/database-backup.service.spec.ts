import { backupDateStamp, backupsToPrune } from './database-backup.service';

describe('database backup helpers', () => {
  it('stamps backups by the Prague calendar day', () => {
    expect(backupDateStamp(new Date('2026-11-04T22:30:00Z'))).toBe(
      '2026-11-04',
    );
    expect(backupDateStamp(new Date('2026-11-04T23:30:00Z'))).toBe(
      '2026-11-05',
    );
  });

  it('keeps the newest backups and ignores other files', () => {
    const files = [
      'faktai-2026-11-01.db',
      'faktai-2026-11-03.db',
      'faktai-2026-11-02.db',
      'faktai-2026-11-04.db.tmp',
      'notes.txt',
    ];
    expect(backupsToPrune(files, 2)).toEqual(['faktai-2026-11-01.db']);
  });
});
