import { useBoard } from '../store/useStore';
import { FretboardDiagram } from './FretboardDiagram';
import { StrummingDiagram } from './StrummingDiagram';
import { TabDiagram } from './TabDiagram';
import { Fretboard, Section, StrummingPattern, TabSection } from '../types';
import { chordDisplayName, getTuning, noteName, parseKeyId } from '../music-theory';
import { chordColor } from '../store/colorPresets';

/** True if the pattern has at least one actual strum (not all rests). */
function hasStrum(p: StrummingPattern | undefined): p is StrummingPattern {
  return !!p && p.slots.some((s) => s.hit !== null);
}

interface Props {
  boardId: string;
  onBack: () => void;
}

const MAX_FRETBOARDS_PER_PAGE = 4;

/** A page of up to 4 consecutive fretboards, or a single tab flowing on its own. */
type ReportBlock = { type: 'fretboards'; items: Fretboard[] } | { type: 'tab'; tab: TabSection };

/** Group sections in order: runs of fretboards into pages of <=4; tabs stand alone. */
function toBlocks(sections: Section[]): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  let buf: Fretboard[] = [];
  const flush = () => {
    if (buf.length) {
      blocks.push({ type: 'fretboards', items: buf });
      buf = [];
    }
  };
  for (const s of sections) {
    if (s.kind === 'fretboard') {
      buf.push(s);
      if (buf.length === MAX_FRETBOARDS_PER_PAGE) flush();
    } else {
      flush();
      blocks.push({ type: 'tab', tab: s });
    }
  }
  flush();
  if (blocks.length === 0) blocks.push({ type: 'fretboards', items: [] }); // header-only
  return blocks;
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

  const blocks = toBlocks(board.sections);

  const header = (
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
        {blocks.map((block, bi) => {
          const brk = bi > 0 ? ' report__block--break' : '';
          if (block.type === 'tab') {
            const tuning = getTuning(block.tab.tuningId);
            return (
              <div className={`report__tab${brk}`} key={bi}>
                {bi === 0 && header}
                <div className="report__fb-head">
                  <h2 className="report__fb-title">{block.tab.label}</h2>
                  <span className="report__fb-config">tab · {tuning?.labels.join(' ')}</span>
                </div>
                {/* Compact PDF density; wraps to the A4 page width, not the screen. */}
                <TabDiagram tab={block.tab} variant="print" />
              </div>
            );
          }
          return (
            <div className={`report__page${brk}`} key={bi}>
              {bi === 0 && header}
              <div className="report__page-fretboards">
                {block.items.map((fb) => (
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
          );
        })}
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
