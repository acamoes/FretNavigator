# TODO

Open items. Keep it short; move the *why* behind any decision into
[decisions.md](decisions.md). Check items off or delete them when done.

_Last updated: 2026-07-11_

- [ ] **Reorder chords in a progression** (◀▶ buttons or drag) — currently you can
      only add / remove / isolate; progression order matters for reading.
- [ ] **Verify "4 fretboards per page"** when printing, and tune the diagram
      height cap (currently `42mm` in `src/index.css` `@media print`) — lower it
      if only 3 fit, raise it if they end up too small.
- [ ] _(Optional)_ **Transparent-background logo** variant for the README so it
      looks right on GitHub's dark theme (current `public/logo.png` is white).
- [ ] _(Optional)_ **Unit test for schema migration + `normalizeChords`** to lock
      in the localStorage self-heal against regressions.
