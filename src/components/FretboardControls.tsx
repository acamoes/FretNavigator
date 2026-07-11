import { useState } from 'react';
import { Fretboard } from '../types';
import {
  ALL_PITCH_CLASSES,
  CHORD_TYPES,
  chordId,
  chordDisplayName,
  keyId,
  noteName,
  parseKeyId,
  SCALE_TYPES,
  TUNINGS,
} from '../music-theory';
import { chordColor } from '../store/colorPresets';
import { effectiveRootNote } from './fretboardLayout';

interface Props {
  fretboard: Fretboard;
  onChange: (patch: Partial<Fretboard>) => void;
  focusedChordIndex: number | null;
  onFocusChord: (index: number | null) => void;
  /** Enter "select notes to keep" (voicing) mode directly for this chord. */
  onRefineChord: (index: number) => void;
}

/** All per-fretboard configuration controls. */
export function FretboardControls({ fretboard: fb, onChange, focusedChordIndex, onFocusChord, onRefineChord }: Props) {
  const parsedKey = fb.keyId ? parseKeyId(fb.keyId) : null;

  // Key selector uses a separate root + scale. Default key root to A.
  const keyRoot = parsedKey ? parsedKey.root : 9;
  const keyScale = parsedKey ? parsedKey.scale.id : '';

  // Local picker state for the "add chord" control (root + type to append).
  const [pickRoot, setPickRoot] = useState(0);
  const [pickType, setPickType] = useState('maj');

  const chords = fb.chords ?? [];

  const addChord = () => {
    onChange({ chords: [...chords, { id: chordId(pickRoot, pickType) }] });
  };
  const removeChord = (index: number) => {
    onChange({ chords: chords.filter((_, i) => i !== index) });
    onFocusChord(null);
  };
  const toggleFocus = (index: number) => {
    onFocusChord(focusedChordIndex === index ? null : index);
  };

  // Root actually used by intervals mode (dropdown, or the first pinned note).
  const effRoot = effectiveRootNote(fb);
  const rootFromNote = fb.rootNote === null && effRoot !== null;

  return (
    <div className="fb-controls">
      <div className="fb-controls__group">
        <label className="field">
          <span>Tuning</span>
          <select value={fb.tuningId} onChange={(e) => onChange({ tuningId: e.target.value })}>
            {TUNINGS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--narrow">
          <span>Frets</span>
          <input
            type="number"
            min={5}
            max={24}
            value={fb.numFrets}
            onChange={(e) => onChange({ numFrets: clamp(Number(e.target.value), 5, 24) })}
          />
        </label>

        <label className="field field--narrow">
          <span>Capo</span>
          <input
            type="number"
            min={0}
            max={fb.numFrets}
            value={fb.capo}
            onChange={(e) => onChange({ capo: clamp(Number(e.target.value), 0, fb.numFrets) })}
          />
        </label>
      </div>

      <div className="fb-controls__group">
        {/* Notes / Intervals toggle */}
        <div className="segmented" role="group" aria-label="Display mode">
          <button
            type="button"
            className={fb.displayMode === 'notes' ? 'is-active' : ''}
            onClick={() => onChange({ displayMode: 'notes' })}
          >
            Notes
          </button>
          <button
            type="button"
            className={fb.displayMode === 'intervals' ? 'is-active' : ''}
            onClick={() => onChange({ displayMode: 'intervals' })}
          >
            Intervals
          </button>
        </div>

        <label className="field field--narrow">
          <span>Root</span>
          <select
            value={fb.rootNote ?? ''}
            onChange={(e) => onChange({ rootNote: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">—</option>
            {ALL_PITCH_CLASSES.map((pc) => (
              <option key={pc} value={pc}>
                {noteName(pc, fb.preferFlats)}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--check" title="Spell notes with flats">
          <input
            type="checkbox"
            checked={fb.preferFlats}
            onChange={(e) => onChange({ preferFlats: e.target.checked })}
          />
          <span>♭</span>
        </label>
      </div>

      <div className="fb-controls__group">
        {/* Key selector */}
        <label className="field">
          <span>Key</span>
          <div className="dual">
            <select
              value={keyRoot}
              onChange={(e) => onChange({ keyId: keyScale ? keyId(Number(e.target.value), keyScale) : keyId(Number(e.target.value), 'major') })}
            >
              {ALL_PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {noteName(pc, fb.preferFlats)}
                </option>
              ))}
            </select>
            <select
              value={keyScale}
              onChange={(e) => onChange({ keyId: e.target.value ? keyId(keyRoot, e.target.value) : null })}
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

        {/* Chord progression: pick a chord and add it to the fretboard */}
        <label className="field">
          <span>Add chord</span>
          <div className="dual">
            <select value={pickRoot} onChange={(e) => setPickRoot(Number(e.target.value))}>
              {ALL_PITCH_CLASSES.map((pc) => (
                <option key={pc} value={pc}>
                  {noteName(pc, fb.preferFlats)}
                </option>
              ))}
            </select>
            <select value={pickType} onChange={(e) => setPickType(e.target.value)}>
              {CHORD_TYPES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--primary btn--sm" onClick={addChord} title="Add chord to fretboard">
              +
            </button>
          </div>
        </label>

        {(fb.keyId || chords.length > 0) && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              onChange({ keyId: null, chords: [] });
              onFocusChord(null);
            }}
          >
            Clear highlights
          </button>
        )}
      </div>

      {/* Live label of what's active */}
      <div className="fb-controls__summary">
        {parsedKey && (
          <span className="tag tag--key">
            Key: {noteName(parsedKey.root, fb.preferFlats)} {parsedKey.scale.name}
          </span>
        )}
        {fb.displayMode === 'intervals' && effRoot === null && (
          <span className="tag tag--warn">Click a note (or pick a Root) to show intervals</span>
        )}
        {fb.displayMode === 'intervals' && rootFromNote && (
          <span className="tag tag--key">Root: {noteName(effRoot!, fb.preferFlats)} (from selected note)</span>
        )}
      </div>

      {/* Progression bar: each chord as a colored chip. Click to isolate; × to remove. */}
      {chords.length > 0 && (
        <div className="progression">
          <span className="progression__label">Progression</span>
          {chords.map((entry, idx) => {
            const color = chordColor(idx);
            const focused = focusedChordIndex === idx;
            const dimmed = focusedChordIndex !== null && !focused;
            return (
              <span
                key={`${entry.id}-${idx}`}
                className={`chord-chip${focused ? ' chord-chip--focused' : ''}${dimmed ? ' chord-chip--dimmed' : ''}`}
                style={{ borderColor: color }}
              >
                <button
                  type="button"
                  className="chord-chip__body"
                  title={focused ? 'Show all chords' : 'Isolate / edit this chord'}
                  onClick={() => toggleFocus(idx)}
                >
                  <span className="chord-chip__dot" style={{ background: color }} />
                  {chordDisplayName(entry.id, fb.preferFlats)}
                  {entry.keep && entry.keep.length > 0 && <span className="chord-chip__voiced" title="Custom voicing">◆</span>}
                </button>
                <button
                  type="button"
                  className="chord-chip__edit"
                  title="Select notes to keep (voicing)"
                  onClick={() => onRefineChord(idx)}
                >
                  ✎
                </button>
                <button type="button" className="chord-chip__x" title="Remove chord" onClick={() => removeChord(idx)}>
                  ×
                </button>
              </span>
            );
          })}
          {focusedChordIndex !== null && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onFocusChord(null)}>
              Show all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
