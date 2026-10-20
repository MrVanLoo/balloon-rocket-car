# Balloon rocket car simulator

Build a single, self-contained HTML simulation of a balloon rocket car on a horizontal string for middle school students on Chromebooks. SPEC.md is the full spec. This file lists the decisions made after the spec was written, and they win wherever SPEC.md says otherwise.

## Files in this folder

- `SPEC.md`: spec and build plan, exported from the planning doc with the teacher's answers under Open questions.
- `reference/mockup.html`: working interface mockup. Use it for layout, look and the physics draft. It is a reference, not the starting codebase.
- `reference/physics-draft.js`: the mockup's `simulate()` as a Node module. Port it into `src/physics.js`.

## Decisions (these override SPEC.md)

The teacher answered every open question in SPEC.md. Apply these:

1. **Pumps.** Default max is 6, not 5. Teacher settings allow a max of 1 to 8. Update the counter text, the run states and the graph's x axis to follow the current max.
2. **Air per pump.** Keep 0.5 L as the default.
3. **Balloon.** Keep the 12 in latex balloon defaults (R0 = 3.5 cm, dry mass 4.5 g).
4. **Trial-to-trial variation.** On by default (plus or minus 5% on friction and neck flow per trial). Teachers can still turn it off.
5. **Units.** Add a visible Metric / Imperial toggle near the readouts, defaulting to metric, remembered in localStorage. Store everything in SI internally and convert only for display and export. Imperial units: distance in ft, speed in ft/s, balloon width in in, air in US fluid ounces (1 fl oz = 29.57 mL; the teacher chose fl oz over cups). The tape measure switches to feet, with a label every 5 ft and a tick every foot. The prediction box takes the current unit. The CSV uses the units selected at export time, and the headers name them, for example `Distance (ft)`.
6. **Prediction box.** Keep it.
7. **Audience.** Middle school. Keep the Show forces toggle and the speed readout for all students.

Two smaller notes where the mockup and SPEC.md differ:

- The mockup draws the balloon, straw and pump 5x actual size; SPEC.md says 3x. Use the mockup's 5x and keep the on-screen note accurate.
- The mockup tries `claude.use("downloads")` before falling back to a Blob download. That hook exists only on claude.ai. Remove it; the deliverable uses the Blob and anchor path only.

## Expected physics results

Defaults, variation off, from `reference/physics-draft.js`. Acceptance test: 1 to 8 pumps match within 3%.

| Pumps | Distance (m) | Time moving (s) | Top speed (m/s) | Balloon width (cm) |
| --- | --- | --- | --- | --- |
| 1 | 1.65 | 0.74 | 4.41 | 10.9 |
| 2 | 3.51 | 1.11 | 6.36 | 13.1 |
| 3 | 4.76 | 1.39 | 6.84 | 14.7 |
| 4 | 5.74 | 1.67 | 6.94 | 16.1 |
| 5 | 6.54 | 1.94 | 6.97 | 17.2 |
| 6 | 7.21 | 2.22 | 6.98 | 18.2 |
| 7 | 7.78 | 2.50 | 6.98 | 19.2 |
| 8 | 8.24 | 2.78 | 6.98 | 20.0 |

No run reaches the 10 m string end at 8 pumps. With variation on, 2,000 runs at 3 pumps ranged from 4.60 m to 4.93 m, inside the plus or minus 10% acceptance band.

## How to work

- Follow the file layout, milestones and acceptance tests in SPEC.md under "Build plan and Claude Code handoff".
- Start with `src/physics.js` and `test/physics.test.mjs`. Use Node's built-in test runner (`node --test`), no dependencies.
- `src/units.js` (added in milestone 2, not in SPEC.md's layout) holds the metric/imperial conversions and tape marks, tested in `test/units.test.mjs`.
- `src/state.js` (added in milestone 3) holds the run-state machine and button rules, tested in `test/state.test.mjs`. `app.js` asks it what each control should do instead of checking phases itself.
- `src/playback.js` (added in milestone 4) picks trajectory samples by elapsed time and lays out force arrows and air puffs, tested in `test/playback.test.mjs`.
- `src/data.js` (added in milestone 5) builds, numbers and loads trial records; `src/csv.js` exports them. Tests: `test/data.test.mjs`, `test/csv.test.mjs`.
- `src/settings.js` (milestone 6) holds teacher-setting limits (air per pump 0.05 to 5 L, max pumps 1 to 8, string 3 to 20 m) and converts them for the dialog; `src/sources.js` holds the 15 sources. Tests: `test/settings.test.mjs` (also checks Sources against SPEC.md).
- All `src/*.js` share one global scope in the built page. `test/globals.test.mjs` fails if two files declare the same top-level name.
- `test/build.test.mjs` runs the build and checks size, inlining, no network code and that the only URLs are the 15 sources. `test/contrast.test.mjs` checks WCAG AA contrast for both themes from the tokens in `style.css`.
- The Release button uses its own `--go` / `--go-ink` tokens: white on the balloon red failed AA contrast.
- Keyboard shortcuts (Space, Enter, R) work when focus is not on a control; a focused control keeps its normal key behavior.
- The CSV has one extra column beyond SPEC.md's table: `Name or group`, last, so SPEC.md's "name field with a comma is quoted" test has a field to check. Columns 2 to 7 stay numeric.
- `.claude/launch.json` serves `dist/` at http://localhost:8765 through `.claude/serve-dist.mjs` (dev only). The preview pane blocks localStorage on file:// pages, so use it to test saving.
- `src/index.html` also runs directly in Chrome for development; it loads `style.css` and the scripts by relative path.
- `build.mjs` inlines `src/` into `dist/balloon-rocket.html`. No bundler, no npm packages.
- Every constant in `CONFIG` gets a comment naming its source from the SPEC.md Sources table, or saying it is an estimate or tuned value.
- The final file must make zero network requests, stay under 150 KB, and run from `file://` in Chrome on ChromeOS.
- Stop after each milestone, run the tests, and summarize what changed before moving on.

## Commands

```
node --test "test/*.test.mjs"
node build.mjs
```
