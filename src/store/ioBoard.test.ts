import { describe, it, expect } from 'vitest';
import { createBoard, createChordsSection, createFretboard, createTabSection } from './factories';
import { deserializeBoards, serializeBoard, serializeLibrary } from './ioBoard';

const library = () => [
  createBoard({ name: 'Esta Cidade', keyId: '4:minor', bpm: 120 }),
  createBoard({
    name: 'Segunda',
    sections: [createFretboard({ label: 'Rhythm' }), createTabSection(), createChordsSection()],
  }),
  createBoard({ name: 'Terceira' }),
];

describe('library export / import', () => {
  it('round-trips every board in one file', () => {
    const boards = library();
    const back = deserializeBoards(serializeLibrary(boards));

    expect(back).toHaveLength(3);
    expect(back.map((b) => b.name)).toEqual(['Esta Cidade', 'Segunda', 'Terceira']);
    expect(back[0].keyId).toBe('4:minor');
    expect(back[0].bpm).toBe(120);
    expect(back[1].sections.map((s) => s.kind)).toEqual(['fretboard', 'tab', 'chords']);
  });

  it('reads a single-board file too, so one Import button serves both', () => {
    const board = createBoard({ name: 'Solo' });
    const back = deserializeBoards(serializeBoard(board));

    expect(back).toHaveLength(1);
    expect(back[0].name).toBe('Solo');
  });

  it('still accepts legacy exports that called sections `fretboards`', () => {
    const legacy = JSON.stringify({
      kind: 'fretnavigator-library',
      boards: [{ name: 'Old', fretboards: [{ id: 'fb1', label: 'One', chords: ['0:maj'] }] }],
    });

    expect(deserializeBoards(legacy)).toHaveLength(1);
  });

  it('rejects files that are not ours, and empty libraries', () => {
    expect(() => deserializeBoards('{"kind":"something-else"}')).toThrow(/not a valid/i);
    expect(() => deserializeBoards('{"kind":"fretnavigator-library","boards":[]}')).toThrow(/no usable boards/i);
    expect(() => deserializeBoards('{"kind":"fretnavigator-board","board":{}}')).toThrow(/missing required/i);
    expect(() => deserializeBoards('not json at all')).toThrow();
  });

  it('drops unusable entries but keeps the good ones', () => {
    const mixed = JSON.stringify({
      kind: 'fretnavigator-library',
      boards: [{ name: 'Good', sections: [] }, null, { noName: true }],
    });

    expect(deserializeBoards(mixed).map((b) => b.name)).toEqual(['Good']);
  });
});
