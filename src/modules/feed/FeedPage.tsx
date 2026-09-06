import { deleteWithUndo } from '@/core/undo';
import { safeExternalUrl } from '@/core/urls';
import { useMemo, useState } from 'react';
import { Check, ExternalLink, Headphones, Lightbulb, ListMusic, Mail, Pin, Plus, Rss, SkipForward, Star, Trash2 } from 'lucide-react';
import { Bar, Button, Card, Chip, DomainChip, Empty, Field, Modal, PageHead, Segmented, Stat } from '@/components/ui';
import { useUI } from '@/app/uiStore';
import { inLens, type Domain } from '@/core/types';
import { toast } from '@/components/Toast';
import { initials, SOURCE_KIND, useFeed, type FeedItem, type Source, type SourceKind } from './store';

type View = 'queue' | 'sources' | 'takeaways';

export function FeedPage() {
  const lens = useUI((s) => s.lens);
  const { sources, items, deleteSource } = useFeed();
  const [view, setView] = useState<View>('queue');
  const [sourceFilter, setSourceFilter] = useState<string | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<SourceKind | 'all'>('all');
  const [newSource, setNewSource] = useState(false);
  const [newItem, setNewItem] = useState(false);
  const [finishing, setFinishing] = useState<string | null>(null);

  const srcList = Object.values(sources).filter((s) => !s.archived && inLens(s.domain, lens)).filter((s) => kindFilter === 'all' || s.kind === kindFilter);
  const srcIds = new Set(srcList.map((s) => s.id));
  const kindsPresent = (Object.keys(SOURCE_KIND) as SourceKind[]).filter((k) => Object.values(sources).some((s) => s.kind === k));
  // Pills for the busiest sources; the long tail lives in a select.
  const queuedCount = (id: string) => Object.values(items).filter((i) => i.sourceId === id && (i.status === 'queued' || i.status === 'in-progress')).length;
  const ranked = [...srcList].sort((a, b) => queuedCount(b.id) - queuedCount(a.id));
  const pillSources = ranked.slice(0, 6);
  const tailSources = ranked.slice(6);
  const visible = useMemo(() => Object.values(items).filter((i) => srcIds.has(i.sourceId)).filter((i) => sourceFilter === 'all' || i.sourceId === sourceFilter), [items, srcIds, sourceFilter]);

  const queue = visible.filter((i) => i.status === 'queued' || i.status === 'in-progress').sort((a, b) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0) || (a.status === 'in-progress' ? -1 : 1) - (b.status === 'in-progress' ? -1 : 1) || a.createdAt.localeCompare(b.createdAt));
  const done = visible.filter((i) => i.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const queuedMin = queue.reduce((a, i) => a + Math.max(0, (i.durationMin ?? 0) - (i.progressMin ?? 0)), 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const doneWeek = done.filter((i) => i.completedAt && new Date(i.completedAt).getTime() > weekAgo);
  const minWeek = doneWeek.reduce((a, i) => a + (i.durationMin ?? 0), 0);

  return (
    <div className="page">
      <PageHead eyebrow="Feed" title="Podcasts & letters" lead="Your Notion reading list plus everything you subscribe to, in one queue. Finish something → capture the one takeaway. Skip freely; the queue should never own you."
        action={<><Button icon={Rss} onClick={() => setNewSource(true)}>Add source</Button><Button variant="primary" icon={Plus} onClick={() => setNewItem(true)} disabled={!srcList.length}>Add episode / issue</Button></>} />

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <Card tint="var(--feed-soft)">
          <div className="stats"><Stat value={queue.length} label="in queue" /><Stat value={`${Math.round(queuedMin / 60 * 10) / 10}h`} label="to get through" /></div>
        </Card>
        <Card title="This week" icon={Headphones} accent="var(--feed)">
          <div className="stats"><Stat value={doneWeek.length} label="finished" /><Stat value={`${Math.round(minWeek / 60 * 10) / 10}h`} label="consumed" /></div>
        </Card>
        <Card title="Takeaways" icon={Lightbulb} accent="var(--feed)">
          <div className="stats"><Stat value={done.filter((i) => i.takeaway).length} label="ideas captured" /><Stat value={srcList.length} label="sources" /></div>
        </Card>
      </div>

      <div className="between" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'queue', label: 'Queue', icon: ListMusic }, { value: 'takeaways', label: 'Takeaways', icon: Lightbulb }, { value: 'sources', label: 'Sources', icon: Rss }]} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {kindsPresent.length > 1 && (
            <div className="seg" style={{ marginRight: 6 }}>
              <button className={kindFilter === 'all' ? 'active' : ''} onClick={() => { setKindFilter('all'); setSourceFilter('all'); }}>All</button>
              {kindsPresent.map((k) => <button key={k} className={kindFilter === k ? 'active' : ''} onClick={() => { setKindFilter(k); setSourceFilter('all'); }}>{SOURCE_KIND[k]}{k === 'blog' ? 's' : ''}</button>)}
            </div>
          )}
        </div>
      </div>
      <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <Chip onClick={() => setSourceFilter('all')} tone={sourceFilter === 'all' ? 'accent' : undefined}>All sources</Chip>
        {pillSources.map((s) => <SourcePill key={s.id} source={s} active={sourceFilter === s.id} onClick={() => setSourceFilter(sourceFilter === s.id ? 'all' : s.id)} />)}
        {tailSources.length > 0 && (
          <select value={tailSources.some((s) => s.id === sourceFilter) ? sourceFilter : ''} onChange={(e) => setSourceFilter(e.target.value || 'all')} style={{ width: 'auto', padding: '4px 8px', borderRadius: 999, fontSize: 12.5 }} aria-label="More sources">
            <option value="">{tailSources.length} more sources…</option>
            {tailSources.map((s) => <option key={s.id} value={s.id}>{s.name} ({queuedCount(s.id)})</option>)}
          </select>
        )}
      </div>

      {view === 'queue' && (
        !queue.length ? <Empty icon={ListMusic} title="Queue is clear" hint={srcList.length ? 'Add the next episode or issue you want to get to.' : 'Add a podcast or Substack first.'} /> :
        <div className="list card" style={{ padding: 6 }}>{queue.map((i) => <ItemRow key={i.id} item={i} source={sources[i.sourceId]} onFinish={() => setFinishing(i.id)} />)}</div>
      )}
      {view === 'takeaways' && (
        !done.length ? <Empty icon={Lightbulb} title="No takeaways yet" hint="When you finish something, write down the one idea worth keeping." /> :
        <div className="grid cols-2">{done.map((i) => <TakeawayCard key={i.id} item={i} source={sources[i.sourceId]} />)}</div>
      )}
      {view === 'sources' && (
        !srcList.length ? <Empty icon={Rss} title="No sources yet" hint="Add the podcasts and Substacks you actually want to keep up with." action={<Button size="sm" onClick={() => setNewSource(true)}>Add source</Button>} /> :
        <div className="grid cols-3">
          {srcList.map((s) => {
            const its = Object.values(items).filter((i) => i.sourceId === s.id);
            return (
              <Card key={s.id}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="avatar" style={{ width: 40, height: 40, borderRadius: 12, background: s.color, display: 'grid', placeItems: 'center', fontWeight: 700, color: 'white' }}>{initials(s.name)}</span>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="row" style={{ gap: 5 }}><Chip>{SOURCE_KIND[s.kind]}</Chip>{s.domain && <DomainChip domain={s.domain} />}</div>
                  </div>
                  <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label="Delete source" onClick={() => confirm(`Remove ${s.name} and its items?`) && deleteWithUndo(useFeed, () => deleteSource(s.id), 'Source deleted')} />
                </div>
                <div className="faint" style={{ fontSize: 12.5, marginTop: 10 }}>{its.filter((i) => i.status !== 'done' && i.status !== 'skipped').length} queued · {its.filter((i) => i.status === 'done').length} finished</div>
                {s.url && <a href={safeExternalUrl(s.url)} target="_blank" rel="noreferrer" className="faint" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{s.url.replace(/^https?:\/\//, '')}</a>}
              </Card>
            );
          })}
        </div>
      )}

      <NewSourceModal open={newSource} onClose={() => setNewSource(false)} defaultDomain={lens === 'business' ? 'business' : undefined} />
      <NewItemModal open={newItem} onClose={() => setNewItem(false)} sources={srcList} defaultSource={sourceFilter !== 'all' ? sourceFilter : undefined} />
      <FinishModal id={finishing} onClose={() => setFinishing(null)} />
    </div>
  );
}

function SourcePill({ source, active, onClick }: { source: Source; active?: boolean; onClick?: () => void }) {
  return (
    <button className="source-pill" onClick={onClick} style={active ? { borderColor: source.color, background: `color-mix(in srgb, ${source.color} 14%, transparent)` } : undefined}>
      <span className="avatar" style={{ background: source.color }}>{initials(source.name)}</span>{source.name}
    </button>
  );
}

export function ItemRow({ item, source, onFinish, compact }: { item: FeedItem; source?: Source; onFinish: () => void; compact?: boolean }) {
  const { setProgress, updateItem, deleteItem } = useFeed();
  const Icon = source?.kind === 'podcast' || source?.kind === 'youtube' ? Headphones : Mail;
  const rem = item.durationMin ? Math.max(0, item.durationMin - (item.progressMin ?? 0)) : undefined;
  return (
    <div className="list-item">
      <span className="avatar" style={{ width: 30, height: 30, borderRadius: 9, background: source?.color ?? 'var(--border)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: 'white', flex: 'none' }}>{source ? initials(source.name) : '?'}</span>
      <div className="grow">
        <div className="row" style={{ gap: 6 }}>
          {item.pinned && <Pin size={12} style={{ color: 'var(--accent)' }} />}
          {item.url ? <a href={safeExternalUrl(item.url)} target="_blank" rel="noreferrer" className="title truncate" style={{ textDecoration: 'underline dotted' }}>{item.title}</a> : <span className="title truncate">{item.title}</span>}
        </div>
        {!compact && (
          <div className="meta">
            <span className="faint" style={{ fontSize: 12 }}><Icon size={11} style={{ verticalAlign: '-1px' }} /> {source?.name}</span>
            {item.durationMin && (
              <span className="item-progress"><Bar value={item.progressMin ?? 0} max={item.durationMin} color={source?.color} thin />{rem} min left</span>
            )}
            {item.kindHint && <Chip>{item.kindHint}</Chip>}
            {item.status === 'in-progress' && <Chip tone="accent">In progress</Chip>}
            {item.notionUrl && <a href={safeExternalUrl(item.notionUrl)} target="_blank" rel="noreferrer" className="chip" title="Open in Notion"><ExternalLink />Notion</a>}
          </div>
        )}
      </div>
      {!compact && item.durationMin && item.durationMin > 0 && (
        <Button size="sm" variant="ghost" onClick={() => setProgress(item.id, (item.progressMin ?? 0) + 15)} title="Log 15 minutes">+15m</Button>
      )}
      {!compact && <Button size="sm" variant="ghost" iconOnly icon={Pin} aria-label="Pin" onClick={() => updateItem(item.id, { pinned: !item.pinned })} />}
      {!compact && <Button size="sm" variant="ghost" iconOnly icon={SkipForward} aria-label="Skip" onClick={() => { updateItem(item.id, { status: 'skipped' }); toast('Skipped'); }} />}
      <Button size="sm" icon={Check} onClick={onFinish}>Finish</Button>
      {!compact && <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label="Delete" onClick={() => deleteWithUndo(useFeed, () => deleteItem(item.id), 'Item deleted')} />}
    </div>
  );
}

function TakeawayCard({ item, source }: { item: FeedItem; source?: Source }) {
  return (
    <div className="card" style={{ padding: 16, borderLeft: `3px solid ${source?.color ?? 'var(--border)'}` }}>
      <div className="between"><span className="faint" style={{ fontSize: 12 }}>{source?.name} · {item.completedAt ? new Date(item.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
        {item.rating && <span className="row" style={{ gap: 2, color: 'var(--accent)' }}>{Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</span>}</div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{item.title}</div>
      {item.takeaway ? <p className="display" style={{ marginTop: 8, fontSize: 16, lineHeight: 1.4 }}>“{item.takeaway}”</p> : <p className="faint" style={{ marginTop: 8, fontSize: 13 }}>No takeaway captured.</p>}
    </div>
  );
}

function NewSourceModal({ open, onClose, defaultDomain }: { open: boolean; onClose: () => void; defaultDomain?: Domain }) {
  const addSource = useFeed((s) => s.addSource);
  const [name, setName] = useState(''); const [kind, setKind] = useState<SourceKind>('podcast'); const [url, setUrl] = useState(''); const [domain, setDomain] = useState<Domain | ''>(defaultDomain ?? '');
  const submit = () => { if (!name.trim()) return; addSource({ name, kind, url: url || undefined, domain: domain || undefined }); toast(`Following ${name}`); setName(''); setUrl(''); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Add a source">
      <div className="form">
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Acquired, Lenny's Newsletter, Huberman Lab" onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
        <div className="form-row">
          <Field label="Type"><select value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>{(Object.keys(SOURCE_KIND) as SourceKind[]).map((k) => <option key={k} value={k}>{SOURCE_KIND[k]}</option>)}</select></Field>
          <Field label="Domain"><select value={domain} onChange={(e) => setDomain(e.target.value as Domain | '')}><option value="">Both / neither</option><option value="personal">Personal</option><option value="business">Business</option></select></Field>
        </div>
        <Field label="URL (optional)"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!name.trim()}>Add source</Button></div>
      </div>
    </Modal>
  );
}

function NewItemModal({ open, onClose, sources, defaultSource }: { open: boolean; onClose: () => void; sources: Source[]; defaultSource?: string }) {
  const addItem = useFeed((s) => s.addItem);
  const [sourceId, setSourceId] = useState(defaultSource ?? sources[0]?.id ?? ''); const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [duration, setDuration] = useState('');
  const sid = sourceId || sources[0]?.id || '';
  const submit = () => { if (!title.trim() || !sid) return; addItem({ sourceId: sid, title, url: url || undefined, durationMin: duration ? Number(duration) : undefined }); toast('Queued'); setTitle(''); setUrl(''); setDuration(''); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Queue an episode or issue">
      <div className="form">
        <Field label="Source"><select value={sid} onChange={(e) => setSourceId(e.target.value)}>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
        <div className="form-row">
          <Field label="Link (optional)"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
          <Field label="Length in minutes"><input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 75 or 12" /></Field>
        </div>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!title.trim() || !sid}>Add to queue</Button></div>
      </div>
    </Modal>
  );
}

export function FinishModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { items, complete } = useFeed();
  const [takeaway, setTakeaway] = useState(''); const [rating, setRating] = useState<FeedItem['rating']>();
  const item = id ? items[id] : undefined;
  if (!item) return null;
  const submit = () => { complete(item.id, takeaway || undefined, rating); toast(takeaway ? 'Takeaway saved' : 'Finished'); setTakeaway(''); setRating(undefined); onClose(); };
  return (
    <Modal open onClose={onClose} title="One takeaway">
      <div className="form">
        <p className="muted" style={{ fontSize: 13.5 }}>Finished <b style={{ color: 'var(--text)' }}>{item.title}</b>. What's the one idea worth keeping?</p>
        <textarea autoFocus value={takeaway} onChange={(e) => setTakeaway(e.target.value)} placeholder="The insight, in your own words…" style={{ fontFamily: 'var(--font-display)', fontSize: 16 }} />
        <div className="between">
          <div className="row" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((r) => <button key={r} aria-label={`${r} stars`} onClick={() => setRating(r as FeedItem['rating'])} style={{ color: (rating ?? 0) >= r ? 'var(--accent)' : 'var(--text-3)' }}><Star size={18} fill={(rating ?? 0) >= r ? 'currentColor' : 'none'} /></button>)}
          </div>
          <div className="row"><Button variant="ghost" onClick={submit}>Skip note</Button><Button variant="primary" onClick={submit}>Save</Button></div>
        </div>
      </div>
    </Modal>
  );
}
