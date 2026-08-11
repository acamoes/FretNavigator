import { describe, it, expect } from 'vitest';
import { TabSection } from '../types';
import {
  cloneBoard,
  cloneTabSection,
  createBoard,
  createStrummingPattern,
  createTabSection,
  normalizeSections,
} from './factories';

describe('strumming factories', () => {
  it('createStrummingPattern makes one bar of 8 empty slots', () => {
    const p = createStrummingPattern();
    expect(p.slots).toHaveLength(8);
    expect(p.slots.every((s) => s.hit === null)).toBe(true);
  });

  it('cloneBoard deep-copies the strumming pattern', () => {
    const board = createBoard({ strumming: createStrummingPattern() });
    const clone = cloneBoard(board);

    clone.strumming!.slots[0].hit = 'down';

    expect(clone.strumming).not.toBe(board.strumming);
    expect(board.strumming!.slots[0].hit).toBeNull(); // original untouched
  });
});

describe('sections', () => {
  it('new boards hold fretboard-kind sections', () => {
    const board = createBoard();
    expect(board.sections.length).toBeGreaterThan(0);
    expect(board.sections.every((s) => s.kind === 'fretboard')).toBe(true);
  });

  it('normalizeSections upgrades legacy `fretboards` (string chords -> ChordEntry[])', () => {
    const legacy = { fretboards: [{ id: 'fb1', label: 'Old', chords: ['0:maj'] }] };
    const sections = normalizeSections(legacy);

    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe('fretboard');
    const fb = sections[0] as Extract<(typeof sections)[number], { kind: 'fretboard' }>;
    expect(fb.chords).toEqual([{ id: '0:maj' }]);
  });

  it('cloneBoard deep-copies sections with fresh ids', () => {
    const board = createBoard();
    const clone = cloneBoard(board);

    expect(clone.sections[0].id).not.toBe(board.sections[0].id);
    (clone.sections[0] as { label: string }).label = 'changed';
    expect(board.sections[0].label).not.toBe('changed');
  });

  it('createTabSection makes empty columns sized to the tuning', () => {
    const tab = createTabSection('standard'); // 6 strings
    expect(tab.kind).toBe('tab');
    expect(tab.columns.length).toBeGreaterThan(0);
    expect(tab.columns.every((c) => c.frets.length === 6 && c.frets.every((f) => f === null))).toBe(true);
  });

  // normalizeTabColumns rebuilds every column field by field, so anything it
  // doesn't know about is silently dropped on rehydration and on import.
  it('normalizeSections keeps tab annotations and slurs', () => {
    const raw = {
      sections: [
        {
          kind: 'tab',
          id: 't1',
          label: 'Solo',
          tuningId: 'standard',
          columns: [{ frets: [null, null, null, null, null, 9], annotation: 'A#m7', slurs: [5] }],
        },
      ],
    };
    const tab = normalizeSections(raw)[0] as TabSection;

    expect(tab.columns[0].annotation).toBe('A#m7');
    expect(tab.columns[0].slurs).toEqual([5]);
  });

  it('normalizeSections cleans junk annotations and slurs', () => {
    const raw = {
      sections: [
        {
          kind: 'tab',
          id: 't1',
          label: 'Solo',
          tuningId: 'standard',
          columns: [
            { frets: [], annotation: '   ', slurs: ['x', -1, 2, 2, 1.5] },
            { frets: [], annotation: 42, slurs: [] },
          ],
        },
      ],
    };
    const tab = normalizeSections(raw)[0] as TabSection;

    expect(tab.columns[0].annotation).toBeUndefined(); // whitespace-only
    expect(tab.columns[0].slurs).toEqual([2]); // deduped, non-integers dropped
    expect(tab.columns[1].annotation).toBeUndefined(); // not a string
    expect(tab.columns[1].slurs).toBeUndefined(); // empty -> absent
  });

  it('cloneTabSection copies annotations and does not share the slurs array', () => {
    const tab = createTabSection('standard');
    tab.columns[0] = { ...tab.columns[0], annotation: 'C', slurs: [0] };
    const clone = cloneTabSection(tab);

    expect(clone.columns[0].annotation).toBe('C');
    clone.columns[0].slurs!.push(3);
    expect(tab.columns[0].slurs).toEqual([0]); // original untouched
  });
});
