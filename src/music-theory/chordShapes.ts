/**
 * Guitar fingerings for the triads a key is built from.
 *
 * A curated table, not a search. Finding voicings algorithmically would need
 * octave-aware pitches (the model only has pitch classes) plus playability
 * heuristics that produce awkward shapes easily; the degree table only ever
 * needs four triad types, so a small table is smaller, predictable, and gives
 * the shapes a guitarist actually recognizes.
 *
 * STANDARD TUNING ONLY. A board's key carries no tuning of its own, and
 * covering DADGAD/open G would require exactly the search this avoids.
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
};

/** Open-string pitch classes in standard tuning, low → high (E A D G B E). */
const STANDARD = [4, 9, 2, 7, 11, 4];

/** Fret on `stringIndex` that sounds `pc`, in 0..11. */
function rootFret(stringIndex: number, pc: PitchClass): number {
  return mod12(pc - STANDARD[stringIndex]);
}

/**
 * A playable fingering for a chord id, or null if the type isn't one of the
 * triads a key produces (maj / min / dim / aug).
 */
export function chordShape(id: string): ChordShape | null {
  const parsed = parseChordId(id);
  if (!parsed) return null;

  const open = OPEN_SHAPES[id];
  if (open) return { frets: [...open], baseFret: 1 };

  const candidates = MOVABLE[parsed.type.id];
  if (!candidates) return null;

  // Lowest position wins, so Bm barres at the 2nd fret rather than the 7th;
  // a tie keeps the first candidate (the E shape).
  let best: { shape: MovableShape; fret: number } | null = null;
  for (const shape of candidates) {
    const fret = rootFret(shape.rootString, parsed.root);
    // Fret 0 would mean the open shape, which the table above already covers.
    const at = fret === 0 ? 12 : fret;
    if (!best || at < best.fret) best = { shape, fret: at };
  }
  if (!best) return null;

  const { shape, fret } = best;
  const frets = shape.offsets.map((o) => (o === null ? null : o + fret));
  const barre = shape.barred ? { fret, from: shape.rootString, to: 5 } : undefined;
  return { frets, baseFret: fret, barre };
}
