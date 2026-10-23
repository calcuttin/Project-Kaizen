export const BACKUP_INTERVAL_MS = 7 * 86400000;
export function backupReminderDue(lastBackupAt: string | null, dismissedUntil: string | null, now = Date.now()): boolean {
  if (dismissedUntil && Date.parse(dismissedUntil) > now) return false;
  const last = lastBackupAt ? Date.parse(lastBackupAt) : NaN;
  return !Number.isFinite(last) || now - last >= BACKUP_INTERVAL_MS;
}
