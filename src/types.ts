/** Core domain types for FretNavigator. */

export type DisplayMode = 'notes' | 'intervals';

export type StrokeStyle = 'solid' | 'dashed';

export interface NoteStyle {
  /** Fill color (hex). */
  fill: string;
  /** Outline color (hex). */
  stroke: string;
  strokeStyle: StrokeStyle;
}

/** A physical board position (string + fret). */
export interface FretPosition {
  /** Index into the tuning's `strings` array (0 = lowest string). */
  stringIndex: number;
  /** Fret number (0 = open string). */
  fret: number;
}

/** A manually pinned note at a physical board position. */
export interface SelectedNote extends FretPosition {
  style: NoteStyle;
}

/** A chord in the progression, optionally narrowed to a specific voicing. */
export interface ChordEntry {
  /** Chord id "<root>:<chordTypeId>". */
  id: string;
  /**
   * If set, only these positions are shown for this chord (a chosen voicing).
   * If absent, every position of the chord's notes is shown.
   */
  keep?: FretPosition[];
}

export interface Fretboard {
  id: string;
  label: string;
  /** Tuning id from music-theory TUNINGS. */
  tuningId: string;
  numFrets: number;
  /** Capo fret (0 = no capo). */
  capo: number;
  displayMode: DisplayMode;
  /** Root pitch class for interval mode / chord-independent root, or null. */
  rootNote: number | null;
  /** Key id "<root>:<scaleId>" or null. */
  keyId: string | null;
  /** Ordered chord progression, each shown in its own color. */
  chords: ChordEntry[];
  /** Prefer flat spelling for note names. */
  preferFlats: boolean;
  selectedNotes: SelectedNote[];
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  fretboards: Fretboard[];
  createdAt: number;
  updatedAt: number;
}

/** The persisted, versioned document shape. */
export interface PersistedState {
  schemaVersion: number;
  boards: Board[];
}

export const SCHEMA_VERSION = 3;
