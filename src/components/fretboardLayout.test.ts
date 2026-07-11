import { describe, it, expect } from 'vitest';
import { buildFretboardModel } from './fretboardLayout';
import { createFretboard } from '../store/factories';

describe('chord voicing (keep) + refine', () => {
  it('shows every position of a chord with no keep filter', () => {
    const fb = createFretboard({ chords: [{ id: '0:maj' }] }); // C major = C E G
    const chordCells = buildFretboardModel(fb).cells.filter((c) => c.highlight.layer === 'chord');
    expect(chordCells.length).toBeGreaterThan(3);
  });

  it('narrows a chord to only its kept positions', () => {
    const fb = createFretboard({ chords: [{ id: '0:maj' }] });
    const all = buildFretboardModel(fb).cells.filter((c) => c.highlight.layer === 'chord');
    const pick = all[0];

    const narrowed = createFretboard({
      chords: [{ id: '0:maj', keep: [{ stringIndex: pick.stringIndex, fret: pick.fret }] }],
    });
    const chordCells = buildFretboardModel(narrowed).cells.filter((c) => c.highlight.layer === 'chord');

    expect(chordCells).toHaveLength(1);
    expect(chordCells[0].stringIndex).toBe(pick.stringIndex);
    expect(chordCells[0].fret).toBe(pick.fret);
  });

  it('marks kept vs candidate notes while refining', () => {
    const fb = createFretboard({ chords: [{ id: '0:maj' }] });
    const pick = buildFretboardModel(fb).cells.find((c) => c.highlight.layer === 'chord')!;

    const model = buildFretboardModel(fb, {
      refine: { chordIndex: 0, keepKeys: new Set([`${pick.stringIndex}:${pick.fret}`]) },
    });
    const kept = model.cells.filter((c) => c.highlight.keepState === 'kept');
    const candidate = model.cells.filter((c) => c.highlight.keepState === 'candidate');

    expect(kept).toHaveLength(1);
    expect(candidate.length).toBeGreaterThan(0);
  });
});
