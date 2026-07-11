# Decisions

Architecture Decision Records for FretNavigator — the **why** behind non-obvious
choices. Code shows *what*, git shows *when*; this file captures *why*.

**Format.** Append-only. Each entry: title, date, status, context, decision,
consequences. When a decision changes, add a **new** entry that *supersedes* the
old one — don't rewrite history. Keep entries short.

---

## 1. Chord model & schema migrations
**2026-07-11 · Accepted**

**Context.** A fretboard first held a single chord (`chordId: string`), then a
progression of ids (`chords: string[]`), then chords with an optional voicing
(`chords: ChordEntry[]` where `ChordEntry = { id, keep? }`). Persisted data lives
in `localStorage`, and dev-time HMR can leave in-memory state in an old shape
mid-change.

**Decision.** Keep two independent safety nets in the Zustand `persist` config
(`src/store/useStore.ts`): `migrate(persisted, version)` handles version bumps
(`SCHEMA_VERSION` 1→3 in `src/types.ts`), and `merge()` runs on **every**
rehydration, re-normalizing `chords` via `normalizeChords` (`src/store/factories.ts`).

**Consequences.** Old saves upgrade on version mismatch; data saved mid-migration
(or at a matching version but wrong shape) self-heals on the next load. When the
`Fretboard`/`ChordEntry` shape changes: bump `SCHEMA_VERSION`, extend `migrate`,
and keep `normalizeChords` tolerant.

## 2. Multi-chord progression rendering
**2026-07-11 · Accepted**

**Context.** Users want to see a whole progression on one fretboard, including
shared notes (common tones / voice leading).

**Decision.** Overlay all chords at once, colored by list position (`chordColor`
in `src/store/colorPresets.ts`). A note in several chords renders as a **pie
split** (`piePaths` in `FretboardDiagram.tsx`); each chord's root is emphasized.
Clicking a chip isolates one chord.

**Consequences.** Colors are stable by position, so isolating a chord doesn't
recolor the others. All display logic stays in `buildFretboardModel`.

## 3. Voicing (`keep`) and refine are transient local state
**2026-07-11 · Accepted**

**Context.** "Select notes to keep" narrows a chord to a chosen voicing; focus/
isolate dims the rest. Neither is really board *data* — they're view actions.

**Decision.** `focusedChordIndex`, `refiningChordIndex`, and the draft keep-set
live as **local `useState` in `FretboardCard`**, threaded to the pure layer via
`BuildOptions` (`focusedChordIndex`, `refine`). Only the committed `keep` array
is persisted on the `ChordEntry`.

**Consequences.** The data model stays clean, the report is unaffected by
transient focus, and `buildFretboardModel` remains pure and shared.

## 4. Interval root falls back to the first pinned note
**2026-07-11 · Accepted**

**Context.** Users expect "click a note, then press Intervals" to root the
intervals on that note, not to require the Root dropdown.

**Decision.** `effectiveRootNote(fb)` returns the Root dropdown value, or — if
unset — the first pinned note's pitch class (`src/components/fretboardLayout.ts`).

## 5. Single pure render pipeline
**2026-07-11 · Accepted**

**Context.** The interactive card and the read-only report must render
identically.

**Decision.** Both render via `buildFretboardModel` (pure) → `FretboardDiagram`
(SVG). Each cell gets one highlight by layer priority
`manual > chord > key > interval > plain` (`computeHighlight`). No display logic
lives in the components.

## 6. Report scaling & print output
**2026-07-11 · Accepted**

**Context.** In the report, wide fretboards overflowed (horizontal scrollbar,
clipped in print), the browser added its own header/footer (title, date, URL),
and only ~2 fretboards fit per page.

**Decision.** The SVG's `minWidth` applies only in the interactive card; the
report lets it scale to fit. In `@media print`: `@page { margin: 0 }` suppresses
the browser chrome (Chrome/Edge), content margins are restored via
`.report__sheet` padding, and the diagram height is capped (~42mm) so four
fretboards fit per A4 page. Refs: `FretboardDiagram.tsx`, `src/index.css`.

**Consequences.** Firefox ignores `@page { margin: 0 }` for chrome suppression —
there it's a manual toggle in the print dialog. The 42mm cap may need tuning.

## 7. GitHub Pages deployment
**2026-07-11 · Accepted**

**Context.** Pages serves a project site under `/<repo>/`.

**Decision.** `base: '/FretNavigator/'` only for production builds (dev stays
`/`) in `vite.config.ts`. Public assets are referenced via
`import.meta.env.BASE_URL` (code) or `%BASE_URL%` (`index.html`) so they resolve
under the sub-path. `.github/workflows/deploy.yml` builds + tests + deploys on
push to `main`, with `actions/configure-pages` (`enablement: true`).

**Consequences.** Root-absolute asset paths (`/logo.png`) break on Pages — always
go through `BASE_URL`.

## 8. Resilience: error boundary + defensive parsers
**2026-07-11 · Accepted**

**Context.** A single malformed persisted entry (e.g. a legacy string chord) once
white-screened the whole app via `parseChordId(undefined)`.

**Decision.** Wrap the app in `ErrorBoundary` (`src/main.tsx`), and guard
`parseChordId`/`parseKeyId` against non-string input.

## 9. No router
**2026-07-11 · Accepted**

**Context.** Single-user, client-only app with three screens.

**Decision.** `App.tsx` holds a `view` state union (`dashboard | board | report`)
and swaps components; no routing library.
