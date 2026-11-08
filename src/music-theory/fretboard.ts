/**
 * Fretboard geometry helpers: mapping (string, fret) -> pitch class, and
 * common tunings. Strings are stored low-to-high (index 0 = lowest/thickest).
 */

import { mod12, parseNote, PitchClass } from './notes';

/** How a tuning relates to E Standard; the tuning pickers group by this. */
export type TuningFamily = 'standard' | 'drop' | 'open' | 'other';

export const TUNING_FAMILIES: { id: TuningFamily; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'drop', label: 'Drop' },
  { id: 'open', label: 'Open' },
  { id: 'other', label: 'Other' },
];

export interface Tuning {
  /** Persisted in saved boards and exported files — never rename an existing id. */
  id: string;
  name: string;
  family: TuningFamily;
  /** Open-string pitch classes, low string first. */
  strings: PitchClass[];
  /** Human-readable string names low->high, for labels. */
  labels: string[];
}

export const TUNINGS: Tuning[] = [
  tuning('standard', 'standard', 'E Standard', 'E A D G B E'),
  tuning('half-step-down', 'standard', 'Eb Standard', 'Eb Ab Db Gb Bb Eb'),
  tuning('d-standard', 'standard', 'D Standard', 'D G C F A D'),
  tuning('c-sharp-standard', 'standard', 'C# Standard', 'C# F# B E G# C#'),
  tuning('c-standard', 'standard', 'C Standard', 'C F Bb Eb G C'),
  tuning('b-standard', 'standard', 'B Standard', 'B E A D F# B'),

  tuning('drop-d', 'drop', 'Drop D', 'D A D G B E'),
  tuning('drop-c-sharp', 'drop', 'Drop C#', 'C# G# C# F# A# D#'),
  tuning('drop-c', 'drop', 'Drop C', 'C G C F A D'),
  tuning('drop-b', 'drop', 'Drop B', 'B F# B E G# C#'),

  tuning('open-g', 'open', 'Open G', 'D G D G B D'),
  tuning('open-d', 'open', 'Open D', 'D A D F# A D'),
  tuning('open-e', 'open', 'Open E', 'E B E G# B E'),
  tuning('open-a', 'open', 'Open A', 'E A E A C# E'),
  tuning('open-c', 'open', 'Open C', 'C G C G C E'),

  tuning('dadgad', 'other', 'DADGAD', 'D A D G A D'),
];

/**
 * One source string gives both the labels and the pitch classes, so they can't
 * drift apart. The label is spelled as written here (Eb Standard in flats,
 * C# Standard in sharps), which is why it isn't derived from `noteName`.
 */
function tuning(id: string, family: TuningFamily, title: string, spelled: string): Tuning {
  const labels = spelled.split(' ');
  // "DADGAD" already spells its notes; don't repeat them in brackets.
  const name = title === labels.join('') ? title : `${title} (${spelled})`;
  return { id, name, family, strings: labels.map(toPitchClass), labels };
}

function toPitchClass(n: string): PitchClass {
  const pc = parseNote(n);
  if (pc === null) throw new Error(`Invalid tuning note: ${n}`);
  return pc;
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
