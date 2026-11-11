// Fuzz test: random student-range designs (patterns, painting, layers, sculpting, cage, oval) through the slicer.
// Fails on any exception, NaN in the G-code, or a move off the 167 mm bed that was not warned about.
//   node tests/fuzz.js index.html 300
const fs = require('fs'), lib = require('./lib');
const { C, S } = lib.load(process.argv[2] || 'index.html');
const G = S.grid, k = 1 / 0.88;
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)], rng = (a, b) => a + rnd() * (b - a);
const set = C.settings({ LayerH: 1, LineW: 3, Speed: 25, Mix: 0.85, BaseLayers: 3, MaxStep: 35, Spiral: true, Adaptive: true, SkirtLaps: 2, SkirtGap: 5, FirstSpeed: 15 });
const stats = { n: 0, ok: 0, fail: {}, err: {}, nan: 0, warn: {}, slow: 0, maxms: 0, bed: 0 };
const N = +process.argv[3] || 150;
for (let it = 0; it < N; it++) {
  const key = pick(Object.keys(S.PRESETS)), sp = JSON.parse(JSON.stringify(S.PRESETS[key]));
  sp.width *= rng(0.85, 1.15); sp.height *= rng(0.85, 1.15); sp.twist = (sp.twist || 0) * rng(0, 1.2);
  if (rnd() < 0.6) { sp.pattern = pick(['NONE', 'RIBS', 'SPIRAL', 'DIAMONDS', 'BUBBLES', 'WEAVE', 'CORAL', 'BANDS', 'SCALLOPS']); sp.depth = rng(0.5, 1.2); sp.repeats = Math.round(rng(4, 20)); sp.pitch = rng(16, 80); }
  if (rnd() < 0.3) { const m = G.make(); G.brush(m, rnd(), rnd(), 0.15, 0.3, 1, 'ADD', 0, 1); sp.pattern_where = 'PAINT'; sp.pattern_mask = G.encode(m); }
  if (rnd() < 0.3) sp.effects = [{ kind: pick(['CORAL', 'WEAVE', 'RIBS']), depth: rng(0.5, 1.2), repeats: Math.round(rng(4, 16)), pitch: rng(16, 40), seed: Math.round(rng(1, 99)), where: 'ALL' }];
  const stack = key === 'STACK'; sp.stack = stack; sp.handle = key === 'MUG';
  if (!stack && rnd() < 0.5) { const g = G.make(); for (let j = 0; j < 4; j++) G.brush(g, rnd(), rnd(), rng(0.04, 0.15), rng(0.1, 0.3), rng(-5, 5), 'ADD', -5, 5); sp.sculpt = G.encode(g, true); }
  if (!stack && rnd() < 0.5) { const NR = Math.round(rng(3, 6)), NP = Math.round(rng(4, 12));
    sp.cage = { rings: NR, points: NP, scale: Array.from({ length: NR * NP }, () => rnd() < 0.3 ? rng(0.8, 1.25) : 1), lift: Array.from({ length: NP }, () => rnd() < 0.3 ? rng(-12, 8) : 0) }; }
  if (rnd() < 0.1 && key !== 'MUG' && !stack) { sp.outline = 'OVAL'; sp.oval = rng(0.5, 1); }
  sp.stack_lw = sp.handle_lw = 3 / k;
  stats.n++;
  const t0 = Date.now();
  try {
    const sh = new S.Shape(sp, 400);
    const tilt = sh.rim_tilt();
    if (!isFinite(tilt)) { stats.nan++; continue; }
    if (tilt > 60) { stats.refused = (stats.refused || 0) + 1; continue; }   // the app refuses these before slicing
    const r = C.generate(sh.clay_slicer(k), 0, sh.H * k, set, { top: sh.clay_top(k), initials: 'AB' });
    const ms = Date.now() - t0; stats.maxms = Math.max(stats.maxms, ms); if (ms > 3000) stats.slow++;
    if (!r.ok) { const m = String(r.info).slice(0, 70); stats.fail[m] = (stats.fail[m] || 0) + 1; continue; }
    stats.ok++;
    const txt = r.gcode.join('\n');
    if (/NaN|Infinity|undefined/.test(txt)) { stats.nan++; if (stats.nan < 3) console.log('NaN in', key, JSON.stringify(sp).slice(0, 300)); }
    let bad = 0; for (const ln of r.gcode) { const m = /^G[01] .*X(-?[\d.]+) Y(-?[\d.]+)/.exec(ln); if (m && (+m[1] < 0 || +m[1] > 167 || +m[2] < 0 || +m[2] > 167)) bad++; const e = / E(-[\d.]+)/.exec(ln); }
    if (bad && !(r.warnings || []).some(w => /OFF THE BED/.test(w))) stats.bed++;
    (r.warnings || []).forEach(w => { const m = w.replace(/[\d.]+/g, '#').slice(0, 60); stats.warn[m] = (stats.warn[m] || 0) + 1; });
  } catch (e) { const m = (e.stack || String(e)).split('\n').slice(0, 2).join(' @ ').slice(0, 160); stats.err[m] = (stats.err[m] || 0) + 1; if (Object.keys(stats.err).length < 4) console.log('ERR', key, m, JSON.stringify(sp).slice(0, 200)); }
}
console.log(JSON.stringify(stats, null, 1));
process.exit(Object.keys(stats.err).length || stats.nan || stats.bed ? 1 : 0);
