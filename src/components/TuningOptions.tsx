import { TUNING_FAMILIES, TUNINGS } from '../music-theory';

/** The tuning `<option>`s grouped by family, shared by the fretboard and tab pickers. */
export function TuningOptions() {
  return (
    <>
      {TUNING_FAMILIES.map((family) => (
        <optgroup key={family.id} label={family.label}>
          {TUNINGS.filter((t) => t.family === family.id).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
