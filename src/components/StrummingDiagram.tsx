import { StrummingPattern } from '../types';

interface Props {
  pattern: StrummingPattern;
  /** When provided, each slot column is clickable (editor). Omit for the report. */
  onSlotClick?: (index: number) => void;
}

// viewBox geometry (arbitrary units; the SVG scales to fit its container).
const SLOT_W = 60;
const ARROW_TOP = 30;
const ARROW_BOTTOM = 78;
const MID_Y = (ARROW_TOP + ARROW_BOTTOM) / 2;
const COUNT_Y = 96;
const BRACKET_TOP = 106;
const BRACKET_BOTTOM = 114;
const HEIGHT = 125;

/** Eighth-note counting labels: 1 & 2 & 3 & 4 & */
const COUNT_LABELS = ['1', '&', '2', '&', '3', '&', '4', '&'];

/** The strum glyph for a slot, drawn around column center `cx`. All in currentColor. */
function slotGlyph(hit: NonNullable<StrummingPattern['slots'][number]['hit']>, cx: number) {
  switch (hit) {
    case 'down':
      return (
        <>
          <line x1={cx} y1={ARROW_TOP} x2={cx} y2={ARROW_BOTTOM - 10} />
          <polygon points={`${cx - 7},${ARROW_BOTTOM - 12} ${cx + 7},${ARROW_BOTTOM - 12} ${cx},${ARROW_BOTTOM}`} stroke="none" fill="currentColor" />
        </>
      );
    case 'up':
      return (
        <>
          <line x1={cx} y1={ARROW_TOP + 12} x2={cx} y2={ARROW_BOTTOM} />
          <polygon points={`${cx - 7},${ARROW_TOP + 12} ${cx + 7},${ARROW_TOP + 12} ${cx},${ARROW_TOP}`} stroke="none" fill="currentColor" />
        </>
      );
    case 'bass':
      // Down-stroke on the bass strings: a down arrow topped with a filled dot.
      return (
        <>
          <circle cx={cx} cy={ARROW_TOP - 6} r={4} stroke="none" fill="currentColor" />
          <line x1={cx} y1={ARROW_TOP + 2} x2={cx} y2={ARROW_BOTTOM - 10} />
          <polygon points={`${cx - 7},${ARROW_BOTTOM - 12} ${cx + 7},${ARROW_BOTTOM - 12} ${cx},${ARROW_BOTTOM}`} stroke="none" fill="currentColor" />
        </>
      );
    case 'mute':
      // Dead / muted strum: an ✕.
      return (
        <>
          <line x1={cx - 9} y1={MID_Y - 9} x2={cx + 9} y2={MID_Y + 9} />
          <line x1={cx + 9} y1={MID_Y - 9} x2={cx - 9} y2={MID_Y + 9} />
        </>
      );
  }
}

/**
 * Renders a one-bar (8 eighth-note) strumming pattern as SVG. Interactive when
 * `onSlotClick` is provided (editor); static otherwise (report).
 */
export function StrummingDiagram({ pattern, onSlotClick }: Props) {
  const n = pattern.slots.length;
  const width = n * SLOT_W;
  const interactive = !!onSlotClick;

  return (
    <svg
      className="strum-svg"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Strumming pattern"
    >
      {/* Beat-grouping brackets (⊔), one per beat = two slots. */}
      {Array.from({ length: Math.floor(n / 2) }, (_, k) => {
        const xl = k * 2 * SLOT_W + 10;
        const xr = k * 2 * SLOT_W + 2 * SLOT_W - 10;
        return (
          <path
            key={`br-${k}`}
            className="strum-svg__bracket"
            d={`M ${xl} ${BRACKET_TOP} L ${xl} ${BRACKET_BOTTOM} L ${xr} ${BRACKET_BOTTOM} L ${xr} ${BRACKET_TOP}`}
            fill="none"
          />
        );
      })}

      {pattern.slots.map((slot, i) => {
        const cx = i * SLOT_W + SLOT_W / 2;
        return (
          <g key={i}>
            {/* Accent mark (>) above the strum. */}
            {slot.accent && slot.hit && (
              <path className="strum-svg__accent" d={`M ${cx - 4} 9 L ${cx + 3} 15 L ${cx - 4} 21`} fill="none" />
            )}

            {slot.hit && <g className="strum-svg__glyph">{slotGlyph(slot.hit, cx)}</g>}

            {/* Counting label. */}
            <text x={cx} y={COUNT_Y} className="strum-svg__count" textAnchor="middle">
              {COUNT_LABELS[i] ?? ''}
            </text>

            {interactive && (
              <rect
                className="strum-svg__hit"
                x={i * SLOT_W}
                y={0}
                width={SLOT_W}
                height={HEIGHT}
                onClick={() => onSlotClick!(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSlotClick!(i);
                  }
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
