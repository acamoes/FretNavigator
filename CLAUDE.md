# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project docs

- **`decisions.md`** — the *why* behind non-obvious choices (chord schema
  migrations, keep/refine as transient state, Pages base path, print CSS…).
  Read it before changing the data model or persistence.
- **`todo.md`** — current open items.

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # tsc -b (typecheck) + vite build → dist/
npm run typecheck  # types only, no emit
npm test           # Vitest (run once)
npm run test:watch # Vitest watch mode
npm run preview    # serve the production build
```

Run a single test by name or file:

```bash
npx vitest run src/music-theory/music-theory.test.ts -t "formats chord display names"
```

**Environment note:** this repo is developed on Windows. Node is installed but may not be on `PATH` in a fresh shell — prepend it first, e.g. in PowerShell:
`$env:Path = "$env:ProgramFiles\nodejs;$env:Path"`. Tests currently live only in `src/music-theory/`.

## Architecture

Single-user, client-only app. **No router** — `App.tsx` holds a `view` state union (`dashboard | board | report`) and swaps components; `AppHeader` is persistent. Three layers with a strict dependency direction:

1. **Pure logic** (`src/music-theory/`, `src/components/fretboardLayout.ts`) — no React, unit-testable. Never import UI here.
2. **State** (`src/store/`) — Zustand + `persist` to `localStorage`.
3. **UI** (`src/components/`) — reads/writes the store and renders via the pure logic.

### The fretboard rendering pipeline (most important to understand)

`buildFretboardModel(fretboard, opts)` in `fretboardLayout.ts` is the heart of the app: a **pure** function that turns a `Fretboard` into a geometry + per-cell highlight model. `FretboardDiagram.tsx` renders that model as SVG and is used by **both** the interactive card and the read-only report — so all display logic must go through `buildFretboardModel`, not the components.

Each cell gets exactly one highlight by **layer priority** (`computeHighlight`): `manual (pinned) > chord > key > interval > plain`. Colors/labels are decided here, not in the SVG.

Music is modeled as **pitch classes 0–11** everywhere. Keys and chords are string ids `"<rootPc>:<typeId>"` (e.g. `"0:maj7"`), parsed via `parseKeyId` / `parseChordId`. `parse*` functions are defensively guarded against non-string input.

### Chord progressions & voicings

`Fretboard.chords` is `ChordEntry[]` (`{ id, keep? }`), each colored by list position via `chordColor(index)`. All chords overlay at once; a note shared by several chords renders as a **pie split** (`piePaths` in `FretboardDiagram`). `keep` (a list of `FretPosition`) narrows a chord to a chosen voicing; absent = show all positions.

**Focus/isolate and "select notes to keep" (refine) are transient LOCAL state in `FretboardCard`**, not persisted. They are threaded to the pure layer via `BuildOptions` (`focusedChordIndex`, `refine`). During refine, `handleCellClick` toggles a draft keep-set instead of pinning notes; "Remove Unselected Notes" commits it into the chord's `keep`.

`effectiveRootNote(fb)` powers intervals mode: the interval root is the Root dropdown **or**, if unset, the first pinned note — so "click a note, then press Intervals" works.

### Persistence & schema migrations (read before changing the data model)

`useStore.ts` persists via Zustand `persist` with `version: SCHEMA_VERSION` (in `types.ts`). Two mechanisms keep old saved data alive:

- `migrate(persisted, version)` — runs only on version mismatch (handles the historical `chordId → chords[]` and `string[] → ChordEntry[]` conversions).
- `merge()` — runs on **every** rehydration and re-normalizes `chords` via `normalizeChords`, self-healing data that was saved mid-change.

When you alter `Fretboard`/`ChordEntry` shape: bump `SCHEMA_VERSION`, extend `migrate`, and keep `normalizeChords` (`store/factories.ts`) tolerant. Board export/import lives in `store/ioBoard.ts` (its own `schemaVersion`).

### Deployment (GitHub Pages)

Production `base` is `/FretNavigator/` (dev stays `/`) — see `vite.config.ts`. Because of the sub-path, **public assets must not use root-absolute paths**: reference them via `import.meta.env.BASE_URL` in code (see the logo in `AppHeader.tsx`) or `%BASE_URL%` in `index.html` (favicon). `.github/workflows/deploy.yml` builds + tests + deploys on push to `main`.

## Design system

Warm brown, editorial aesthetic; single font **Literata** (self-hosted via `@fontsource-variable/literata`, imported in `main.tsx`). Tokens (colors, radii, 8pt spacing, soft shadows) are CSS variables in `src/index.css`. Fretboard-specific colors are also driven by CSS vars (`--fb-*`) plus constants in `fretboardLayout.ts` (`KEY_HIGHLIGHT_*`) and palettes in `store/colorPresets.ts`.
