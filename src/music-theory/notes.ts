/**
 * Note naming and pitch-class utilities.
 *
 * A "pitch class" (pc) is an integer 0-11 where 0 = C, 1 = C#/Db, ... 11 = B.
 * This module is pure (no UI dependencies) and safe to unit-test in isolation.
 */

export type PitchClass = number; // 0..11

export const SHARP_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;

export const FLAT_NAMES = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
] as const;

/** Normalize any integer to the range 0..11. */
export function mod12(n: number): PitchClass {
  return ((n % 12) + 12) % 12;
}

/**
 * Name a pitch class. Uses flats when `preferFlats` is true (useful for flat
 * keys such as F, Bb, Eb), otherwise sharps.
 */
export function noteName(pc: PitchClass, preferFlats = false): string {
  const table = preferFlats ? FLAT_NAMES : SHARP_NAMES;
  return table[mod12(pc)];
}

/** Parse a note name (e.g. "C", "F#", "Bb") into a pitch class, or null. */
export function parseNote(name: string): PitchClass | null {
  const trimmed = name.trim();
  const sharpIdx = SHARP_NAMES.indexOf(trimmed as (typeof SHARP_NAMES)[number]);
  if (sharpIdx >= 0) return sharpIdx;
  const flatIdx = FLAT_NAMES.indexOf(trimmed as (typeof FLAT_NAMES)[number]);
  if (flatIdx >= 0) return flatIdx;
  return null;
}

export const ALL_PITCH_CLASSES: PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
