/**
 * Genre themes for shelves. A theme drives the wall color behind the shelf, the wood of the plank,
 * and the palette the book spines are drawn from — so a shelf of thrillers looks like one, and a shelf
 * of Roman history looks like parchment and bronze.
 */
import type { Book } from './store';

export type ShelfTheme = 'research' | 'tech' | 'business' | 'thriller' | 'espionage' | 'history' | 'fantasy' | 'gaming' | 'networking' | 'literary' | 'default';

export interface ThemeSpec {
  label: string;
  emoji: string;
  /** Spine colors (CSS). Books are assigned deterministically from their hue seed. */
  palette: string[];
  /** Spine text color. */
  ink: string;
  /** Wall behind the books. */
  wall: string;
  /** Plank the books stand on. */
  wood: string;
  /** Accent used for progress bars / finished markers on this shelf. */
  accent: string;
  /** Optional decorative pattern over the wall. */
  pattern?: string;
  /** Typography for spine titles — genres have a typographic feel. */
  font: 'serif' | 'sans' | 'condensed' | 'italic' | 'mono' | 'wide';
  /** Warm/cool picture-light glow over the shelf. */
  light: string;
  /** A small object that sits on the shelf, and what it is (for the tooltip). */
  prop: { glyph: string; label: string };
}

export const SHELF_THEMES: Record<ShelfTheme, ThemeSpec> = {
  research: {
    label: 'Research & methods', emoji: '🔬',
    palette: ['#23303a', '#2c3d49', '#293c39', '#35413e', '#373445', '#1f2c36', '#34414a', '#263b30'],
    ink: '#e6f0ff', wall: 'linear-gradient(180deg, #0f1a2b, #0b1420)', wood: 'linear-gradient(180deg, #3b2f2a, #22191a)', accent: '#63b3ed',
    font: 'sans', light: 'rgba(99,179,237,.22)', prop: { glyph: '🔭', label: 'Brass telescope' },
    pattern: 'repeating-linear-gradient(90deg, rgba(99,179,237,.06) 0 1px, transparent 1px 24px), repeating-linear-gradient(0deg, rgba(99,179,237,.06) 0 1px, transparent 1px 24px)',
  },
  tech: {
    label: 'Tech & founders', emoji: '💻',
    palette: ['#282b2e', '#1e2020', '#474a49', '#d9d1bf', '#181817', '#683d34', '#6c6b62', '#e4dccb'],
    ink: '#f7fafc', wall: 'linear-gradient(180deg, #141518, #0c0d10)', wood: 'linear-gradient(180deg, #2b2b2e, #171719)', accent: '#a0aec0',
    font: 'condensed', light: 'rgba(226,232,240,.16)', prop: { glyph: '🖥️', label: 'Vintage terminal' },
    pattern: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1.5px) 0 0 / 18px 18px',
  },
  business: {
    label: 'Business & leadership', emoji: '📈',
    palette: ['#695133', '#80613e', '#2d3535', '#ad9264', '#5e3d2e', '#534326', '#916b41', '#232725'],
    ink: '#fffaf0', wall: 'linear-gradient(180deg, #1c1410, #120d0a)', wood: 'linear-gradient(180deg, #5a3a1f, #3a2412)', accent: '#f6ad55',
    pattern: 'repeating-linear-gradient(90deg, rgba(246,173,85,.05) 0 2px, transparent 2px 12px)',
    font: 'sans', light: 'rgba(246,173,85,.22)', prop: { glyph: '🪴', label: 'Desk plant' },
  },
  thriller: {
    label: 'Thrillers', emoji: '🕶️',
    palette: ['#742a2a', '#1a1a1a', '#9b2c2c', '#2d2d2d', '#c53030', '#3d0c0c', '#4a1c1c', '#111111'],
    ink: '#fff5f5', wall: 'linear-gradient(180deg, #160b0b, #0d0707)', wood: 'linear-gradient(180deg, #2f1f1a, #1a1210)', accent: '#fc8181',
    font: 'condensed', light: 'rgba(252,129,129,.16)', prop: { glyph: '🥃', label: 'A glass, neat' },
    pattern: 'repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 1px, transparent 1px 9px)',
  },
  espionage: {
    label: 'Espionage & war', emoji: '🕵️',
    palette: ['#3f4a2f', '#5c6b3f', '#2b2f1e', '#8a7a4a', '#4b5320', '#6b7048', '#a08c5a', '#2f3a2f'],
    ink: '#f5f1e3', wall: 'linear-gradient(180deg, #12150f, #0b0d09)', wood: 'linear-gradient(180deg, #4a3a26, #2d2418)', accent: '#c8b273',
    pattern: 'repeating-radial-gradient(circle at 30% 120%, rgba(200,178,115,.06) 0 1px, transparent 1px 26px)',
    font: 'mono', light: 'rgba(200,178,115,.2)', prop: { glyph: '🧭', label: 'Field compass' },
  },
  history: {
    label: 'History & classics', emoji: '🏛️',
    palette: ['#8b5e3c', '#b7791f', '#7b341e', '#d69e2e', '#6b4423', '#975a16', '#a0522d', '#5f370e'],
    ink: '#fdf6e3', wall: 'linear-gradient(180deg, #1c1811, #12100b)', wood: 'linear-gradient(180deg, #6b4a2e, #43301d)', accent: '#ecc94b',
    font: 'serif', light: 'rgba(236,201,75,.22)', prop: { glyph: '🏺', label: 'Amphora' },
    pattern: 'linear-gradient(105deg, transparent 40%, rgba(236,201,75,.05) 41%, transparent 43%), linear-gradient(80deg, transparent 60%, rgba(255,255,255,.03) 61%, transparent 64%)',
  },
  fantasy: {
    label: 'Fantasy & sci-fi', emoji: '🐉',
    palette: ['#44337a', '#553c9a', '#2c7a7b', '#6b46c1', '#1e3a5f', '#805ad5', '#234e52', '#9f7aea'],
    ink: '#faf5ff', wall: 'linear-gradient(180deg, #120f1f, #0a0814)', wood: 'linear-gradient(180deg, #33283f, #1f1828)', accent: '#d6bcfa',
    font: 'italic', light: 'rgba(214,188,250,.2)', prop: { glyph: '🔮', label: 'Crystal orb' },
    pattern: 'radial-gradient(rgba(255,255,255,.35) .6px, transparent 1px) 0 0 / 37px 29px, radial-gradient(rgba(214,188,250,.3) .5px, transparent 1px) 11px 17px / 53px 41px',
  },
  gaming: {
    label: 'Game worlds', emoji: '⚔️',
    palette: ['#1e3a8a', '#7c2d12', '#b45309', '#1e40af', '#3f3f46', '#a16207', '#0f766e', '#581c87'],
    ink: '#fef3c7', wall: 'linear-gradient(180deg, #0e1220, #080a14)', wood: 'linear-gradient(180deg, #3b2f24, #241c16)', accent: '#fbbf24',
    font: 'wide', light: 'rgba(251,191,36,.2)', prop: { glyph: '🛡️', label: 'Horde crest' },
    pattern: 'repeating-linear-gradient(60deg, rgba(251,191,36,.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(-60deg, rgba(251,191,36,.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, rgba(251,191,36,.04) 0 1px, transparent 1px 22px)',
  },
  networking: {
    label: 'Networking & security', emoji: '🛰️',
    palette: ['#0b4f8a', '#1c6fb5', '#0a3d62', '#155e75', '#1e293b', '#0e7490', '#0f3d5c', '#164e63'],
    ink: '#ecfeff', wall: 'linear-gradient(180deg, #0a1420, #060c14)', wood: 'linear-gradient(180deg, #2a3038, #181c22)', accent: '#22d3ee',
    font: 'mono', light: 'rgba(34,211,238,.18)', prop: { glyph: '📡', label: 'Antenna' },
    pattern: 'repeating-linear-gradient(90deg, rgba(34,211,238,.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, rgba(34,211,238,.05) 0 1px, transparent 1px 22px), radial-gradient(rgba(34,211,238,.35) 1px, transparent 2px) 11px 11px / 66px 66px',
  },
  literary: {
    label: 'Fiction', emoji: '📖',
    palette: ['#4a5568', '#805ad5', '#2c7a7b', '#c05621', '#2b6cb0', '#b83280', '#276749', '#975a16'],
    ink: '#f7fafc', wall: 'linear-gradient(180deg, #151318, #0d0c10)', wood: 'linear-gradient(180deg, #4a3728, #2d2118)', accent: '#e8b04b',
    font: 'serif', light: 'rgba(232,176,75,.18)', prop: { glyph: '🕯️', label: 'Reading candle' },
  },
  default: {
    label: 'General', emoji: '📚',
    palette: ['#4a4e69', '#22223b', '#9a8c98', '#4a5568', '#2c5282', '#744210', '#22543d', '#702459'],
    ink: '#f7fafc', wall: 'linear-gradient(180deg, #14161c, #0d0f14)', wood: 'linear-gradient(180deg, #3a2e28, #221b18)', accent: '#e8b04b',
    font: 'sans', light: 'rgba(232,176,75,.16)', prop: { glyph: '🌿', label: 'Sprig' },
  },
};

