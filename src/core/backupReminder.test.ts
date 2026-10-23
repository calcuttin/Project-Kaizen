import { expect, it } from 'vitest';
import { BACKUP_INTERVAL_MS, backupReminderDue } from './backupReminder';
it('reminds for missing/old backups and respects a one-week dismissal', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  expect(backupReminderDue(null, null, now)).toBe(true);
  expect(backupReminderDue('invalid', null, now)).toBe(true);
  expect(backupReminderDue(new Date(now - BACKUP_INTERVAL_MS + 1).toISOString(), null, now)).toBe(false);
  expect(backupReminderDue(new Date(now - BACKUP_INTERVAL_MS).toISOString(), null, now)).toBe(true);
  expect(backupReminderDue(null, new Date(now + 1).toISOString(), now)).toBe(false);
  expect(backupReminderDue(null, new Date(now).toISOString(), now)).toBe(true);
});
