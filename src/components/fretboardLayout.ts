/**
 * Pure layout + highlight computation for a fretboard, shared by the
 * interactive component and the read-only report view.
 */

import { Fretboard } from '../types';
import {
  chordToneRoles,
  getTuning,
  keyPitchClasses,
  mod12,
  noteName,
  parseChordId,
  pitchAt,
} from '../music-theory';
import { chordColor } from '../store/colorPresets';

/**
 * Major-scale degree for a given number of semitones above the root.
 * Root = "R"; the diatonic degrees are plain numbers; every other (chromatic)
 * semitone has no degree and is left blank in intervals mode.
 */
const MAJOR_SCALE_DEGREE: Record<number, string> = {
  0: 'R',
  2: '2',
  4: '3',
  5: '4',
  7: '5',
  9: '6',
  11: '7',
};

export const GEOM = {
  marginLeft: 58, // room for open-string notes + string labels
  marginRight: 24,
  marginTop: 34, // room for fret numbers
  marginBottom: 20,
  stringGap: 34,
  fretWidth: 52,
  noteRadius: 13,
};

/** A neutral warm background color for notes that belong to the selected key. */
export const KEY_HIGHLIGHT_FILL = '#eaeae9';
export const KEY_HIGHLIGHT_STROKE = '#53413c';

export interface CellHighlight {
  /** 'manual' | 'chord' | 'key' | 'interval' | null (plain note map). */
  layer: 'manual' | 'chord' | 'key' | 'interval' | null;
  fill: string;
  stroke: string;
  strokeDasharray?: string;
  /** Text color chosen for contrast against fill. */
  textColor: string;
  bold: boolean;
  /** For the chord layer: one color per chord containing this note (pie wedges if >1). */
  segments?: string[];
  /** For the chord layer: this note is the root of at least one of its chords. */
  chordRoot?: boolean;
  /** During "select notes to keep": 'kept' = selected, 'candidate' = will be removed. */
  keepState?: 'kept' | 'candidate';
}

/** Options controlling how the model is built (transient view state). */
export interface BuildOptions {
  /** Index into `chords` to isolate (dim the rest); null shows the whole progression. */
  focusedChordIndex?: number | null;
  /**
   * "Select notes to keep" mode for one chord: shows all of that chord's
   * positions, marking the draft-selected ones as kept and the rest as candidates.
   */
  refine?: { chordIndex: number; keepKeys: Set<string> };
}

export interface Cell {
  stringIndex: number;
  fret: number;
  pc: number;
  /** Primary label: note name (notes mode) or interval (intervals mode). */
  label: string;
  /** Secondary small label: note name, shown under the interval in intervals mode. */
  subLabel?: string;
  x: number;
  y: number;
  /** True when this fret is behind the capo (unplayed). */
  behindCapo: boolean;
  highlight: CellHighlight;
}

export interface FretboardModel {
  width: number;
  height: number;
  stringYs: number[]; // y per rendered row (top row = highest string)
  fretXs: number[]; // x of each fret line 0..numFrets
  cells: Cell[];
  stringLabels: string[]; // top-to-bottom
  numFrets: number;
  capo: number;
}

function fretLineX(fret: number): number {
  return GEOM.marginLeft + fret * GEOM.fretWidth;
}

/** X center for a note at a given fret (open notes sit left of the nut). */
function noteX(fret: number): number {
  if (fret === 0) return GEOM.marginLeft - GEOM.fretWidth * 0.5;
  return fretLineX(fret) - GEOM.fretWidth * 0.5;
}

function pickTextColor(bg: string): string {
  // Simple luminance check to pick black/white text.
  const hex = bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#12151c' : '#ffffff';
}

/**
 * The root note used for intervals mode. Prefers the explicit Root dropdown;
 * otherwise falls back to the first note the user pinned on the fretboard, so
 * "click a note, then press Intervals" just works.
 */
