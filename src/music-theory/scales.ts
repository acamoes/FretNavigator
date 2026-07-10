/**
 * Scale / key definitions. A key is a root pitch class + a scale type.
 * Formulas are semitone offsets from the root.
 */

import { mod12, PitchClass } from './notes';

export interface ScaleType {
  id: string;
  name: string;
  /** Semitone offsets from root. */
  intervals: number[];
  /** Whether keys built on this scale usually read better with flats. */
  usesFlats?: boolean;
}

export const SCALE_TYPES: ScaleType[] = [
  { id: 'major', name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian', name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'harmonic-minor', name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic-minor', name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'major-pentatonic', name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
];

export function getScaleType(id: string): ScaleType | undefined {
  return SCALE_TYPES.find((s) => s.id === id);
}

/** Encode a key as "<root>:<scaleId>", e.g. "9:minor" for A minor. */
export function keyId(root: PitchClass, scaleId: string): string {
  return `${mod12(root)}:${scaleId}`;
}

export function parseKeyId(id: string): { root: PitchClass; scale: ScaleType } | null {
  if (typeof id !== 'string') return null;
  const [rootStr, scaleId] = id.split(':');
  const root = Number(rootStr);
  const scale = getScaleType(scaleId);
  if (!Number.isInteger(root) || !scale) return null;
  return { root: mod12(root), scale };
}

/** The set of pitch classes belonging to a key. */
export function scalePitchClasses(root: PitchClass, scale: ScaleType): Set<PitchClass> {
  return new Set(scale.intervals.map((i) => mod12(root + i)));
}

/** Pitch classes for a key id, or empty set if invalid. */
export function keyPitchClasses(id: string | null): Set<PitchClass> {
  if (!id) return new Set();
  const parsed = parseKeyId(id);
  if (!parsed) return new Set();
  return scalePitchClasses(parsed.root, parsed.scale);
}
