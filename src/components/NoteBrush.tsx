import { NoteStyle } from '../types';
import { COLOR_PRESETS, OUTLINE_PRESETS } from '../store/colorPresets';

interface Props {
  value: NoteStyle;
  onChange: (style: NoteStyle) => void;
}

/**
 * The "active brush": the fill/outline/style applied to the next note you
 * click. Fill swatches set the base color; outline swatches override only the
 * contour (overlapping the current fill); plus free color pickers.
 */
export function NoteBrush({ value, onChange }: Props) {
  return (
    <div className="brush">
      {/* Live preview of the current brush */}
      <div className="brush__preview" title="Current brush">
        <span
          className="brush__preview-dot"
          style={{
            background: value.fill,
            borderColor: value.stroke,
            borderStyle: value.strokeStyle === 'dashed' ? 'dashed' : 'solid',
          }}
        />
      </div>

      <div className="brush__section">
        <span className="brush__label">Fill</span>
        <div className="brush__swatches">
          {COLOR_PRESETS.map((p) => {
            const active = p.fill === value.fill;
            return (
              <button
                key={p.name}
                type="button"
                className={`swatch${active ? ' swatch--active' : ''}`}
                title={p.name}
                style={{ background: p.fill, borderColor: p.stroke }}
                onClick={() => onChange({ ...value, fill: p.fill, stroke: p.stroke })}
              />
            );
          })}
          <label className="swatch swatch--custom" title="Custom fill">
            <input
              type="color"
              value={value.fill}
              onChange={(e) => onChange({ ...value, fill: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="brush__section">
        <span className="brush__label">Outline</span>
        <div className="brush__swatches">
          {OUTLINE_PRESETS.map((o) => {
            const active = o.stroke === value.stroke;
            return (
              <button
                key={o.name}
                type="button"
                className={`swatch swatch--ring${active ? ' swatch--active' : ''}`}
                title={`${o.name} outline`}
                style={{ background: value.fill, borderColor: o.stroke }}
                onClick={() => onChange({ ...value, stroke: o.stroke })}
              />
            );
          })}
          <label className="swatch swatch--ring swatch--custom" title="Custom outline" style={{ background: value.fill }}>
            <input
              type="color"
              value={value.stroke}
              onChange={(e) => onChange({ ...value, stroke: e.target.value })}
            />
          </label>
        </div>
      </div>

      <label className="brush__field brush__field--check" title="Dashed outline">
        <input
          type="checkbox"
          checked={value.strokeStyle === 'dashed'}
          onChange={(e) => onChange({ ...value, strokeStyle: e.target.checked ? 'dashed' : 'solid' })}
        />
        Dashed
      </label>
    </div>
  );
}
