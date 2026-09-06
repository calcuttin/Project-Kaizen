import type { ShelfTheme } from './themes';

export type CabinetObject = 'orrery' | 'computer' | 'wafer' | 'dragon' | 'bust' | 'lantern' | 'chessClock' | 'cipherMachine' | 'romanHelmet' | 'detectiveFolio' | 'networkSwitch' | 'fountainPen' | 'crystalD20' | 'compassMap' | 'typewriter' | 'arcadeJoystick' | 'none';
export type CabinetObjects = [CabinetObject, CabinetObject];

export const OBJECTS: Record<CabinetObject, { name: string; detail: string; image?: string }> = {
  orrery: { name: 'Solar system', detail: 'A brass miniature, always in orbit.', image: '/library/objects/orrery.png' },
  computer: { name: 'Apple II', detail: 'A little BASIC. A lot of possibility.', image: '/library/objects/apple-ii.png' },
  wafer: { name: 'Silicon wafer', detail: 'A rainbow hidden in the circuitry.', image: '/library/objects/wafer.png' },
  dragon: { name: 'Bronze dragon', detail: 'A guardian for other worlds.', image: '/library/objects/dragon.png' },
  bust: { name: 'Marble bust', detail: 'A quiet companion from antiquity.', image: '/library/objects/bust.png' },
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
