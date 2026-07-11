import { useBoard } from '../store/useStore';
import { FretboardDiagram } from './FretboardDiagram';
import { Fretboard } from '../types';
import { chordDisplayName, getTuning, noteName, parseKeyId } from '../music-theory';
import { chordColor } from '../store/colorPresets';

interface Props {
  boardId: string;
  onBack: () => void;
}

const MAX_FRETBOARDS_PER_PAGE = 4;

/** Split into groups of at most `size`, preserving order. */
function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

/** Consolidated, print-ready view of every fretboard in the board. */
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

  // At least one page so the header always renders, even with zero fretboards.
  const pages: Fretboard[][] = board.fretboards.length > 0 ? chunk(board.fretboards, MAX_FRETBOARDS_PER_PAGE) : [[]];

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
        {pages.map((pageFretboards, pageIndex) => (
          <div key={pageIndex} className="report__page">
            {pageIndex === 0 && (
              <header className="report__header">
                <div className="report__heading">
                  <h1 className="report__title">{board.name}</h1>
                  {board.description && <p className="report__desc">{board.description}</p>}
                </div>
                <img className="report__logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="FretNavigator" />
              </header>
            )}

            <div className="report__page-fretboards">
              {pageFretboards.map((fb) => (
                <section key={fb.id} className="report__fretboard">
                  <div className="report__fb-head">
                    <h2 className="report__fb-title">{fb.label}</h2>
                    <span className="report__fb-config">{describe(fb)}</span>
                  </div>
                  <div className="report__fb-diagram">
                    <FretboardDiagram fretboard={fb} />
                  </div>
                  {fb.chords.length > 0 && (
                    <div className="progression progression--report">
                      {fb.chords.map((entry, idx) => (
                        <span
                          key={`${entry.id}-${idx}`}
                          className="chord-chip"
                          style={{ borderColor: chordColor(idx) }}
                        >
                          <span className="chord-chip__body">
                            <span className="chord-chip__dot" style={{ background: chordColor(idx) }} />
                            {chordDisplayName(entry.id, fb.preferFlats)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        ))}
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
