import { ChordShape } from '../music-theory';

interface Props {
  shape: ChordShape;
  /** Chord symbol drawn above the box, e.g. "Bm". */
  name: string;
}

/**
 * A chord box: the classic songbook fingering grid. Sized by its container —
 * the SVG scales with its viewBox, so the grid CSS decides how big it renders
 * and the type scales with it.
 *
 * Deliberately not built on FretboardDiagram: that one takes a whole Fretboard
 * document, has module-level fixed geometry, always starts at fret 0, and runs
 * its axes the other way round (fret→x, string→y).
 */

const ROWS = 4; // every shape fits a four-fret window (enforced by a unit test)
const STRINGS = 6;
const GRID_LEFT = 11;
const GRID_TOP = 27;
const STRING_GAP = 9.6;
const FRET_GAP = 12;

const GRID_RIGHT = GRID_LEFT + (STRINGS - 1) * STRING_GAP;
const GRID_BOTTOM = GRID_TOP + ROWS * FRET_GAP;

const stringX = (si: number) => GRID_LEFT + si * STRING_GAP;
const fretY = (fret: number, baseFret: number) => GRID_TOP + (fret - baseFret + 0.5) * FRET_GAP;

export function ChordDiagram({ shape, name }: Props) {
  const { frets, baseFret, barre } = shape;
  const atNut = baseFret === 1;

  return (
    <svg
      className="chord-dia"
      viewBox={`0 0 ${GRID_RIGHT + 11} ${GRID_BOTTOM + 3}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${name} chord diagram`}
    >
      <text className="chord-dia__name" x={(GRID_LEFT + GRID_RIGHT) / 2} y={11} textAnchor="middle">
        {name}
      </text>

      {/* Muted (×) and open (○) markers, above the nut. */}
      {frets.map((fret, si) =>
        fret === null || fret === 0 ? (
          <text className="chord-dia__mark" key={si} x={stringX(si)} y={22} textAnchor="middle">
            {fret === null ? '×' : '○'}
          </text>
        ) : null,
      )}

      {/* Fret rows; the nut is a thick bar, but only in first position. */}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line
          key={r}
          className={r === 0 && atNut ? 'chord-dia__nut' : 'chord-dia__grid'}
          x1={GRID_LEFT}
          x2={GRID_RIGHT}
          y1={GRID_TOP + r * FRET_GAP}
          y2={GRID_TOP + r * FRET_GAP}
        />
      ))}

      {Array.from({ length: STRINGS }, (_, si) => (
        <line
          key={si}
          className="chord-dia__grid"
          x1={stringX(si)}
          x2={stringX(si)}
          y1={GRID_TOP}
          y2={GRID_BOTTOM}
        />
      ))}

      {/* Away from the nut, say where we are instead of drawing a false one. */}
      {!atNut && (
        <text className="chord-dia__fr" x={GRID_LEFT - 4} y={fretY(baseFret, baseFret) + 2} textAnchor="end">
          {baseFret}fr
        </text>
      )}

      {barre && (
        <rect
          className="chord-dia__dot"
          x={stringX(barre.from) - 3.4}
          y={fretY(barre.fret, baseFret) - 3.4}
          width={stringX(barre.to) - stringX(barre.from) + 6.8}
          height={6.8}
          rx={3.4}
        />
      )}

      {frets.map((fret, si) => {
        if (fret === null || fret === 0) return null;
        // A note the barre already covers doesn't need its own dot.
        if (barre && fret === barre.fret && si >= barre.from && si <= barre.to) return null;
        return (
          <circle className="chord-dia__dot" key={si} cx={stringX(si)} cy={fretY(fret, baseFret)} r={3.4} />
        );
      })}
    </svg>
  );
}
