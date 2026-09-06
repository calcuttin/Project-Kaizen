import { downloadJson, supportReport } from '@/core/diagnostics';
import { saveStatus } from '@/core/sync/saveStatus';
import { currentWorkspaceOwner, workspaceAvailable } from '@/core/storage';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Cloud, Download, LogOut, Moon, RefreshCw, Sparkles, Sun, Trash2, Upload } from 'lucide-react';
import { Button, Card, Modal, PageHead } from '@/components/ui';
import { useUI } from '@/app/uiStore';
import { exportAll, importAll, inspectBackup, resetAll } from '@/core/store';
import { toast } from '@/components/Toast';
import { seedSampleData } from './seed';
import { useAuth } from '@/core/auth/AuthProvider';
import { UserButton } from '@clerk/react';
import { config } from '@/core/config';
import { queueSyncOperation, readConflicts, removeConflict } from '@/core/sync/outbox';
import { applyRemoteChanges } from '@/core/sync/storeBridge';
import { startCloudSync, stopCloudSync, syncNow, useSyncStatus } from '@/core/sync/engine';
import { useImports } from '@/core/imports/store';
import { getSupabaseClient } from '@/core/supabase';
import type { SyncConflict } from '@/core/sync/types';
import { planConflictResolution } from '@/core/sync/conflicts';

