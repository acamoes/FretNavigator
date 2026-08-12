import { Board } from '../types';
import { useStore } from '../store/useStore';
import { ALL_PITCH_CLASSES, keyId, noteName, parseKeyId, SCALE_TYPES } from '../music-theory';
import { KeyTable } from './KeyTable';

interface Props {
  board: Board;
}

/**
 * Board-level key picker: sets the song's key and shows what it is made of.
 * The key is independent of each fretboard's own key — "Apply to all" copies it
 * across on demand rather than silently overwriting per-fretboard choices.
 */
export function KeyPanel({ board }: Props) {
  const updateBoardMeta = useStore((s) => s.updateBoardMeta);
  const updateFretboard = useStore((s) => s.updateFretboard);

  const parsed = board.keyId ? parseKeyId(board.keyId) : null;
  const root = parsed ? parsed.root : 0;
  const scaleId = parsed ? parsed.scale.id : '';

  const fretboards = board.sections.filter((s) => s.kind === 'fretboard');
  const canApply = !!board.keyId && fretboards.length > 0;

  const applyToFretboards = () => {
    for (const fb of fretboards) updateFretboard(board.id, fb.id, { keyId: board.keyId });
  };

  return (
    <section className="key-panel no-print">
      <div className="key-panel__bar">
        <label className="field">
          <span>Song key</span>
          <div className="dual">
            <select
              aria-label="Key root"
              value={root}
              onChange={(e) => updateBoardMeta(board.id, { keyId: keyId(Number(e.target.value), scaleId || 'major') })}
            >
              {ALL_PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {noteName(pc)}
                </option>
              ))}
            </select>
            <select
              aria-label="Key scale"
              value={scaleId}
              onChange={(e) =>
                updateBoardMeta(board.id, { keyId: e.target.value ? keyId(root, e.target.value) : undefined })
              }
            >
              <option value="">Off</option>
              {SCALE_TYPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={!canApply}
          title={canApply ? undefined : 'Pick a key first'}
          onClick={applyToFretboards}
        >
          Apply to all fretboards
        </button>
      </div>

      {board.keyId ? (
        <KeyTable keyId={board.keyId} />
      ) : (
        <p className="key-panel__empty">
          Set the key to see its notes and the chords behind each degree.
        </p>
      )}
    </section>
  );
}
