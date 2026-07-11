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

## 10. Report pagination: explicit page groups + flex fill (supersedes #6's diagram cap)
**2026-07-11 · Accepted**

**Context.** Entry #6's fixed `~42mm` diagram height was a guess: with 4
fretboards on a page it left height unused, and with fewer it didn't grow to
fill the extra space — no CSS rule knew *how many* fretboards shared a page,
because they rendered as one continuous `.map()` with pagination left to the
browser's automatic page-break logic.

**Decision.** Pre-chunk `board.fretboards` into groups of at most 4 in JS
(`chunk()` in `ReportView.tsx`) — the only reliable way to cap "4 per page"
precisely. Each group renders inside a `.report__page` div. In `@media print`,
declare `@page { size: A4; margin: 0 }` (size is new — needed as a fixed
reference) and give `.report__page` a matching fixed height (297mm) with
`display: flex; flex-direction: column`. Inside: the header (page 1 only) is
`flex: 0 0 auto`; `.report__page-fretboards` is `flex: 1 1 auto` and claims
whatever height is left; each `.report__fretboard` inside it is `flex: 1 1 0`,
so the page's remaining height divides evenly by however many fretboards
actually share that page. The diagram's `<svg>` is simply `width: 100%; height:
100%` — `preserveAspectRatio="xMidYMid meet"` (already set in
`FretboardDiagram.tsx`) contains the viewBox within that box, so it scales to
fill the flex-allocated cell with no extra math. Refs: `ReportView.tsx`,
`src/index.css` (`@media print`).

**Consequences.** Vertical padding (12mm) moved from `.report__sheet` to
`.report__page`: a block that fragments across printed pages only gets its own
padding-top before the first fragment and padding-bottom after the last, so
middle pages of one continuous `.report__sheet` would otherwise render with no
vertical margin — each `.report__page` now carries its own. Horizontal padding
(14mm) stays on `.report__sheet` (unaffected by fragmentation). The `size: A4`
assumption means a printer fed US Letter will get browser-rescaled margins
(layout stays correct, spacing shifts slightly) rather than an exact fit.

## 11. Report fretboards: full width, not flex-filled (supersedes #10's equal division)
**2026-07-11 · Accepted**

**Context.** Entry #10 divided each page's height equally among its fretboards
(`flex: 1 1 0`) and stretched each SVG to `height: 100%`, assuming fewer
fretboards per page would render bigger. Two problems in practice: (a) the
fretboard is a wide/short shape (viewBox ≈ 862×224 ≈ **3.85:1**), so at full
page width its height maxes at ~47mm — extra vertical space can't make it taller,
only adds letterbox whitespace, so "3 per page bigger than 4" never happened;
(b) fretboards carrying a chord row (or on the header page) got a shorter
diagram cell, and `preserveAspectRatio="xMidYMid meet"` then fit them by height
→ they rendered visibly **narrower** than the rest.

**Decision.** In portrait, render every report fretboard at **full page width,
natural height** (`.report__fb-diagram .fretboard-svg { width: 100%; height:
auto }` — the same rule the on-screen report uses) and give
`.report__fretboard` its natural height (`flex: 0 0 auto`, not `flex: 1 1 0`).
The page keeps its fixed A4 height and distributes the leftover vertical space
with `justify-content: space-evenly` on `.report__page-fretboards`. Refs:
`src/index.css` (`@media print`).

**Consequences.** Every fretboard is identical width regardless of chords or the
header (bug fixed), and as large as portrait allows. "Fewer per page" no longer
means "bigger" — it means more even spacing (a fixed geometric limit, accepted
by the user; landscape would be the only way to genuinely enlarge them). Edge
case: four chord-heavy fretboards on the header page can slightly overflow
(~13mm); if it bites, add a uniform `max-height` (~44mm) safety cap on the SVG.
