/**
 * Fretboard geometry helpers: mapping (string, fret) -> pitch class, and
 * common tunings. Strings are stored low-to-high (index 0 = lowest/thickest).
 */

import { mod12, parseNote, PitchClass } from './notes';

export interface Tuning {
  id: string;
  name: string;
  /** Open-string pitch classes, low string first. */
  strings: PitchClass[];
  /** Human-readable string names low->high, for labels. */
  labels: string[];
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Standard (E A D G B E)', strings: notes('E', 'A', 'D', 'G', 'B', 'E'), labels: ['E', 'A', 'D', 'G', 'B', 'E'] },
  { id: 'drop-d', name: 'Drop D (D A D G B E)', strings: notes('D', 'A', 'D', 'G', 'B', 'E'), labels: ['D', 'A', 'D', 'G', 'B', 'E'] },
  { id: 'dadgad', name: 'DADGAD', strings: notes('D', 'A', 'D', 'G', 'A', 'D'), labels: ['D', 'A', 'D', 'G', 'A', 'D'] },
  { id: 'open-g', name: 'Open G (D G D G B D)', strings: notes('D', 'G', 'D', 'G', 'B', 'D'), labels: ['D', 'G', 'D', 'G', 'B', 'D'] },
  { id: 'open-d', name: 'Open D (D A D F# A D)', strings: notes('D', 'A', 'D', 'F#', 'A', 'D'), labels: ['D', 'A', 'D', 'F#', 'A', 'D'] },
  { id: 'half-step-down', name: 'Half-step Down (Eb Ab Db Gb Bb Eb)', strings: notes('D#', 'G#', 'C#', 'F#', 'A#', 'D#'), labels: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
];

function notes(...names: string[]): PitchClass[] {
  return names.map((n) => {
    const pc = parseNote(n);
    if (pc === null) throw new Error(`Invalid tuning note: ${n}`);
    return pc;
  });
}

export function getTuning(id: string): Tuning | undefined {
  return TUNINGS.find((t) => t.id === id);
}

/**
 * Pitch class sounding at a given open-string pitch class and fret.
 * A capo raises the pitch of every string by `capo` semitones for the
 * purpose of what an "open" (fret 0) position sounds like — but here we
 * compute the literal pitch at the physical fret, and the UI treats frets
 * below the capo as unplayed.
 */
export function pitchAt(openPc: PitchClass, fret: number): PitchClass {
  return mod12(openPc + fret);
}

/** Fret positions (0..numFrets) that should get inlay dots. */
export const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_DOT_FRETS = [12, 24];

export function hasSingleDot(fret: number): boolean {
  return SINGLE_DOT_FRETS.includes(fret);
}
export function hasDoubleDot(fret: number): boolean {
  return DOUBLE_DOT_FRETS.includes(fret);
}
