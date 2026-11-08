# TODO

Open items. Keep it short; move the *why* behind any decision into
[decisions.md](decisions.md). Check items off or delete them when done.

_Last updated: 2026-11-08_

- [ ] **Reorder chords in a progression** (◀▶ buttons or drag) — currently you can
      only add / remove / isolate; progression order matters for reading.
- [ ] _(Optional)_ **Transparent-background logo** variant for the README so it
      looks right on GitHub's dark theme (current `public/logo.png` is white).
- [ ] _(Optional)_ **Unit test for schema migration + `normalizeChords`** to lock
      in the localStorage self-heal against regressions.
- [ ] _(Optional)_ **Strumming pattern extensions** — sixteenth notes (16 slots),
      multi-bar patterns, and muted up/down-strokes (see [decisions.md #12](decisions.md)).
- [ ] _(Optional)_ **Tab extensions** — remaining techniques (slide, bend) and
      rhythm/duration; also revisit whether tabs should be able to share a
      printed page with fretboards (see [decisions.md #13](decisions.md)).
      Hammer-on/pull-off and per-column chord labels are done (#14).
- [ ] _(Optional)_ **"Think in E" view for down-tuned standards** — label notes
      as the E Standard shape would (play an E shape in C# Standard, read "E")
      instead of the sounding pitch. Today fretboards show only sounding pitches.
- [ ] _(Optional)_ **7-string and bass tunings** — the tab already reshapes
      columns when the string count changes, but `Fretboard` doesn't: pinned
      notes and chord `keep` positions on a vanished string would be orphaned,
      and chord diagrams are fixed at 6 strings.
