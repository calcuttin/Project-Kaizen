import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface Anchor { x: number; y: number }

/**
 * A popover that opens at the point the user clicked, flips to stay inside the viewport,
 * and collapses to a bottom sheet on narrow screens.
 */
export function Popover({ anchor, onClose, children, width = 400, label }: { anchor: Anchor | null; onClose: () => void; children: ReactNode; width?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrowLeft?: number; arrowTop?: number; side: 'right' | 'left' | 'sheet' } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw < 760) { setPos({ left: 0, top: 0, side: 'sheet' }); return; }
    const rect = ref.current.getBoundingClientRect();
    const h = rect.height, w = Math.min(width, vw - 32);
    const gap = 14;
    const fitsRight = anchor.x + gap + w <= vw - 12;
    const left = fitsRight ? anchor.x + gap : Math.max(12, anchor.x - gap - w);
    let top = anchor.y - Math.min(56, h / 3);
    top = Math.max(12, Math.min(top, vh - h - 12));
    setPos({ left, top, side: fitsRight ? 'right' : 'left', arrowTop: Math.max(14, Math.min(anchor.y - top, h - 14)) });
  }, [anchor, width, children]);

  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener('keydown', onKey);
    // Defer so the opening click doesn't immediately close it.
    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); window.removeEventListener('mousedown', onDown); };
  }, [anchor, onClose]);

  if (!anchor) return null;
  const sheet = pos?.side === 'sheet';
  // Portal to <body>: an animated/transformed ancestor would otherwise become the containing block for position: fixed.
  return createPortal(
    <div ref={ref} role="dialog" aria-label={label} className={`popover ${sheet ? 'sheet' : ''} ${pos ? 'ready' : ''}`}
      style={sheet ? undefined : { left: pos?.left ?? anchor.x, top: pos?.top ?? anchor.y, width: Math.min(width, window.innerWidth - 32) }}>
      {!sheet && pos && <span className={`popover-arrow ${pos.side}`} style={{ top: pos.arrowTop }} />}
      {children}
    </div>,
    document.body,
  );
}
