# Project 17 — Figures d’examen (and GeoMotor): specification

> Copied from `SPEC-step-quiz-9-projects.md` §12 and §5.3 (2026-10-22). The shared rules of that document
> apply and are summarised here; decisions taken later are in [`STATE.md`](STATE.md), which overrides this file.
> Where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins.

## Shared rules (summary of the master spec §2–§4)

- Static only (HTML + CSS + vanilla JS), no build step, no backend. **Must work under `file://`** (double click):
  classic scripts with one namespace per file and the dual export wrapper, no ES modules, no `fetch`, no Workers.
- No network at runtime (no CDN, fonts, analytics). Privacy: no personal data; `localStorage` only, every access in
  `try/catch`, fully usable without storage. Keys `figures:v1:<what>`.
- Everything the student sees is in Catalan; identifiers and comments in Catalan; agent docs in English.
- Content CC BY-NC-SA 4.0, code MIT (`LICENSE`, `LLICENCIA.md` from `step-quiz-commons/fitxers/`).
- Never `[skip ci]`, `[ci skip]` or `[cf-pages-skip]` in any commit message.
- Tests before delivery; tests recompute results independently of the code under test. Docs follow code.
- Seeded RNG (FNV-1a → mulberry32, from `prova1eso/assets/js/atzar.js`); never `Math.random` for anything
  reproducible. URL readers tolerate garbage.
- Pedagogy: one action per screen state, ≤ ~40 words of instructions, feedback names the mistake (≤ 2 messages),
  no gamification noise, every route ends in a "beauty moment", hints never give the answer.
- Interaction triad (drag, tap-then-tap, keyboard); Pointer Events with `setPointerCapture`; `touch-action: none`
  only on the board; targets ≥ 44 px touch / ≥ 24 px mouse; `aria-live` feedback; colour never the only carrier;
  animations ≤ 300 ms and off under `prefers-reduced-motion`; dark mode via tokens; print black on white, A4 15 mm.
- Cache busting with `?v=<content hash>` (`tools/versio.py`), checked by a test.
- Catalan maths typography: decimal comma (inputs accept `,` and `.`), `·` and `:`, `«…»`, typographic `’`.

## 12. Project 17: Figures d'examen (and the GeoMotor engine)

**Repo:** `figures`. **Audience:** Mathematics teachers who write exams in LaTeX/Overleaf (the user) or Google Docs (colleagues).

### 12.1 Intent

A clean, correctly constructed exam figure in minutes:
- points, segments, lines, circles, constructions, angle marks, equal-segment ticks, dimensions and labels;
- exported as **TikZ** (Overleaf), **SVG** and **PNG at 300 dpi** (Google Docs).

The user's other repos (`combinades`, `pd`, `llibre`, `sol`) already produce `.tex`.

### 12.2 GeoMotor (pure engine, `js/motor/geo-motor.js`, see §5.3)

- **Object model.** A construction is an ordered list. Each object is
  `{ id, tipus, args: [ids | numbers], estil: {...}, etiqueta: { text, desplaçament: [dx, dy] }, visible }`.
  An object's args may only reference earlier ids, so the list is a topological order by construction.
- **Base types.**
  - points: `punt` (free x, y), `punt-sobre` (object, parameter `t`: along a line or segment, or an angle on a circle), `interseccio` (a, b, branch), `punt-mig`;
  - lines: `recta`, `segment`, `semirecta`, `perpendicular` (line, point), `paral·lela` (line, point), `mediatriu`, `bisectriu` (A, B, C);
  - circles: `circumferencia` (centre, point), `circumferencia-radi` (centre, r), `arc` (centre, from, to);
  - polygons: `poligon`, `poligon-regular` (A, B, n);
  - transforms: `gir` (point, centre, angle), `simetria` (point, line), `translacio` (point, vector).
  - Convenience types for Project 21: `trisectriu` (A, B, C, k), `centre-homotecia` (circle1, circle2, `'ext'|'int'`), `baricentre`, `circumcentre`, `incentre`, `ortocentre`. They are implemented directly, but each must also be constructible from primitives (a test checks equality).
- **Evaluation.**
  - Recompute everything in list order on any change; there are fewer than 500 objects.
  - An undefined result (parallel lines, no intersection) is `null` and propagates; renderers hide null objects.
- **Intersection branches** (the classic dynamic-geometry trap):
  - At creation, store `branca` by a deterministic rule: line–circle by order along the line's direction vector; circle–circle by the sign of the cross product relative to centre1 → centre2. Loading a file then rebuilds the same figure.
  - While dragging, choose the solution closest to the previous position (temporal continuity), and update `branca` when the user releases.
  - Tangency: discriminant within `ε` → a single point.
- **Numerics.** Doubles; `ε = 1e-9 × scene scale`. Every predicate (collinear, concyclic, tangent) uses relative tolerances.
- **Serialisation.** `{ versio: 1, unitats: 'cm', objectes: [...], vista: { x0, y0, x1, y1 } }`. Use deterministic ids (`A`, `B`, … for points; `s1`, `c1`, … otherwise) and assign labels automatically in creation order.

### 12.3 Editor UI

