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

## 12. Strumming pattern: board-level, optional field, shared pure SVG
**2026-07-12 · Accepted**

**Context.** Users want to record a song's strumming pattern (↓/↑, accent, bass
note, mute) and print it like a standard strum chart. Confirmed scope: one 4/4
bar of eighth notes (8 slots), one pattern per song, palette-brush input.

**Decision.** Model a slot as `{ hit: 'down'|'up'|'bass'|'mute'|null; accent? }`
— `hit`s are mutually exclusive glyph types (bass/mute are their own strokes,
not direction modifiers), `accent` is the only modifier. `StrummingPattern`
(8 `StrumSlot`s) lives on **`Board`** (`board.strumming?`), edited in
`BoardView`'s header via `StrummingEditor` (a palette + interactive diagram) and
shown once atop the report. Rendering is a shared pure component
`StrummingDiagram` (SVG), interactive when given `onSlotClick` — mirroring
`FretboardDiagram`/`onCellClick`.

**Consequences.** The field is **optional and needs no schema bump**: absence =
no pattern, `merge()` spreads it through on rehydration, `ioBoard` serializes the
whole board, and `cloneBoard` deep-copies it — all without a migration. Not
representable in v1 (deferred to `todo.md`): muted up/down-strokes, sixteenths
(16 slots), and multi-bar patterns.

## 13. Heterogeneous sections + tab (tablature) sections
**2026-07-12 · Accepted**

**Context.** Solos are better shown as tablature (fret numbers over time) than as
fretboard dots. Users want a tab freely ordered among fretboards (e.g. Rhythm →
Solo(tab) → Rhythm).

**Decision.** `Board.fretboards: Fretboard[]` became `Board.sections: Section[]`
where `Section = Fretboard | TabSection`, each tagged with `kind`
(`'fretboard'`/`'tab'`). A `TabSection` is one bar-agnostic sequence of
`TabColumn { frets: (number|null)[]; bar? }` (fret per string; `bar` = barline
before the column). Rendering is the shared pure `TabDiagram` (HTML/CSS, not SVG
— easier number alignment + focusable cells), interactive via `onCellClick`;
`TabCard` adds keyboard entry (digits with two-digit combine ≤24, arrows, space,
`|`) plus fretboard-click input (reusing `FretboardDiagram`). Store: generic
section ops (delete/duplicate/move by id) work for any kind; `mapFretboard`/
`mapTab` narrow by kind; `addTab` + `updateTab` added. Migration: `SCHEMA_VERSION`
→ 4, but the real work is in `merge()` + `normalizeSections()` (reads legacy
`fretboards` or `sections` on every load, self-healing).

