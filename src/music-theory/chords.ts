/**
 * Chord definitions. A chord is a root pitch class + a chord type.
 * Each chord tone carries its interval role so it can be color-coded
 * (root vs 3rd vs 5th vs 7th vs tension).
 */

import { mod12, noteName, PitchClass } from './notes';

export interface ChordType {
  id: string;
  /** Symbol appended to the root, e.g. "maj7", "m", "7". */
  symbol: string;
  name: string;
  /** Semitone offsets from root. */
  intervals: number[];
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', symbol: '', name: 'Major', intervals: [0, 4, 7] },
  { id: 'min', symbol: 'm', name: 'Minor', intervals: [0, 3, 7] },
  { id: 'dim', symbol: 'dim', name: 'Diminished', intervals: [0, 3, 6] },
  { id: 'aug', symbol: 'aug', name: 'Augmented', intervals: [0, 4, 8] },
  { id: 'sus2', symbol: 'sus2', name: 'Suspended 2nd', intervals: [0, 2, 7] },
  { id: 'sus4', symbol: 'sus4', name: 'Suspended 4th', intervals: [0, 5, 7] },
  { id: '6', symbol: '6', name: 'Major 6th', intervals: [0, 4, 7, 9] },
  { id: 'm6', symbol: 'm6', name: 'Minor 6th', intervals: [0, 3, 7, 9] },
  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', intervals: [0, 4, 7, 11] },
  { id: '7', symbol: '7', name: 'Dominant 7th', intervals: [0, 4, 7, 10] },
  { id: 'm7', symbol: 'm7', name: 'Minor 7th', intervals: [0, 3, 7, 10] },
  { id: 'm7b5', symbol: 'm7b5', name: 'Half-diminished (m7b5)', intervals: [0, 3, 6, 10] },
  { id: 'dim7', symbol: 'dim7', name: 'Diminished 7th', intervals: [0, 3, 6, 9] },
  { id: 'add9', symbol: 'add9', name: 'Add 9', intervals: [0, 4, 7, 2] },
  { id: '9', symbol: '9', name: 'Dominant 9th', intervals: [0, 4, 7, 10, 2] },
  { id: 'maj9', symbol: 'maj9', name: 'Major 9th', intervals: [0, 4, 7, 11, 2] },
  { id: 'm9', symbol: 'm9', name: 'Minor 9th', intervals: [0, 3, 7, 10, 2] },
];

export function getChordType(id: string): ChordType | undefined {
  return CHORD_TYPES.find((c) => c.id === id);
}

/** Encode a chord as "<root>:<chordId>", e.g. "0:maj7" for Cmaj7. */
export function chordId(root: PitchClass, typeId: string): string {
  return `${mod12(root)}:${typeId}`;
}

export function parseChordId(id: string): { root: PitchClass; type: ChordType } | null {
  if (typeof id !== 'string') return null;
  const [rootStr, typeId] = id.split(':');
  const root = Number(rootStr);
  const type = getChordType(typeId);
  if (!Number.isInteger(root) || !type) return null;
  return { root: mod12(root), type };
}

/**
 * Map each pitch class in the chord to its interval role (semitones from root).
 * e.g. Cmaj7 -> { 0:0, 4:4, 7:7, 11:11 }. Used to color chord tones by role.
 */
export function chordToneRoles(id: string | null): Map<PitchClass, number> {
  const roles = new Map<PitchClass, number>();
  if (!id) return roles;
  const parsed = parseChordId(id);
  if (!parsed) return roles;
  for (const interval of parsed.type.intervals) {
    roles.set(mod12(parsed.root + interval), mod12(interval));
  }
  return roles;
}

/** Human chord symbol, e.g. "Cmaj7", "Am", "D7". Empty string if id is invalid. */
export function chordDisplayName(id: string, preferFlats = false): string {
  const parsed = parseChordId(id);
  if (!parsed) return '';
  return `${noteName(parsed.root, preferFlats)}${parsed.type.symbol}`;
}
