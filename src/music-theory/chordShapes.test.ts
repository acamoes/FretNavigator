import { describe, it, expect } from 'vitest';
import {
  ALL_PITCH_CLASSES,
  chordId,
  chordShape,
  chordShapes,
  chordToneRoles,
  mod12,
  pitchAt,
  SHAPED_CHORD_TYPES,
} from './index';

/** Standard tuning open strings, low → high (E A D G B E). */
const STANDARD = [4, 9, 2, 7, 11, 4];

describe('chord shapes', () => {
  it('prefers the open shape when there is one', () => {
    const c = chordShape(chordId(0, 'maj'))!; // C
    expect(c.frets).toEqual([null, 3, 2, 0, 1, 0]);
    expect(c.baseFret).toBe(1);
    expect(c.barre).toBeUndefined();
  });

  it('F major barres the E shape at the 1st fret', () => {
    const f = chordShape(chordId(5, 'maj'))!;
    expect(f.frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(f.barre).toEqual({ fret: 1, from: 0, to: 5 });
  });

  it('B minor takes the Am shape at the 2nd fret, not the 7th', () => {
    const bm = chordShape(chordId(11, 'min'))!;
    expect(bm.baseFret).toBe(2); // Am shape on the A string, not Em shape on E
    expect(bm.frets).toEqual([null, 2, 4, 4, 3, 2]);
    expect(bm.barre).toEqual({ fret: 2, from: 1, to: 5 });
  });

  it('diminished uses the three-note grip rooted on the A string', () => {
    const b = chordShape(chordId(11, 'dim'))!; // B°
    expect(b.frets).toEqual([null, 2, 3, 4, 3, null]);
    expect(b.barre).toBeUndefined();
  });

  it('offers several positions for the same chord, lowest first', () => {
    const positions = chordShapes(chordId(0, 'maj')); // C
    expect(positions.length).toBeGreaterThanOrEqual(3);
    expect(positions[0].frets).toEqual([null, 3, 2, 0, 1, 0]); // open C
    expect(positions.map((p) => p.baseFret)).toEqual([...positions.map((p) => p.baseFret)].sort((a, b) => a - b));
    // Open, A-shape barre at 3, E-shape barre at 8.
    expect(positions.map((p) => p.baseFret)).toEqual([1, 3, 8]);
  });

  it('never lists the same fingering twice', () => {
    for (const type of SHAPED_CHORD_TYPES) {
      for (const root of ALL_PITCH_CLASSES) {
        const shapes = chordShapes(chordId(root, type));
        const keys = shapes.map((s) => s.frets.join(','));
        expect(new Set(keys).size, `${chordId(root, type)} repeats a shape`).toBe(keys.length);
      }
    }
  });

  it('returns nothing for chords it cannot draw, and for junk', () => {
    expect(chordShapes(chordId(0, 'add9'))).toEqual([]);
    expect(chordShape(chordId(0, 'add9'))).toBeNull();
    expect(chordShapes('99:bogus')).toEqual([]);
    expect(chordShape('')).toBeNull();
  });

  // The table is hand-written, so check every entry against the theory the app
  // already trusts. Two rules: never a note outside the chord, and never a
  // missing tone — except the perfect 5th, which guitar voicings drop routinely
  // (the open C7, x32310, has no G). A b5 or #5 is characteristic, not
  // droppable, so this stays strict for dim, aug and m7b5.
  it('every position of every chord sounds that chord and nothing else', () => {
    for (const type of SHAPED_CHORD_TYPES) {
      for (const root of ALL_PITCH_CLASSES) {
        const id = chordId(root, type);
        const shapes = chordShapes(id);
        expect(shapes.length, `no shape for ${id}`).toBeGreaterThan(0);

        const want = new Set(chordToneRoles(id).keys());
        const perfectFifth = mod12(root + 7);

        for (const shape of shapes) {
          const sounded = new Set(
            shape.frets.flatMap((fret, si) => (fret === null ? [] : [pitchAt(STANDARD[si], fret)])),
          );
          const where = `${id} at fret ${shape.baseFret}`;

          for (const pc of sounded) {
            expect([...want], `${where} sounds ${pc}, not in the chord`).toContain(pc);
          }
          const missing = [...want].filter((pc) => !sounded.has(pc));
          expect(missing.filter((pc) => pc !== perfectFifth), `${where} drops more than the 5th`).toEqual([]);
          // And the root is never optional.
          expect(sounded.has(root), `${where} has no root`).toBe(true);
        }
      }
    }
  });

  it('every position fits the diagram’s four-fret window', () => {
    for (const type of SHAPED_CHORD_TYPES) {
      for (const root of ALL_PITCH_CLASSES) {
        const id = chordId(root, type);
        for (const { frets, baseFret } of chordShapes(id)) {
          const fretted = frets.filter((f): f is number => f !== null && f > 0);
          const span = Math.max(...fretted) - baseFret;
          expect(span, `${id} at fret ${baseFret} spans more than 4 rows`).toBeLessThan(4);
        }
      }
    }
  });

  it('a barre never reaches past the strings the shape actually plays', () => {
    for (const type of SHAPED_CHORD_TYPES) {
      for (const root of ALL_PITCH_CLASSES) {
        const id = chordId(root, type);
        for (const { frets, barre } of chordShapes(id)) {
          if (!barre) continue;
          expect(frets[barre.to], `${id} barres to a muted string`).not.toBeNull();
          expect(frets[barre.from], `${id} barres from a muted string`).not.toBeNull();
        }
      }
    }
  });
});
