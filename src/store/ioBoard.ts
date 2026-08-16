/**
 * JSON export / import. Two file shapes: one board, or the whole library as a
 * backup. Reading accepts either, so a single Import action covers both.
 */

import { Board, SCHEMA_VERSION } from '../types';

/** Wrapper shape for a single exported board file. */
export interface BoardExport {
  schemaVersion: number;
  kind: 'fretnavigator-board';
  board: Board;
}

/** Wrapper shape for a whole-library export: every board in one file. */
export interface LibraryExport {
  schemaVersion: number;
  kind: 'fretnavigator-library';
  exportedAt: string;
  boards: Board[];
}

export function serializeBoard(board: Board): string {
  const payload: BoardExport = { schemaVersion: SCHEMA_VERSION, kind: 'fretnavigator-board', board };
  return JSON.stringify(payload, null, 2);
}

export function serializeLibrary(boards: Board[]): string {
  const payload: LibraryExport = {
    schemaVersion: SCHEMA_VERSION,
    kind: 'fretnavigator-library',
    exportedAt: new Date().toISOString(),
    boards,
  };
  return JSON.stringify(payload, null, 2);
}

/** A board needs a name and some sections; old exports called them `fretboards`. */
function isBoardLike(value: unknown): value is Board {
  if (!value || typeof value !== 'object') return false;
  const board = value as Board & { fretboards?: unknown };
  // cloneBoard normalizes either field into `sections` on import.
  return typeof board.name === 'string' && (Array.isArray(board.sections) || Array.isArray(board.fretboards));
}

/**
 * Every board in an imported file. Accepts **both** shapes — a library export
 * and a single-board export — so one Import action handles whichever file the
 * user picks. Throws on anything else.
 */
export function deserializeBoards(json: string): Board[] {
  // Untrusted input: the two export kinds have incompatible literal `kind`s, so
  // this is a bag of unknowns until the checks below narrow it.
  const data = JSON.parse(json) as { kind?: unknown; boards?: unknown; board?: unknown } | null;
  if (!data || typeof data !== 'object') throw new Error('Not a valid FretNavigator file.');

  if (data.kind === 'fretnavigator-library') {
    if (!Array.isArray(data.boards)) throw new Error('Library file has no boards.');
    const boards = data.boards.filter(isBoardLike);
    if (boards.length === 0) throw new Error('Library file contains no usable boards.');
    return boards;
  }

  if (data.kind === 'fretnavigator-board') {
    if (!isBoardLike(data.board)) throw new Error('Board file is missing required fields.');
    return [data.board];
  }

  throw new Error('Not a valid FretNavigator board or library file.');
}

/** Filename-safe slug, e.g. "Esta Cidade" -> "esta_cidade". */
function slug(name: string, fallback: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || fallback;
}

function download(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of one board as a .json file. */
export function downloadBoard(board: Board): void {
  download(serializeBoard(board), `${slug(board.name, 'board')}.fretnav.json`);
}

/** Trigger a browser download of every board in one file (a backup). */
export function downloadLibrary(boards: Board[]): void {
  const date = new Date().toISOString().slice(0, 10);
  download(serializeLibrary(boards), `fretnavigator-library-${date}.fretnav.json`);
}
