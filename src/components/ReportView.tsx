import { useBoard } from '../store/useStore';
import { FretboardDiagram } from './FretboardDiagram';
import { StrummingDiagram } from './StrummingDiagram';
import { TabDiagram } from './TabDiagram';
import { KeyTable } from './KeyTable';
import { Fretboard, StrummingPattern } from '../types';
import { chordDisplayName, chordShapes, getTuning, noteName, parseKeyId } from '../music-theory';
import { ChordDiagram } from './ChordDiagram';
import { chordColor } from '../store/colorPresets';

/** True if the pattern has at least one actual strum (not all rests). */
function hasStrum(p: StrummingPattern | undefined): p is StrummingPattern {
  return !!p && p.slots.some((s) => s.hit !== null);
}

interface Props {
  boardId: string;
  onBack: () => void;
}

/**
 * Consolidated, print-ready view of every section in the board.
 *
 * Sections flow continuously and the browser paginates them: each one carries
 * `break-inside: avoid`, so it is never cut in half, and pages fill up to
 * whatever fits. There is deliberately no JS chunking and no forced page break
 * per section — that model existed to serve fixed-height pages (decisions #10)
 * and, once those went, only left pages sitting one-section-empty.
 */
export function ReportView({ boardId, onBack }: Props) {
  const board = useBoard(boardId);

  if (!board) {
    return (
      <div className="report">
        <p>Board not found.</p>
        <button className="btn" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  // The key table sits below the header rather than inside it: .report__header is
  // a flex row ending in the logo, which a full-width table would fight.
  const header = (
    <>
      <header className="report__header">
        <div className="report__heading">
          <h1 className="report__title">{board.name}</h1>
          {board.description && <p className="report__desc">{board.description}</p>}
          {board.bpm ? <p className="report__tempo">♩ = {board.bpm} BPM</p> : null}
        </div>
        {hasStrum(board.strumming) && (
          <div className="report__header-strum">
            <StrummingDiagram pattern={board.strumming} />
          </div>
        )}
        <img className="report__logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="FretNavigator" />
      </header>
      {board.keyId && <KeyTable keyId={board.keyId} variant="print" />}
    </>
  );

  return (
    <div className="report">
      <div className="report__toolbar no-print">
        <button className="btn btn--ghost" onClick={onBack}>
          ← Back to editing
        </button>
        <button className="btn btn--primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="report__sheet">
        {header}
        {board.sections.map((section) =>
          section.kind === 'tab' ? (
            <section key={section.id} className="report__tab">
              <div className="report__fb-head">
                <h2 className="report__fb-title">{section.label}</h2>
                <span className="report__fb-config">tab · {getTuning(section.tuningId)?.labels.join(' ')}</span>
              </div>
              {/* Compact PDF density; wraps to the A4 page width, not the screen. */}
              <TabDiagram tab={section} variant="print" />
            </section>
          ) : section.kind === 'chords' ? (
            <section key={section.id} className="report__chords">
              <div className="report__fb-head">
                <h2 className="report__fb-title">{section.label}</h2>
              </div>
              <div className="chord-grid chord-grid--report">
                {section.boxes.map((box, i) => {
                  const shapes = box.id ? chordShapes(box.id) : [];
                  const shape = shapes[Math.min(box.shape ?? 0, Math.max(0, shapes.length - 1))];
                  // An unfilled box is an editing state, not something to print.
                  return shape ? (
                    <ChordDiagram key={i} shape={shape} name={chordDisplayName(box.id)} />
                  ) : null;
                })}
              </div>
            </section>
          ) : (
            <section key={section.id} className="report__fretboard">
              <div className="report__fb-head">
                <h2 className="report__fb-title">{section.label}</h2>
                <span className="report__fb-config">{describe(section)}</span>
              </div>
              <div className="report__fb-diagram">
                <FretboardDiagram fretboard={section} />
              </div>
              {section.chords.length > 0 && (
                <div className="progression progression--report">
                  {section.chords.map((entry, idx) => (
                    <span key={`${entry.id}-${idx}`} className="chord-chip" style={{ borderColor: chordColor(idx) }}>
                      <span className="chord-chip__body">
                        <span className="chord-chip__dot" style={{ background: chordColor(idx) }} />
                        {chordDisplayName(entry.id, section.preferFlats)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </section>
          ),
        )}
      </div>
    </div>
  );
}

/** One-line human summary of a fretboard's configuration for the report. */
function describe(fb: Fretboard): string {
  const parts: string[] = [];
  const tuning = getTuning(fb.tuningId);
  if (tuning) parts.push(tuning.labels.join(' '));
  parts.push(`${fb.numFrets} frets`);
  if (fb.capo > 0) parts.push(`capo ${fb.capo}`);
  if (fb.displayMode === 'intervals' && fb.rootNote !== null) {
    parts.push(`intervals from ${noteName(fb.rootNote, fb.preferFlats)}`);
  }
  const key = fb.keyId ? parseKeyId(fb.keyId) : null;
  if (key) parts.push(`key ${noteName(key.root, fb.preferFlats)} ${key.scale.name}`);
  if (fb.chords.length > 0) {
    parts.push(`chords ${fb.chords.map((entry) => chordDisplayName(entry.id, fb.preferFlats)).join(' – ')}`);
  }
  return parts.join(' · ');
}