- **SVG, not canvas**: crisp output, direct export, DOM hit-testing.
- **Layout.** Tools on the left, canvas in the centre, properties on the right. On a phone, the tools become a bottom bar and properties a sheet. The editor targets laptops first.
- **Units.** World units are **cm on paper**. Default page area 16 × 10 cm. Optional 0,5 cm grid and snap-to-grid; Shift temporarily disables snapping.
- **Annotation objects.**
  - `marca-angle` (A, B, C, `{ arcs: 1|2|3, recte: bool, radi, etiqueta }`): a right angle is drawn as a square;
  - `marca-segment` (P, Q, `{ ratlles: 1|2|3 }`);
  - `cota` (P, Q, `{ desplaçament, text: auto length | custom }`): a dimension line with arrows;
  - `etiqueta`;
  - `ombrejat` (polygon: grey 20 % or hatched).
- **Styles.**
  - Line widths fi / normal / gruixut map to TikZ `thin` / `semithick` / `thick` (0,4 / 0,6 / 0,8 pt).
  - Solid, dashed or dotted.
  - Black by default, grey as the only alternative in v1, since exams are printed in black and white.
- **Axes object.** Cartesian axes with ticks, numbers (decimal comma) and an optional grid. Point coordinates can be shown.
  - *Phase 2:* `grafica` `y = f(x)` with a safe parser and adaptive sampling; useful for Batxillerat exams.
- **Commands and keys.**
  - Undo/redo with the command pattern (200 steps).
  - Keys: P point, S segment, R line, C circle, A angle mark, M midpoint, Esc cancels the tool, Supr deletes, Ctrl+Z / Ctrl+Y.
- **Templates** (`data/plantilles.js`): triangle with altitudes, Thales configuration, Pythagoras with squares, inscribed angle, tangent to a circle, coordinate axes with a segment.

### 12.4 Export

1. **TikZ snippet.**
   - Plain `tikz` only, **no libraries**.
   - Every object is emitted with numeric coordinates computed in JS (3 decimals), never as TikZ constructions. Angle arcs are `\draw (x,y) arc[start angle=…, end angle=…, radius=…];`, segment ticks are short segments computed in JS, and right angles are two segments.
   - Labels: `\node[anchor=<one of 8 anchors chosen from the label offset>] at (x,y) {$A$};`.
   - The **first line** is a comment carrying the construction, so the snippet round-trips through «Importa des del .tex»: `% figures:v1:<base64url(deflate(JSON))>`. This is the same idea as `combinades` storing its URL in the `.tex`.

   Example shape:
   ```latex
   % figures:v1:eJx…
   \begin{tikzpicture}[line cap=round, line join=round]
     \coordinate (A) at (0.000,0.000); \coordinate (B) at (6.000,0.000); \coordinate (C) at (2.000,3.500);
     \draw[semithick] (A) -- (B) -- (C) -- cycle;
     \draw[thin] (5.600,0.000) arc[start angle=180, end angle=138.81, radius=0.4];
     \node[anchor=north east] at (A) {$A$};
   \end{tikzpicture}
   ```
2. **Standalone `.tex`:** `\documentclass[tikz,border=2mm]{standalone}` + `\begin{document}` + snippet + `\end{document}`, for quick compilation.
3. **SVG:** clean markup, `viewBox` in mm, inline styles, labels as italic serif text. Complex KaTeX labels are rasterised or simplified; document the limitation.
4. **PNG at 300 dpi:** draw the SVG on a canvas through a Blob URL.
5. **Copy to clipboard:** TikZ as text; PNG through `ClipboardItem` where supported.

### 12.5 Persistence

- Autosave to `localStorage` (§4.3).
- «Desa» downloads a `.json`; «Obre…» accepts a file picker or drag-and-drop.
- A share URL holds `#f=<base64url(deflate(JSON))>`. Use `CompressionStream('deflate-raw')` when available, else uncompressed base64url.

### 12.6 Tests

- **Engine.**
  - Intersections against analytic solutions (line–line, line–circle, circle–circle, tangency, no solution).
  - Perpendicular and parallel; midpoint; bisector.
  - Each convenience type equals its primitive construction.
- **Branch continuity.** Drag a free point along a scripted path. The tracked intersection must never jump more than a bound per step, except across a real tangency.
- **Serialisation round trip** is byte-stable.
- **TikZ golden files** for every template (`tests/golden/*.tex`, exact comparison; regenerate with a flag).
- **Real compilation** in an optional workflow `compila.yml`, run on changes to `js/export/**`: `sudo apt-get install -y --no-install-recommends texlive-latex-base texlive-pictures texlive-latex-extra`, then compile each golden standalone file with `pdflatex -halt-on-error`.
- SVG well-formedness; the PNG exporter produces the expected pixel size.

### 12.7 Acceptance criteria

- [ ] A teacher can build every template figure from scratch in under 3 minutes.
- [ ] TikZ compiles in Overleaf unchanged.
- [ ] Round trip `.tex` → editor works.
- [ ] Works offline by double-click.

**Open questions for the user** (answered 2026-10-22, see STATE.md):
- His TikZ conventions: does `defs.tex` in `combinades`/`llibre` define macros the export should use, or should output be plain TikZ?

## GeoMotor as a shared component (master spec §5.3)

Specified in detail in §12.2.
- **Where it is developed:** in `figures/js/motor/geo-motor.js`.
- **When Project 21 starts:** move it to `step-quiz-commons/fitxers/geo-motor.js`. Register both webs in `comuns.json` and add `comuns.yml` (template `plantilles/comuns.yml`) to both. Move its tests to commons as well.
- **Ask the user first.** Commons is currently described as "files shared by the programming courses", so its README must be updated to widen the scope.

