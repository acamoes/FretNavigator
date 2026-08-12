import { describe, it, expect } from 'vitest';
import {
  chordToneRoles,
  chordDisplayName,
  intervalLabel,
  keyPitchClasses,
  mod12,
  noteName,
  parseNote,
  pitchAt,
  scalePitchClasses,
  getScaleType,
  chordId,
  keyId,
  parseKeyId,
  parseChordId,
  getTuning,
  keySummary,
} from './index';

describe('notes', () => {
  it('mod12 wraps into 0..11', () => {
    expect(mod12(0)).toBe(0);
    expect(mod12(12)).toBe(0);
    expect(mod12(-1)).toBe(11);
    expect(mod12(25)).toBe(1);
  });

  it('names pitch classes with sharps and flats', () => {
    expect(noteName(0)).toBe('C');
    expect(noteName(1)).toBe('C#');
    expect(noteName(1, true)).toBe('Db');
    expect(noteName(10, true)).toBe('Bb');
  });

  it('parses note names round-trip', () => {
    expect(parseNote('C')).toBe(0);
    expect(parseNote('F#')).toBe(6);
    expect(parseNote('Bb')).toBe(10);
    expect(parseNote('H')).toBeNull();
  });
});

describe('intervals', () => {
  it('labels intervals relative to a root', () => {
    // Root A (9)
    expect(intervalLabel(9, 9)).toBe('R');
    expect(intervalLabel(9, 0)).toBe('b3'); // A -> C is a minor 3rd
    expect(intervalLabel(9, 4)).toBe('5'); // A -> E is a perfect 5th
    expect(intervalLabel(9, 7)).toBe('b7'); // A -> G is a minor 7th
  });
});

describe('scales / keys', () => {
  it('C major has natural notes only', () => {
    const pcs = scalePitchClasses(0, getScaleType('major')!);
    expect([...pcs].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('A minor equals C major note set', () => {
    const aMinor = keyPitchClasses(keyId(9, 'minor'));
    const cMajor = keyPitchClasses(keyId(0, 'major'));
    expect([...aMinor].sort((a, b) => a - b)).toEqual([...cMajor].sort((a, b) => a - b));
  });

  it('minor pentatonic has 5 notes', () => {
    expect(keyPitchClasses(keyId(9, 'minor-pentatonic')).size).toBe(5);
  });

  it('round-trips key ids', () => {
    const parsed = parseKeyId(keyId(2, 'mixolydian'));
    expect(parsed?.root).toBe(2);
    expect(parsed?.scale.id).toBe('mixolydian');
  });
});

describe('chords', () => {
  it('Cmaj7 tones map to correct interval roles', () => {
    const roles = chordToneRoles(chordId(0, 'maj7'));
    expect(roles.get(0)).toBe(0); // C = root
    expect(roles.get(4)).toBe(4); // E = major 3rd
    expect(roles.get(7)).toBe(7); // G = 5th
    expect(roles.get(11)).toBe(11); // B = major 7th
    expect(roles.size).toBe(4);
  });

  it('D7 contains F# and C', () => {
    const roles = chordToneRoles(chordId(2, '7'));
    // D F# A C
    expect([...roles.keys()].sort((a, b) => a - b)).toEqual([0, 2, 6, 9]);
  });

  it('round-trips chord ids', () => {
    const parsed = parseChordId(chordId(11, 'min'));
    expect(parsed?.root).toBe(11);
    expect(parsed?.type.id).toBe('min');
  });

  it('formats chord display names', () => {
    expect(chordDisplayName(chordId(0, 'maj7'))).toBe('Cmaj7');
    expect(chordDisplayName(chordId(9, 'min'))).toBe('Am');
    expect(chordDisplayName(chordId(2, '7'))).toBe('D7');
    expect(chordDisplayName(chordId(10, 'maj'), true)).toBe('Bb');
  });
});

describe('diatonic harmony', () => {
  it('C major harmonizes into the textbook triads', () => {
    const s = keySummary(keyId(0, 'major'))!;
    expect(s.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(s.chords.map((c) => c.numeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(s.chords.map((c) => c.triadName)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  });

  it('C major sevenths put the dominant on G', () => {
    const s = keySummary(keyId(0, 'major'))!;
    expect(s.chords.map((c) => c.seventhName)).toEqual([
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
      'Am7',
      'Bm7b5',
    ]);
    expect(s.chords[4].seventhNotes).toBe('G B D F');
    expect(s.chords[6].functionName).toBe('Leading tone'); // B is a semitone under C
  });

  it('A minor numerals are relative to the scale, without flats', () => {
    const s = keySummary(keyId(9, 'minor'))!;
    expect(s.notes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(s.chords.map((c) => c.numeral)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
    expect(s.chords[6].functionName).toBe('Subtonic'); // G is a whole tone under A
  });

  it('spells flat keys with flats, never as sharps', () => {
    const s = keySummary(keyId(3, 'major'))!; // Eb major
    expect(s.notes).toEqual(['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D']);
    expect(s.tonicName).toBe('Eb');
    expect(s.notes.join('')).not.toContain('#');
  });

  it('breaks the F#/Gb tie towards sharps', () => {
    const s = keySummary(keyId(6, 'major'))!;
    expect(s.notes).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
  });

  it('harmonic minor raises the dominant to a major chord', () => {
    const s = keySummary(keyId(9, 'harmonic-minor'))!;
    expect(s.notes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G#']);
    expect(s.chords[4].triadName).toBe('E'); // major V, not Em
    expect(s.chords[4].seventhName).toBe('E7');
    expect(s.chords[6].triadName).toBe('G#dim');
    expect(s.chords[0].seventhName).toBe('AmMaj7'); // needs the mMaj7 type
    expect(s.chords[2].seventhName).toBe('Cmaj7#5');
  });

  it('pentatonic scales report notes but no diatonic chords', () => {
    const s = keySummary(keyId(0, 'major-pentatonic'))!;
    expect(s.notes).toHaveLength(5);
    expect(s.chords).toEqual([]);
  });

  it('returns null for an unparseable key', () => {
    expect(keySummary('99:bogus')).toBeNull();
    expect(keySummary('')).toBeNull();
  });
});

describe('fretboard', () => {
  it('standard tuning open strings', () => {
    const t = getTuning('standard')!;
    expect(t.strings).toEqual([4, 9, 2, 7, 11, 4]); // E A D G B E
  });

  it('pitchAt computes fretted notes', () => {
    // Low E string open (4) + 5 frets = A (9)
    expect(pitchAt(4, 5)).toBe(9);
    // A string (9) + 12 = octave A (9)
    expect(pitchAt(9, 12)).toBe(9);
  });
});