export const THEME_KEYS = Object.keys(SHELF_THEMES) as ShelfTheme[];

/** Best-guess theme from a shelf name, used for shelves created before themes existed. */
export function themeForShelfName(name: string): ShelfTheme {
  const n = name.toLowerCase();
  if (/office .*top|research|method/.test(n)) return 'research';
  if (/office .*middle|tech|founder/.test(n)) return 'tech';
  if (/office .*bottom|business|leader/.test(n)) return 'business';
  if (/living room .*1|thriller|clancy/.test(n)) return 'thriller';
  if (/living room .*2|living room .*3|spy|espionage|war/.test(n)) return 'espionage';
  if (/living room .*4|warcraft|game/.test(n)) return 'gaming';
  if (/living room .*5|rome|history|classic/.test(n)) return 'history';
  if (/living room .*6|cisco|network|ccnp|cissp/.test(n)) return 'networking';
  if (/fantasy|sci-?fi/.test(n)) return 'fantasy';
  if (/fiction|novel/.test(n)) return 'literary';
  return 'default';
}

/** Relative luminance of a #rrggbb color (0 = black, 1 = white). */
function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Deterministic spine look for a book on a themed shelf. Ink flips dark on pale spines so titles stay legible. */
export function spineStyle(book: Book, theme: ThemeSpec, index: number): React.CSSProperties {
  const base = theme.palette[(book.hue + index * 3) % theme.palette.length];
  const ink = luminance(base) > 0.45 ? '#1a1a1f' : theme.ink;
  const height = 150 + ((book.hue * 7 + book.pages) % 36);            // 150–186px, varies like real books
  const width = Math.max(22, Math.min(46, 18 + Math.round(book.pages / 28))); // thicker for longer books
  return {
    '--spine': base,
    '--ink': ink,
    height, width,
  } as React.CSSProperties;
}

/** Which of the spine designs a book gets: 0 plain, 1 banded, 2 label box, 3 striped, 4 foil-block. Deterministic per book. */
export function spineVariant(book: Book): number {
  return (book.hue + book.pages + book.title.length) % 5;
}
