import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { deserializeBoards, downloadBoard, downloadLibrary } from '../store/ioBoard';

interface Props {
  onOpenBoard: (boardId: string) => void;
}

/** Landing screen: the list of saved boards + create/import. */
export function Dashboard({ onOpenBoard }: Props) {
  const boards = useStore((s) => s.boards);
  const addBoard = useStore((s) => s.addBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const duplicateBoard = useStore((s) => s.duplicateBoard);
  const importBoards = useStore((s) => s.importBoards);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const ids = importBoards(deserializeBoards(text));
      // Jump straight into a single board; a whole library stays on the list,
      // where you can see everything that just arrived.
      if (ids.length === 1) onOpenBoard(ids[0]);
      else alert(`Imported ${ids.length} boards.`);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  };

  const sorted = [...boards].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="dashboard">
      <div className="dashboard__bar">
        <div>
          <h1 className="dashboard__title">Boards</h1>
          <p className="dashboard__subtitle">Reference boards for songs, keys and interval studies.</p>
        </div>
        <div className="dashboard__actions">
          <button
            className="btn btn--ghost"
            disabled={boards.length === 0}
            title={boards.length === 0 ? 'No boards to export yet' : 'Save every board to one file'}
            onClick={() => downloadLibrary(boards)}
          >
            Export all
          </button>
          {/* Takes a single-board file or a whole library — same button. */}
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <button
            className="btn btn--primary"
            onClick={() => onOpenBoard(addBoard())}
          >
            + New board
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <p>No boards yet.</p>
          <button className="btn btn--primary" onClick={() => onOpenBoard(addBoard('My First Board'))}>
            Create your first board
          </button>
        </div>
      ) : (
        <div className="board-grid">
          {sorted.map((board) => (
            <article key={board.id} className="board-card" onClick={() => onOpenBoard(board.id)}>
              <div className="board-card__body">
                <h2 className="board-card__name">{board.name}</h2>
                {board.description ? (
                  <p className="board-card__desc">{board.description}</p>
                ) : (
                  <p className="board-card__desc board-card__desc--muted">No description</p>
                )}
              </div>
              <div className="board-card__meta">
                <span>
                  {board.sections.length} section{board.sections.length === 1 ? '' : 's'}
                </span>
                <span>· {new Date(board.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="board-card__actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn--ghost btn--sm" onClick={() => duplicateBoard(board.id)}>
                  Duplicate
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => downloadBoard(board)}>
                  Export
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => {
                    if (confirm(`Delete board "${board.name}"? This cannot be undone.`)) deleteBoard(board.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
