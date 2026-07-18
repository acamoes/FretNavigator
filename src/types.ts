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
  /** Discriminant for the heterogeneous `Board.sections` list. */
  kind: 'fretboard';
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

/** A single strum in a bar. `null` hit = a rest (no strum on that eighth). */
export type StrumHit = 'down' | 'up' | 'bass' | 'mute';

export interface StrumSlot {
  hit: StrumHit | null;
  /** Accent mark (>) above the strum. */
  accent?: boolean;
}

/** One 4/4 bar of eighth notes: exactly 8 slots (1 & 2 & 3 & 4 &). */
export interface StrummingPattern {
  slots: StrumSlot[];
}

/** One time column of a tab: a fret per string (null = string not played). */
export interface TabColumn {
  /** Indexed by stringIndex (0 = lowest string), like SelectedNote. */
  frets: (number | null)[];
  /** Draw a barline immediately before this column. */
  bar?: boolean;
}

/** A guitar tablature section (a solo written as fret numbers over time). */
export interface TabSection {
  kind: 'tab';
  id: string;
  label: string;
  /** Tuning id from music-theory TUNINGS (determines the number of strings). */
  tuningId: string;
  columns: TabColumn[];
}

/** A board holds an ordered, heterogeneous list of these. */
export type Section = Fretboard | TabSection;

export interface Board {
  id: string;
  name: string;
  description?: string;
  /** Song tempo in beats per minute (optional). */
  bpm?: number;
  /** Ordered sections: fretboards and tabs, freely interleaved. */
  sections: Section[];
  /** Optional strumming pattern for the song (shown once at the top of the report). */
  strumming?: StrummingPattern;
  createdAt: number;
  updatedAt: number;
}

/** The persisted, versioned document shape. */
export interface PersistedState {
  schemaVersion: number;
  boards: Board[];
}

export const SCHEMA_VERSION = 4;
