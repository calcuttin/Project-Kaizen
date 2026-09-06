import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw, Settings2, Shuffle, Trash2 } from 'lucide-react';
import { CabinetScene } from './CabinetScene';
import { LibraryDialog } from './LibraryDialog';
import { OBJECTS, ENVIRONMENTS, CABINET_LIGHTS, OBJECT_CATEGORIES, findCabinetObjects, type ObjectCategory, cabinetSettings, type CabinetSettings, type CabinetObject, type CabinetObjects } from './cabinet';
import { SHELF_THEMES, THEME_KEYS, type ShelfTheme } from './themes';
import { useLibrary, type Shelf } from './store';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const query = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReduced(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update); }, []);
  return reduced;
}

export function ShelfScene({ shelf, themeKey, count, finished, children, atmosphere, onComputer, onDeleteShelf }: { shelf: Shelf | null; themeKey: ShelfTheme; count: number; finished: number; children: ReactNode; atmosphere: boolean; onComputer: () => void; onDeleteShelf: (s: Shelf) => void }) {
  const theme = SHELF_THEMES[themeKey], environment = ENVIRONMENTS[themeKey];
  const name = shelf?.name ?? 'Unshelved';
  const objects = shelf?.objects ?? environment.objects;
  const settings = cabinetSettings(shelf?.cabinet);
  const reducedMotion = useReducedMotion();
  const [objectQuery, setObjectQuery] = useState('');
  const [objectCategory, setObjectCategory] = useState<ObjectCategory>('All objects');
  const matchingObjects = findCabinetObjects(objectQuery, objectCategory);
  const [editing, setEditing] = useState(false), [slot, setSlot] = useState<0 | 1>(0), [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false), [canLeft, setCanLeft] = useState(false), [canRight, setCanRight] = useState(false);
  const root = useRef<HTMLElement>(null), rail = useRef<HTMLDivElement>(null);
  const setShelfTheme = useLibrary((s) => s.setShelfTheme), setShelfObjects = useLibrary((s) => s.setShelfObjects);
  const setShelfCabinet = useLibrary((s) => s.setShelfCabinet);
  const updateCabinet = (patch: Partial<CabinetSettings>) => { if (shelf) setShelfCabinet(shelf.id, { ...settings, ...patch }); };
  const moving = atmosphere && !reducedMotion && !paused;
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
      {shelf && <button className="cabinet-change" onClick={() => setEditing(true)}><Settings2 size={13} />Curate cabinet</button>}
      <CabinetScene objects={objects} settings={settings} moving={moving && active} onComputer={onComputer} />
      <div className="cabinet-actions">{objects.includes('orrery') && <button disabled={!atmosphere} onClick={() => setPaused((p) => !p)} title={!atmosphere ? 'Enable atmosphere to animate the solar system' : undefined}>{paused || !atmosphere ? <Play size={11} /> : <Pause size={11} />}{paused || !atmosphere ? 'Play orbit' : 'Pause orbit'}</button>}{objects.includes('computer') && <button onClick={onComputer}><Play size={11} />Use computer</button>}</div>
    </aside>
    <LibraryDialog open={editing} onClose={() => setEditing(false)} title={`Curate ${name}`} className="cabinet-curator">
      <p className="cabinet-editor-lead">A small world beside your books. Choose its objects, light, and depth.</p>
      <div className="cabinet-curator-grid">
        <div className="cabinet-preview-column">
          <CabinetScene className="cabinet-preview" objects={objects} settings={settings} moving={moving && editing} selectedSlot={slot} onSelect={setSlot} />
          <div className="cabinet-preview-caption"><span>LIVE PREVIEW</span><p>Select an object in the cabinet to replace it.{moving && ' Move your pointer across the scene to explore its depth.'}</p></div>
          {objects.includes('computer') && <button className="btn ghost" onClick={() => { setEditing(false); onComputer(); }}><Play size={14} />Use the Apple II</button>}
        </div>
        <div className="cabinet-controls">
          <h3>1. Make it yours</h3>
          <div className="cabinet-slot-tabs" role="group" aria-label="Object position">{([0, 1] as const).map((i) => <button key={i} aria-pressed={slot === i} onClick={() => setSlot(i)}>{i === 0 ? 'Left object' : 'Right object'}<span>{OBJECTS[objects[i]].name}</span></button>)}</div>
          <div className="object-browser-tools"><input type="search" aria-label="Search cabinet objects" placeholder="Find an object…" value={objectQuery} onChange={(e) => setObjectQuery(e.target.value)} /><select aria-label="Object category" value={objectCategory} onChange={(e) => setObjectCategory(e.target.value as ObjectCategory)}>{OBJECT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
          <div className="object-picker" role="group" aria-label="Collectibles">{matchingObjects.map((object) => <button key={object} aria-label={OBJECTS[object].name} title={OBJECTS[object].detail} onClick={() => selectObject(object)} aria-pressed={objects[slot] === object} className={objects[slot] === object ? 'selected' : ''}>{OBJECTS[object].image ? <img className={object === 'computer' ? 'computer-thumb' : ''} src={OBJECTS[object].image} alt="" loading="lazy" /> : <span className="empty-object-icon"><Shuffle size={24} /></span>}<strong>{OBJECTS[object].name}</strong><small>{OBJECTS[object].detail}</small></button>)}</div>
          {!matchingObjects.length && <p className="object-no-results">No objects found. <button className="btn sm ghost" onClick={() => { setObjectQuery(''); setObjectCategory('All objects'); }}>Clear object filters</button></p>}
          <div className="object-selection-note"><p><strong>{OBJECTS[objects[slot]].name}</strong><span>{OBJECTS[objects[slot]].detail}</span></p><button className="btn sm ghost" onClick={() => selectObject('none')} aria-pressed={objects[slot] === 'none'}>Leave some space</button></div>
          <h3>2. Set the mood</h3>
          <div className="cabinet-light-options" role="group" aria-label="Cabinet lighting">{CABINET_LIGHTS.map((light) => <button key={light.id} data-light={light.id} aria-pressed={settings.lighting === light.id} onClick={() => updateCabinet({ lighting: light.id })}><span className="light-swatch" aria-hidden="true" /><strong>{light.name}</strong><small>{light.detail}</small></button>)}</div>
          <label className="cabinet-brightness">Light level <output>{settings.brightness}%</output><input type="range" aria-label="Cabinet light level" min="35" max="100" step="5" value={settings.brightness} onChange={(e) => updateCabinet({ brightness: Number(e.target.value) })} /></label>
          <div className="cabinet-layout-options" role="group" aria-label="Object arrangement"><button aria-pressed={settings.layout === 'layered'} onClick={() => updateCabinet({ layout: 'layered' })}><strong>Layered</strong><small>Near and far, with depth</small></button><button aria-pressed={settings.layout === 'balanced'} onClick={() => updateCabinet({ layout: 'balanced' })}><strong>Side by side</strong><small>A balanced pair</small></button></div>
          <div className="cabinet-settings"><label><Settings2 size={14} />Shelf environment<select value={themeKey} onChange={(e) => shelf && setShelfTheme(shelf.id, e.target.value as ShelfTheme)}>{THEME_KEYS.map((key) => <option key={key} value={key}>{SHELF_THEMES[key].label}</option>)}</select></label><button className="btn sm ghost" onClick={() => { if (shelf) { setShelfObjects(shelf.id, undefined); setShelfCabinet(shelf.id, undefined); } }}><RotateCcw size={13} />Restore defaults</button></div>
        </div>
      </div>
      <div className="cabinet-editor-footer"><button className="btn sm ghost" onClick={() => { if (shelf) { setEditing(false); onDeleteShelf(shelf); } }}><Trash2 size={13} />Remove shelf</button><span>Changes save automatically</span><button className="btn primary" onClick={() => setEditing(false)}>Done</button></div>
    </LibraryDialog>
  </section>;
}
