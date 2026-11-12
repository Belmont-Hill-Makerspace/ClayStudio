# Clay Studio tests

These read the slicer and shape code straight out of `index.html`, so they always test what is on the site. GitHub runs them on every push (see `.github/workflows/tests.yml`): a green tick on the commit means they passed, a red cross means look before the next class. They never stop the site from updating.

| Command | What it proves |
|---|---|
| `node tests/golden.js index.html` | With the freeform features off, all 11 starting shapes give the same G-code as before (a fingerprint per shape in `golden.json`). |
| `node tests/shapes.js index.html` | The rim sits exactly on its top surface, rim steepness is measured correctly and passed to the slicer, cage rims line up on twisted pieces, sculpting and the cage stay within what was set; every starting shape's base is solid (a clay-thickness map of each base layer: no gaps, no heaps), initials are grooves with a solid layer above, tilted layers are never thicker than the layer setting, and long travels lift clear. |
| `node tests/fuzz.js index.html 300` | 300 random designs mixing every feature: no crashes, no bad numbers, nothing off the 167 mm plate without a warning. |
| `python3 tests/ui_smoke.py index.html` | In a real browser: every shape is ready to print in both modes, sculpting and the cage work, the 3D view doesn't flash, too-steep rims are refused, students' wave dips and tabs are capped, a reload brings the design back, print files get the new names and version line, and Save design / Open design round-trips. |

Running them yourself needs Node 18 or newer, plus Python 3 and Playwright for the browser test (`pip install playwright` then `playwright install chromium`).

If a change is *meant* to alter the G-code, run `node tests/golden.js index.html --update`, then edit the `_note` line at the top of `golden.json` to say what changed and why.

The test that compares this engine with the Grasshopper one is kept privately, because it contains the Grasshopper engine's source.
