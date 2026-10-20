# Balloon rocket car simulator

Students pump air into a balloon taped to a straw, release it, and measure how far it rides along a string. Built for middle school (NGSS MS-PS2-2) on Chromebooks.

**The simulator is one file: `dist/balloon-rocket.html`** (about 64 KB). It works offline, needs no install, and makes no network requests.

**Try it online:** https://mrvanloo.github.io/balloon-rocket-car/ (needs internet; the downloaded file works offline).

## Share it with students

1. Share `dist/balloon-rocket.html` as a **download** (Google Classroom attachment, Drive "Download", or a USB stick).
   Do not share a Google Drive preview link: Drive shows HTML files as source text instead of running them.
2. Students download it, open the **Files** app, and double-click the file. It opens in Chrome.
3. Their trials save in that browser automatically. They can use **Download CSV** or **Copy table** to move data into Google Sheets.
   - CSV: in Sheets, File > Import > Upload, pick the file, then Insert new sheet.
   - Copy table: click cell A1 in a sheet and paste.

## Teacher settings

Click the gear in the top right corner:

| Setting | Default | Range |
| --- | --- | --- |
| Air per pump | 0.5 L | 0.05 to 5 L |
| Most pumps allowed | 6 | 1 to 8 |
| String length | 10 m | 3 to 20 m |
| Small differences between repeat trials | On (about ±5%) | On or off |

Settings are remembered in that browser. To measure your own pump's air per stroke, see "Measuring air per pump" in `SPEC.md`.

Students can switch between metric and imperial units (ft, ft/s, in, fl oz) with the toggle next to the readouts. Keyboard: Space pumps, Enter releases, R starts over.

## For developers

No dependencies; needs Node 18 or newer.

```bash
node --test "test/*.test.mjs"
```

```bash
node build.mjs
```

- `src/` holds the page (`index.html`, `style.css`) and scripts. `src/index.html` also runs directly in Chrome while developing.
- `build.mjs` inlines `src/` into `dist/balloon-rocket.html` and fails if the file is over 150 KB or anything external is still linked.
- `CLAUDE.md` lists the project decisions and where each part of the code lives. `SPEC.md` is the full spec and the source of every physics constant.
- `index.html` and `.nojekyll` at the root are only for GitHub Pages; `index.html` redirects to `dist/balloon-rocket.html`.
- `reference/` holds the original mockup and physics draft, kept for reference only.

## Acceptance tests

From `SPEC.md` "Build plan". Automated tests are in `test/` (82 tests).

| Test | Status |
| --- | --- |
| Defaults match the expected distances within 3% (1 to 8 pumps) | Automated: `physics.test.mjs` |
| Distance increases with pumps, with diminishing returns | Automated: `physics.test.mjs` (gains shrink from the 2nd pump on; see note below) |
| Variation off: same pumps, same distance | Automated: `physics.test.mjs` |
| Variation on: repeats within ±10% | Automated: `physics.test.mjs` (10 runs and 2,000 runs) |
| Run reaching the string end stops there and logs "yes" | Automated: `physics.test.mjs`, `csv.test.mjs`; checked in browser |
| CSV passes RFC 4180; a name with a comma is quoted | Automated: `csv.test.mjs` (strict parser) |
| Columns 2 to 7 are numbers in Google Sheets | Automated check of the cells; **Chromebook check 5 below** |
| Full flow works with keyboard only | Checked in browser; **Chromebook check 4** |
| Runs with Wi-Fi off from Downloads; zero network requests | Automated: `build.test.mjs`; zero requests seen in browser; **Chromebook check 1** |
| dist under 150 KB; no console errors | Automated: `build.test.mjs` (64 KB); no console messages in browser |
| 60 fps on a low-end Chromebook (never below 30) | 60 fps on a Mac, 0.3 ms of script per frame; **Chromebook check 3** |
| Sources dialog lists every source in SPEC.md | Automated: `settings.test.mjs` |
| Colors pass WCAG AA contrast (light and dark) | Automated: `contrast.test.mjs` |

Note: the 1st pump adds less distance (1.65 m) than the 2nd (1.86 m), because a lightly filled balloon spends its short burst low on the pressure curve. Every pump after the 2nd adds less than the one before.

## Chromebook checklist

These need a real Chromebook (ideally an older, low-end one) and take about 10 minutes.

1. **Offline from Downloads.** Download the file, turn Wi-Fi off, open it from Files. The page loads and every button works.
2. **Saving.** Run 2 trials, close the tab, reopen the file. The trials and the name box are still there. Switch to Imperial, reload, and it stays Imperial.
3. **Smoothness.** Turn on Show forces and run 6 pumps. Motion should look smooth with no stutter. Optional: press Ctrl+Shift+I, open the Performance panel, record a run, and confirm frames stay near 60 fps (never below 30).
4. **Keyboard only.** Without touching the touchpad: Space three times, Enter, wait for the result, then R. Tab through the page; the focus ring is always visible.
5. **Google Sheets.** Download the CSV, import it into Sheets, and type `=SUM(D2:D10)` under the Distance column. It should add up with no cleanup. Try Copy table too.
6. **Screen reader (optional).** Turn on ChromeVox (Ctrl+Alt+Z), pump and release. It reads each pump and the result.
7. **Width.** Use Ctrl+Minus and Ctrl+Plus to try a narrow and a wide window. Nothing overlaps or scrolls sideways.
