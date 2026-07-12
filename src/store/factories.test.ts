import { describe, it, expect } from 'vitest';
import { cloneBoard, createBoard, createStrummingPattern } from './factories';

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
