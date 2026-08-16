/**
 * Guitar fingerings: where a chord is actually played.
 *
 * A curated table, not a search. Finding voicings algorithmically would need
 * octave-aware pitches (the model only has pitch classes) plus playability
 * heuristics that produce awkward shapes easily. A table stays predictable and
 * gives the shapes a guitarist recognizes; a unit test replays every entry
 * through the theory, so a transcription slip fails the build.
 *
 * STANDARD TUNING ONLY. Chords here carry no tuning of their own, and covering
 * DADGAD/open G would require exactly the search this avoids.
 */

import { parseChordId } from './chords';
import { mod12, PitchClass } from './notes';

export interface ChordShape {
  /** Fret per string, low → high. null = muted, 0 = open. Absolute frets. */
  frets: (number | null)[];
  /** Lowest fret drawn; 1 = at the nut. Diagrams label anything higher. */
  baseFret: number;
  /** Barre across a fret, inclusive string indices. */
  barre?: { fret: number; from: number; to: number };
}

const X = null;

/** The chord types this module can draw, in picker order. */
export const SHAPED_CHORD_TYPES = [
  'maj',
  'min',
  'dim',
  'aug',
  'maj7',
  '7',
  'm7',
  'm7b5',
  'sus2',
  'sus4',
  '6',
  'm6',
] as const;

/**
 * Open shapes win when they exist: in the key of C you want the open C, not a
 * barre at the 8th fret. Keyed by the app's usual "<rootPc>:<typeId>" id.
 */
const OPEN_SHAPES: Record<string, (number | null)[]> = {
  '0:maj': [X, 3, 2, 0, 1, 0], // C
  '2:maj': [X, X, 0, 2, 3, 2], // D
  '4:maj': [0, 2, 2, 1, 0, 0], // E
  '7:maj': [3, 2, 0, 0, 0, 3], // G
  '9:maj': [X, 0, 2, 2, 2, 0], // A
  '2:min': [X, X, 0, 2, 3, 1], // Dm
  '4:min': [0, 2, 2, 0, 0, 0], // Em
  '9:min': [X, 0, 2, 2, 1, 0], // Am
  '0:maj7': [X, 3, 2, 0, 0, 0], // Cmaj7
  '0:7': [X, 3, 2, 3, 1, 0], // C7
  '0:6': [X, 3, 2, 2, 1, 0], // C6
  '2:7': [X, X, 0, 2, 1, 2], // D7
  '2:m7': [X, X, 0, 2, 1, 1], // Dm7
  '2:sus2': [X, X, 0, 2, 3, 0], // Dsus2
  '2:sus4': [X, X, 0, 2, 3, 3], // Dsus4
  '4:7': [0, 2, 0, 1, 0, 0], // E7
  '4:m7': [0, 2, 0, 0, 0, 0], // Em7
  '4:sus4': [0, 2, 2, 2, 0, 0], // Esus4
  '7:7': [3, 2, 0, 0, 0, 1], // G7
  '9:7': [X, 0, 2, 0, 2, 0], // A7
  '9:m7': [X, 0, 2, 0, 1, 0], // Am7
  '9:sus2': [X, 0, 2, 2, 0, 0], // Asus2
  '9:sus4': [X, 0, 2, 2, 3, 0], // Asus4
};

/**
 * Movable patterns, as offsets from the root fret. `rootString` is the string
 * the root sits on (0 = low E), which is what decides where the shape lands.
 */
interface MovableShape {
  rootString: 0 | 1;
  offsets: (number | null)[];
  barred: boolean;
}

