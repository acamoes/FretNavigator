import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Board, Fretboard, NoteStyle, SCHEMA_VERSION, SelectedNote } from '../types';
import { cloneBoard, cloneFretboard, createBoard, createFretboard, normalizeChords, uid } from './factories';

interface StoreState {
  boards: Board[];

  // Board-level actions
  addBoard: (name?: string) => string;
  importBoard: (board: Board) => string;
  deleteBoard: (boardId: string) => void;
  duplicateBoard: (boardId: string) => string | null;
  updateBoardMeta: (boardId: string, patch: Partial<Pick<Board, 'name' | 'description' | 'strumming'>>) => void;

  // Fretboard-level actions
  addFretboard: (boardId: string) => void;
  deleteFretboard: (boardId: string, fretboardId: string) => void;
  duplicateFretboard: (boardId: string, fretboardId: string) => void;
  updateFretboard: (boardId: string, fretboardId: string, patch: Partial<Fretboard>) => void;
  moveFretboard: (boardId: string, fretboardId: string, direction: -1 | 1) => void;

  // Note-level actions
  toggleNote: (boardId: string, fretboardId: string, stringIndex: number, fret: number, style: NoteStyle) => void;
  setNoteStyle: (boardId: string, fretboardId: string, stringIndex: number, fret: number, style: NoteStyle) => void;
  clearSelectedNotes: (boardId: string, fretboardId: string) => void;
}

function touch(board: Board): Board {
  return { ...board, updatedAt: Date.now() };
}

/** Apply a transform to one board and mark it updated. */
function mapBoard(boards: Board[], boardId: string, fn: (b: Board) => Board): Board[] {
  return boards.map((b) => (b.id === boardId ? touch(fn(b)) : b));
}

/** Apply a transform to one fretboard within a board. */
function mapFretboard(board: Board, fretboardId: string, fn: (fb: Fretboard) => Fretboard): Board {
  return { ...board, fretboards: board.fretboards.map((fb) => (fb.id === fretboardId ? fn(fb) : fb)) };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      boards: [],

      addBoard: (name) => {
        const board = createBoard(name ? { name } : {});
        set((s) => ({ boards: [board, ...s.boards] }));
        return board.id;
      },

      importBoard: (board) => {
        // Re-id to avoid collisions with existing boards.
        const imported = cloneBoard(board, board.name);
        set((s) => ({ boards: [imported, ...s.boards] }));
        return imported.id;
      },

      deleteBoard: (boardId) => set((s) => ({ boards: s.boards.filter((b) => b.id !== boardId) })),

      duplicateBoard: (boardId) => {
        const original = get().boards.find((b) => b.id === boardId);
        if (!original) return null;
        const copy = cloneBoard(original);
        set((s) => ({ boards: [copy, ...s.boards] }));
        return copy.id;
      },

      updateBoardMeta: (boardId, patch) =>
        set((s) => ({ boards: mapBoard(s.boards, boardId, (b) => ({ ...b, ...patch })) })),

      addFretboard: (boardId) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => ({
            ...b,
            fretboards: [...b.fretboards, createFretboard({ label: `Fretboard ${b.fretboards.length + 1}` })],
          })),
        })),

      deleteFretboard: (boardId, fretboardId) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => ({
            ...b,
            fretboards: b.fretboards.filter((fb) => fb.id !== fretboardId),
          })),
        })),

      duplicateFretboard: (boardId, fretboardId) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => {
            const idx = b.fretboards.findIndex((fb) => fb.id === fretboardId);
            if (idx < 0) return b;
            const copy = cloneFretboard(b.fretboards[idx]);
            const next = [...b.fretboards];
            next.splice(idx + 1, 0, copy);
            return { ...b, fretboards: next };
          }),
        })),

      updateFretboard: (boardId, fretboardId, patch) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => mapFretboard(b, fretboardId, (fb) => ({ ...fb, ...patch }))),
        })),

      moveFretboard: (boardId, fretboardId, direction) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => {
            const idx = b.fretboards.findIndex((fb) => fb.id === fretboardId);
            const target = idx + direction;
            if (idx < 0 || target < 0 || target >= b.fretboards.length) return b;
            const next = [...b.fretboards];
            [next[idx], next[target]] = [next[target], next[idx]];
            return { ...b, fretboards: next };
          }),
        })),

      toggleNote: (boardId, fretboardId, stringIndex, fret, style) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) =>
            mapFretboard(b, fretboardId, (fb) => {
              const exists = fb.selectedNotes.some((n) => n.stringIndex === stringIndex && n.fret === fret);
              const selectedNotes: SelectedNote[] = exists
                ? fb.selectedNotes.filter((n) => !(n.stringIndex === stringIndex && n.fret === fret))
                : [...fb.selectedNotes, { stringIndex, fret, style: { ...style } }];
              return { ...fb, selectedNotes };
            }),
          ),
        })),

      setNoteStyle: (boardId, fretboardId, stringIndex, fret, style) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) =>
            mapFretboard(b, fretboardId, (fb) => ({
              ...fb,
              selectedNotes: fb.selectedNotes.map((n) =>
                n.stringIndex === stringIndex && n.fret === fret ? { ...n, style: { ...style } } : n,
              ),
            })),
          ),
        })),

      clearSelectedNotes: (boardId, fretboardId) =>
        set((s) => ({
          boards: mapBoard(s.boards, boardId, (b) => mapFretboard(b, fretboardId, (fb) => ({ ...fb, selectedNotes: [] }))),
        })),
    }),
    {
      name: 'fretnavigator',
      version: SCHEMA_VERSION,
      partialize: (state) => ({ boards: state.boards }),
      // Runs on every rehydration (even when the stored version matches), so a
      // board saved mid-migration with legacy string chords always self-heals.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as { boards?: Board[] };
        const boards = (p.boards ?? []).map((b) => ({
          ...b,
          fretboards: (b.fretboards ?? []).map((fb) => ({
            ...fb,
            chords: normalizeChords((fb as { chords?: unknown }).chords),
          })),
        }));
        return { ...current, boards };
      },
      migrate: (persisted, version) => {
        const state = (persisted ?? { boards: [] }) as { boards: Board[] };
        for (const b of state.boards ?? []) {
          for (const fb of b.fretboards ?? []) {
            const legacy = fb as unknown as { chordId?: string | null; chords?: unknown };
            // v1 -> v2: single `chordId` became a list.
            if (version < 2 && !Array.isArray(legacy.chords)) {
              legacy.chords = legacy.chordId ? [legacy.chordId] : [];
            }
            delete legacy.chordId;
            // v2 -> v3: string[] became ChordEntry[] ({ id, keep? }).
            if (version < 3) {
              fb.chords = normalizeChords(legacy.chords);
            }
          }
        }
        return state;
      },
    },
  ),
);

/** Convenience selector hook: look up a board by id (reactive). */
export function useBoard(boardId: string | null): Board | undefined {
  return useStore((s) => (boardId ? s.boards.find((b) => b.id === boardId) : undefined));
}

export { uid };
