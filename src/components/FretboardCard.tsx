import { useState } from 'react';
import { Board, Fretboard, NoteStyle } from '../types';
import { useStore } from '../store/useStore';
import { DEFAULT_NOTE_STYLE } from '../store/colorPresets';
import { chordDisplayName, chordToneRoles, getTuning, pitchAt } from '../music-theory';
import { FretboardControls } from './FretboardControls';
import { FretboardDiagram } from './FretboardDiagram';
import { NoteBrush } from './NoteBrush';

interface Props {
  board: Board;
  fretboard: Fretboard;
  index: number;
  total: number;
}

function sameStyle(a: NoteStyle, b: NoteStyle): boolean {
  return a.fill === b.fill && a.stroke === b.stroke && a.strokeStyle === b.strokeStyle;
}

/** One interactive fretboard within a board (header + controls + diagram). */
export function FretboardCard({ board, fretboard: fb, index, total }: Props) {
  const [brush, setBrush] = useState<NoteStyle>(DEFAULT_NOTE_STYLE);
  // Transient: which chord of the progression is isolated (null = show all).
  const [focusedChordIndex, setFocusedChordIndex] = useState<number | null>(null);
  // Transient: chord being refined ("select notes to keep") + the draft selection.
  const [refiningChordIndex, setRefiningChordIndex] = useState<number | null>(null);
  const [keepDraft, setKeepDraft] = useState<string[]>([]);

  const updateFretboard = useStore((s) => s.updateFretboard);
  const deleteFretboard = useStore((s) => s.deleteFretboard);
  const duplicateFretboard = useStore((s) => s.duplicateFretboard);
  const moveFretboard = useStore((s) => s.moveFretboard);
  const toggleNote = useStore((s) => s.toggleNote);
  const setNoteStyle = useStore((s) => s.setNoteStyle);
  const clearSelectedNotes = useStore((s) => s.clearSelectedNotes);

  const focusedChord = focusedChordIndex !== null ? fb.chords[focusedChordIndex] : undefined;
  const refining = refiningChordIndex !== null;

  // Changing focus always exits any in-progress refine.
  const handleFocusChord = (idx: number | null) => {
    setFocusedChordIndex(idx);
    setRefiningChordIndex(null);
    setKeepDraft([]);
  };

  const startRefine = () => {
    if (focusedChordIndex === null || !focusedChord) return;
    setRefiningChordIndex(focusedChordIndex);
    setKeepDraft((focusedChord.keep ?? []).map((p) => `${p.stringIndex}:${p.fret}`));
  };
  const cancelRefine = () => {
    setRefiningChordIndex(null);
    setKeepDraft([]);
  };
  const commitRefine = () => {
    if (refiningChordIndex === null || keepDraft.length === 0) return;
    const keep = keepDraft.map((k) => {
      const [s, f] = k.split(':').map(Number);
      return { stringIndex: s, fret: f };
    });
    updateFretboard(board.id, fb.id, {
      chords: fb.chords.map((c, i) => (i === refiningChordIndex ? { ...c, keep } : c)),
    });
    setRefiningChordIndex(null);
    setKeepDraft([]);
  };
  // Drop a chord's voicing filter so all of its notes show again.
  const showAllForFocused = () => {
    if (focusedChordIndex === null) return;
    updateFretboard(board.id, fb.id, {
      chords: fb.chords.map((c, i) => (i === focusedChordIndex ? { id: c.id } : c)),
    });
    cancelRefine();
  };

  const handleCellClick = (stringIndex: number, fret: number) => {
    // Refine mode: clicking a chord tone toggles it in the "keep" selection.
    if (refiningChordIndex !== null) {
      const entry = fb.chords[refiningChordIndex];
      if (!entry) return;
      const tuning = getTuning(fb.tuningId) ?? getTuning('standard')!;
      const pc = pitchAt(tuning.strings[stringIndex], fret);
      if (!chordToneRoles(entry.id).has(pc)) return; // only this chord's notes are selectable
      const key = `${stringIndex}:${fret}`;
      setKeepDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
      return;
    }

    const existing = fb.selectedNotes.find((n) => n.stringIndex === stringIndex && n.fret === fret);
    if (existing && !sameStyle(existing.style, brush)) {
      // Recolor with the current brush instead of toggling off.
      setNoteStyle(board.id, fb.id, stringIndex, fret, brush);
    } else {
      // Add if empty, or remove if it already matches the brush.
      toggleNote(board.id, fb.id, stringIndex, fret, brush);
    }
  };

  return (
    <section className="fb-card">
      <header className="fb-card__header">
        <div className="fb-card__title">
          <span className="fb-card__index">{index + 1}</span>
          <input
            className="fb-card__label"
            value={fb.label}
            aria-label="Fretboard label"
            onChange={(e) => updateFretboard(board.id, fb.id, { label: e.target.value })}
          />
        </div>
        <div className="fb-card__actions no-print">
          <button
            type="button"
            className="btn btn--icon"
            title="Move up"
            disabled={index === 0}
            onClick={() => moveFretboard(board.id, fb.id, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn--icon"
            title="Move down"
            disabled={index === total - 1}
            onClick={() => moveFretboard(board.id, fb.id, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            title="Duplicate fretboard"
            onClick={() => duplicateFretboard(board.id, fb.id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            title="Delete fretboard"
            onClick={() => {
              if (total <= 1 || confirm(`Delete fretboard "${fb.label}"?`)) deleteFretboard(board.id, fb.id);
            }}
          >
            Delete
          </button>
        </div>
      </header>

      <div className="no-print">
        <FretboardControls
          fretboard={fb}
          onChange={(patch) => updateFretboard(board.id, fb.id, patch)}
          focusedChordIndex={focusedChordIndex}
          onFocusChord={handleFocusChord}
        />
      </div>

      {focusedChord && (
        <div className="refine-bar no-print">
          {!refining ? (
            <>
              <span className="refine-bar__text">
                Focusing <strong>{chordDisplayName(focusedChord.id, fb.preferFlats)}</strong>
              </span>
              <button type="button" className="btn btn--sm" onClick={startRefine}>
                Select notes to keep
              </button>
              {focusedChord.keep && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={showAllForFocused}>
                  Show all notes
                </button>
              )}
            </>
          ) : (
            <>
              <span className="refine-bar__text">
                Click the notes to <strong>keep</strong> for {chordDisplayName(focusedChord.id, fb.preferFlats)} ·{' '}
                {keepDraft.length} selected
              </span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={keepDraft.length === 0}
                onClick={commitRefine}
              >
                Remove Unselected Notes
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={cancelRefine}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div className="fb-card__diagram">
        <div className="fb-card__scroll">
          <FretboardDiagram
            fretboard={fb}
            onCellClick={handleCellClick}
            focusedChordIndex={focusedChordIndex}
            refine={refining ? { chordIndex: refiningChordIndex!, keepKeys: new Set(keepDraft) } : undefined}
          />
        </div>
      </div>

      <div className="fb-card__footer no-print">
        <NoteBrush value={brush} onChange={setBrush} />
        {fb.selectedNotes.length > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              if (confirm('Clear all pinned notes on this fretboard?')) clearSelectedNotes(board.id, fb.id);
            }}
          >
            Clear {fb.selectedNotes.length} pinned
          </button>
        )}
      </div>
    </section>
  );
}