const MOVABLE: Record<string, MovableShape[]> = {
  maj: [
    { rootString: 0, offsets: [0, 2, 2, 1, 0, 0], barred: true }, // E shape
    { rootString: 1, offsets: [X, 0, 2, 2, 2, 0], barred: true }, // A shape
  ],
  min: [
    { rootString: 0, offsets: [0, 2, 2, 0, 0, 0], barred: true }, // Em shape
    { rootString: 1, offsets: [X, 0, 2, 2, 1, 0], barred: true }, // Am shape
  ],
  // Root, b5, root, b3. Two rootings, so a chord like F#dim lands at the 2nd
  // fret off the E string instead of the 9th off the A string.
  dim: [
    { rootString: 0, offsets: [0, 1, 2, 0, X, X], barred: false },
    { rootString: 1, offsets: [X, 0, 1, 2, 1, X], barred: false },
  ],
  // Root, #5, root, 3rd.
  aug: [
    { rootString: 0, offsets: [0, 3, 2, 1, X, X], barred: false },
    { rootString: 1, offsets: [X, 0, 3, 2, 2, X], barred: false },
  ],
  maj7: [
    { rootString: 0, offsets: [0, 2, 1, 1, 0, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 1, 2, 0], barred: true },
  ],
  '7': [
    { rootString: 0, offsets: [0, 2, 0, 1, 0, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 0, 2, 0], barred: true },
  ],
  m7: [
    { rootString: 0, offsets: [0, 2, 0, 0, 0, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 0, 1, 0], barred: true },
  ],
  m7b5: [
    { rootString: 0, offsets: [0, 1, 0, 0, X, X], barred: false },
    { rootString: 1, offsets: [X, 0, 1, 0, 1, X], barred: false },
  ],
  // No E-string sus2 fits four frets — the 2nd forces `0 2 4 4 0 0` (span 4),
  // so this type gets one movable position instead of two.
  sus2: [{ rootString: 1, offsets: [X, 0, 2, 2, 0, 0], barred: true }],
  sus4: [
    { rootString: 0, offsets: [0, 2, 2, 2, 0, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 2, 3, 0], barred: true },
  ],
  '6': [
    { rootString: 0, offsets: [0, 2, 2, 1, 2, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 2, 2, 2], barred: true },
  ],
  m6: [
    { rootString: 0, offsets: [0, 2, 2, 0, 2, 0], barred: true },
    { rootString: 1, offsets: [X, 0, 2, 2, 1, 2], barred: true },
  ],
};

/** Open-string pitch classes in standard tuning, low → high (E A D G B E). */
const STANDARD = [4, 9, 2, 7, 11, 4];

/** Fret on `stringIndex` that sounds `pc`, in 0..11. */
function rootFret(stringIndex: number, pc: PitchClass): number {
  return mod12(pc - STANDARD[stringIndex]);
}

/** Place a movable pattern at a root fret, working out the barre span. */
function place(shape: MovableShape, fret: number): ChordShape {
  const frets = shape.offsets.map((o) => (o === null ? null : o + fret));
  // At the nut the open strings do the barre's job, so there is nothing to bar.
  if (!shape.barred || fret === 0) return { frets, baseFret: Math.max(1, fret) };

  // The barre runs from the root to the last string still pressed at that fret.
  let last: number = shape.rootString;
  shape.offsets.forEach((o, si) => {
    if (o === 0) last = si;
  });
  return { frets, baseFret: fret, barre: { fret, from: shape.rootString, to: last } };
}

/**
 * Every playable position for a chord, lowest first. Empty when the type isn't
 * one this module draws (see SHAPED_CHORD_TYPES).
 */
export function chordShapes(id: string): ChordShape[] {
  const parsed = parseChordId(id);
  if (!parsed) return [];

  const found: ChordShape[] = [];
  const open = OPEN_SHAPES[id];
  if (open) found.push({ frets: [...open], baseFret: 1 });

  for (const shape of MOVABLE[parsed.type.id] ?? []) {
    found.push(place(shape, rootFret(shape.rootString, parsed.root)));
  }

  // A movable landing at the nut can reproduce the open shape exactly.
  const seen = new Set<string>();
  return found
    .filter((s) => {
      const key = s.frets.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.baseFret - b.baseFret);
}

/** The lowest position for a chord, or null if there is no shape for it. */
export function chordShape(id: string): ChordShape | null {
  return chordShapes(id)[0] ?? null;
}
