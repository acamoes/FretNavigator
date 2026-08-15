import { chordShape, keySummary } from '../music-theory';
import { ChordDiagram } from './ChordDiagram';

interface Props {
  /** Key id, "<rootPc>:<scaleId>". */
  keyId: string;
  /** 'screen' = editor panel. 'print' = compact, for the report/PDF. */
  variant?: 'screen' | 'print';
}

/**
 * The notes of a key and the chord built on each of its degrees. Shared by the
 * board editor and the read-only report, so both read the same harmony.
 */
export function KeyTable({ keyId, variant = 'screen' }: Props) {
  const summary = keySummary(keyId);
  if (!summary) return null;

  return (
    <div className={`key-table key-table--${variant}`}>
      <div className="key-table__head">
        <h3 className="key-table__title">
          Key of {summary.tonicName} <span className="key-table__scale">{summary.scaleName}</span>
        </h3>
        <p className="key-table__notes">
          {summary.notes.map((n, i) => (
            <span className="key-table__note" key={i}>
              {n}
            </span>
          ))}
        </p>
      </div>

      {summary.chords.length > 0 ? (
        <div className="key-table__body">
          <div className="key-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>Degree</th>
                  <th>Chord</th>
                  <th>7th</th>
                  <th>Function</th>
                </tr>
              </thead>
              <tbody>
                {summary.chords.map((c) => (
                  <tr key={c.degree}>
                    <td className="key-table__numeral">{c.numeral}</td>
                    <td className="key-table__chord">{c.triadName}</td>
                    <td className="key-table__chord" title={c.seventhNotes}>
                      {c.seventhName}
                    </td>
                    <td className="key-table__fn">{c.functionName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to play each degree, filling the space beside the table. */}
          <div className="key-table__shapes">
            {summary.chords.map((c) => {
              const shape = chordShape(c.triadId);
              return shape ? <ChordDiagram key={c.degree} shape={shape} name={c.triadName} /> : null;
            })}
          </div>
        </div>
      ) : (
        <p className="key-table__hint">
          Pentatonic and blues scales don't stack into diatonic chords — pick a 7-note scale to see degrees.
        </p>
      )}
    </div>
  );
}
