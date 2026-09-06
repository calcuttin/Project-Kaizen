import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw, Settings2, Shuffle, Trash2 } from 'lucide-react';
import { LibraryDialog } from './LibraryDialog';
import { OBJECTS, ENVIRONMENTS, type CabinetObject, type CabinetObjects } from './cabinet';
import { SHELF_THEMES, THEME_KEYS, type ShelfTheme } from './themes';
import { useLibrary, type Shelf } from './store';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const query = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update); }, []);
  return reduced;
}

function Artifact({ object, paused, onComputer }: { object: CabinetObject; paused: boolean; onComputer: () => void }) {
  if (object === 'none') return null;
  if (object === 'computer') return <button className="artifact artifact-computer" onClick={onComputer} aria-label="Use Apple II computer">
    <img src={OBJECTS.computer.image} alt="Beige Apple II computer" loading="lazy" draggable={false} />
    <span className="mini-crt"><span>APPLE II</span><span>] PRINT &quot;HELLO&quot;</span><span>HELLO</span><span>] <i className="crt-cursor" /></span></span>
  </button>;
  if (object === 'orrery') return <div className="artifact artifact-orrery" title="Brass solar system"><img className="orrery-base" src="/library/objects/orrery-base.png" alt="" loading="lazy" /><div className="orbit-plane"><img className="orbit-disk" src={OBJECTS.orrery.image} alt="Brass solar system with eight planets" loading="lazy" draggable={false} style={{ animationPlayState: paused ? 'paused' : undefined }} /></div></div>;
  return <div className={`artifact artifact-${object}`} title={OBJECTS[object].name}><img src={OBJECTS[object].image} alt={OBJECTS[object].name} loading="lazy" draggable={false} /></div>;
}

