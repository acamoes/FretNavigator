import { TabSection } from '../types';
import { getTuning } from '../music-theory';

interface Props {
  tab: TabSection;
  /** Editor cursor (highlighted cell); omit for the static/report render. */
  cursor?: { col: number; si: number } | null;
  /** When provided, cells are clickable (editor). */
  onCellClick?: (col: number, si: number) => void;
  /** Columns per wrapped "system" (a stacked 6-line block). */
  colsPerSystem?: number;
}

/**
 * Renders a guitar tab (fret numbers over time) as stacked 6-line systems.
 * Interactive (clickable cells) when `onCellClick` is given, else static.
 */
export function TabDiagram({ tab, cursor, onCellClick, colsPerSystem = 32 }: Props) {
  const tuning = getTuning(tab.tuningId) ?? getTuning('standard')!;
  const numStrings = tuning.strings.length;
  const interactive = !!onCellClick;

  const columns = tab.columns.length > 0 ? tab.columns : [];
  const systems: { start: number; cols: TabSection['columns'] }[] = [];
  for (let i = 0; i < Math.max(columns.length, 1); i += colsPerSystem) {
    systems.push({ start: i, cols: columns.slice(i, i + colsPerSystem) });
  }

  return (
    <div className={`tab${interactive ? ' tab--interactive' : ''}`}>
      {systems.map((sys) => (
        <div className="tab-system" key={sys.start}>
          {Array.from({ length: numStrings }, (_, row) => {
            const si = numStrings - 1 - row; // top row = highest string
            return (
              <div className="tab-row" key={si}>
                <span className="tab-label">{tuning.labels[si]}</span>
                <div className="tab-cells">
                  {sys.cols.map((c, j) => {
                    const col = sys.start + j;
                    const val = c.frets[si];
                    const isCursor = !!cursor && cursor.col === col && cursor.si === si;
                    const cls =
                      'tab-cell' +
                      (c.bar ? ' tab-cell--bar' : '') +
                      (isCursor ? ' tab-cell--cursor' : '') +
                      (val != null ? ' tab-cell--filled' : '');
                    return (
                      <span
                        key={col}
                        className={cls}
                        onClick={interactive ? () => onCellClick!(col, si) : undefined}
                        role={interactive ? 'button' : undefined}
                      >
                        {val != null ? <span className="tab-num">{val}</span> : ''}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
