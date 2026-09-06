import { Check, Minus, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';
import type { Domain, Lens } from '@/core/types';

/* ── Buttons ─────────────────────────────────────────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  iconOnly?: boolean;
};
export function Button({ variant = 'default', size = 'md', icon: Icon, iconOnly, className = '', children, ...rest }: BtnProps) {
  const cls = ['btn', variant !== 'default' ? variant : '', size === 'sm' ? 'sm' : '', iconOnly ? 'icon' : '', className].join(' ');
  return (
    <button className={cls} {...rest}>
      {Icon && <Icon />}
      {!iconOnly && children}
    </button>
  );
}

/* ── Card ────────────────────────────────────────────── */
export function Card({
  title, icon: Icon, action, children, className = '', accent, tint, style,
}: { title?: ReactNode; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string; accent?: string; tint?: string; style?: React.CSSProperties }) {
  const vars = { ...(accent ? { '--card-accent': accent } : {}), ...(tint ? { '--card-tint': tint } : {}), ...style } as React.CSSProperties;
  return (
    <section className={`card ${tint ? 'tinted' : ''} ${className}`} style={vars}>
      {(title || action) && (
        <header className="card-head">
          <div className="card-title">{Icon && <Icon />}{title}</div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ── Check ───────────────────────────────────────────── */
export function CheckBox({ on, onToggle, round, large, label }: { on: boolean; onToggle: () => void; round?: boolean; large?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label ?? (on ? 'Mark incomplete' : 'Mark complete')}
      className={`check ${on ? 'on' : ''} ${round ? 'round' : ''} ${large ? 'lg' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <Check strokeWidth={3} />
    </button>
  );
}

/* ── Chips ───────────────────────────────────────────── */
export function Chip({ children, tone, icon: Icon, onClick, title }: { children: ReactNode; tone?: 'personal' | 'business' | 'accent' | 'danger' | 'success'; icon?: LucideIcon; onClick?: () => void; title?: string }) {
  return (
    <span className={`chip ${tone ?? ''} ${onClick ? 'clickable' : ''}`} onClick={onClick} title={title}>
      {Icon && <Icon />}{children}
    </span>
  );
}
export function DomainChip({ domain }: { domain: Domain }) {
  return <Chip tone={domain}>{domain === 'personal' ? 'Personal' : 'Business'}</Chip>;
}

/* ── Lens switch (global Personal / Business filter) ── */
export function LensSwitch({ value, onChange }: { value: Lens; onChange: (l: Lens) => void }) {
  const opts: { v: Lens; label: string; color?: string }[] = [
    { v: 'all', label: 'Everything' },
    { v: 'personal', label: 'Personal', color: 'var(--personal)' },
    { v: 'business', label: 'Business', color: 'var(--business)' },
  ];
  return (
    <div className="lens" role="tablist" aria-label="Life lens">
      {opts.map((o) => (
        <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'active' : ''} onClick={() => onChange(o.v)}>
          {o.color && <span className="dot" style={{ background: o.color }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Segmented control ───────────────────────────────── */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon }[] }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon />}{o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Progress ────────────────────────────────────────── */
export function Bar({ value, max = 1, color, thin }: { value: number; max?: number; color?: string; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`bar ${thin ? 'thin' : ''}`} style={color ? ({ '--bar-color': color } as React.CSSProperties) : undefined}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, max = 1, size = 96, stroke = 8, color = 'var(--accent)', label, sub }: { value: number; max?: number; size?: number; stroke?: number; color?: string; label?: ReactNode; sub?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-hover)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`} style={{ transition: 'stroke-dasharray .6s var(--ease)' }} />
      </svg>
      <div className="ring-label"><b>{label}</b>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, step = 1, unit }: { value: number; onChange: (v: number) => void; min?: number; step?: number; unit?: string }) {
  return (
    <div className="stepper">
      <button aria-label="Decrease" onClick={() => onChange(Math.max(min, value - step))}><Minus size={14} /></button>
      <span>{value}{unit ? ` ${unit}` : ''}</span>
      <button aria-label="Increase" onClick={() => onChange(value + step)}><Plus size={14} /></button>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────── */
export function Empty({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon />
      <strong>{title}</strong>
      {hint && <span style={{ fontSize: 13 }}>{hint}</span>}
      {action}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────── */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/* ── Form bits ───────────────────────────────────────── */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
      {children}
    </label>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return <div className="stat"><b>{value}</b><small>{label}</small></div>;
}

/* ── Page header ─────────────────────────────────────── */
export function PageHead({ eyebrow, title, lead, action }: { eyebrow?: string; title: ReactNode; lead?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action && <div className="row">{action}</div>}
    </div>
  );
}

/* ── Sparkline ───────────────────────────────────────── */
export function Sparkline({ data, color = 'var(--accent)', width = 64, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={height - 2 - ((data[data.length - 1] - min) / span) * (height - 4)} r={2.2} fill={color} />
    </svg>
  );
}
