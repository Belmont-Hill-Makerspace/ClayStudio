// Golden test: with the freeform features off, every preset's G-code must not change.
//   node tests/golden.js index.html            compare against tests/golden.json
//   node tests/golden.js index.html --update   rewrite golden.json (only after a deliberate, explained engine change)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), lib = require('./lib');
const { C, S, K } = lib.load(process.argv[2] || 'index.html'), file = path.join(__dirname, 'golden.json');
const now = {};
for (const key of Object.keys(S.PRESETS)) {
  const sh = new S.Shape(lib.spec(S, key, {}, K), 400);
  const r = C.generate(sh.clay_slicer(K), 0, sh.H * K, lib.settings(C), { top: sh.clay_top(K), initials: 'AB', note: 'N', source: 'Clay Studio ' + key });
  now[key] = { sha256: crypto.createHash('sha256').update(r.ok ? r.gcode.join('\n') : 'FAIL ' + r.info).digest('hex'), lines: r.ok ? r.gcode.length : 0, ml: r.ok ? Math.round(r.clay_ml) : 0 };
}
if (process.argv.includes('--update')) {        // keeps the note: say why the G-code changed
  let note; try { note = JSON.parse(fs.readFileSync(file, 'utf8'))._note; } catch (e) { }
  fs.writeFileSync(file, JSON.stringify(Object.assign(note ? { _note: note } : {}, now), null, 1)); console.log('golden.json updated: edit its _note to say why'); process.exit(0);
}
const gold = JSON.parse(fs.readFileSync(file, 'utf8')); delete gold._note; let bad = 0;
for (const k of new Set([...Object.keys(gold), ...Object.keys(now)])) {
  const ok = gold[k] && now[k] && gold[k].sha256 === now[k].sha256; if (!ok) bad++;
  console.log((ok ? 'same  ' : 'DIFF  ') + k + (ok ? '' : '  was ' + JSON.stringify(gold[k]) + ' now ' + JSON.stringify(now[k])));
}
process.exit(bad ? 1 : 0);
