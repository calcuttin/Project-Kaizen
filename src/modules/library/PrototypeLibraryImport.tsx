import { useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { currentWorkspaceOwner, flushWorkspaceWrites, workspaceAvailable } from '@/core/storage';
import { downloadJson } from '@/core/diagnostics';
import { useSyncStatus } from '@/core/sync/engine';
import { Button, Card, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useLibrary } from './store';
import { parsePrototype, planPrototypeImport, PROTOTYPE_KEY, type PrototypeLibrary } from './prototypeImport';

export function PrototypeLibraryImport() {
 const auth=useAuth(),sync=useSyncStatus();
 const [raw]=useState(()=>{try{return localStorage.getItem(PROTOTYPE_KEY);}catch{return null;}});
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[samples,setSamples]=useState(false),[saving,setSaving]=useState(false);
 if(!raw||auth.mode!=='cloud'||!auth.user)return null;
 let legacy:PrototypeLibrary|undefined;try{legacy=parsePrototype(raw);}catch{}
 const ready=sync.status==='idle'&&!sync.pending&&!sync.writing&&!sync.conflicts;
 const copy=async()=>{
  const owner=auth.user?.id;
  const latestSync=useSyncStatus.getState();
  if(!legacy||!owner||currentWorkspaceOwner()!==owner||!workspaceAvailable()||latestSync.status!=='idle'||latestSync.pending||latestSync.writing||latestSync.conflicts)return;
  setSaving(true);setError('');
  try{const plan=planPrototypeImport(legacy,useLibrary.getState(),samples);useLibrary.setState({books:plan.books,shelves:plan.shelves,sessions:plan.sessions});await flushWorkspaceWrites();if(currentWorkspaceOwner()!==owner)return;setOpen(false);toast(`${plan.added} books copied; ${plan.skipped} skipped. Cloud saving will continue automatically.`);}
  catch(e){setError(e instanceof Error?e.message:'Could not save the import. The original local library is still available.');}
  finally{setSaving(false);}
 };
 return <Card title="Your earlier Bookshelf library"><p className="muted">A library from the standalone prototype is still on this browser. You can copy its books into this signed-in account. Existing books and your reading goal will not be replaced.</p><div className="row"><Button onClick={()=>{try{downloadJson(JSON.parse(raw),'bookshelf-prototype-library.json');}catch{setError('The saved JSON is damaged. It has been kept unchanged in this browser.');}}}>Download original</Button><Button disabled={!legacy} onClick={()=>setOpen(true)}>Review import</Button></div>{!legacy&&<p role="alert">The earlier library cannot be imported safely. Its original data has been preserved.</p>}{error&&!open&&<p role="alert">{error}</p>}<Modal open={open} onClose={()=>!saving&&setOpen(false)} title="Copy your local books"><p>Destination account: <strong>{auth.user.email??auth.user.name}</strong></p><p>{legacy?.books.length??0} local books. Existing titles and ISBNs will be skipped. Notes, ratings, progress, and reading sessions for new books are included. The original local library stays on this browser.</p>{legacy?.demo&&<label className="row"><input type="checkbox" checked={samples} onChange={e=>setSamples(e.target.checked)} />Include sample books and their notes</label>}<p className="muted">{ready?'This copies data to your Kaizen account when you confirm.':'Wait for cloud saving to finish and resolve any conflicts before importing.'}</p>{error&&<p role="alert">{error}</p>}<div className="form-actions"><Button disabled={saving} onClick={()=>setOpen(false)}>Cancel</Button><Button variant="primary" disabled={!ready||saving} onClick={()=>void copy()}>{saving?'Copying…':'Copy to this account'}</Button></div></Modal></Card>;
}
