# Balloon Rocket Car Simulator: Spec and Build Plan

Oct 20, 2026 · @Bill

## Overview

Students pick 1 to 5 pumps of air, watch the balloon grow, release it, and record how far the straw-and-balloon vehicle travels along a horizontal string. The deliverable is one self-contained HTML file that runs offline on a student Chromebook.

The learning goal is to connect the amount of stored air to the push the escaping air gives (Newton's third law) and to see that drag and friction limit the payoff. The model is an estimate, not a full physics engine, but every equation and constant comes from a cited source.

In scope: inflate, release, animate, measure distance, log trials, export CSV. Out of scope for version 1: changing balloon size, nozzle size, string angle, or vehicle mass. Those are listed as possible extensions in Open questions.

The [interface mockup](https://claude.ai/artifact/Dfd6DtnVCCfJFPbZcQ1b6j) is a published HTML page that runs a working draft of this model, so the numbers in the mockup match this spec.

## Physics model

The sim steps a one-dimensional model forward in small time steps: the stretched balloon pushes air out the neck, the jet pushes the vehicle forward, and drag plus string friction slow it down. Every run is deterministic unless the teacher turns on trial-to-trial variation.

**Air added.** Each pump adds a fixed volume of air at near-atmospheric pressure. The balloon starts at its unstretched volume.

```latex
V_{start} = V_0 + n \cdot V_{pump}, \qquad \lambda = (V/V_0)^{1/3}
```

**Balloon pressure.** Rubber balloons do not follow Hooke's law. Gauge pressure rises fast, peaks near a stretch ratio of about 1.4, then falls as the balloon grows ([Vandermarlière 2016](https://physlab.org/wp-content/uploads/2023/01/1.4967901.pdf); [Merritt and Weinhaus 1978](https://eric.ed.gov/?id=EJ193106)). The sim uses a Mooney-Rivlin style curve with K scaled so the peak is about 3.3 kPa, which matches the measured peak of roughly 3% above atmospheric pressure. Deflating air comes out at 85% of the inflation curve, because the same paper measured a lower pressure on deflation (hysteresis).

```latex
\Delta P(\lambda) = K\left(\frac{1}{\lambda} - \frac{1}{\lambda^7}\right)\left(1 + \alpha\lambda^2\right)
```

**Jet speed and flow.** The pressure difference is under 4% of atmospheric, so the air can be treated as incompressible. Jet speed comes from Bernoulli, and a discharge coefficient Cd,n corrects for the jet narrowing as it leaves the neck ([Engineering ToolBox](https://www.engineeringtoolbox.com/orifice-nozzle-venturi-d_590.html)).

```latex
v_e = \sqrt{2\Delta P/\rho}, \qquad Q = C_{d,n} A_n v_e, \qquad \frac{dV}{dt} = -Q
```

**Thrust.** The jet leaves at roughly room pressure, so the pressure term in the rocket thrust equation drops out and thrust is mass flow times exit speed ([NASA Rocket Thrust Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/)). Combining the two lines above gives a simple form that is easy to show students.

```latex
F_{thrust} = \dot m\, v_e = \rho Q v_e = 2\, C_{d,n} A_n \Delta P
```

**Air resistance.** Standard drag equation on the balloon's current frontal area, treating it as a sphere ([NASA Drag Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/); [NASA Flight Equations with Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/)). The balloon shrinks as it empties, so drag area shrinks too.

```latex
F_{drag} = \tfrac{1}{2} C_d \rho A v^2, \qquad A = \pi r^2
```

**String friction.** A constant opposing force while moving. The coefficient is an effective value that also stands in for wobble, straw tilt and string sag, which the model does not simulate. It is the one tuned number in the model (see Parameter values).

```latex
F_{fric} = \mu_{eff}\, m g
```

**Moving mass.** Mass is the rubber, straw and tape, plus the air still inside, plus an added-mass term of half the displaced air, which is the standard correction for a sphere accelerating through a fluid.

```latex
m = m_{dry} + \rho V + \tfrac{1}{2}\rho V_{sphere}, \qquad a = \frac{F_{thrust} - F_{drag} - F_{fric}}{m}
```

**Run ends** when the balloon is empty and speed reaches zero, or when the vehicle hits the end of the string. Integrate with a fixed 1 ms physics step (semi-implicit Euler is enough at these speeds), decoupled from the 60 fps draw loop.

The model predicts diminishing returns: each extra pump adds less distance than the one before, because drag grows with speed squared. That curve is a good discussion point once students graph their data.

## Parameter values

With the defaults below, 1 pump travels about 1.7 m and 5 pumps about 6.5 m, which sits inside the 3 m to 8 m string lengths that classroom guides use ([Science World](https://www.scienceworld.ca/resource/balloon-rockets/) uses 3 m; [FLEET](https://archive.fleet.org.au/blog/balloon-rocket/) uses 7 to 8 m). All values live in one `CONFIG` object at the top of the script so a teacher or developer can change them in one place.

| Parameter | Default | Basis |
| --- | --- | --- |
| Air per pump, V\_pump | 0.5 L | Teacher setting. Hand pumps vary a lot: one large double-action pump moves about 3.2 L per full cycle ([Balloons Wiki](https://balloons.fandom.com/wiki/Balloon_Pumps)), while small party pumps move far less. Measure yours (see Open questions). |
| Pumps allowed | 1 to 5 | Your spec |
| Unstretched balloon radius, R0 | 3.5 cm (V0 about 0.18 L) | Estimate for a 12 in latex balloon; measurable with a ruler |
| Peak gauge pressure | 3.3 kPa at stretch 1.42 | Measured peak about 3% above atmospheric at R/R0 about 1.44 ([Vandermarlière 2016](https://physlab.org/wp-content/uploads/2023/01/1.4967901.pdf)) |
| Curve stiffening term, alpha | 0.05 | Puts the peak near 1.42 and adds late stiffening, as in the Mooney-Rivlin curve cited in the same paper |
| Deflation pressure factor | 0.85 | Deflation curve sits below inflation curve (hysteresis), same paper |
| Neck opening diameter | 8 mm | Estimate; measurable |
| Neck discharge coefficient, Cd,n | 0.6 | Standard orifice value ([Engineering ToolBox](https://www.engineeringtoolbox.com/orifice-nozzle-venturi-d_590.html)) |
| Balloon drag coefficient, Cd | 0.5 | Sphere range 0.07 to 0.5, upper end at classroom speeds ([NASA Shape Effects on Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/)) |
| Air density, rho | 1.2 kg/m³ | Room-temperature air at sea level |
| Dry mass (balloon, straw, tape) | 4.5 g | Estimate; weigh on a kitchen scale |
| Effective friction, mu\_eff | 0.8 | Tuned so distances match the classroom range above. Not a measured straw-on-string value. |
| String length | 10 m | Long enough that 5 pumps never hits the end with defaults |
| Physics step | 1 ms | Stable at these speeds |

The model with these defaults produced the run below (Python prototype, same equations the sim will use).

| Pumps | Air in balloon (L) | Balloon diameter (cm) | Distance (m) | Time moving (s) | Air runs out at (s) | Top speed (m/s) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.68 | 10.9 | 1.65 | 0.74 | 0.27 | 4.4 |
| 2 | 1.18 | 13.1 | 3.51 | 1.11 | 0.52 | 6.4 |
| 3 | 1.68 | 14.7 | 4.76 | 1.39 | 0.78 | 6.8 |
| 4 | 2.18 | 16.1 | 5.74 | 1.67 | 1.05 | 6.9 |
| 5 | 2.68 | 17.2 | 6.54 | 1.94 | 1.32 | 7.0 |

Two honest caveats. Peak thrust is the same for every run (about 0.17 N) because every balloon passes back through the pressure peak as it empties; more pumps buy longer thrust, not stronger thrust. And the friction value is fitted, so the absolute distances are a reasonable estimate rather than a prediction for any specific string.

## Interface

The track sits on top, controls and live readouts in the middle, the data table and a small distance-vs-pumps graph at the bottom. On a 1366 x 768 Chromebook, after Chrome's own toolbar, the track, controls and readouts must be visible without scrolling; the table and graph may sit partly below the fold. The mockup shows this layout running.

**Track (SVG).** Two posts with a taut string between them, tick marks every 0.5 m and labels every 1 m from 0 to 10 m. The straw rides on the string with the balloon taped under it, neck pointing back toward the start. A hand pump attaches to the neck during inflation and moves away on release. The whole 10 m track fits the width, so the balloon is drawn 3x larger than true scale, with a small note saying so. Its size still tracks the real volume (radius grows with the cube root of air volume).

**Controls.**

- Pump button with a counter ("Pumps: 3 of 5"). Each press plays a 0.4 s pump stroke and eases the balloon to its new size. The button disables during a stroke and at 5.
- Release button, disabled until at least 1 pump. On release the pump slides away, air puffs stream from the neck while thrust lasts, the balloon shrinks as it empties, and a marker follows the straw.
- Start over button that empties the balloon and returns the vehicle to 0 m.
- Show forces toggle (default off). Draws three arrows on the vehicle during the run: thrust forward, air resistance and friction backward, lengths scaled to force.
- Optional prediction box: "How far will it go? (m)". If filled, it is saved with the trial.

**Live readouts.** Pumps, air in balloon (L), balloon diameter (cm), distance (m), time (s), speed (m/s). Distance updates during the run and freezes at the end with a flag at the stopping point.

**After each run** the trial is added to the table automatically, the graph gets a new point, and a short line appears: "Trial 4: 3 pumps, 4.76 m." Then Start over is the only active button besides the data tools.

**Run states,** in order:

1. Ready: empty balloon at 0 m, pump attached.
2. Inflating: 1 to 5 pumps, Release enabled.
3. Moving: all inputs locked, animation plays in real time.
4. Stopped: result shown and logged, flag at stopping point.
5. Start over returns to Ready.

**Accessibility.** Keyboard: Space pumps, Enter releases, R starts over. Buttons at least 44 px tall. Results are announced through an aria-live region. Colors pass WCAG AA contrast and force arrows are labeled, not color-only. Respect prefers-reduced-motion by skipping the air puffs and easing.

**Teacher settings** (gear icon, not shown to students by default): air per pump, max pumps, string length, trial-to-trial variation on or off (plus or minus 5% on friction and neck flow, so repeated trials differ a little the way real ones do), and units (metric default).

## Data log and CSV export

Every completed run is one row. The Download CSV button saves a file Google Sheets opens with numeric columns ready to graph, and a Copy table button puts the same rows on the clipboard as tab-separated text for pasting straight into a sheet.

| Column header | Example | Notes |
| --- | --- | --- |
| Trial | 4 | Counts up from 1 in this session |
| Pumps | 3 | Independent variable |
| Air added (L) | 1.50 | Pumps x air per pump, 2 decimals |
| Distance (m) | 4.76 | Dependent variable, 2 decimals |
| Time moving (s) | 1.39 | 2 decimals |
| Top speed (m/s) | 6.84 | 2 decimals |
| Prediction (m) | 4 | Blank if not entered |
| Reached end of string | no | yes or no |

Format rules, following [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html): header row first, comma separators, CRLF line endings, any field containing a comma or quote wrapped in double quotes with inner quotes doubled. Units go in the headers, never in the cells, so Sheets reads the cells as numbers. Encode as UTF-8 with no byte-order mark.

```csv
Trial,Pumps,Air added (L),Distance (m),Time moving (s),Top speed (m/s),Prediction (m),Reached end of string
1,1,0.50,1.65,0.74,4.41,,no
2,3,1.50,4.76,1.39,6.84,4,no
3,5,2.50,6.54,1.94,6.97,8,no
```

File name: `balloon-rocket-<name>-YYYY-MM-DD.csv`, where name comes from an optional "Name or group" box above the table (spaces become hyphens, other symbols dropped). Without a name it is `balloon-rocket-data-YYYY-MM-DD.csv`.

Table tools: Delete last trial (no confirm), Clear all (confirm dialog). The log saves to localStorage after every run, wrapped in try/catch, so a refresh or accidental tab close does not lose a class period of data. If storage is blocked, the sim still works and shows a one-line warning to download before closing.

In Sheets the student uses File, Import, Upload, then picks the file and chooses Insert new sheet or Replace spreadsheet ([Rows guide to CSV import](https://rows.com/blog/post/import-csv-google-sheets)). The Copy table route skips the Downloads folder entirely, which tends to be easier on Chromebooks.

## Technical requirements

The deliverable is one `.html` file with all CSS, JavaScript and SVG inline and zero network requests, so it runs from a Chromebook's Downloads folder with Wi-Fi off.

- No CDNs, web fonts, images by URL or analytics. Use the system font stack (Roboto is on ChromeOS). Draw everything as inline SVG.
- Target Chrome on ChromeOS, current and previous major version. No other browser needs testing for v1.
- File size under 150 KB.
- Smooth on a low-end Chromebook (Celeron-class, 4 GB RAM): animate with requestAnimationFrame and SVG transforms only. No CSS blur or SVG filters during the run.
- Compute the whole trajectory the moment Release is pressed (about 2,000 physics steps, a few milliseconds), then play it back in real time. Playback and the logged result can never disagree.
- Works with mouse, touchpad, touchscreen and keyboard. Layout holds from 1024 px to 1920 px wide.
- CSV download through a Blob and an anchor with the download attribute. Copy table through navigator.clipboard with a hidden-textarea fallback.
- localStorage only for the data log and teacher settings, always inside try/catch.
- No console errors or warnings in normal use.
- Teachers should share the file as a download, not as a Google Drive preview link: Drive shows HTML files as source text instead of running them. The student downloads it, then opens it from Files with Chrome.

## Build plan and Claude Code handoff

Build from small source files with a pure, tested physics module, then inline everything into one HTML file with a tiny Node build script. The mockup's `simulate()` function is a working first draft of the physics module.

```
balloon-rocket/
  src/index.html      page shell with placeholders
  src/style.css
  src/physics.js      CONFIG + simulate(pumps, config) -> trajectory, no DOM
  src/csv.js          toCSV(rows), toTSV(rows), fileName(name, date)
  src/app.js          state machine, SVG drawing, playback, table, graph
  test/physics.test.mjs
  test/csv.test.mjs
  build.mjs           inlines src/* into dist/balloon-rocket.html
```

**Milestones**, each ending with its tests passing:

1. Physics module. `simulate()` returns arrays of time, position, speed, volume, thrust, drag and friction, plus summary values.
2. Static scene: track, posts, ruler, straw, balloon, pump, readouts, empty table.
3. Inflation: pump stroke animation, balloon easing to new size, counter and button states.
4. Release: trajectory playback, air puffs, shrinking balloon, stop flag, force arrows toggle.
5. Data: auto-log, graph, CSV download, Copy table, delete last, clear all, localStorage.
6. Teacher settings, Sources dialog, keyboard shortcuts, aria-live, reduced motion.
7. Build to one file, then run the Chromebook checklist below.

**Acceptance tests**

- [ ] With defaults, distances for 1 to 5 pumps match the Parameter values table within 3%.
- [ ] Distance strictly increases with pumps, and each added pump adds less than the one before.
- [ ] With variation off, the same pumps always give the same distance.
- [ ] With variation on, 10 repeats at 3 pumps stay within plus or minus 10% of the no-variation result.
- [ ] A run that reaches the string end stops there and logs "yes".
- [ ] CSV output passes an RFC 4180 check, and a value containing a comma in the name field is quoted.
- [ ] Imported into Google Sheets, columns 2 to 7 are numbers (SUM works without cleanup).
- [ ] Full flow works with keyboard only.
- [ ] Runs with Wi-Fi off from the Downloads folder; DevTools shows zero network requests.
- [ ] dist file under 150 KB; no console errors.
- [ ] Holds 60 fps during a run on a low-end Chromebook, or at least never drops below 30.
- [ ] Sources dialog lists every source in this doc's Sources section.

**Prompt to start Claude Code**

```markdown
Build the balloon rocket car simulator described in the attached spec (SPEC.md) and mockup (mockup.html).
Follow the file layout and milestones in "Build plan". Start with src/physics.js and its tests;
port simulate() from the mockup and make it reproduce the Parameter values table within 3%.
The final output must be one self-contained file, dist/balloon-rocket.html, with no network requests.
Keep every physics constant in CONFIG with a comment citing its source from the Sources section.
Stop after each milestone, run the tests, and summarize what changed.
```

To hand off, export this doc as Markdown (SPEC.md) and download the mockup's HTML, then put both in the project folder.

## Open questions

The biggest unknown is air per pump. Measure it once with the classroom pump and put that number in Teacher settings; everything else can stay at defaults.

**Measuring air per pump (about 10 minutes).** Fill a 2 L bottle with water, turn it upside down in a tub of water, and push the pump's tube up into the neck. Give 5 full strokes, read how much water was pushed out using lines marked on the bottle every 100 mL, and divide by 5. If one stroke empties the bottle, use a bigger container or count a single stroke.

- [ ] Air per pump for your pump (default 0.5 L). Single-action or double-action? The sim counts one push as one pump.\
Use this as the default.
- [ ] Balloon size you use (default 12 in latex). A different size changes R0 and dry mass.\
This size is fine.
- [ ] Should 5 pumps stay the max, or should teachers be able to raise it to 8 or 10?\
Let's raise the max to 6 pumps, with teachers able to raise it to 8.
- [ ] Grade level. NGSS [MS-PS2-2](https://www.nextgenscience.org/sites/default/files/evidence_statement/black_white/MS-PS2-2%20Evidence%20Statements%20June%202015%20asterisks.pdf) (plan an investigation showing that change in motion depends on net force and mass) fits well, with pumps as the one variable changed; for younger grades, hide the force arrows and speed readout.\
This is for middle schoolers; the forces shown are appropriate.
- [ ] Trial-to-trial variation: on or off by default? On teaches repeat trials and averaging; off makes the pattern cleaner.\
Add a slight trial-to-trial variation to mimic real world variations.
- [ ] Metric only, or a feet/inches option?\
Toggle for units between metric & imperial.
- [ ] Keep the prediction box?\
Yes, keep the prediction box.

**Possible version 2 extensions:** balloon shape (round vs long), added cargo mass, string angle, nozzle size (a straw in the neck), and a side-by-side race mode like the one in [NASA JPL's Simple Rocket Science lesson](https://www.jpl.nasa.gov/edu/resources/lesson-plan/simple-rocket-science-continued/).

## Sources

Every equation and constant in this spec traces to one of these pages, except the two estimates flagged in Parameter values (balloon size and dry mass) and the tuned friction value. The simulator's Sources dialog lists the same 15 entries.

| Source | Used for |
| --- | --- |
| [Vandermarlière, J. (2016). On the inflation of a rubber balloon. The Physics Teacher 54, 566](https://physlab.org/wp-content/uploads/2023/01/1.4967901.pdf) | Pressure peak about 3% above atmospheric at R/R0 about 1.44; lower pressure on deflation |
| [Merritt, D. R. and Weinhaus, F. (1978). The pressure curve for a rubber balloon. American Journal of Physics 46, 976](https://eric.ed.gov/?id=EJ193106) | Theory of balloon pressure vs radius |
| [NASA Glenn Research Center. Rocket Thrust Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/) | Thrust from mass flow, exit speed and exit pressure |
| [NASA Glenn Research Center. Drag Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/) | Air resistance formula and reference area |
| [NASA Glenn Research Center. Shape Effects on Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/) | Sphere drag coefficient range, 0.07 to 0.5 |
| [NASA Glenn Research Center. Flight Equations with Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/) | How drag slows a coasting object |
| [Engineering ToolBox. Orifice, Nozzle and Venturi Flow Rate Meters](https://www.engineeringtoolbox.com/orifice-nozzle-venturi-d_590.html) | Flow through an opening; discharge coefficient 0.6 |
| [Balloons Wiki. Balloon Pumps](https://balloons.fandom.com/wiki/Balloon_Pumps) | Air per stroke for hand pumps, about 3.2 L per cycle for one large pump |
| [NASA JPL Education. Simple Rocket Science Continued](https://www.jpl.nasa.gov/edu/resources/lesson-plan/simple-rocket-science-continued/) | Classroom version of breaths vs distance; race-mode idea |
| [Science World. Balloon Rockets](https://www.scienceworld.ca/resource/balloon-rockets/) | 3 m classroom string |
| [FLEET. Balloon rocket home-science experiment](https://archive.fleet.org.au/blog/balloon-rocket/) | 7 to 8 m string; repeat trials |
| [Science Friday. Balloon Rockets](https://www.sciencefriday.com/educational-resources/balloon-rockets/) | Newton's third law explanation for students |
| [NGSS Lead States. MS-PS2-2 evidence statement](https://www.nextgenscience.org/sites/default/files/evidence_statement/black_white/MS-PS2-2%20Evidence%20Statements%20June%202015%20asterisks.pdf) | Standards alignment |
| [Shafranovich, Y. (2005). RFC 4180, Common Format and MIME Type for CSV Files](https://www.rfc-editor.org/rfc/rfc4180.html) | CSV format rules |
| [Rows. How to import CSV files in Google Sheets](https://rows.com/blog/post/import-csv-google-sheets) | Sheets import steps |
