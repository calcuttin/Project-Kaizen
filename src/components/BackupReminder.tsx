import { useSyncExternalStore } from 'react';
import { useUI } from '@/app/uiStore';
import { config } from '@/core/config';
import { backupReminderDue } from '@/core/backupReminder';
import { downloadJson } from '@/core/diagnostics';
import { exportAll, registeredStores } from '@/core/store';
import { Button } from './ui';

function hasRecords() {
  return [...registeredStores().values()].some(store => Object.entries(store.getState()).some(([key, value]) => key !== 'goal' && value && typeof value === 'object' && Object.keys(value).length > 0));
}
function subscribe(update: () => void) {
  const stops = [...registeredStores().values()].map(store => store.subscribe(update));
  return () => stops.forEach(stop => stop());
}
export function BackupReminder() {
  const { lastBackupAt, backupReminderDismissedUntil, dismissBackupReminder, markBackup } = useUI();
  const populated = useSyncExternalStore(subscribe, hasRecords);
  if (config.mode !== 'device' || !populated || !backupReminderDue(lastBackupAt, backupReminderDismissedUntil)) return null;
  return <section className="backup-reminder" aria-label="Backup reminder"><div><strong>Keep a copy of your workspace</strong><p className="muted">{lastBackupAt ? 'Your last backup download was at least a week ago.' : 'You have not downloaded a backup in this browser yet.'} Keep the downloaded file outside browser storage. Sync is not a backup.</p></div><div className="row"><Button onClick={() => { downloadJson(exportAll(), `kaizen-backup-${new Date().toISOString().slice(0, 10)}.json`); markBackup(); }}>Back up now</Button><Button onClick={dismissBackupReminder}>Remind me in a week</Button></div></section>;
}