**Consequences (report pagination — revisits #10/#11).** Fretboard pages assumed
uniform heights (fixed A4 page, 4 per page). Tabs have variable height, so the
report now builds ordered **blocks**: runs of ≤4 fretboards render as the tuned
fixed-height pages; each tab flows at natural height. Every block after the first
gets `break-before: page` (`.report__block--break`), so tabs get their own
page(s) — order is preserved and the fretboard layout is untouched, at the cost
of a tab never sharing a page with a fretboard (accepted; "hybrid" option B).
Deferred to `todo.md`: techniques (h/p//b) and rhythm/duration.

## 14. Tab column annotations + hammer-on/pull-off slurs
**2026-08-12 · Accepted**

**Context.** Two gaps when writing a solo: you couldn't name the chord over a
moment in the tab ("A", "C#m7"), and there was no way to mark a hammer-on or
pull-off — the first of the techniques deferred by #13.

**Decision.** Two optional fields on `TabColumn`, so **no schema bump** (absence =
no data, exactly like `bar` and `Board.strumming` in #12): `annotation?: string`
and `slurs?: number[]` (string indices tied to the **next** column). Both are
rendered by the shared `TabDiagram`, so the report inherits them for free.

- *Slur direction is derived, not stored.* Next fret higher = hammer-on, lower =
  pull-off. There is nothing to keep in sync, editing is one toggle, and both
  `h` and `p` are accepted as the shortcut. Only the arc is drawn (no `h`/`p`
  letters), which is what the reference notation looks like.
- *Annotations overflow right instead of widening the cell.* `SIZES` in
  `TabDiagram` is the single source of truth for the wrapping maths, and its cell
  width is constrained by the two-digit-fret rule. A wide chord name would break
  both, so the label is absolutely positioned at its column and allowed to run
  over the following ones — how printed tab does it anyway.
- *The arc is CSS, not SVG* (`border-top` + elliptical `border-radius`), staying
  with #13's HTML/CSS tab. `width: 100%` of a `.tab-cell` **is** the centre-to-
  centre distance, so it aligns without new geometry. Its height/offset are two
  more `SIZES` entries (`slurH`, `slurGap`) rather than hard-coded CSS.

**Consequences.** Anything the normalizers don't know about is dropped on every
rehydration, so both fields had to be added to `normalizeTabColumns` **and**
`cloneTabSection`. A slur is drawn only when its partner column is in the same
system — across a line break the arc is dropped rather than pointed at nothing.
Deleting a column clears the previous column's slurs, and changing to a tuning
with fewer strings filters orphaned indices. The annotation row shows always in
the editor (it's the click target) but only when non-empty in print, so
unannotated tabs keep their current PDF density.

## 15. Board-level key + diatonic degree table
**2026-08-12 · Accepted**

**Context.** The app knew about keys only per fretboard, where a key is just a
coloring input. Nothing said what key the *song* is in, and nothing explained the
harmony: which notes belong to the key and which chord each degree produces.

**Decision.** `Board.keyId?: string` (same `"<rootPc>:<scaleId>"` encoding as
`Fretboard.keyId`, so `parseKeyId` serves both and "Apply to all fretboards" is a
plain copy). **No schema bump** — optional scalar, absence = no key, like `bpm`
(#12) and the tab fields (#14). A new pure module `music-theory/harmony.ts`
exposes `keySummary(keyId)`; `KeyTable` renders it for both the editor and the
report, the same shared-render split used by strumming (#12) and tab (#13).

Three judgment calls worth recording:

- *Roman numerals are relative to the scale, not to a parallel major.* A minor
  reads `i ii° III iv v VI VII`, not `i ii° bIII iv v bVI bVII`. The numeral comes
  from the degree index, so the rule holds identically for every mode
  (Mixolydian → `I ii iii° IV v vi VII`). The pop convention of flagging
  accidentals would need a second reference key to compare against, which the
  model doesn't have and which breaks down for the modes.
- *Notes are spelled by letter, not by the `preferFlats` boolean.* `noteName` has
  only a sharps and a flats table, which would print Eb major as
  "D# F G G# A# C D". Instead each degree of a 7-note scale takes its own letter
  A–G and the accidental falls out of the pitch difference; the tonic's letter is
  chosen by **minimizing the total accidentals** of the spelled scale (ties go to
  sharps). That reproduces the conventional key signatures — Eb major, Bb major,
  F# major — without a circle-of-fifths table, and it is why `ScaleType.usesFlats`
  stays unused.
- *Two chord types were added to close the table.* Harmonic and melodic minor
  produce `mMaj7` on i and `maj7#5` on III, which had no match in `CHORD_TYPES`;
  without them those cells would be blank. They are additive and now also appear
  in the per-fretboard chord picker.

**Consequences.** Quality detection matches an interval signature against a
**short candidate list** per row (4 triad types, 7 seventh types) — searching all
of `CHORD_TYPES` lets `sus2`/`add9` win over the plain triad they share notes
with. Scales that aren't 7 notes (pentatonics, blues) don't stack into thirds, so
`chords` comes back empty and the UI shows the notes plus one explanatory line
instead of an empty table. Chord symbols reuse the app's existing `ChordType.symbol`
(so a diminished triad reads "Bdim", matching the chord chips elsewhere) while the
numeral column carries the `°`/`+` quality marks.

## 16. Tighter report spacing + chord diagrams beside the key table
**2026-08-12 · Accepted**

**Context.** Two complaints about the printed page: ~2.2cm of dead space between
every block (key table → Fretboard 1 → Fretboard 2), and a wide empty band beside
the degree table that should show how to *play* each degree.

**Decision (spacing) — supersedes #11's spacing consequence.**
`.report__page-fretboards` goes from `justify-content: space-evenly` to
`flex-start` plus an explicit `gap: 6mm`. The `space-evenly` was coherent under
#10, where `.report__fretboard` was `flex: 1 1 0` and *consumed* the surplus of
the fixed 297mm page. #11 changed them to natural height so they wouldn't render
narrow — and left `space-evenly` behind, so from then on the entire surplus
became n+1 equal gaps (~22mm with two fretboards, ~65mm with one). #11's own
consequence ("fewer per page now means more even spacing… accepted by the user")
is hereby un-accepted. The page keeps `height: 297mm`: that is what makes one
block one physical page and keeps the 12mm bottom padding on fragmented pages.
Surplus now collects at the page foot, where it reads as a margin.

**Decision (chord diagrams).** A new pure `music-theory/chordShapes.ts` maps a
chord id to a `ChordShape` (fret per string, base fret, optional barre), and
`components/ChordDiagram.tsx` draws it as a songbook chord box. `KeyTable` shows
one per degree in a grid beside the table, so the editor and the report both get
them.

- *A curated table, not a voicing search.* Searching would need octave-aware
  pitches — the model only has pitch classes (`pitchAt` returns 0–11) — plus
  playability heuristics that produce awkward grips easily. The degree table only
  ever needs four triad types, so the table is small and predictable. Open shapes
  are tried first (key of C shows the open C, not a barre at the 8th fret), then
  movable shapes rooted on the 6th or 5th string, **lowest position winning** —
  which is what puts Bm at the 2nd fret and F#dim at the 2nd rather than the 9th.
- *Standard tuning only.* A board's key carries no tuning (each fretboard has its
  own), and covering DADGAD/open G would require exactly the search above.
- *A new SVG, not a reused `FretboardDiagram`.* That component takes a whole
  `Fretboard` document, has module-level fixed geometry with no scale, always
  starts at fret 0, and runs its axes the other way round (fret→x, string→y).

**Consequences.** The hand-written shape table is guarded by a test that replays
every shape (4 types × 12 roots) through `chordToneRoles` + `pitchAt` and asserts
it sounds exactly the chord's pitch classes, plus a second test that every shape
fits the diagram's four-fret window — so a transcription slip fails the build
rather than printing a wrong chord. Making room for the diagrams meant dropping
`.key-table__fn { width: 99% }`: that trick squeezed the chord columns by pushing
all slack into the Function column, which *was* the empty band. The table now
sizes to its content and the slack belongs to the diagram grid.

## 17. The report is one continuous flow (supersedes #10's page groups and #13's tab pages)
**2026-08-16 · Accepted**

**Context.** Two failures in a row from the same root. First a tab section
printed *on top of* a fretboard. Then, once that was fixed, the opposite: a board
with two fretboards and one tab produced three pages, each holding a single
section with two-thirds of the sheet blank.

**Cause.** Both came from pagination being computed in JS and forced with CSS.
`toBlocks()` chunked sections into "pages", `.report__page` was pinned to
`height: 297mm` (#10, so fretboards could flex-fill it) and every block after the
first carried `break-before: page` (#13). #11 removed the flex-filling but kept
the rigid box, so content could exceed it — and overflow out of a fixed-height
box is neither clipped nor reflowed; the browser painted it outside the element,
onto the sheet the next block had claimed. Hence the overlap. Capping the chunks
stopped the overlap but left the forced break per block, which is what wasted
whole pages: the JS had no way to know a tab would have fit under a fretboard.

**Decision.** Delete the whole mechanism. Sections render in order in one
continuous `.report__sheet`, with **no JS chunking and no forced page breaks**.
Each section carries `break-inside: avoid`, so it is never cut in half, and the
browser fills each page with whatever fits. `toBlocks`, `.report__page`,
`.report__page-fretboards` and `.report__block--break` are all gone.

**Consequences.** Pagination is now the browser's job, which is the one thing it
is actually good at, and the failure mode is a page that ends early rather than
overlapping ink. Section spacing had to move from `margin`/flex `gap` to
**`padding` on the section itself**: margins are dropped at a page boundary,
padding is always drawn, so `padding: 5mm 0` doubles as the gap between sections
and as the breathing room a section gets when it starts a fresh page. Vertical
page margins otherwise come only from `.report__sheet` padding, which lands on
the first page's top and the last page's bottom — `@page { margin: 0 }` has to
stay (it is what suppresses the browser's header/footer, #6), so an interior page
break relies on that section padding alone. A tab can now share a page with a
fretboard, which #13 had accepted as impossible.

## 18. A third section kind: chord grids
**2026-08-16 · Accepted**

**Context.** A board could hold fretboards and tabs, but not the most direct
thing a song needs: its chords, drawn as fingering boxes.

**Decision.** `ChordsSection { kind: 'chords', id, label, boxes: ChordBox[] }`,
where a `ChordBox` is a chord id plus the index of the chosen fingering. Each box
picks a chord and cycles through that chord's positions. `chordShapes.ts` grows
from one shape to **all** positions and from 4 triad types to 12
(`SHAPED_CHORD_TYPES`), and `ChordDiagram` gained an optional `shape` so an
unfilled box draws a blank grid instead of needing a second component.

- *The field is `boxes`, not `chords`.* `migrate` walks every section
  indiscriminately writing `chords`/`chordId` onto it, so a field with that name
  would be exposed to a legacy migration rewriting it; and `Fretboard.chords` is
  a different type (`ChordEntry[]`).
- *No `SCHEMA_VERSION` bump.* Nothing existing changes shape — a member is added
  to a union. Old data has no chords sections and loads unchanged.
- *The curated shape table was extended rather than replaced by a search.* Same
  reasoning as #16: a voicing search needs octave-aware pitches the model lacks.
  Positions come from the open shape plus the 6th- and 5th-string rootings,
  deduped and sorted, which yields 2-3 per chord — enough to cycle, few enough to
  stay recognisable.

**Consequences.** Three branches decide whether a new kind survives, and none of
them fails loudly: `normalizeSection`'s fallback **rewrites an unknown kind as a
fretboard**, and `merge()` runs it on *every* rehydration, so a missed branch
destroys the section on the next reload rather than at write time;
`cloneSection`'s fallback does the same on duplicate and on import. Both are now
explicit per kind and covered by tests that assert a chords section stays a
chords section. `.report__chords` also had to join the print enumeration that
grants `break-inside: avoid`, or the grid would split across pages.

`sus2` has no 6th-string shape that fits four frets (the 2nd forces a span of 4),
so it offers fewer positions than the other types. Widening the diagram to five
rows would fix it at the cost of shrinking every other diagram, including the key
table's — not worth it for one chord type. The shape table's safety net is a test
that replays all ~400 generated positions through `chordToneRoles` + `pitchAt`:
no note outside the chord, and no missing tone except the perfect 5th, which real
voicings drop (the open C7, x32310, has no G) — while a b5 or #5 stays mandatory,
keeping dim, aug and m7b5 strict.
