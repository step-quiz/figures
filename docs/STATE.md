# Project 17 — Figures d’examen: living state

Agent-facing memory between sessions. English. Update it in the same commit as any change.
Spec: [`SPEC.md`](SPEC.md). Where they disagree, this file wins.

## Status (2026-10-23): v2 — GeoMotor consumed from step-quiz-commons

| Part | Status |
|---|---|
| GeoMotor `js/motor/geo-motor.js` | MOVED to `step-quiz-commons/fitxers/geo-motor.js` (2026-10-23, user approved); synced daily by `comuns.yml`. Added `segona-interseccio` and `circumcercle` for Project 21. Full tests in commons; here only a sync/smoke test |
| Function plotter `js/motor/funcio.js` (safe parser + adaptive sampling) | DONE (in v1 by the user's choice) |
| Drawing primitives `dibuix.js`; exports TikZ / standalone .tex / SVG / PNG 300 dpi; `.tex` round trip | DONE |
| Editor: tools, SVG canvas, properties, undo/redo (200), keys, templates (7), save/open/share/import, autosave | DONE, browser-checked under `file://` |
| Tests (`node tests/run-all.js`); TikZ golden files compiled with pdflatex (`tools/compila-golden.sh`) | DONE, all green |
| Optional workflow `compila.yml` (text in `docs/compila.yml`) | PENDING (user, web UI) |
| Workflow `.github/workflows/comuns.yml` (copy of `step-quiz-commons/plantilles/comuns.yml`) | PENDING (user, web UI) |
| GitHub bootstrap, Cloudflare `figures.step-quiz.net`, card in `ins` | PENDING (user) |

## Decisions approved by the user (2026-10-22)

1. Plain TikZ: the user's `defs.tex` (combinades) defines no TikZ macros, so the export uses none.
2. Default line width `semithick` (0,6 pt); labels at the document's text size (his exams are 12 pt).
3. Function plotter `y = f(x)` in v1.

## Technical decisions (agent)

- **World = cm on paper, y up.** Axes: one unit = 1 cm (no separate scale in v1); the view (`vista`) is
  editable (origin, width, height). Default page 16 × 10 cm.
- **Object model** as spec §12.2 with ASCII keys: `estil: { gruix, trac, color }`, `etiqueta: { text,
  desplacament }`, plus `opcions` for type-specific settings (marks, dimension, shading, axes, function).
  `normalitza()` fills defaults and fixes key order, so `serialitza(llegeix(s)) === s` byte for byte.
  `llegeix()` drops objects with forward references, unknown types or odd ids (reported to the user).
- **Types**: all base types of §12.2 (`paral·lela` is `parallela`), transforms (gir, simetria, translacio) on
  points, convenience types (trisectriu, centre-homotecia, baricentre, circumcentre, incentre, ortocentre) each
  tested equal to a primitive construction (trisection against a rotation by the measured third, since it is
  not ruler-and-compass). Annotation types `marca-angle`, `marca-segment`, `cota`, `ombrejat`, `text`,
  `eixos`, `grafica`.
- **Intersections**: line–circle ordered along the line's direction vector; circle–circle by the side of
  c1 → c2 (left = branch 0); tangency by relative tolerance on distances (1e-9 × scene diagonal), giving one
  point for both branches; segments, rays and arcs restrict their solutions (outside → `null`, the branch does
  not switch). While dragging, the solution closest to the previous position wins; on release
  `fixaBranques()` stores it. A test reproduces the classic trap (dragging B past A reverses the line's
  direction: the fixed rule jumps to the other point; continuity does not).
- **Drawing primitives** shared by the editor, TikZ, SVG and PNG: lines (recta/semirecta clipped to the view),
  circles, arcs (degrees), fills, dots (r = 0,05 cm), arrowheads (filled triangles, no TikZ arrow library),
  texts with one of 8 anchors chosen from the label offset. Right angles: a square of 0,7 × radius; angle arcs
  spaced 0,08 cm; segment ticks ±0,12 cm; dimension lines with extension lines and arrowheads; hatch at 45°
  every 0,2 cm (even–odd clipping).
- **TikZ**: 3-decimal coordinates, angles with 2 decimals, one `% <id>` comment per object, first line
  `% figures:v1:<base64url(deflate-raw(JSON))>`. Standalone `.tex`: `standalone` 12 pt with Computer Modern
  (no `lmodern`: it is not in the CI TeX packages of the spec). Labels: single letter (+ primes + index) or
  Greek → math mode; `$…$` verbatim; otherwise escaped text; `−` → `$-$`.
- **Code**: browser `CompressionStream('deflate-raw')` (async) with a fallback to uncompressed base64url JSON;
  decoding detects plain JSON by its first byte `{`. Node uses zlib for tests and golden files.
- **SVG**: presentation attributes only (no `style`), so the same generator renders the editor canvas under the
  strict CSP. Widths 0,4/0,6/0,8 pt in mm; text serif, letters italic. Limitation: `$…$` labels are simplified
  in SVG (Greek, `^2`, `^3`, `\cdot`, index), not typeset.
- **PNG**: SVG → Blob URL → `<img>` → canvas at 300 dpi (`midaPng`), white background; «Copia la PNG» only
  where `ClipboardItem` exists.
- **Editor**: SVG canvas (viewBox = view in mm), hit-testing analytic (`Eines.proper`, 0,25 cm; points win),
  snapping 0,5 cm (Shift disables), hidden objects shown faded, selection in orange. Undo/redo = command
  objects with before/after JSON (200). A tool sequence that creates intermediate points is one undo step.
  Keyboard: tool letters, Esc, Supr, Ctrl+Z/Y, arrows move the selected free point; the point tool also has
  x/y fields for keyboard-only use.
- **Persistence**: autosave `figures:v1:actual`; start-up order: `#f=` link → autosave → empty.
- **Templates** (`data/plantilles.js`): triangle with altitudes, Thales, Pythagoras with squares, inscribed
  angle, tangents from an external point, axes with a segment, function graph. Each has a golden TikZ file,
  compiled locally with pdflatex (TeX Live 2023) — all compile.

## Acceptance criteria (spec §12.7)

- [x] Every template can be built from scratch with the tools (`tests/eines.test.js` rebuilds two of them by
      simulated clicks and compares the points); timing by a real teacher still to be checked.
- [x] TikZ compiles unchanged (golden files compiled with pdflatex; no libraries).
- [x] Round trip `.tex` → editor works (tested in Node and in the browser).
- [x] Works offline by double-click.
