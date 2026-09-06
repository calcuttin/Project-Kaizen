import { deleteWithUndo } from '@/core/undo';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { CalendarDays, Columns3, Flame, LayoutDashboard, Lightbulb, LineChart, Mic, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Chip, Empty, Field, Modal, PageHead, Segmented, Sparkline, Stat } from '@/components/ui';
import { humanDate, isOverdue } from '@/core/dates';
import { toast } from '@/components/Toast';
import { whenHydrated } from '@/core/store';
import type { ID } from '@/core/types';
import { cadence, CHANNEL_KIND, channelSnapshots, DEFAULT_METRICS, metricTrend, PIECE_FORMAT, STAGES, useStudio, type Channel, type ChannelKind, type Piece, type PieceFormat, type Stage } from './store';

type View = 'overview' | 'pipeline' | 'schedule';

export function StudioPage() {
  const { channels, pieces, ensureDefaults } = useStudio();
  const [view, setView] = useState<View>('overview');
  const [channelFilter, setChannelFilter] = useState<ID | 'all'>('all');
  const [newPiece, setNewPiece] = useState<Stage | null>(null);
  const [editing, setEditing] = useState<ID | null>(null);
  const [editChannel, setEditChannel] = useState<ID | 'new' | null>(null);
  const [logging, setLogging] = useState<ID | null>(null);
  const [quick, setQuick] = useState('');

  // Wait for IndexedDB hydration; otherwise defaults would be created against an empty store and then overwritten.
  useEffect(() => { void whenHydrated(useStudio).then(() => ensureDefaults()); }, [ensureDefaults]);

  const channelList = Object.values(channels).filter((c) => !c.archived);
  const pieceList = useMemo(() => Object.values(pieces).filter((p) => channelFilter === 'all' || p.channelId === channelFilter), [pieces, channelFilter]);
  const inFlight = pieceList.filter((p) => p.stage !== 'idea' && p.stage !== 'published').length;

  const addIdea = () => {
    if (!quick.trim() || !channelList.length) return;
    const channelId = channelFilter !== 'all' ? channelFilter : channelList[0].id;
    useStudio.getState().addPiece({ channelId, title: quick, stage: 'idea' });
    setQuick(''); toast('Idea captured');
  };

  return (
    <div className="page">
      <PageHead eyebrow="Studio" title={<>Your channels <span className="faint">· {inFlight} in production</span></>}
        lead="The content you make: Substack posts and podcast episodes under one brand. Ship on cadence, watch the audience grow."
        action={<><Button icon={Mic} onClick={() => setEditChannel('new')}>Add channel</Button><Button variant="primary" icon={Plus} onClick={() => setNewPiece('idea')} disabled={!channelList.length}>New piece</Button></>} />

      <div className="quick-add" style={{ marginBottom: 16 }}>
        <Lightbulb />
        <input placeholder="Capture an idea… episode angle, post title, guest to invite" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addIdea()} aria-label="Capture idea" />
        {quick && <Button size="sm" variant="primary" onClick={addIdea}>Add idea</Button>}
      </div>

      <div className="between" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'overview', label: 'Overview', icon: LayoutDashboard }, { value: 'pipeline', label: 'Pipeline', icon: Columns3 }, { value: 'schedule', label: 'Schedule', icon: CalendarDays }]} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Chip onClick={() => setChannelFilter('all')} tone={channelFilter === 'all' ? 'accent' : undefined}>All channels</Chip>
          {channelList.map((c) => (
            <span key={c.id} className={`chip clickable ${channelFilter === c.id ? 'accent' : ''}`} onClick={() => setChannelFilter(channelFilter === c.id ? 'all' : c.id)}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: c.color }} />{c.name}
            </span>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <div className="grid cols-2">
          {channelList.filter((c) => channelFilter === 'all' || c.id === channelFilter).map((c) => <ChannelCard key={c.id} channel={c} onLog={() => setLogging(c.id)} onEdit={() => setEditChannel(c.id)} onOpenPiece={setEditing} />)}
          {!channelList.length && <Empty icon={Mic} title="No channels yet" hint="Add your podcast and Substack to get started." />}
        </div>
      )}
      {view === 'pipeline' && <Pipeline pieces={pieceList} onOpen={setEditing} onAdd={(stage) => setNewPiece(stage)} />}
      {view === 'schedule' && <Schedule pieces={pieceList} onOpen={setEditing} />}

      <PieceModal open={newPiece !== null} stage={newPiece ?? 'idea'} onClose={() => setNewPiece(null)} channels={channelList} defaultChannel={channelFilter !== 'all' ? channelFilter : undefined} />
      <PieceEditor id={editing} onClose={() => setEditing(null)} />
      <ChannelModal target={editChannel} onClose={() => setEditChannel(null)} />
      <LogMetricsModal channelId={logging} onClose={() => setLogging(null)} />
    </div>
  );
}