export function effectiveRootNote(fb: Fretboard): number | null {
  if (fb.rootNote !== null) return fb.rootNote;
  if (fb.selectedNotes.length > 0) {
    const tuning = getTuning(fb.tuningId) ?? getTuning('standard')!;
    const n = fb.selectedNotes[0];
    return pitchAt(tuning.strings[n.stringIndex], n.fret);
  }
  return null;
}

/**
 * Build the full geometric + highlight model for a fretboard.
 * Layer priority: manual selection > chord > key > interval > plain.
 */
export function buildFretboardModel(fb: Fretboard, opts: BuildOptions = {}): FretboardModel {
  const tuning = getTuning(fb.tuningId) ?? getTuning('standard')!;
  const strings = tuning.strings;
  const numStrings = strings.length;

  const keySet = keyPitchClasses(fb.keyId);
  const rootForIntervals = effectiveRootNote(fb);
  const selectedMap = new Map<string, Fretboard['selectedNotes'][number]>();
  for (const n of fb.selectedNotes) selectedMap.set(`${n.stringIndex}:${n.fret}`, n);

  // Parse the chord progression: each chord keeps its palette color (by position),
  // root, and optional "keep" voicing filter, so colors stay stable when isolated.
  const chordEntries = fb.chords ?? [];
  const parsedChords = chordEntries.map((entry, idx) => ({
    pcs: new Set(chordToneRoles(entry.id).keys()),
    rootPc: parseChordId(entry.id)?.root ?? -1,
    color: chordColor(idx),
    keepSet: entry.keep && entry.keep.length > 0 ? new Set(entry.keep.map((p) => `${p.stringIndex}:${p.fret}`)) : null,
  }));

  let focus = opts.focusedChordIndex ?? null;
  if (focus !== null && (focus < 0 || focus >= parsedChords.length)) focus = null;

  const refine =
    opts.refine && opts.refine.chordIndex >= 0 && opts.refine.chordIndex < parsedChords.length ? opts.refine : null;

  // While refining a chord, isolate it and drop key/interval highlights.
  const activeChords = refine ? [] : focus !== null ? [parsedChords[focus]] : parsedChords;
  const activeKeySet = refine ? new Set<number>() : keySet;

  const fretXs: number[] = [];
  for (let f = 0; f <= fb.numFrets; f++) fretXs.push(fretLineX(f));

  // Render highest string at top: reverse string order for Y.
  const stringYs: number[] = [];
  for (let row = 0; row < numStrings; row++) {
    stringYs.push(GEOM.marginTop + row * GEOM.stringGap);
  }

  const cells: Cell[] = [];
  for (let si = 0; si < numStrings; si++) {
    // Row 0 = highest string = last tuning index.
    const row = numStrings - 1 - si;
    const y = stringYs[row];
    for (let fret = 0; fret <= fb.numFrets; fret++) {
      const pc = pitchAt(strings[si], fret);
      const behindCapo = fb.capo > 0 && fret > 0 && fret < fb.capo;

      const name = noteName(pc, fb.preferFlats);
      let label: string;
      let subLabel: string | undefined;
      let intervalRole: 'root' | 'scale' | null = null;
      if (fb.displayMode === 'intervals' && rootForIntervals !== null) {
        // Major-scale degree as the primary label (R, 2..7), note name small
        // underneath. Chromatic (non-scale) notes are left blank.
        const degree = MAJOR_SCALE_DEGREE[mod12(pc - rootForIntervals)];
        if (degree) {
          label = degree;
          subLabel = name;
          intervalRole = degree === 'R' ? 'root' : 'scale';
        } else {
          label = '';
        }
      } else {
        label = name;
      }

      // Which chords contain this position (for overlay + pie), respecting each
      // chord's "keep" voicing; or, while refining, kept vs candidate marking.
      const posKey = `${si}:${fret}`;
      let chordHit: { colors: string[]; isRoot: boolean; keepState?: 'kept' | 'candidate' } | null = null;
      if (refine) {
        const c = parsedChords[refine.chordIndex];
        if (c.pcs.has(pc)) {
          chordHit = {
            colors: [c.color],
            isRoot: c.rootPc === pc,
            keepState: refine.keepKeys.has(posKey) ? 'kept' : 'candidate',
          };
        }
      } else if (activeChords.length > 0) {
        const colors: string[] = [];
        let isRoot = false;
        for (const c of activeChords) {
          if (c.pcs.has(pc) && (!c.keepSet || c.keepSet.has(posKey))) {
            colors.push(c.color);
            if (c.rootPc === pc) isRoot = true;
          }
        }
        if (colors.length > 0) chordHit = { colors, isRoot };
      }

      const highlight = computeHighlight(
        si,
        fret,
        pc,
        activeKeySet,
        chordHit,
        selectedMap,
        refine ? null : intervalRole,
      );

      cells.push({ stringIndex: si, fret, pc, label, subLabel, x: noteX(fret), y, behindCapo, highlight });
    }
  }

  const width = fretLineX(fb.numFrets) + GEOM.marginRight;
  const height = GEOM.marginTop + (numStrings - 1) * GEOM.stringGap + GEOM.marginBottom;

  // Labels top-to-bottom (highest string first).
  const stringLabels = [...tuning.labels].reverse();

  return { width, height, stringYs, fretXs, cells, stringLabels, numFrets: fb.numFrets, capo: fb.capo };
}

