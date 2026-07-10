import { Fretboard } from '../types';
import { BuildOptions, buildFretboardModel, GEOM } from './fretboardLayout';
import { hasDoubleDot, hasSingleDot } from '../music-theory';

interface Props {
  fretboard: Fretboard;
  onCellClick?: (stringIndex: number, fret: number) => void;
  /** Isolate one chord of the progression (dim the rest). Report passes none. */
  focusedChordIndex?: number | null;
  /** "Select notes to keep" mode for one chord. */
  refine?: BuildOptions['refine'];
}

/** SVG paths for an N-color pie centered at (cx, cy), starting at the top. */
function piePaths(cx: number, cy: number, r: number, colors: string[]) {
  const n = colors.length;
  return colors.map((color, i) => {
    const a0 = (-90 + (360 / n) * i) * (Math.PI / 180);
    const a1 = (-90 + (360 / n) * (i + 1)) * (Math.PI / 180);
    const x0 = (cx + r * Math.cos(a0)).toFixed(2);
    const y0 = (cy + r * Math.sin(a0)).toFixed(2);
    const x1 = (cx + r * Math.cos(a1)).toFixed(2);
    const y1 = (cy + r * Math.sin(a1)).toFixed(2);
    const large = 360 / n > 180 ? 1 : 0;
    return <path key={i} d={`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={color} />;
  });
}

/**
 * Renders a fretboard as SVG. When `onCellClick` is provided the note cells
 * are interactive; otherwise it renders as a static (report/print) diagram.
 */
export function FretboardDiagram({ fretboard, onCellClick, focusedChordIndex, refine }: Props) {
  const model = buildFretboardModel(fretboard, { focusedChordIndex, refine });
  const interactive = !!onCellClick;
  const top = model.stringYs[0];
  const bottom = model.stringYs[model.stringYs.length - 1];

  return (
    <svg
      className="fretboard-svg"
      viewBox={`0 0 ${model.width} ${model.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ minWidth: model.width * 0.82 }}
      role="img"
      aria-label={`${fretboard.label} fretboard diagram`}
    >
      {/* Fretboard wood area */}
      <rect
        x={model.fretXs[0]}
        y={top - GEOM.stringGap * 0.5}
        width={model.fretXs[model.fretXs.length - 1] - model.fretXs[0]}
        height={(model.stringYs.length - 1) * GEOM.stringGap + GEOM.stringGap}
        className="fretboard-svg__board"
        rx={3}
      />

      {/* Inlay dots */}
      {model.fretXs.map((_, f) => {
        if (f === 0) return null;
        const cx = model.fretXs[f] - GEOM.fretWidth * 0.5;
        const midY = (top + bottom) / 2;
        if (hasDoubleDot(f)) {
          return (
            <g key={`dot-${f}`} className="fretboard-svg__inlay">
              <circle cx={cx} cy={top + GEOM.stringGap * 0.5} r={4} />
              <circle cx={cx} cy={bottom - GEOM.stringGap * 0.5} r={4} />
            </g>
          );
        }
        if (hasSingleDot(f)) {
          return <circle key={`dot-${f}`} className="fretboard-svg__inlay" cx={cx} cy={midY} r={4} />;
        }
        return null;
      })}

      {/* Capo bar */}
      {model.capo > 0 && model.capo <= model.numFrets && (
        <rect
          className="fretboard-svg__capo"
          x={model.fretXs[model.capo] - GEOM.fretWidth * 0.5 - 4}
          y={top - GEOM.stringGap * 0.4}
          width={8}
          height={(model.stringYs.length - 1) * GEOM.stringGap + GEOM.stringGap * 0.8}
          rx={4}
        />
      )}

      {/* Fret lines */}
      {model.fretXs.map((x, f) => (
        <line
          key={`fret-${f}`}
          x1={x}
          x2={x}
          y1={top - GEOM.stringGap * 0.5}
          y2={bottom + GEOM.stringGap * 0.5}
          className={f === 0 ? 'fretboard-svg__nut' : 'fretboard-svg__fret'}
        />
      ))}

      {/* Fret numbers */}
      {model.fretXs.map((x, f) =>
        f === 0 ? null : (
          <text
            key={`fnum-${f}`}
            x={x - GEOM.fretWidth * 0.5}
            y={GEOM.marginTop - GEOM.stringGap * 0.5 - 8}
            className="fretboard-svg__fretnum"
            textAnchor="middle"
          >
            {f}
          </text>
        ),
      )}

      {/* Strings */}
      {model.stringYs.map((y, row) => (
        <g key={`string-${row}`}>
          <line
            x1={model.fretXs[0]}
            x2={model.fretXs[model.fretXs.length - 1]}
            y1={y}
            y2={y}
            className="fretboard-svg__string"
            strokeWidth={1 + row * 0.35}
          />
          <text x={16} y={y + 4} className="fretboard-svg__stringlabel" textAnchor="middle">
            {model.stringLabels[row]}
          </text>
        </g>
      ))}

      {/* Note cells */}
      {model.cells.map((cell) => {
        const key = `${cell.stringIndex}:${cell.fret}`;
        const h = cell.highlight;
        const isPlain = h.layer === null;
        if (cell.behindCapo) return null;

        return (
          <g
            key={key}
            className={`cell${interactive ? ' cell--interactive' : ''}${isPlain ? ' cell--plain' : ''}`}
            onClick={interactive ? () => onCellClick!(cell.stringIndex, cell.fret) : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCellClick!(cell.stringIndex, cell.fret);
                    }
                  }
                : undefined
            }
          >
            {/* Larger invisible hit area for easy clicking */}
            {interactive && <circle cx={cell.x} cy={cell.y} r={GEOM.noteRadius + 3} className="cell__hit" />}
            {h.layer === 'chord' && h.segments && h.segments.length > 1 ? (
              // Note shared by several chords: split the dot into colored wedges.
              <g className="cell__dot">
                {piePaths(cell.x, cell.y, GEOM.noteRadius, h.segments)}
                <circle cx={cell.x} cy={cell.y} r={GEOM.noteRadius * 0.5} fill="#ffffff" />
                <circle
                  cx={cell.x}
                  cy={cell.y}
                  r={GEOM.noteRadius}
                  fill="none"
                  stroke={h.chordRoot ? '#1b1b1b' : '#00000030'}
                  strokeWidth={h.chordRoot ? 2.5 : 1}
                />
              </g>
            ) : (
              <circle
                cx={cell.x}
                cy={cell.y}
                r={GEOM.noteRadius}
                fill={isPlain ? 'var(--fb-plain-fill)' : h.fill}
                stroke={isPlain ? 'var(--fb-plain-stroke)' : h.stroke}
                strokeWidth={h.layer === 'manual' || (h.layer === 'chord' && h.chordRoot) ? 2.5 : 1.25}
                strokeDasharray={h.strokeDasharray}
                className="cell__dot"
              />
            )}
            {cell.subLabel ? (
              <>
                <text
                  x={cell.x}
                  y={cell.y + 1}
                  textAnchor="middle"
                  className="cell__label"
                  fill={isPlain ? undefined : h.textColor}
                  style={{ fontWeight: h.bold ? 700 : 400 }}
                >
                  {cell.label}
                </text>
                <text
                  x={cell.x}
                  y={cell.y + 8.5}
                  textAnchor="middle"
                  className="cell__sublabel"
                  fill={isPlain ? undefined : h.textColor}
                >
                  {cell.subLabel}
                </text>
              </>
            ) : (
              <text
                x={cell.x}
                y={cell.y + 4}
                textAnchor="middle"
                className="cell__label"
                fill={isPlain ? undefined : h.textColor}
                style={{ fontWeight: h.bold ? 700 : 400 }}
              >
                {cell.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