export function SettingsPage() {
  const { theme, toggleTheme, externalBookCovers, setExternalBookCovers } = useUI();
  const lastBackupAt = useUI((state) => state.lastBackupAt);
  const auth = useAuth();
  const sync = useSyncStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<{ payload: unknown; summary: ReturnType<typeof inspectBackup> } | null>(null);
  const [backupError, setBackupError] = useState('');
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const importRuns = useImports((state) => state.runs);
  useEffect(() => { void readConflicts().then(setConflicts); }, [auth.user?.id, sync.lastSyncedAt]);
  const doExport = () => {
    downloadJson(exportAll(), `kaizen-backup-${new Date().toISOString().slice(0, 10)}.json`);
    useUI.getState().markBackup();
    toast('Backup download started');
  };
  const doImport = async (file: File) => {
    const owner = currentWorkspaceOwner();
    setBackupError(''); setBackup(null);
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('This backup exceeds the 50 MB import limit.');
      const payload: unknown = JSON.parse(await file.text());
      if (!workspaceAvailable() || owner !== currentWorkspaceOwner()) return;
      setBackup({ payload, summary: inspectBackup(payload) });
    } catch (error) { setBackupError(error instanceof SyntaxError ? 'This file is not valid JSON. Choose a Kaizen backup.' : error instanceof Error ? error.message : 'Unable to read this backup.'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const deleteAccount = async () => {
    if (!confirm('Permanently delete your cloud account and synced data? Download a backup first if you want to keep it.')) return;
    stopCloudSync();
    const { error } = await getSupabaseClient()!.functions.invoke('delete-account');
    if (error) { startCloudSync(); toast(`Account deletion failed: ${error.message}`); return; }
    resetAll();
  };
  const resolveConflict = async (conflict: SyncConflict, choice: 'local' | 'remote') => {
    const resolution = planConflictResolution(conflict, choice);
    if (resolution.kind === 'push') await queueSyncOperation(resolution.mutation);
    else applyRemoteChanges([resolution.change]);
    await removeConflict(conflict.id);
    const remaining = await readConflicts();
    setConflicts(remaining);
    useSyncStatus.setState({ conflicts: remaining.length });
    if (!remaining.length) setShowConflicts(false);
    if (choice === 'local') await syncNow();
  };

  return (
    <div className="page">
      <PageHead eyebrow="Settings" title="Your Kaizen" lead={config.mode === 'cloud' ? 'Your account has a separate workspace that synchronizes across your devices.' : "Everything lives on this device, in your browser's storage. Export regularly; import anywhere."} />
      <div className="grid cols-2">
        <Card title="Account & saving" icon={Cloud}>
          <div className="stack" style={{ gap: 11 }}>
            <div className="between"><span className="muted">Mode</span><span className="chip accent">{config.mode === 'cloud' ? 'Cloud workspace' : 'Device only'}</span></div>
            {config.mode === 'device' ? <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>No account is required. To use your workspace across devices, follow the cloud setup guide in Help & guides below.</p> : <>
              <div className="between"><span className="muted">Signed in as</span><span className="row" style={{ gap: 8 }}><strong style={{ fontSize: 12.5 }}>{auth.user?.email}</strong><UserButton /></span></div>
              <div className="between"><span className="muted" role="status">{saveStatus(sync)}</span><Button size="sm" icon={RefreshCw} onClick={() => void syncNow()} disabled={sync.status === 'syncing' || sync.localError}>{sync.status === 'syncing' ? 'Saving…' : 'Save now'}</Button></div>
              {(sync.error || sync.localError) && <p style={{ color: 'var(--danger)', fontSize: 11, margin: 0 }}>{sync.localError ? 'Browser storage could not save a change. Download a backup now before reloading or signing out.' : 'Cloud saving failed. Your changes are waiting on this device. Check your connection and try Save now.'}</p>}
              {conflicts.length > 0 && <div className="between"><span className="muted">Conflict inbox</span><Button size="sm" variant="danger" onClick={() => setShowConflicts(true)}>{conflicts.length} need review</Button></div>}
              <p className="muted" style={{ fontSize: 12.5 }}>This account has its own workspace on this browser. New records sync only to this account.</p>
              <Button size="sm" variant="ghost" icon={LogOut} onClick={() => void auth.signOut()}>Sign out</Button>
            </>}
          </div>
        </Card>
        <Card title="Import history">
          <div className="stack" style={{ gap: 9 }}>
            {!importRuns.length ? <p className="muted" style={{ fontSize: 12.5 }}>CSV and Kindle imports will appear here.</p> : importRuns.slice(0, 5).map((run) => <div className="between" key={run.id}><span style={{ fontSize: 12 }}><b>{run.adapter === 'kindle' ? 'Kindle clippings' : 'Books CSV'}</b><small className="muted" style={{ display: 'block' }}>{run.fileName} · {new Date(run.createdAt).toLocaleDateString()}</small></span><span className={`chip ${run.undoneAt ? '' : 'success'}`}>{run.undoneAt ? 'Undone' : `${run.created} added`}</span></div>)}
          </div>
        </Card>
        <Card title="Appearance">
          <div className="between">
            <span className="muted">Theme</span>
            <Button icon={theme === 'dark' ? Sun : Moon} onClick={toggleTheme}>{theme === 'dark' ? 'Switch to light' : 'Switch to dark'}</Button>
          </div>
        </Card>
        <Card title="Getting started"><p className="muted">Reopen the first-steps checklist on Today whenever you need it.</p><Button onClick={() => { useUI.getState().setGettingStarted(true); toast('Checklist is ready on Today'); }}>Show checklist on Today</Button></Card>
        <Card title="Data">
          <div className="stack" style={{ gap: 10 }}>
            <div className="between"><span className="muted">Export a JSON backup</span><Button icon={Download} onClick={doExport}>Export</Button></div>
            <div className="between"><span className="muted">Restore from a backup</span><Button icon={Upload} onClick={() => fileRef.current?.click()}>Import</Button>
              <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} /></div>
            {backupError && <p role="alert" style={{ color: 'var(--danger)' }}>{backupError}</p>}
            <p className="muted">{lastBackupAt ? `Last backup download started: ${new Date(lastBackupAt).toLocaleString()}` : 'No backup downloaded in this browser yet.'} Keep a copy outside your browser.</p>
            {config.enableBundledImports && <div className="between"><span className="muted">Re-apply developer bundled imports</span><Button icon={RefreshCw} onClick={() => { void import('@/app/imports').then(({ reimportAll }) => { const r = reimportAll(); toast(`Added ${r.books} books, ${r.items} items`); }); }}>Re-import</Button></div>}
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Kaizen opens your saved workspace automatically. Sample data is optional and adds example records to your workspace.</p>
            <div className="between"><span className="muted">Add sample data to explore</span><Button icon={Sparkles} onClick={() => { seedSampleData(); toast('Sample data loaded'); }}>Load samples</Button></div>
            <div className="between"><span className="muted" style={{ color: 'var(--danger)' }}>Erase this workspace on this device</span><Button variant="danger" icon={Trash2} onClick={() => { if (confirm(config.mode === 'cloud' ? 'Erase the local cache and pending changes for this workspace? Cloud records will download again. Export first if you want a copy.' : 'Erase all Kaizen data on this device? Export first if you want a copy.')) { stopCloudSync(); resetAll(); } }}>Reset</Button></div>
          </div>
        </Card>
        <Card title="Privacy">
          <div className="stack" style={{ gap: 10 }}>
            <div className="between"><span className="muted">Online book covers</span><Button onClick={() => setExternalBookCovers(!externalBookCovers)}>{externalBookCovers ? 'Turn off online covers' : 'Enable online covers'}</Button></div>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Optional. Looking up covers sends book titles, authors, or ISBNs to Open Library. Loading remote images also shares your IP address with the image provider. Manual ISBN lookups contact Open Library when you request them.</p>
          </div>
        </Card>
        <Card title="Help & guides" icon={BookOpen}>
          <div className="stack" style={{ gap: 12 }}>
            <p className="muted">Get started, protect your data, or set up your own Kaizen. Guides open in a new tab.</p>
            <Button icon={Download} onClick={() => downloadJson(supportReport(), 'kaizen-support-report.json')}>Download support report</Button>
            <small className="muted">Contains save status and counts only. No task text, book details, account IDs, or tokens. Nothing is sent automatically.</small>
            {[
              ['using-kaizen', 'Using Kaizen', 'Your first steps, imports, backups, and sync.'],
              ['setup', 'Choose a setup', 'Compare using a website, local mode, and your own cloud.'],
              ['local', 'Local setup', 'Run on your computer with no account required.'],
              ['cloud', 'Cloud setup', 'Host your own site with private account workspaces.'],
            ].map(([slug, label, description]) => <div key={slug} className="stack" style={{ gap: 4 }}>
              <a className="btn" style={{ alignSelf: 'flex-start' }} href={`/guides/${slug}.html`} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (opens in a new tab)</span></a>
              <small className="muted">{description}</small>
            </div>)}
          </div>
        </Card>
        <Card title="About" className="span-2">
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            <b style={{ color: 'var(--text)' }}>Kaizen</b> (改善) means continuous improvement through small, steady steps. This app is built around one idea: your life areas —
            tasks, health, reading, and what you listen to — deserve one calm place, and the daily question “what's one small improvement?” beats any grand plan.
            Project Kaizen is a placeholder name. Other companies and projects use similar names in other fields; we plan to differentiate the name or choose another before a broader launch.
          </p>
        </Card>
        {config.mode === 'cloud' && <Card title="Danger zone" className="span-2"><div className="between"><span className="muted">Permanently delete your cloud account and all synced data</span><Button variant="danger" icon={Trash2} onClick={() => void deleteAccount()}>Delete account</Button></div></Card>}
      </div>
      <Modal open={Boolean(backup)} onClose={() => setBackup(null)} title="Review backup restore">
        <p>This replaces the collections listed below with the backup contents. Records currently in those collections but absent from the backup will be removed. Other collections stay as they are.{config.mode === 'cloud' ? ' Restored changes will also be saved to your cloud account.' : ''}</p>
        <p>Download a current backup first so you can undo this restore.</p>
        <ul>{backup?.summary.map((area) => <li key={area.name}><strong>{area.name}</strong>: {area.collections.map((item) => `${item.count} ${item.name}`).join(', ') || 'preferences only'}</li>)}</ul>
        <div className="form-actions"><Button onClick={doExport}>Download current backup</Button><Button variant="ghost" onClick={() => setBackup(null)}>Cancel</Button><Button variant="primary" onClick={() => { try { importAll(backup?.payload); setBackup(null); toast('Backup restored'); } catch (error) { setBackup(null); setBackupError(error instanceof Error ? error.message : 'Restore failed'); } }}>Restore backup</Button></div>
      </Modal>
      <Modal open={showConflicts} onClose={() => setShowConflicts(false)} title="Conflict inbox"><div className="stack" style={{ gap: 12 }}>{conflicts.map((conflict) => <div key={conflict.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}><div className="between"><strong style={{ fontSize: 13 }}>{conflict.entityType} · {conflict.entityId}</strong><span className="muted" style={{ fontSize: 10 }}>{new Date(conflict.detectedAt).toLocaleString()}</span></div><p className="muted" style={{ fontSize: 11, margin: '8px 0' }}>This item changed on two devices. Choose which complete version to keep.</p><details><summary>Compare versions</summary><div className="grid cols-2"><div><strong>This device</strong><pre className="conflict-preview">{JSON.stringify(conflict.local ?? 'Deleted on this device', null, 2)}</pre></div><div><strong>Cloud</strong><pre className="conflict-preview">{JSON.stringify(conflict.remote ?? 'Deleted in the cloud', null, 2)}</pre></div></div></details><div className="row" style={{ justifyContent: 'flex-end' }}><Button size="sm" onClick={() => void resolveConflict(conflict, 'remote')}>Use cloud version</Button><Button size="sm" variant="primary" onClick={() => void resolveConflict(conflict, 'local')}>Keep this device</Button></div></div>)}</div></Modal>
    </div>
  );
}
