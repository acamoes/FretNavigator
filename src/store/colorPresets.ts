import { NoteStyle } from '../types';

export interface ColorPreset {
  name: string;
  fill: string;
  stroke: string;
}

/** Preset fill/outline swatches offered in the note style picker (warm-forward). */
export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Brown', fill: '#53413c', stroke: '#2f231f' },
  { name: 'Terracotta', fill: '#b23a2e', stroke: '#5f1a13' },
  { name: 'Burnt Orange', fill: '#c77a3e', stroke: '#6b3c16' },
  { name: 'Ochre', fill: '#d2a24c', stroke: '#725209' },
  { name: 'Sage', fill: '#7e9b67', stroke: '#3a4c2c' },
  { name: 'Teal', fill: '#4fa093', stroke: '#1c463f' },
  { name: 'Dusty Blue', fill: '#4c7a99', stroke: '#1e3546' },
  { name: 'Violet', fill: '#8a6aa0', stroke: '#3c2b49' },
  { name: 'Plum', fill: '#a85a8e', stroke: '#4c2340' },
  { name: 'Ink', fill: '#1b1b1b', stroke: '#000000' },
];

export interface OutlinePreset {
  name: string;
  stroke: string;
}

/**
 * Outline-only swatches. These override just the contour of the current
 * brush, leaving the fill color untouched — pick a fill, then a contour.
 */
export const OUTLINE_PRESETS: OutlinePreset[] = [
  { name: 'White', stroke: '#ffffff' },
  { name: 'Ink', stroke: '#1b1b1b' },
  { name: 'Brown', stroke: '#53413c' },
  { name: 'Terracotta', stroke: '#b23a2e' },
  { name: 'Ochre', stroke: '#d2a24c' },
  { name: 'Sage', stroke: '#7e9b67' },
  { name: 'Dusty Blue', stroke: '#4c7a99' },
  { name: 'Plum', stroke: '#a85a8e' },
];

/**
 * Distinct, harmonious colors assigned by position to chords in a progression.
 * Cycles if the progression is longer than the palette.
 */
export const CHORD_PALETTE: string[] = [
  '#b23a2e', // terracotta
  '#4c7a99', // dusty blue
  '#7e9b67', // sage
  '#d2a24c', // ochre
  '#8a6aa0', // violet
  '#4fa093', // teal
  '#a85a8e', // plum
  '#c77a3e', // burnt orange
];

export function chordColor(index: number): string {
  return CHORD_PALETTE[((index % CHORD_PALETTE.length) + CHORD_PALETTE.length) % CHORD_PALETTE.length];
}

export const DEFAULT_NOTE_STYLE: NoteStyle = {
  fill: COLOR_PRESETS[0].fill,
  stroke: COLOR_PRESETS[0].stroke,
  strokeStyle: 'solid',
};
