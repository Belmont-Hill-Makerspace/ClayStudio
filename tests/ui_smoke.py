"""Browser smoke test (needs: pip install playwright && playwright install chromium).
    python3 tests/ui_smoke.py index.html
Loads the page, visits every starting shape in student and teacher mode, runs a sculpt stroke, turns the cage on,
checks the 3D view does not resize after a stroke (the cause of the old "flash"), that a too-steep rim is refused
even in advanced settings, that a student's wave slider stops short of that, and that a reload brings the design back.
Fails on any page error.
"""
import sys, os
from playwright.sync_api import sync_playwright
import re
page = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
url = 'file://' + page
code = re.search(r"TEACHER_CODE\s*=\s*'([^']*)'", open(page, encoding='utf-8').read()).group(1)   # read from the page, not written here
errs, fails = [], []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('dialog', lambda d: d.accept(code))
    pg.goto(url); pg.wait_for_timeout(1500)
    presets = pg.eval_on_selector_all('[data-preset]', 'els => els.map(e => e.dataset.preset)')
    for mode in ('student', 'teacher'):
        if mode == 'teacher': pg.click('#advToggle'); pg.wait_for_timeout(600)
        for k in presets:
            pg.click('[data-preset=%s]' % k); pg.wait_for_timeout(1300)
            head = pg.inner_text('#status').split('\n')[0]
            if 'Ready' not in head: fails.append('%s %s: %s' % (mode, k, head))
    pg.click('#advToggle'); pg.wait_for_timeout(400)     # back to student mode
    pg.click('[data-preset=TUMBLER]'); pg.wait_for_timeout(800)
    pg.click('summary:has-text("Freeform shaping")'); pg.click('#sculptBtn'); pg.wait_for_timeout(800)
    pg.evaluate("""() => { window._rs = -1; const v = document.getElementById('view'); new ResizeObserver(() => window._rs++).observe(v); }""")
    box = pg.locator('#view canvas').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] * 0.45
    pg.mouse.move(cx - 60, cy); pg.mouse.down()
    for i in range(12): pg.mouse.move(cx - 60 + 6 * i, cy); pg.wait_for_timeout(20)
    pg.mouse.up(); pg.wait_for_timeout(2000)
    if 'Nothing sculpted' in pg.inner_text('#sculptInfo'): fails.append('sculpt stroke had no effect')
    if pg.evaluate('window._rs') > 0: fails.append('3D view resized %d time(s) after a stroke' % pg.evaluate('window._rs'))
    pg.click('#bbDone'); pg.wait_for_timeout(400)
    pg.locator('#cageOn').scroll_into_view_if_needed(); pg.check('#cageOn'); pg.wait_for_timeout(1000)
    if not pg.locator('#brushbar').is_visible(): fails.append('cage edit panel did not open')
    pg.click('#bbDone'); pg.wait_for_timeout(400)
    def setn(k, v):
        pg.evaluate("([k, v]) => { const e = document.getElementById('in_' + k); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }", [k, v])
        pg.wait_for_timeout(1300)
    # students: the dip slider stops short of a refused rim on a narrow tulip
    pg.click('[data-preset=TULIP]'); pg.wait_for_timeout(900)
    setn('width', 70); setn('wave_n', 6); setn('wave_d', 20); pg.wait_for_timeout(1200)
    if int(float(pg.input_value('#in_wave_d'))) >= 20: fails.append('student wave dip was not capped on a narrow tulip')
    if 'Ready' not in pg.inner_text('#status').split('\n')[0]: fails.append('capped student tulip is not ready: ' + pg.inner_text('#status')[:80])
    # autosave: a reload brings the same design back
    pg.reload(); pg.wait_for_timeout(2500)
    if pg.evaluate("() => document.querySelector('.chip[aria-pressed=true]').dataset.preset") != 'TULIP' or int(float(pg.input_value('#in_width'))) != 70:
        fails.append('reload did not bring the design back')
    # students: hanger tabs stop at the 45 degree student limit, and the piece stays printable
    pg.click('[data-preset=ORNAMENT]'); pg.wait_for_timeout(900)
    pg.evaluate("() => document.querySelector('#rim button[data-v=TABS]').click()"); pg.wait_for_timeout(1500)
    setn('tab_h', 10); pg.wait_for_timeout(1500)
    if int(float(pg.input_value('#in_tab_h'))) > 4: fails.append('student hanger tabs were not capped (got %s mm)' % pg.input_value('#in_tab_h'))
    if 'Ready' not in pg.inner_text('#status').split('\n')[0]: fails.append('capped student ornament is not ready: ' + pg.inner_text('#status')[:80])
    pg.click('[data-preset=TULIP]'); pg.wait_for_timeout(900)
    # file names, the version stamp, and saving / opening a design
    with pg.expect_download() as d: pg.evaluate("() => document.getElementById('dlG').click()")
    name = d.value.suggested_filename; head = open(d.value.path(), encoding='utf-8').read(3000)
    if not re.match(r'^[a-z_]+(_[A-Z]{1,3})?_\d{4}-\d{4}_\d+min\.gcode$', name): fails.append('unexpected print file name: ' + name)
    if '; made with: Clay Studio ' not in head: fails.append('print file has no version line')
    with pg.expect_download() as d: pg.evaluate("() => document.getElementById('saveDesign').click()")
    dpath = d.value.path(); pg.click('[data-preset=ESPRESSO]'); pg.wait_for_timeout(800)
    pg.set_input_files('#openFile', str(dpath)); pg.wait_for_timeout(1500)
    if pg.evaluate("() => document.querySelector('.chip[aria-pressed=true]').dataset.preset") != 'TULIP': fails.append('Open design did not bring the design back')
    pg.click('[data-preset=TULIP]'); pg.wait_for_timeout(900)
    # teachers: a rim steeper than 60 degrees is refused
    pg.click('#advToggle'); pg.wait_for_timeout(600)
    setn('wave_n', 8); setn('wave_d', 30); pg.wait_for_timeout(2500)
    if 'Not printable' not in pg.inner_text('#status') or not pg.is_disabled('#dlG'): fails.append('steep rim was not refused in advanced settings')
    b.close()
for f in fails: print('FAIL', f)
for e in errs: print('PAGE ERROR', e)
print('ui smoke:', 'ok' if not fails and not errs else 'FAILED')
sys.exit(1 if fails or errs else 0)
