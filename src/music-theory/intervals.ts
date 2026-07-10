/**
 * Interval definitions relative to a root, plus the standard color convention
 * used across the app for interval-mode display and chord-role highlighting.
 *
 * Convention (semitones from root, within one octave):
 *   0  R    root        strong red / highlight
 *   1  b2   tension     cool/muted
 *   2  2    tension     cool/muted
 *   3  b3   3rd         warm (consonant)
 *   4  3    3rd         warm (consonant)
 *   5  4    tension     green
 *   6  b5   tritone     steel
 *   7  5    5th         blue (consonant)
 *   8  #5   tension     violet
 *   9  6    color tone  teal
 *   10 b7   7th         purple (warning-ish)
 *   11 7    7th         magenta (warning-ish)
 */

import { mod12 } from './notes';

export interface IntervalInfo {
  /** Semitones from root, 0..11. */
  semitones: number;
  /** Short label used in interval mode. */
  label: string;
  /** Longer human name. */
  name: string;
  /** Category used for grouping / legend. */
  category: 'root' | 'third' | 'fifth' | 'seventh' | 'tension';
  /** Base color for this interval. */
  color: string;
}

// Earthy, slightly desaturated palette that harmonizes with the warm brown UI
// while keeping the standard interval convention (root = strong warm, 3rds warm,
// 5th consonant blue, 7ths/tensions cooler).
export const INTERVALS: IntervalInfo[] = [
  { semitones: 0, label: 'R', name: 'Root', category: 'root', color: '#b23a2e' },
  { semitones: 1, label: 'b2', name: 'Minor 2nd', category: 'tension', color: '#9e9089' },
  { semitones: 2, label: '2', name: 'Major 2nd', category: 'tension', color: '#8c9ba3' },
  { semitones: 3, label: 'b3', name: 'Minor 3rd', category: 'third', color: '#c77a3e' },
  { semitones: 4, label: '3', name: 'Major 3rd', category: 'third', color: '#d2a24c' },
  { semitones: 5, label: '4', name: 'Perfect 4th', category: 'tension', color: '#7e9b67' },
  { semitones: 6, label: 'b5', name: 'Tritone', category: 'tension', color: '#6d8a93' },
  { semitones: 7, label: '5', name: 'Perfect 5th', category: 'fifth', color: '#4c7a99' },
  { semitones: 8, label: '#5', name: 'Augmented 5th', category: 'tension', color: '#8a6aa0' },
  { semitones: 9, label: '6', name: 'Major 6th', category: 'tension', color: '#4fa093' },
  { semitones: 10, label: 'b7', name: 'Minor 7th', category: 'seventh', color: '#7a66a6' },
  { semitones: 11, label: '7', name: 'Major 7th', category: 'seventh', color: '#a85a8e' },
];

/** Interval info for the distance from `root` to `pc` (both pitch classes). */
export function intervalFrom(root: number, pc: number): IntervalInfo {
  return INTERVALS[mod12(pc - root)];
}

/** Short interval label (e.g. "b3") from root to pc. */
export function intervalLabel(root: number, pc: number): string {
  return intervalFrom(root, pc).label;
}

/** Color for the interval from root to pc. */
export function intervalColor(root: number, pc: number): string {
  return intervalFrom(root, pc).color;
}
