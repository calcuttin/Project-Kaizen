import { deleteWithUndo } from '@/core/undo';
import { safeExternalUrl } from '@/core/urls';
import { useState } from 'react';
import { Check, ExternalLink, Headphones, Mail, Pin, SkipForward, Star, Trash2 } from 'lucide-react';
import { Bar, Button, Chip, Modal } from '@/components/ui';
import { toast } from '@/components/Toast';
import { initials, useFeed, type FeedItem, type Source } from './store';

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
