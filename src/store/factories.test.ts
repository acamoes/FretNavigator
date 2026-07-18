import { describe, it, expect } from 'vitest';
import { cloneBoard, createBoard, createStrummingPattern, createTabSection, normalizeSections } from './factories';

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
});
