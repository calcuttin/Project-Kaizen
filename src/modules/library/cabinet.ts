import type { ShelfTheme } from './themes';

export type CabinetObject = 'orrery' | 'computer' | 'wafer' | 'dragon' | 'bust' | 'lantern' | 'chessClock' | 'cipherMachine' | 'romanHelmet' | 'detectiveFolio' | 'networkSwitch' | 'fountainPen' | 'crystalD20' | 'compassMap' | 'typewriter' | 'arcadeJoystick' | 'globe' | 'hourglass' | 'bonsai' | 'fossil' | 'camera' | 'tea' | 'none';
export type CabinetObjects = [CabinetObject, CabinetObject];

export const OBJECTS: Record<CabinetObject, { name: string; detail: string; image?: string }> = {
  orrery: { name: 'Solar system', detail: 'A brass miniature, always in orbit.', image: '/library/objects/orrery.png' },
  computer: { name: 'Apple II', detail: 'A little BASIC. A lot of possibility.', image: '/library/objects/apple-ii.png' },
  wafer: { name: 'Silicon wafer', detail: 'A rainbow hidden in the circuitry.', image: '/library/objects/wafer.png' },
  dragon: { name: 'Bronze dragon', detail: 'A guardian for other worlds.', image: '/library/objects/dragon-v2.png' },
  bust: { name: 'Marble bust', detail: 'A quiet companion from antiquity.', image: '/library/objects/bust-v2.png' },
  lantern: { name: 'Reading lantern', detail: 'One small pool of warm light.', image: '/library/objects/lantern.png' },
  chessClock: { name: 'Chess clock', detail: 'For the next decisive move.', image: '/library/objects/chess-clock.png' },
  cipherMachine: { name: 'Cipher machine', detail: 'A secret in every turn.', image: '/library/objects/cipher-machine.png' },
  romanHelmet: { name: 'Roman helmet', detail: 'A relic of the republic.', image: '/library/objects/roman-helmet.png' },
  detectiveFolio: { name: 'Detective folio', detail: 'The clue is in the margins.', image: '/library/objects/detective-folio.png' },
  networkSwitch: { name: 'Network switch', detail: 'Signals waiting to connect.', image: '/library/objects/network-switch.png' },
  fountainPen: { name: 'Fountain pen', detail: 'For a line worth keeping.', image: '/library/objects/fountain-pen.png' },
  crystalD20: { name: 'Crystal D20', detail: 'A little luck for the next quest.', image: '/library/objects/crystal-d20.png' },
  compassMap: { name: 'Compass & map', detail: 'For the road beyond the shelf.', image: '/library/objects/compass-map.png' },
  typewriter: { name: 'Typewriter', detail: 'A blank page, then a beginning.', image: '/library/objects/typewriter.png' },
  arcadeJoystick: { name: 'Arcade joystick', detail: 'One more life, one more try.', image: '/library/objects/arcade-joystick.png' },
  globe: { name: 'Antique globe', detail: 'A whole world within reach.', image: '/library/objects/globe.png' },
  hourglass: { name: 'Brass hourglass', detail: 'A reminder to take your time.', image: '/library/objects/hourglass.png' },
  bonsai: { name: 'Bonsai pine', detail: 'Small growth, shaped with patience.', image: '/library/objects/bonsai.png' },
  fossil: { name: 'Ammonite fossil', detail: 'A spiral carrying deep time.', image: '/library/objects/fossil.png' },
  camera: { name: 'Vintage camera', detail: 'For the moments worth noticing.', image: '/library/objects/camera.png' },
  tea: { name: 'Celadon tea cup', detail: 'A quiet pause between chapters.', image: '/library/objects/tea.png' },
  none: { name: 'Leave some space', detail: 'A little room to breathe.' },
};