export function ShelfScene({ shelf, themeKey, count, finished, children, atmosphere, onComputer, onDeleteShelf }: { shelf: Shelf | null; themeKey: ShelfTheme; count: number; finished: number; children: ReactNode; atmosphere: boolean; onComputer: () => void; onDeleteShelf: (s: Shelf) => void }) {
  const theme = SHELF_THEMES[themeKey], environment = ENVIRONMENTS[themeKey];
  const name = shelf?.name ?? 'Unshelved';
  const objects = shelf?.objects ?? environment.objects;
  const [editing, setEditing] = useState(false), [slot, setSlot] = useState<0 | 1>(0), [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false), [canLeft, setCanLeft] = useState(false), [canRight, setCanRight] = useState(false);
  const root = useRef<HTMLElement>(null), rail = useRef<HTMLDivElement>(null);
  const setShelfTheme = useLibrary((s) => s.setShelfTheme), setShelfObjects = useLibrary((s) => s.setShelfObjects);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '60px' });
    observer.observe(root.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = rail.current; if (!element) return;
    const update = () => { setCanLeft(element.scrollLeft > 2); setCanRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 2); };
    update(); const observer = new ResizeObserver(update); observer.observe(element);
    element.addEventListener('scroll', update, { passive: true }); return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, [children]);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .7, behavior: atmosphere ? 'smooth' : 'auto' });
  const selectObject = (object: CabinetObject) => { if (!shelf) return; const next = [...objects] as CabinetObjects; next[slot] = object; setShelfObjects(shelf.id, next); };
  return <section ref={root} className={`world-shelf font-${theme.font} world-${themeKey}`} data-moving={atmosphere && active} style={{ '--scene': `url('/library/environments/${environment.image}.png')`, '--shelf-accent': theme.accent } as CSSProperties} aria-label={`${theme.label} — ${name}`}>
    <div className="world-main">
      <div className="world-environment" aria-hidden="true" />
      <div className="world-label"><span className="world-index">THE COLLECTION</span><h2>{theme.label}</h2><span className="world-count"><BookOpen size={12} /> {count} {count === 1 ? 'book' : 'books'}{finished > 0 && ` · ${finished} read`}</span><span className="world-location"><MapPin size={12} />{name}</span><span className="world-mood">{environment.mood}</span></div>
      <div className="world-books">
        <div className="world-book-tools"><span>{canLeft || canRight ? 'Explore the shelf' : 'Pick a spine. Step inside.'}</span><div><button disabled={!canLeft} onClick={() => scroll(-1)} aria-label={`Previous books on ${name}`}><ChevronLeft size={15} /></button><button disabled={!canRight} onClick={() => scroll(1)} aria-label={`Next books on ${name}`}><ChevronRight size={15} /></button></div></div>
        <div ref={rail} className="world-book-rail" tabIndex={0} aria-label={`Books on ${name}`}><div className="shelf-row">{children}</div></div>
      </div>
      <div className="world-plank"><span className="plaque">{name}</span></div>
    </div>
    <aside className="world-cabinet" aria-label={`Display cabinet for ${name}`}>
      <div className="cabinet-wall" aria-hidden="true" />
      {shelf && <button className="cabinet-change" onClick={() => setEditing(true)}><Shuffle size={12} />Change objects</button>}
      <div className={`cabinet-objects ${objects.filter((o) => o !== 'none').length > 1 ? 'paired' : 'single'}`}>
        {objects.map((object, i) => <Artifact key={`${i}-${object}`} object={object} paused={paused} onComputer={onComputer} />)}
        {objects.every((o) => o === 'none') && <span className="cabinet-empty">A little room<br />for something you love.</span>}
      </div>
      <div className="cabinet-actions">{objects.includes('orrery') && <button disabled={!atmosphere} onClick={() => setPaused((p) => !p)} title={!atmosphere ? 'Enable atmosphere to animate the solar system' : undefined}>{paused || !atmosphere ? <Play size={11} /> : <Pause size={11} />}{paused || !atmosphere ? 'Play orbit' : 'Pause orbit'}</button>}{objects.includes('computer') && <button onClick={onComputer}><Play size={11} />Use computer</button>}</div>
    </aside>
    <LibraryDialog open={editing} onClose={() => setEditing(false)} title={`Curate ${name}`}>
      <p className="cabinet-editor-lead">Small objects. A shelf that feels like yours.</p>
      <div className="cabinet-slot-tabs" role="group" aria-label="Object position">{([0, 1] as const).map((i) => <button key={i} aria-pressed={slot === i} onClick={() => setSlot(i)}>{i === 0 ? 'Left object' : 'Right object'}<span>{OBJECTS[objects[i]].name}</span></button>)}</div>
      <div className="object-picker">{(Object.keys(OBJECTS) as CabinetObject[]).map((object) => <button key={object} onClick={() => selectObject(object)} aria-pressed={objects[slot] === object} className={objects[slot] === object ? 'selected' : ''}>{OBJECTS[object].image ? <img className={object === 'computer' ? 'computer-thumb' : ''} src={OBJECTS[object].image} alt="" /> : <span className="empty-object-icon"><Shuffle size={24} /></span>}<strong>{OBJECTS[object].name}</strong><small>{OBJECTS[object].detail}</small></button>)}</div>
      <div className="cabinet-settings"><label><Settings2 size={14} />Shelf environment<select value={themeKey} onChange={(e) => shelf && setShelfTheme(shelf.id, e.target.value as ShelfTheme)}>{THEME_KEYS.map((key) => <option key={key} value={key}>{SHELF_THEMES[key].label}</option>)}</select></label><button className="btn sm ghost" onClick={() => shelf && setShelfObjects(shelf.id, undefined)}><RotateCcw size={13} />Restore genre objects</button></div>
      <div className="cabinet-editor-footer"><button className="btn sm ghost" onClick={() => { if (shelf) { setEditing(false); onDeleteShelf(shelf); } }}><Trash2 size={13} />Remove shelf</button><span>Changes saved automatically</span><button className="btn primary" onClick={() => setEditing(false)}>Done</button></div>
    </LibraryDialog>
  </section>;
}
