import { Fragment, useEffect, useId, useRef, type CSSProperties, type PointerEvent } from 'react';
import { OBJECTS, OBJECT_DISPLAY, cabinetSettings, type CabinetObject, type CabinetObjects, type CabinetSettings } from './cabinet';

function Artifact({ object, moving }: { object: CabinetObject; moving: boolean }) {
  if (object === 'none') return null;
  if (object === 'computer') return <div className="artifact artifact-computer">
    <img src={OBJECTS.computer.image} alt="Beige Apple II computer" loading="lazy" draggable={false} />
    <span className="mini-crt"><span>APPLE II</span><span>] PRINT &quot;HELLO&quot;</span><span>HELLO</span><span>] <i className="crt-cursor" /></span></span>
  </div>;
  if (object === 'orrery') return <div className="artifact artifact-orrery"><img className="orrery-base" src="/library/objects/orrery-base.png" alt="" loading="lazy" /><div className="orbit-plane"><img className="orbit-disk" src={OBJECTS.orrery.image} alt="Brass solar system with eight planets" loading="lazy" draggable={false} style={{ animationPlayState: moving ? 'running' : 'paused' }} /></div></div>;
  return <div className={`artifact artifact-${object}`}><img src={OBJECTS[object].image} alt={OBJECTS[object].name} loading="lazy" draggable={false} /></div>;
}

/** Separate scene, object and shadow planes share a small, bounded pointer offset. */
export function CabinetScene({ objects, settings, moving, selectedSlot, onSelect, onComputer, className = '' }: {
  objects: CabinetObjects; settings?: CabinetSettings; moving: boolean; selectedSlot?: 0 | 1;
  onSelect?: (slot: 0 | 1) => void; onComputer?: () => void; className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const cutoutId = `cabinet-cutout-${useId().replaceAll(':', '')}`;
  const options = cabinetSettings(settings);
  const count = objects.filter((object) => object !== 'none').length;
  const reset = () => { root.current?.style.setProperty('--look-x', '0'); root.current?.style.setProperty('--look-y', '0'); };
  useEffect(() => { if (!moving) reset(); }, [moving]);
  const look = (event: PointerEvent<HTMLDivElement>) => {
    if (!moving || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--look-x', String(Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2))));
    event.currentTarget.style.setProperty('--look-y', String(Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2))));
  };
  return <div ref={root} className={`cabinet-scene ${className}`} data-light={options.lighting} data-layout={options.layout} data-count={count} data-moving={moving} style={{ '--cabinet-brightness': options.brightness / 100, '--object-cutout': `url(#${cutoutId})` } as CSSProperties} onPointerMove={look} onPointerLeave={reset}>
    <svg className="cabinet-filter-defs" aria-hidden="true" width="0" height="0"><defs><filter id={cutoutId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  12 12 12 0 0" /></filter></defs></svg>
    <img className="cabinet-interior" src="/library/cabinets/walnut-niche.png" alt="" loading="lazy" draggable={false} />
    <div className="cabinet-light-wash" aria-hidden="true" />
    {objects.map((object, i) => {
      const slot = i as 0 | 1;
      const display = OBJECT_DISPLAY[object];
      const artStyle = { '--object-scale': display?.scale ?? 1, '--object-lift': `${(display?.lift ?? 0) * 100}%`, '--contact-width': `${(display?.shadow ?? .6) * 100}%` } as CSSProperties;
      if (object === 'none' && !onSelect) return null;
      const canUseComputer = object === 'computer' && onComputer && !onSelect;
      const label = onSelect ? `Choose ${i === 0 ? 'left' : 'right'} object: ${OBJECTS[object].name}` : canUseComputer ? 'Use Apple II computer' : OBJECTS[object].name;
      const content = <><Artifact object={object} moving={moving} />{object === 'none' && <span className="cabinet-vacancy">Choose an object</span>}<span className="cabinet-object-label">{OBJECTS[object].name}</span></>;
      return <Fragment key={slot}><div className="cabinet-placement cabinet-shadow" data-slot={slot} data-object={object} style={artStyle} aria-hidden="true"><span className="artifact-contact" /></div>{onSelect || canUseComputer ? <button type="button" key={slot} className="cabinet-placement" data-slot={slot} data-object={object} style={artStyle} aria-label={label} aria-pressed={onSelect ? selectedSlot === slot : undefined} onClick={() => onSelect ? onSelect(slot) : onComputer?.()}>{content}</button> : <div key={slot} className="cabinet-placement" data-slot={slot} data-object={object} style={artStyle} tabIndex={0} aria-label={label}>{content}</div>}</Fragment>;
    })}
    {!count && !onSelect && <p className="cabinet-empty">A little room for<br />something you love.</p>}
    <div className="cabinet-front-edge" aria-hidden="true" />
  </div>;
}
