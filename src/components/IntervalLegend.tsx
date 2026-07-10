import { INTERVALS } from '../music-theory';
import { KEY_HIGHLIGHT_FILL } from './fretboardLayout';

/** Small legend explaining the interval color convention. */
export function IntervalLegend({ showKey }: { showKey?: boolean }) {
  return (
    <div className="legend">
      {showKey && (
        <span className="legend__item">
          <span className="legend__dot" style={{ background: KEY_HIGHLIGHT_FILL }} />
          Key
        </span>
      )}
      {INTERVALS.map((i) => (
        <span className="legend__item" key={i.semitones} title={i.name}>
          <span className="legend__dot" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
