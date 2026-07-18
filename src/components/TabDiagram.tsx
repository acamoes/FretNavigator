import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { TabSection } from '../types';
import { getTuning } from '../music-theory';

interface Props {
  tab: TabSection;
  /** Editor cursor (highlighted cell); omit for the static/report render. */
  cursor?: { col: number; si: number } | null;
  /** When provided, cells are clickable (editor). */
  onCellClick?: (col: number, si: number) => void;
  /**
   * Fixed columns per wrapped "system". Omit to size dynamically from the
   * container width (editor); the print variant derives its own fixed value so
   * the printed page doesn't depend on the on-screen width.
   */
  colsPerSystem?: number;
  /** 'editor' = large, clickable cells. 'print' = compact, PDF-style tab. */
  variant?: 'editor' | 'print';
}

/**
 * All tab metrics live here (not in CSS) so the measurement maths below can
 * never drift from what is rendered; they're handed to CSS as custom properties.
 *
 * CONSTRAINT: `cell` must fit a two-digit fret plus padding, otherwise numbers
 * like "12" overlap their neighbours. Rule of thumb: 2 digits ≈ 1.15 × font, so
 * keep `cell >= 1.15 * font + 2 * numPad`.
 */
const SIZES = {
  // 22 >= 1.15*14 + 2*3 = 22.1 (borderline by design: roomy, clickable targets)
  editor: { cell: 22, label: 20, row: 24, font: 14, numPad: 3 },
  // Compact, professional PDF density: ~4.0mm columns, ~2.9mm between strings,
  // ~7pt numbers. 15 >= 1.15*9.5 + 2*1.5 = 13.9 ✓
  print: { cell: 15, label: 15, row: 11, font: 9.5, numPad: 1.5 },
} as const;

/** A4 content width used for print chunking: 210mm − 2×14mm ≈ 182mm @96dpi. */
const A4_CONTENT_PX = 688;
/** Leaves a sliver so a re-appearing scrollbar can't trigger a measure loop. */
const SAFETY_PX = 2;
const FALLBACK_COLS = 16;

/**
 * Renders a guitar tab (fret numbers over time) as stacked systems that wrap to
 * the available width. Interactive (clickable cells) when `onCellClick` is given.
 */
export function TabDiagram({ tab, cursor, onCellClick, colsPerSystem, variant = 'editor' }: Props) {
  const tuning = getTuning(tab.tuningId) ?? getTuning('standard')!;
  const numStrings = tuning.strings.length;
  const interactive = !!onCellClick;
  const size = SIZES[variant];

  // Print wraps to the page width (fixed); the editor measures its container.
  const fixedCols =
    colsPerSystem ?? (variant === 'print' ? Math.floor((A4_CONTENT_PX - size.label) / size.cell) : undefined);

  const rootRef = useRef<HTMLDivElement>(null);
  const [measuredCols, setMeasuredCols] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fixedCols != null) return;
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const usable = el.clientWidth - size.label - SAFETY_PX;
      setMeasuredCols(Math.max(1, Math.floor(usable / size.cell)));
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixedCols, size.label, size.cell]);

  const cols = fixedCols ?? measuredCols ?? FALLBACK_COLS;

  const columns = tab.columns;
  const systems: { start: number; cols: TabSection['columns'] }[] = [];
  for (let i = 0; i < Math.max(columns.length, 1); i += cols) {
    systems.push({ start: i, cols: columns.slice(i, i + cols) });
  }

  const sizeVars = {
    '--tab-cell-w': `${size.cell}px`,
    '--tab-label-w': `${size.label}px`,
    '--tab-row-h': `${size.row}px`,
    '--tab-font': `${size.font}px`,
    '--tab-num-pad': `${size.numPad}px`,
  } as CSSProperties;

  return (
    <div
      className={`tab tab--${variant}${interactive ? ' tab--interactive' : ''}`}
      ref={rootRef}
      style={sizeVars}
    >
      {systems.map((sys) => {
        // Pad the (short) last system so the string lines still run full width.
        const fillerCount = Math.max(0, cols - sys.cols.length);
        return (
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
                    {/* Visual-only padding: draws the staff line, not editable. */}
                    {Array.from({ length: fillerCount }, (_, k) => (
                      <span key={`filler-${k}`} className="tab-cell tab-cell--filler" aria-hidden="true" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