function computeHighlight(
  stringIndex: number,
  fret: number,
  pc: number,
  keySet: Set<number>,
  chordHit: { colors: string[]; isRoot: boolean; keepState?: 'kept' | 'candidate' } | null,
  selectedMap: Map<string, Fretboard['selectedNotes'][number]>,
  intervalRole: 'root' | 'scale' | null,
): CellHighlight {
  // 1. Manual selection wins.
  const sel = selectedMap.get(`${stringIndex}:${fret}`);
  if (sel) {
    return {
      layer: 'manual',
      fill: sel.style.fill,
      stroke: sel.style.stroke,
      strokeDasharray: sel.style.strokeStyle === 'dashed' ? '4 3' : undefined,
      textColor: pickTextColor(sel.style.fill),
      bold: true,
    };
  }

  // 2. Chord progression tone (one color per chord; pie split when shared).
  if (chordHit) {
    // In refine mode, a "candidate" (unselected) note renders hollow/dashed.
    if (chordHit.keepState === 'candidate') {
      return {
        layer: 'chord',
        keepState: 'candidate',
        segments: chordHit.colors,
        chordRoot: false,
        fill: 'transparent',
        stroke: chordHit.colors[0],
        strokeDasharray: '3 3',
        textColor: chordHit.colors[0],
        bold: false,
      };
    }
    const multi = chordHit.colors.length > 1;
    return {
      layer: 'chord',
      keepState: chordHit.keepState,
      segments: chordHit.colors,
      chordRoot: chordHit.isRoot,
      fill: chordHit.colors[0],
      stroke: chordHit.isRoot ? '#1b1b1b' : '#00000040',
      textColor: multi ? '#1b1b1b' : pickTextColor(chordHit.colors[0]),
      bold: true,
    };
  }

  // 3. Key membership (neutral background).
  if (keySet.has(pc)) {
    return {
      layer: 'key',
      fill: KEY_HIGHLIGHT_FILL,
      stroke: KEY_HIGHLIGHT_STROKE,
      textColor: '#1b1b1b',
      bold: false,
    };
  }

  // 4. Interval mode: root and major-scale degrees get a readable chip.
  if (intervalRole === 'root') {
    return { layer: 'interval', fill: '#53413c', stroke: '#2f231f', textColor: '#ffffff', bold: true };
  }
  if (intervalRole === 'scale') {
    return { layer: 'interval', fill: '#ffffff', stroke: '#53413c', textColor: '#1b1b1b', bold: false };
  }

  // 5. Plain note-map cell (low-key).
  return { layer: null, fill: 'transparent', stroke: 'transparent', textColor: 'var(--fb-faint-text)', bold: false };
}
