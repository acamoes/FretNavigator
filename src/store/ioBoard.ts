import { Board, SCHEMA_VERSION } from '../types';

/** Wrapper shape for a single exported board file. */
export interface BoardExport {
  schemaVersion: number;
  kind: 'fretnavigator-board';
  board: Board;
}

export function serializeBoard(board: Board): string {
  const payload: BoardExport = { schemaVersion: SCHEMA_VERSION, kind: 'fretnavigator-board', board };
  return JSON.stringify(payload, null, 2);
}

/** Validate + extract a board from imported JSON text. Throws on bad input. */
export function deserializeBoard(json: string): Board {
  const data = JSON.parse(json) as Partial<BoardExport> & { board?: unknown };
  if (!data || data.kind !== 'fretnavigator-board' || typeof data.board !== 'object' || data.board === null) {
    throw new Error('Not a valid FretNavigator board file.');
  }
  const board = data.board as Board;
  if (typeof board.name !== 'string' || !Array.isArray(board.fretboards)) {
    throw new Error('Board file is missing required fields.');
  }
  return board;
}

/** Trigger a browser download of a board as a .json file. */
export function downloadBoard(board: Board): void {
  const blob = new Blob([serializeBoard(board)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = board.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'board';
  a.href = url;
  a.download = `${safeName}.fretnav.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
