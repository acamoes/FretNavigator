import { describe, it, expect } from 'vitest';
import { ALL_PITCH_CLASSES, chordId, chordShape, chordToneRoles, pitchAt } from './index';

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

  it('returns null for chords a key never produces, and for junk', () => {
    expect(chordShape(chordId(0, 'maj7'))).toBeNull(); // sevenths aren't drawn
    expect(chordShape('99:bogus')).toBeNull();
    expect(chordShape('')).toBeNull();
  });

  // The table is hand-written, so check every entry against the theory the app
  // already trusts: a shape must sound the chord's pitch classes and nothing else.
  it('every shape sounds exactly its chord, for all 12 roots', () => {
    for (const type of ['maj', 'min', 'dim', 'aug']) {
      for (const root of ALL_PITCH_CLASSES) {
        const id = chordId(root, type);
        const shape = chordShape(id);
        expect(shape, `no shape for ${id}`).not.toBeNull();

        const want = new Set(chordToneRoles(id).keys());
        const sounded = new Set(
          shape!.frets.flatMap((fret, si) => (fret === null ? [] : [pitchAt(STANDARD[si], fret)])),
        );

        // No wrong notes, and the full triad is present (root, 3rd, 5th).
        for (const pc of sounded) {
          expect([...want], `${id} sounds ${pc}, not in the chord`).toContain(pc);
        }
        expect([...sounded].sort(), `${id} is missing chord tones`).toEqual([...want].sort());
      }
    }
  });

  it('every shape stays within a four-fret window', () => {
    for (const type of ['maj', 'min', 'dim', 'aug']) {
      for (const root of ALL_PITCH_CLASSES) {
        const id = chordId(root, type);
        const { frets, baseFret } = chordShape(id)!;
        const fretted = frets.filter((f): f is number => f !== null && f > 0);
        const span = Math.max(...fretted) - baseFret;
        expect(span, `${id} spans more than the diagram's 4 rows`).toBeLessThan(4);
      }
    }
  });
});