/* ── Channel overview card ─────────────────────────────── */
function ChannelCard({ channel, onLog, onEdit, onOpenPiece }: { channel: Channel; onLog: () => void; onEdit: () => void; onOpenPiece: (id: ID) => void }) {
  const { pieces, snapshots } = useStudio();
  const all = Object.values(pieces);
  const snaps = channelSnapshots(snapshots, channel.id);
  const cad = cadence(channel, all);
  const next = all.filter((p) => p.channelId === channel.id && p.stage === 'scheduled' && p.publishDate).sort((a, b) => a.publishDate!.localeCompare(b.publishDate!))[0];
  const working = all.filter((p) => p.channelId === channel.id && ['outline', 'production', 'edit'].includes(p.stage));
  const publishedPieces = all.filter((p) => p.channelId === channel.id && p.stage === 'published');
  const published = publishedPieces.length;
  const episodes = publishedPieces.filter((p) => p.format === 'episode').length;
  const late = cad.daysLeft < 0;
  return (
    <Card tint={`color-mix(in srgb, ${channel.color} 14%, transparent)`}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, background: channel.color, display: 'grid', placeItems: 'center', color: '#111', fontWeight: 700 }}>{channel.kind === 'podcast' ? '🎙️' : channel.kind === 'substack' || channel.kind === 'newsletter' ? '✉️' : channel.kind === 'youtube' ? '▶️' : '★'}</span>
          <div>
            <h2 className="display" style={{ fontSize: 20 }}>{channel.name}</h2>
            <div className="row" style={{ gap: 5 }}><Chip>{CHANNEL_KIND[channel.kind]}</Chip><Chip>every {channel.cadenceDays}d</Chip>{cad.streak > 1 && <span className="streak"><Flame size={12} />{cad.streak} on cadence</span>}</div>
          </div>
        </div>
        <div className="row"><Button size="sm" variant="ghost" iconOnly icon={Pencil} aria-label="Edit channel" onClick={onEdit} /><Button size="sm" icon={LineChart} onClick={onLog}>Log metrics</Button></div>
      </div>

      <div className="stats" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 20 }}>
        {channel.metricKeys.map((k) => {
          const t = metricTrend(snaps, k);
          return (
            <div key={k} className="stat">
              <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
                <b>{t.latest ?? '—'}</b>
                {t.delta !== undefined && t.delta !== 0 && <span style={{ fontSize: 12, fontWeight: 600, color: t.delta > 0 ? 'var(--success)' : 'var(--danger)' }}>{t.delta > 0 ? '+' : ''}{t.delta}</span>}
                {t.series.length > 1 && <Sparkline data={t.series} color={channel.color} />}
              </div>
              <small>{k}</small>
            </div>
          );
        })}
        <Stat value={published} label={episodes ? `published · ${episodes} episodes` : 'published'} />
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <div className="between" style={{ fontSize: 13 }}>
          <span className="muted">Next due</span>
          <span style={{ fontWeight: 600, color: late ? 'var(--danger)' : cad.daysLeft <= 2 ? 'var(--warning)' : 'var(--text)' }}>{late ? `${-cad.daysLeft}d overdue` : cad.daysLeft === 0 ? 'Today' : `in ${cad.daysLeft}d`} <span className="faint" style={{ fontWeight: 400 }}>· {humanDate(cad.nextDue)}</span></span>
        </div>
        {next ? (
          <div className="list-item" style={{ padding: '6px 8px', background: 'var(--surface)' }} onClick={() => onOpenPiece(next.id)} role="button" tabIndex={0}>
            <CalendarDays size={14} style={{ color: channel.color }} /><span className="grow truncate" style={{ fontWeight: 500 }}>{next.title}</span><Chip>{humanDate(next.publishDate)}</Chip>
          </div>
        ) : <span className="faint" style={{ fontSize: 12.5 }}>Nothing scheduled. {working.length ? `${working.length} in the works.` : 'Pick an idea and start.'}</span>}
        {working.slice(0, 3).map((p) => (
          <div key={p.id} className="list-item" style={{ padding: '5px 8px' }} onClick={() => onOpenPiece(p.id)} role="button" tabIndex={0}>
            <span className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', width: 70 }}>{STAGES.find((s) => s.id === p.stage)?.label.split(' ')[0]}</span><span className="grow truncate" style={{ fontSize: 13.5 }}>{p.title}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Pipeline board ───────────────────────────────────── */
function Pipeline({ pieces, onOpen, onAdd }: { pieces: Piece[]; onOpen: (id: ID) => void; onAdd: (stage: Stage) => void }) {
  const { movePiece, channels } = useStudio();
  const [over, setOver] = useState<Stage | null>(null);
  const [dragging, setDragging] = useState<ID | null>(null);
  const onDrop = (e: DragEvent, stage: Stage) => { e.preventDefault(); const id = e.dataTransfer.getData('text/kaizen-piece') || dragging; if (id) movePiece(id, stage); setOver(null); setDragging(null); };
  return (
    <div className="board">
      {STAGES.map((st) => {
        const items = pieces.filter((p) => p.stage === st.id).sort((a, b) => st.id === 'published' ? (b.publishDate ?? '').localeCompare(a.publishDate ?? '') : a.order - b.order);
        return (
          <div key={st.id} className={`column ${over === st.id ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); if (over !== st.id) setOver(st.id); }} onDragLeave={() => setOver(null)} onDrop={(e) => onDrop(e, st.id)}>
            <div className="column-head"><span title={st.hint}>{st.label}</span><span className="row" style={{ gap: 6 }}><span className="faint">{items.length}</span><button className="btn ghost icon sm" aria-label={`Add to ${st.label}`} onClick={() => onAdd(st.id)}><Plus size={13} /></button></span></div>
            {items.map((p) => {
              const c = channels[p.channelId];
              return (
                <div key={p.id} className={`tcard ${dragging === p.id ? 'dragging' : ''}`} draggable onDragStart={(e) => { e.dataTransfer.setData('text/kaizen-piece', p.id); setDragging(p.id); }} onDragEnd={() => { setDragging(null); setOver(null); }} onClick={() => onOpen(p.id)} style={{ borderLeft: `3px solid ${c?.color ?? 'var(--border)'}` }}>
                  <span style={{ fontWeight: 500 }}>{PIECE_FORMAT[p.format ?? 'post'].emoji} {p.title}</span>
                  <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                    <Chip>{PIECE_FORMAT[p.format ?? 'post'].label}</Chip>
                    {c && Object.keys(channels).length > 1 && <Chip>{c.name}</Chip>}
                    {p.guest && <Chip>🎤 {p.guest}</Chip>}
                    {p.publishDate && <Chip icon={CalendarDays} tone={p.stage !== 'published' && isOverdue(p.publishDate) ? 'danger' : undefined}>{humanDate(p.publishDate)}</Chip>}
                  </div>
                </div>
              );
            })}
            {!items.length && <div className="faint" style={{ fontSize: 12, textAlign: 'center', padding: 16 }}>{st.hint}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Schedule ─────────────────────────────────────────── */
function Schedule({ pieces, onOpen }: { pieces: Piece[]; onOpen: (id: ID) => void }) {
  const channels = useStudio((s) => s.channels);
  const dated = pieces.filter((p) => p.publishDate).sort((a, b) => a.publishDate!.localeCompare(b.publishDate!));
  const upcoming = dated.filter((p) => p.stage !== 'published');
  const past = dated.filter((p) => p.stage === 'published').reverse();
  const Row = ({ p }: { p: Piece }) => {
    const c = channels[p.channelId];
    return (
      <div className="list-item" onClick={() => onOpen(p.id)} role="button" tabIndex={0}>
        <div style={{ width: 84, flex: 'none' }}><div style={{ fontWeight: 600, fontSize: 13, color: p.stage !== 'published' && isOverdue(p.publishDate) ? 'var(--danger)' : undefined }}>{humanDate(p.publishDate)}</div><div className="faint" style={{ fontSize: 11 }}>{p.publishDate}</div></div>
        <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: c?.color }} />
        <div className="grow"><div className="title truncate">{PIECE_FORMAT[p.format ?? 'post'].emoji} {p.title}</div><div className="meta"><Chip>{PIECE_FORMAT[p.format ?? 'post'].label}</Chip>{Object.keys(channels).length > 1 && <Chip>{c?.name}</Chip>}<Chip tone={p.stage === 'published' ? 'success' : p.stage === 'scheduled' ? 'accent' : undefined}>{STAGES.find((s) => s.id === p.stage)?.label}</Chip></div></div>
      </div>
    );
  };
  return (
    <div className="grid cols-2">
      <Card title="Upcoming" icon={CalendarDays}>{upcoming.length ? <div className="list">{upcoming.map((p) => <Row key={p.id} p={p} />)}</div> : <Empty icon={CalendarDays} title="Nothing on the calendar" hint="Give a piece a publish date to see it here." />}</Card>
      <Card title="Published" icon={Mic}>{past.length ? <div className="list">{past.slice(0, 20).map((p) => <Row key={p.id} p={p} />)}</div> : <Empty icon={Mic} title="No releases yet" hint="Your back catalog will build here." />}</Card>
    </div>
  );
}

/* ── Modals ───────────────────────────────────────────── */
function PieceModal({ open, stage, onClose, channels, defaultChannel }: { open: boolean; stage: Stage; onClose: () => void; channels: Channel[]; defaultChannel?: ID }) {
  const addPiece = useStudio((s) => s.addPiece);
  const [title, setTitle] = useState(''); const [channelId, setChannelId] = useState(defaultChannel ?? channels[0]?.id ?? ''); const [date, setDate] = useState(''); const [guest, setGuest] = useState(''); const [format, setFormat] = useState<PieceFormat>('post');
  const cid = channelId || channels[0]?.id || '';
  const submit = () => { if (!title.trim() || !cid) return; addPiece({ channelId: cid, title, format, stage, publishDate: date || undefined, guest: guest || undefined }); toast('Added to pipeline'); setTitle(''); setDate(''); setGuest(''); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title={`New piece · ${STAGES.find((s) => s.id === stage)?.label}`}>
      <div className="form">
        <Field label="Title / working title"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Ep. 42 — Why QoS matters again" /></Field>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Format"><select value={format} onChange={(e) => setFormat(e.target.value as PieceFormat)}>{(Object.keys(PIECE_FORMAT) as PieceFormat[]).map((f) => <option key={f} value={f}>{PIECE_FORMAT[f].emoji} {PIECE_FORMAT[f].label}</option>)}</select></Field>
          <Field label="Channel"><select value={cid} onChange={(e) => setChannelId(e.target.value)}>{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Publish date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Guest (optional)"><input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder={format === 'episode' ? 'Who is on the mic with you?' : ''} /></Field>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!title.trim() || !cid}>Add piece</Button></div>
      </div>
    </Modal>
  );
}

function PieceEditor({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const { pieces, channels, updatePiece, deletePiece } = useStudio();
  const p = id ? pieces[id] : undefined;
  if (!p) return null;
  return (
    <Modal open onClose={onClose} title="Piece">
      <div className="form">
        <input value={p.title} onChange={(e) => updatePiece(p.id, { title: e.target.value })} style={{ fontSize: 17, fontWeight: 500 }} aria-label="Title" />
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <Field label="Format"><select value={p.format ?? 'post'} onChange={(e) => updatePiece(p.id, { format: e.target.value as PieceFormat })}>{(Object.keys(PIECE_FORMAT) as PieceFormat[]).map((f) => <option key={f} value={f}>{PIECE_FORMAT[f].emoji} {PIECE_FORMAT[f].label}</option>)}</select></Field>
          <Field label="Channel"><select value={p.channelId} onChange={(e) => updatePiece(p.id, { channelId: e.target.value })}>{Object.values(channels).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Stage"><select value={p.stage} onChange={(e) => useStudio.getState().movePiece(p.id, e.target.value as Stage)}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
        </div>
        <div className="form-row">
          <Field label="Publish date"><input type="date" value={p.publishDate ?? ''} onChange={(e) => updatePiece(p.id, { publishDate: e.target.value || undefined })} /></Field>
          <Field label="Guest"><input value={p.guest ?? ''} onChange={(e) => updatePiece(p.id, { guest: e.target.value || undefined })} /></Field>
        </div>
        <Field label="Link (once published)"><input value={p.url ?? ''} onChange={(e) => updatePiece(p.id, { url: e.target.value || undefined })} placeholder="https://" /></Field>
        <p className="muted">Changes save automatically.</p><Field label="Notes / outline"><textarea value={p.notes ?? ''} onChange={(e) => updatePiece(p.id, { notes: e.target.value })} placeholder="Angle, key points, show notes, CTA…" rows={5} /></Field>
        <div className="form-actions"><Button variant="ghost" className="danger" icon={Trash2} onClick={() => { deleteWithUndo(useStudio, () => deletePiece(p.id), 'Piece deleted'); onClose(); }}>Delete</Button><span className="grow" /><Button variant="primary" onClick={onClose}>Close</Button></div>
      </div>
    </Modal>
  );
}

function ChannelModal({ target, onClose }: { target: ID | 'new' | null; onClose: () => void }) {
  const { channels, addChannel, updateChannel, deleteChannel } = useStudio();
  const existing = target && target !== 'new' ? channels[target] : undefined;
  const [name, setName] = useState(''); const [kind, setKind] = useState<ChannelKind>('podcast'); const [url, setUrl] = useState(''); const [cad, setCad] = useState('7'); const [metrics, setMetrics] = useState('');
  useEffect(() => {
    if (existing) { setName(existing.name); setKind(existing.kind); setUrl(existing.url ?? ''); setCad(String(existing.cadenceDays)); setMetrics(existing.metricKeys.join(', ')); }
    else { setName(''); setKind('podcast'); setUrl(''); setCad('7'); setMetrics(DEFAULT_METRICS.podcast.join(', ')); }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!target) return null;
  const submit = () => {
    if (!name.trim()) return;
    const metricKeys = metrics.split(',').map((m) => m.trim()).filter(Boolean);
    if (existing) updateChannel(existing.id, { name, kind, url: url || undefined, cadenceDays: Number(cad) || 7, metricKeys: metricKeys.length ? metricKeys : DEFAULT_METRICS[kind] });
    else addChannel({ name, kind, url: url || undefined, cadenceDays: Number(cad) || 7, metricKeys: metricKeys.length ? metricKeys : DEFAULT_METRICS[kind] });
    toast(existing ? 'Channel updated' : `Channel “${name}” added`); onClose();
  };
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit channel' : 'Add channel'}>
      <div className="form">
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="The name of your show or publication" onKeyDown={(e) => e.key === 'Enter' && submit()} /></Field>
        <div className="form-row">
          <Field label="Type"><select value={kind} onChange={(e) => { const k = e.target.value as ChannelKind; setKind(k); if (!existing) setMetrics(DEFAULT_METRICS[k].join(', ')); }}>{(Object.keys(CHANNEL_KIND) as ChannelKind[]).map((k) => <option key={k} value={k}>{CHANNEL_KIND[k]}</option>)}</select></Field>
          <Field label="Publish every (days)"><input type="number" min={1} value={cad} onChange={(e) => setCad(e.target.value)} /></Field>
        </div>
        <Field label="URL"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
        <Field label="Metrics to track (comma-separated)"><input value={metrics} onChange={(e) => setMetrics(e.target.value)} /></Field>
        <div className="form-actions">
          {existing && <Button variant="ghost" className="danger" icon={Trash2} onClick={() => { if (confirm(`Delete ${existing.name} and all its pieces and metrics?`)) { deleteWithUndo(useStudio, () => deleteChannel(existing.id), 'Channel deleted'); onClose(); } }}>Delete</Button>}
          <span className="grow" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} disabled={!name.trim()}>{existing ? 'Save changes' : 'Add channel'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function LogMetricsModal({ channelId, onClose }: { channelId: ID | null; onClose: () => void }) {
  const { channels, snapshots, logSnapshot } = useStudio();
  const c = channelId ? channels[channelId] : undefined;
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => { setVals({}); }, [channelId]);
  if (!c) return null;
  const last = channelSnapshots(snapshots, c.id).at(-1);
  const submit = () => {
    const values: Record<string, number> = {};
    for (const k of c.metricKeys) { const v = vals[k]; if (v !== undefined && v !== '') values[k] = Number(v); else if (last?.values[k] !== undefined) values[k] = last.values[k]; }
    if (!Object.keys(values).length) return;
    logSnapshot(c.id, values); toast('Metrics logged'); onClose();
  };
  return (
    <Modal open onClose={onClose} title={`${c.name} · today's numbers`}>
      <div className="form">
        {c.metricKeys.map((k) => (
          <Field key={k} label={`${k}${last?.values[k] !== undefined ? ` · last ${last.values[k]}` : ''}`}>
            <input type="number" step="any" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder={last?.values[k] !== undefined ? String(last.values[k]) : '0'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </Field>
        ))}
        <p className="faint" style={{ fontSize: 12 }}>Blank fields keep the last value. One snapshot per day; logging again today overwrites.</p>
        <div className="form-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Log</Button></div>
      </div>
    </Modal>
  );
}
