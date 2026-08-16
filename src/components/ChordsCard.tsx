import { Board, ChordBox, ChordsSection } from '../types';
import { useStore } from '../store/useStore';
import {
  ALL_PITCH_CLASSES,
  chordId,
  chordShapes,
  getChordType,
  noteName,
  parseChordId,
  SHAPED_CHORD_TYPES,
} from '../music-theory';
import { ChordDiagram } from './ChordDiagram';

interface Props {
  board: Board;
  section: ChordsSection;
  index: number;
  total: number;
}

/** Compact suffixes, the way a guitarist writes them: C, Cm, Cmaj7, Cm7b5. */
const TYPE_LABELS = SHAPED_CHORD_TYPES.map((id) => ({
  id,
  label: getChordType(id)?.symbol || 'maj',
}));

/** Editor for one chords section: a grid of chord boxes, each with a picker. */
export function ChordsCard({ board, section, index, total }: Props) {
  const updateChords = useStore((s) => s.updateChords);
  const deleteFretboard = useStore((s) => s.deleteFretboard);
  const duplicateFretboard = useStore((s) => s.duplicateFretboard);
  const moveFretboard = useStore((s) => s.moveFretboard);

  const commit = (boxes: ChordBox[]) => updateChords(board.id, section.id, { boxes });

  const setBox = (i: number, patch: Partial<ChordBox>) => {
    commit(section.boxes.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  };

  return (
    <section className="fb-card">
      <header className="fb-card__header">
        <div className="fb-card__title">
          <span className="fb-card__index">{index + 1}</span>
          <span className="tag tag--chords">CHORDS</span>
          <input
            className="fb-card__label"
            value={section.label}
            aria-label="Chords label"
            onChange={(e) => updateChords(board.id, section.id, { label: e.target.value })}
          />
        </div>
        <div className="fb-card__actions no-print">
          <button
            type="button"
            className="btn btn--icon"
            title="Move up"
            disabled={index === 0}
            onClick={() => moveFretboard(board.id, section.id, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn--icon"
            title="Move down"
            disabled={index === total - 1}
            onClick={() => moveFretboard(board.id, section.id, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => duplicateFretboard(board.id, section.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => {
              if (confirm(`Delete chords "${section.label}"?`)) deleteFretboard(board.id, section.id);
            }}
          >
            Delete
          </button>
        </div>
      </header>

      <div className="chord-grid">
        {section.boxes.map((box, i) => {
          const parsed = box.id ? parseChordId(box.id) : null;
          const root = parsed ? parsed.root : 0;
          const typeId = parsed ? parsed.type.id : '';
          const shapes = box.id ? chordShapes(box.id) : [];
          const at = Math.min(box.shape ?? 0, Math.max(0, shapes.length - 1));

          const step = (delta: number) => {
            if (shapes.length < 2) return;
            setBox(i, { shape: (at + delta + shapes.length) % shapes.length });
          };

          return (
            <div className="chord-box" key={i}>
              <div className="chord-box__pick no-print">
                <div className="dual">
                  <select
                    aria-label={`Chord ${i + 1} root`}
                    value={root}
                    onChange={(e) =>
                      // Position resets: a stale index may not exist on the new chord.
                      setBox(i, { id: chordId(Number(e.target.value), typeId || 'maj'), shape: undefined })
                    }
                  >
                    {ALL_PITCH_CLASSES.map((pc) => (
                      <option key={pc} value={pc}>
                        {noteName(pc)}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Chord ${i + 1} type`}
                    value={typeId}
                    onChange={(e) =>
                      setBox(i, { id: e.target.value ? chordId(root, e.target.value) : '', shape: undefined })
                    }
                  >
                    <option value="">—</option>
                    {TYPE_LABELS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn--icon chord-box__remove"
                  title="Remove chord"
                  onClick={() => commit(section.boxes.filter((_, k) => k !== i))}
                >
                  ×
                </button>
              </div>

              {/* No name here — the picker right above it already says which chord. */}
              <ChordDiagram shape={shapes[at]} />

              {shapes.length > 1 && (
                <div className="chord-box__positions no-print">
                  <button type="button" className="btn btn--icon" title="Previous position" onClick={() => step(-1)}>
                    ‹
                  </button>
                  <span>
                    {at + 1}/{shapes.length}
                  </span>
                  <button type="button" className="btn btn--icon" title="Next position" onClick={() => step(1)}>
                    ›
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="chord-grid__add no-print">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => commit([...section.boxes, { id: '' }])}
        >
          + Add chord
        </button>
      </div>
    </section>
  );
}