export const ENVIRONMENTS: Record<ShelfTheme, { image: string; mood: string; objects: CabinetObjects }> = {
  research: { image: 'research', mood: 'The observatory', objects: ['typewriter', 'orrery'] },
  tech: { image: 'tech', mood: 'The inventor’s workshop', objects: ['computer', 'wafer'] },
  business: { image: 'study', mood: 'The strategist’s study', objects: ['chessClock', 'fountainPen'] },
  thriller: { image: 'noir', mood: 'After midnight', objects: ['detectiveFolio', 'compassMap'] },
  espionage: { image: 'espionage', mood: 'The map room', objects: ['cipherMachine', 'compassMap'] },
  history: { image: 'history', mood: 'Echoes of antiquity', objects: ['romanHelmet', 'bust'] },
  fantasy: { image: 'fantasy', mood: 'Beyond the known world', objects: ['dragon', 'crystalD20'] },
  gaming: { image: 'fantasy', mood: 'Realms of possibility', objects: ['arcadeJoystick', 'crystalD20'] },
  networking: { image: 'tech', mood: 'Signals in the dark', objects: ['networkSwitch', 'computer'] },
  literary: { image: 'study', mood: 'A room of one’s own', objects: ['typewriter', 'fountainPen'] },
  default: { image: 'study', mood: 'The reading room', objects: ['compassMap', 'lantern'] },
};

export type CabinetLighting = 'warm' | 'moonlight' | 'candle';
export type CabinetLayout = 'layered' | 'balanced';
export type CabinetSettings = { lighting: CabinetLighting; layout: CabinetLayout; brightness: number };
export const DEFAULT_CABINET: CabinetSettings = { lighting: 'warm', layout: 'layered', brightness: 85 };
export const CABINET_LIGHTS: { id: CabinetLighting; name: string; detail: string }[] = [
  { id: 'warm', name: 'Gallery', detail: 'Warm pools of light' },
  { id: 'moonlight', name: 'Moonlight', detail: 'A cool, quiet evening' },
  { id: 'candle', name: 'Candlelit', detail: 'An intimate amber glow' },
];
export function cabinetSettings(value?: Partial<CabinetSettings>): CabinetSettings {
  return { lighting: CABINET_LIGHTS.some((light) => light.id === value?.lighting) ? value!.lighting! : DEFAULT_CABINET.lighting, layout: value?.layout === 'balanced' ? 'balanced' : 'layered', brightness: Math.max(35, Math.min(100, Number.isFinite(value?.brightness) ? value!.brightness! : DEFAULT_CABINET.brightness)) };
}

export const OBJECT_CATEGORIES = ['All objects', 'Study', 'Science & nature', 'History & fantasy', 'Technology'] as const;
export type ObjectCategory = typeof OBJECT_CATEGORIES[number];
export const OBJECT_GROUPS: Record<Exclude<ObjectCategory, 'All objects'>, CabinetObject[]> = {
  Study: ['typewriter', 'fountainPen', 'lantern', 'chessClock', 'detectiveFolio', 'compassMap', 'tea'],
  'Science & nature': ['orrery', 'wafer', 'globe', 'hourglass', 'bonsai', 'fossil'],
  'History & fantasy': ['dragon', 'bust', 'romanHelmet', 'crystalD20'],
  Technology: ['computer', 'cipherMachine', 'networkSwitch', 'arcadeJoystick', 'camera'],
};
export function findCabinetObjects(query: string, category: ObjectCategory): CabinetObject[] {
  const candidates = category === 'All objects' ? Object.keys(OBJECTS) as CabinetObject[] : OBJECT_GROUPS[category];
  const term = query.trim().toLocaleLowerCase();
  return candidates.filter((id) => id !== 'none' && `${OBJECTS[id].name} ${OBJECTS[id].detail}`.toLocaleLowerCase().includes(term));
}

/** Art direction per object: align each photograph's base with its contact shadow. */
export const OBJECT_DISPLAY: Partial<Record<CabinetObject, { scale: number; lift: number; shadow: number }>> = {
  dragon: { scale: .94, lift: 0, shadow: .68 }, bust: { scale: .88, lift: 0, shadow: .5 },
  lantern: { scale: .88, lift: 0, shadow: .42 }, fountainPen: { scale: .82, lift: -.08, shadow: .65 },
  crystalD20: { scale: .78, lift: -.05, shadow: .48 }, wafer: { scale: .88, lift: 0, shadow: .4 },
  globe: { scale: .93, lift: 0, shadow: .48 }, hourglass: { scale: .86, lift: -.015, shadow: .48 },
  bonsai: { scale: .9, lift: -.02, shadow: .65 }, fossil: { scale: .87, lift: 0, shadow: .56 },
  camera: { scale: .85, lift: -.19, shadow: .82 }, tea: { scale: .69, lift: -.11, shadow: .85 },
};
