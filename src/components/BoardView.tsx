import { useBoard, useStore } from '../store/useStore';
import { downloadBoard } from '../store/ioBoard';
import { FretboardCard } from './FretboardCard';
import { StrummingEditor } from './StrummingEditor';

interface Props {
  boardId: string;
  onBack: () => void;
  onReport: () => void;
}

/** Editing view for a single board and all its fretboards. */
export function BoardView({ boardId, onBack, onReport }: Props) {
  const board = useBoard(boardId);
  const updateBoardMeta = useStore((s) => s.updateBoardMeta);
  const addFretboard = useStore((s) => s.addFretboard);

  if (!board) {
    return (
      <div className="board-view">
        <p>Board not found.</p>
        <button className="btn" onClick={onBack}>
          ← Back to boards
        </button>
      </div>
    );
  }

  return (
    <div className="board-view">
      <div className="board-view__topbar no-print">
        <button className="btn btn--ghost" onClick={onBack}>
          ← Boards
        </button>
        <div className="board-view__topbar-right">
          <button className="btn btn--ghost" onClick={() => downloadBoard(board)}>
            Export JSON
          </button>
          <button className="btn btn--primary" onClick={onReport}>
            Report
          </button>
        </div>
      </div>

      <header className="board-view__header no-print">
        <input
          className="board-view__name"
          value={board.name}
          aria-label="Board name"
          onChange={(e) => updateBoardMeta(board.id, { name: e.target.value })}
        />
        <textarea
          className="board-view__desc"
          placeholder="Description (optional)…"
          value={board.description ?? ''}
          rows={2}
          onChange={(e) => updateBoardMeta(board.id, { description: e.target.value })}
        />
        <StrummingEditor board={board} />
      </header>

      <div className="board-view__fretboards">
        {board.fretboards.map((fb, i) => (
          <FretboardCard key={fb.id} board={board} fretboard={fb} index={i} total={board.fretboards.length} />
        ))}
      </div>

      <div className="board-view__add no-print">
        <button className="btn btn--primary" onClick={() => addFretboard(board.id)}>
          + Add fretboard
        </button>
      </div>
    </div>
  );
}
