/**
 * Diatonic harmony: what a key is actually made of.
 *
 * Turns a key id into its spelled notes plus the chord built on every scale
 * degree (triad + seventh) with a roman numeral, so a song's harmony can be read
 * at a glance. Pure — no React, no store.
 */

import { ChordType, chordId, getChordType } from './chords';
import { mod12, noteName, PitchClass } from './notes';
import { parseKeyId } from './scales';

export interface DiatonicChord {
  /** 1-based scale degree. */
  degree: number;
  /** Roman numeral, cased by quality: "I", "ii", "vii°", "III+". */
  numeral: string;
  /** Correctly spelled chord root, e.g. "Bb" (never "A#"). */
  rootName: string;
  /** Chord ids in the app's usual "<rootPc>:<typeId>" form ('' if unmatched). */
  triadId: string;
  seventhId: string;
  /** Display symbols, e.g. "Dm" and "Dm7". */
  triadName: string;
  seventhName: string;
  /** The seventh chord's spelled tones, e.g. "D F A C". */
  seventhNotes: string;
  /** Degree name: "Tonic", "Supertonic", … "Leading tone" / "Subtonic". */
  functionName: string;
}

export interface KeySummary {
  /** Spelled tonic, e.g. "Eb". */
  tonicName: string;
  /** Scale display name from SCALE_TYPES, e.g. "Major (Ionian)". */
  scaleName: string;
  /** Spelled scale notes, in degree order. */
  notes: string[];
  /** Empty for scales that aren't 7-note (pentatonics, blues). */
  chords: DiatonicChord[];
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const DEGREE_NAMES = ['Tonic', 'Supertonic', 'Mediant', 'Subdominant', 'Dominant', 'Submediant'];

/**
 * Candidates are deliberately short lists, not all of CHORD_TYPES: searching
 * every type lets sus2/add9 win over the plain triad they share notes with.
 */
const TRIAD_IDS = ['maj', 'min', 'dim', 'aug'];
const SEVENTH_IDS = ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', 'maj7#5'];

function mod7(n: number): number {
  return ((n % 7) + 7) % 7;
}

/** Signed distance from a letter's natural pitch: -1 = flat, +1 = sharp. */
function accidentalDelta(letterIdx: number, pc: PitchClass): number {
  const delta = mod12(pc - LETTER_PC[mod7(letterIdx)]);
  return delta > 6 ? delta - 12 : delta;
}

/** Spell `pc` using a given letter: (letter E, pc 3) -> "Eb". */
function spellWithLetter(letterIdx: number, pc: PitchClass): string {
  const delta = accidentalDelta(letterIdx, pc);
  return LETTERS[mod7(letterIdx)] + (delta > 0 ? '#'.repeat(delta) : 'b'.repeat(-delta));
}

/**
 * Spell a 7-note scale with one letter per degree, picking the tonic letter that
 * needs the fewest accidentals overall (ties go to sharps, since candidates are
 * tried in letter order). That reproduces the conventional key signatures —
 * Eb major as "Eb F G Ab Bb C D", never the "D# F G G# A# C D" that a single
 * sharps/flats table would give.
 */
function spellHeptatonic(root: PitchClass, intervals: number[]): string[] {
  let best: string[] | null = null;
  let bestCost = Infinity;

  for (let letter = 0; letter < 7; letter++) {
    // A tonic spelled with more than one accidental is never the better reading.
    if (Math.abs(accidentalDelta(letter, root)) > 1) continue;
    const names = intervals.map((iv, degree) => spellWithLetter(letter + degree, mod12(root + iv)));
    const cost = names.reduce((sum, n) => sum + (n.length - 1), 0); // accidental chars
    if (cost < bestCost) {
      best = names;
      bestCost = cost;
    }
  }
  return best ?? intervals.map((iv) => noteName(mod12(root + iv)));
}

/** Find the chord type whose intervals match a signature, within a candidate list. */
function matchChordType(signature: number[], candidateIds: string[]): ChordType | null {
  const want = [...signature].sort((a, b) => a - b).join(',');
  for (const id of candidateIds) {
    const type = getChordType(id);
    if (!type) continue;
    const have = type.intervals
      .map((i) => mod12(i))
      .sort((a, b) => a - b)
      .join(',');
    if (have === want) return type;
  }
  return null;
}

/** Stack scale thirds on every degree: indices i, i+2, i+4 (+6 for the seventh). */
function diatonicChords(pcs: PitchClass[], notes: string[], root: PitchClass): DiatonicChord[] {
  return pcs.map((chordRoot, i) => {
    const pick = (offsets: number[]) => offsets.map((o) => pcs[mod7(i + o)]);
    const signature = (members: PitchClass[]) => members.map((pc) => mod12(pc - chordRoot));

    const triad = matchChordType(signature(pick([0, 2, 4])), TRIAD_IDS);
    const seventh = matchChordType(signature(pick([0, 2, 4, 6])), SEVENTH_IDS);

    const rootName = notes[i];
    const minorish = triad?.id === 'min' || triad?.id === 'dim';
    const suffix = triad?.id === 'dim' ? '°' : triad?.id === 'aug' ? '+' : '';
    const numeral = (minorish ? NUMERALS[i].toLowerCase() : NUMERALS[i]) + suffix;

    // The 7th degree is a leading tone only when it's a semitone below the tonic;
    // a whole tone below (natural minor, mixolydian…) is a subtonic.
    const functionName =
      i < DEGREE_NAMES.length
        ? DEGREE_NAMES[i]
        : mod12(chordRoot - root) === 11
          ? 'Leading tone'
          : 'Subtonic';

    return {
      degree: i + 1,
      numeral,
      rootName,
      triadId: triad ? chordId(chordRoot, triad.id) : '',
      seventhId: seventh ? chordId(chordRoot, seventh.id) : '',
      triadName: triad ? `${rootName}${triad.symbol}` : '—',
      seventhName: seventh ? `${rootName}${seventh.symbol}` : '—',
      seventhNotes: [0, 2, 4, 6].map((o) => notes[mod7(i + o)]).join(' '),
      functionName,
    };
  });
}

/**
 * Everything worth knowing about a key: its spelled notes and its diatonic
 * chords. Returns null for an unparseable key id; `chords` is empty for scales
 * that don't stack into thirds (pentatonics, blues).
 */
export function keySummary(id: string): KeySummary | null {
  const parsed = parseKeyId(id);
  if (!parsed) return null;

  const { root, scale } = parsed;
  const pcs = scale.intervals.map((i) => mod12(root + i));
  const heptatonic = scale.intervals.length === 7;
  const notes = heptatonic ? spellHeptatonic(root, scale.intervals) : pcs.map((pc) => noteName(pc));

  return {
    tonicName: notes[0],
    scaleName: scale.name,
    notes,
    chords: heptatonic ? diatonicChords(pcs, notes, root) : [],
  };
}
