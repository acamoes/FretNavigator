import { useRef, useState } from 'react';
import { Board, TabSection } from '../types';
import { useStore } from '../store/useStore';
import { createFretboard } from '../store/factories';
import { DEFAULT_NOTE_STYLE } from '../store/colorPresets';
import { getTuning, TUNINGS } from '../music-theory';
import { TabDiagram } from './TabDiagram';
import { FretboardDiagram } from './FretboardDiagram';

interface Props {
  board: Board;
  tab: TabSection;
  index: number;
  total: number;
}

/** Interactive editor for one tab section (keyboard grid + fretboard-click). */
export function TabCard({ board, tab, index, total }: Props) {
  const updateTab = useStore((s) => s.updateTab);
  const deleteFretboard = useStore((s) => s.deleteFretboard);
  const duplicateFretboard = useStore((s) => s.duplicateFretboard);
  const moveFretboard = useStore((s) => s.moveFretboard);

  const numStrings = getTuning(tab.tuningId)?.strings.length ?? 6;
  const [cursor, setCursor] = useState<{ col: number; si: number }>({ col: 0, si: numStrings - 1 });
  // Which column's label is being typed right now (transient, like the cursor).
  const [annotEdit, setAnnotEdit] = useState<number | null>(null);
  const combineCell = useRef<string | null>(null);

  const commit = (columns: TabSection['columns']) => updateTab(board.id, tab.id, { columns });

  const setFret = (col: number, si: number, val: number | null) => {
    commit(tab.columns.map((c, i) => (i === col ? { ...c, frets: c.frets.map((f, k) => (k === si ? val : f)) } : c)));
  };
  const appendColumn = (): number => {
    commit([...tab.columns, { frets: Array(numStrings).fill(null) }]);
    return tab.columns.length; // index of the appended column
  };
  const toggleBar = (col: number) => {
    commit(tab.columns.map((c, i) => (i === col ? { ...c, bar: c.bar ? undefined : true } : c)));
  };
  const setAnnotation = (col: number, value: string) => {
    commit(tab.columns.map((c, i) => (i === col ? { ...c, annotation: value.trim() ? value : undefined } : c)));
  };
  /** Tie this cell to the next column on the same string (hammer-on / pull-off). */
  const toggleSlur = (col: number, si: number) => {
    if (col >= tab.columns.length - 1) return; // nothing to tie to
    commit(
      tab.columns.map((c, i) => {
        if (i !== col) return c;
        const next = c.slurs?.includes(si)
          ? c.slurs.filter((s) => s !== si)
          : [...(c.slurs ?? []), si].sort((a, b) => a - b);
        return { ...c, slurs: next.length ? next : undefined };
      }),
    );
  };
  const removeColumn = (col: number) => {
    if (tab.columns.length <= 1) return;
    // The previous column's slurs pointed at the column being removed; drop them
    // so no arc is left tying two notes that were never neighbours.
    const kept = tab.columns.filter((_, i) => i !== col);
    commit(kept.map((c, i) => (i === col - 1 ? { ...c, slurs: undefined } : c)));
    setCursor((c) => ({ col: Math.max(0, Math.min(c.col, tab.columns.length - 2)), si: c.si }));
  };

  const moveCursor = (col: number, si: number) => {
    setCursor({ col, si });
    setAnnotEdit(null);
    combineCell.current = null;
  };

  const advance = (col: number, si: number) => {
    const nc = col + 1 >= tab.columns.length ? appendColumn() : col + 1;
    moveCursor(nc, si);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { col, si } = cursor;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const d = Number(e.key);
      const cur = tab.columns[col]?.frets[si] ?? null;
      const key = `${col}:${si}`;
      const combined = combineCell.current === key && cur != null && cur * 10 + d <= 24 ? cur * 10 + d : d;
      setFret(col, si, combined);
      combineCell.current = key;
      return;
    }
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        advance(col, si);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveCursor(Math.max(0, col - 1), si);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveCursor(col, Math.min(numStrings - 1, si + 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveCursor(col, Math.max(0, si - 1));
        break;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        setFret(col, si, null);
        combineCell.current = null;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        advance(col, si);
        break;
      case '|':
        e.preventDefault();
        toggleBar(col);
        break;
      // Both keys do the same thing: hammer-on vs pull-off is read off the frets.
      case 'h':
      case 'H':
      case 'p':
      case 'P':
        e.preventDefault();
        toggleSlur(col, si);
        break;
      default:
        break;
    }
  };

  // Click a note on the fretboard to write it into the cursor's column.
  const handleFretClick = (si: number, fret: number) => {
    setFret(cursor.col, si, fret);
    moveCursor(cursor.col, si);
  };

  const changeTuning = (newId: string) => {
    const n = getTuning(newId)?.strings.length ?? 6;
    const columns = tab.columns.map((c) => {
      const slurs = c.slurs?.filter((s) => s < n); // drop ties to strings that no longer exist
      return {
        ...c,
        frets: Array.from({ length: n }, (_, k) => c.frets[k] ?? null),
        slurs: slurs?.length ? slurs : undefined,
      };
    });
    updateTab(board.id, tab.id, { tuningId: newId, columns });
    setCursor((c) => ({ col: c.col, si: Math.min(c.si, n - 1) }));
  };

  // Synthetic fretboard reflecting the cursor column (for feedback + click input).
  const curCol = tab.columns[cursor.col];
  const inputFretboard = createFretboard({
    tuningId: tab.tuningId,
    numFrets: 15,
    selectedNotes: curCol
      ? curCol.frets.flatMap((f, si) => (f == null ? [] : [{ stringIndex: si, fret: f, style: DEFAULT_NOTE_STYLE }]))
      : [],
  });

  return (
    <section className="fb-card">
      <header className="fb-card__header">
        <div className="fb-card__title">
          <span className="fb-card__index">{index + 1}</span>
          <span className="tag tag--tab">TAB</span>
          <input
            className="fb-card__label"
            value={tab.label}
            aria-label="Tab label"
            onChange={(e) => updateTab(board.id, tab.id, { label: e.target.value })}
          />
        </div>
        <div className="fb-card__actions no-print">
          <button type="button" className="btn btn--icon" title="Move up" disabled={index === 0} onClick={() => moveFretboard(board.id, tab.id, -1)}>
            ↑
          </button>
          <button
            type="button"
            className="btn btn--icon"
            title="Move down"
            disabled={index === total - 1}
            onClick={() => moveFretboard(board.id, tab.id, 1)}
          >
            ↓
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => duplicateFretboard(board.id, tab.id)}>
            Duplicate
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => {
              if (confirm(`Delete tab "${tab.label}"?`)) deleteFretboard(board.id, tab.id);
            }}
          >
            Delete
          </button>
        </div>
      </header>

      <div className="tab-editor__controls no-print">
        <label className="field field--tuning">
          <span>Tuning</span>
          <select value={tab.tuningId} onChange={(e) => changeTuning(e.target.value)}>
            {TUNINGS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => advance(cursor.col, cursor.si)}>
          + Column
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleBar(cursor.col)}>
          Barline
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleSlur(cursor.col, cursor.si)}>
          Hammer / Pull
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAnnotEdit(cursor.col)}>
          Label
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeColumn(cursor.col)}>
          Remove column
        </button>
        <span className="tab-editor__hint">
          Type numbers · ← → move · ↑ ↓ string · space = next · <kbd>|</kbd> barline · <kbd>h</kbd> hammer/pull ·
          backspace clears · click above a column to name the chord
        </span>
      </div>

      <div
        className="tab-editor__grid no-print"
        tabIndex={0}
        role="application"
        aria-label="Tab editor grid"
        onKeyDown={handleKeyDown}
      >
        <TabDiagram
          tab={tab}
          cursor={cursor}
          onCellClick={(col, si) => moveCursor(col, si)}
          annotationEdit={annotEdit}
          onAnnotationClick={(col) => {
            moveCursor(col, cursor.si);
            setAnnotEdit(col);
          }}
          onAnnotationChange={setAnnotation}
          onAnnotationDone={() => setAnnotEdit(null)}
        />
      </div>

      <div className="tab-editor__fretboard no-print">
        <span className="tab-editor__hint">Or click a fret to place it in the current column:</span>
        <div className="fb-card__scroll">
          <FretboardDiagram fretboard={inputFretboard} onCellClick={handleFretClick} />
        </div>
      </div>
    </section>
  );
}
