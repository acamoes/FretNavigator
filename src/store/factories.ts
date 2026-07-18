import { Board, ChordEntry, Fretboard, Section, StrummingPattern, TabColumn, TabSection } from '../types';
import { getTuning } from '../music-theory';

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
    kind: 'fretboard',
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

/** A blank tab section: a handful of empty columns sized to the tuning. */
export function createTabSection(tuningId = 'standard'): TabSection {
  const numStrings = getTuning(tuningId)?.strings.length ?? 6;
  const columns: TabColumn[] = Array.from({ length: 8 }, () => ({ frets: Array(numStrings).fill(null) }));
  return { kind: 'tab', id: uid('tab'), label: 'Solo', tuningId, columns };
}

/** Coerce persisted/imported data into clean tab columns. */
function normalizeTabColumns(raw: unknown): TabColumn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const col = (c ?? {}) as { frets?: unknown; bar?: unknown };
    return {
      frets: Array.isArray(col.frets) ? (col.frets as (number | null)[]).map((f) => (typeof f === 'number' ? f : null)) : [],
      bar: col.bar ? true : undefined,
    };
  });
}

/** Coerce one persisted/imported section into a clean, kind-tagged Section. */
function normalizeSection(raw: unknown): Section | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (s.kind === 'tab') {
    return {
      kind: 'tab',
      id: typeof s.id === 'string' ? s.id : uid('tab'),
      label: typeof s.label === 'string' ? s.label : 'Solo',
      tuningId: typeof s.tuningId === 'string' ? s.tuningId : 'standard',
      columns: normalizeTabColumns(s.columns),
    };
  }
  // Anything else is a fretboard (legacy sections had no `kind`).
  return { ...(raw as Fretboard), kind: 'fretboard', chords: normalizeChords(s.chords) };
}

/** Read a board's sections, accepting the legacy `fretboards` field, cleaned. */
export function normalizeSections(board: { sections?: unknown; fretboards?: unknown }): Section[] {
  const list = Array.isArray(board.sections)
    ? board.sections
    : Array.isArray(board.fretboards)
      ? board.fretboards
      : [];
  return list.map(normalizeSection).filter((s): s is Section => s !== null);
}

export function createBoard(partial: Partial<Board> = {}): Board {
  const now = Date.now();
  return {
    id: uid('board'),
    name: 'Untitled Board',
    description: '',
    sections: [createFretboard({ label: 'Fretboard 1' })],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Deep-clone a fretboard with fresh ids. */
export function cloneFretboard(fb: Fretboard, label?: string): Fretboard {
  return {
    ...fb,
    kind: 'fretboard',
    id: uid('fb'),
    label: label ?? `${fb.label} (copy)`,
    chords: normalizeChords(fb.chords),
    selectedNotes: fb.selectedNotes.map((n) => ({ ...n, style: { ...n.style } })),
  };
}

/** Deep-clone a tab section with a fresh id. */
export function cloneTabSection(tab: TabSection, label?: string): TabSection {
  return {
    ...tab,
    id: uid('tab'),
    label: label ?? `${tab.label} (copy)`,
    columns: tab.columns.map((c) => ({ frets: [...c.frets], bar: c.bar })),
  };
}

/** Deep-clone any section, preserving its kind. */
export function cloneSection(section: Section, label?: string): Section {
  return section.kind === 'tab' ? cloneTabSection(section, label) : cloneFretboard(section, label);
}

/** Deep-clone a board with fresh ids throughout. */
export function cloneBoard(board: Board, name?: string): Board {
  const now = Date.now();
  return {
    ...board,
    id: uid('board'),
    name: name ?? `${board.name} (copy)`,
    sections: normalizeSections(board).map((s) => cloneSection(s, s.label)),
    strumming: cloneStrumming(board.strumming),
    createdAt: now,
    updatedAt: now,
  };
}
