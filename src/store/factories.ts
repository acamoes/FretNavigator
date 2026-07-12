import { Board, ChordEntry, Fretboard, StrummingPattern } from '../types';

/** A blank one-bar strumming pattern: 8 rest slots (1 & 2 & 3 & 4 &). */
export function createStrummingPattern(): StrummingPattern {
  return { slots: Array.from({ length: 8 }, () => ({ hit: null })) };
}

function cloneStrumming(p: StrummingPattern | undefined): StrummingPattern | undefined {
  return p ? { slots: p.slots.map((s) => ({ ...s })) } : undefined;
}

/** Accept legacy string[] or ChordEntry[] and return a clean ChordEntry[]. */
export function normalizeChords(raw: unknown): ChordEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ChordEntry[] = [];
  for (const c of raw) {
    if (typeof c === 'string') {
      out.push({ id: c });
    } else if (c && typeof (c as ChordEntry).id === 'string') {
      const entry = c as ChordEntry;
      out.push({ id: entry.id, keep: entry.keep ? entry.keep.map((p) => ({ ...p })) : undefined });
    }
  }
  return out;
}

/** Small unique id generator (good enough for local, single-user data). */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFretboard(partial: Partial<Fretboard> = {}): Fretboard {
  return {
    id: uid('fb'),
    label: 'New Fretboard',
    tuningId: 'standard',
    numFrets: 15,
    capo: 0,
    displayMode: 'notes',
    rootNote: null,
    keyId: null,
    chords: [],
    preferFlats: false,
    selectedNotes: [],
    ...partial,
  };
}

export function createBoard(partial: Partial<Board> = {}): Board {
  const now = Date.now();
  return {
    id: uid('board'),
    name: 'Untitled Board',
    description: '',
    fretboards: [createFretboard({ label: 'Fretboard 1' })],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Deep-clone a fretboard with fresh ids. */
export function cloneFretboard(fb: Fretboard, label?: string): Fretboard {
  return {
    ...fb,
    id: uid('fb'),
    label: label ?? `${fb.label} (copy)`,
    chords: normalizeChords(fb.chords),
    selectedNotes: fb.selectedNotes.map((n) => ({ ...n, style: { ...n.style } })),
  };
}

/** Deep-clone a board with fresh ids throughout. */
export function cloneBoard(board: Board, name?: string): Board {
  const now = Date.now();
  return {
    ...board,
    id: uid('board'),
    name: name ?? `${board.name} (copy)`,
    fretboards: board.fretboards.map((fb) => cloneFretboard(fb, fb.label)),
    strumming: cloneStrumming(board.strumming),
    createdAt: now,
    updatedAt: now,
  };
}
