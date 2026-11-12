// Shape checks: the geometry fixes of November 2026 stay fixed. Each check prints what it measured.
//   node tests/shapes.js index.html
const lib = require('./lib');
const { C, S, K } = lib.load(process.argv[2] || 'index.html'), G = S.grid;
let fails = 0;
function check(name, ok, got) { console.log((ok ? 'ok    ' : 'FAIL  ') + name + '  (' + got + ')'); if (!ok) fails++; }
const shp = (key, extra, n) => new S.Shape(lib.spec(S, key, extra, K), n || 400);

// 1. rim() lands on the top surface, even for steep waves with twist (it used to be up to 24 mm off)
let worst = 0;
for (const [key, ex] of [['TULIP', {}], ['TULIP', { wave_n: 8, wave_d: 30 }], ['TULIP', { wave_n: 8, wave_d: 30, twist: -180 }], ['ORNAMENT', { rim: 'TABS', twist: 60 }], ['POURING', {}]]) {
  const sh = shp(key, ex);
  for (let i = 0; i < sh.n; i++) { const z = sh.rim(i), p = sh._smooth(i, z); worst = Math.max(worst, Math.abs(z - Math.min(sh.H, sh.top_z(p[0], p[1])))); }
}
check('rim sits on the top surface', worst < 0.01, 'worst ' + worst.toFixed(4) + ' mm');

// 2. measured rim steepness agrees with the formula (dip/2 x waves / radius) on round outlines
{
  const sp = { outline: 'CIRCLE', twist: 0, wave_n: 6, wave_d: 20 }, sh = shp('TULIP', sp), q = sh.point(0, sh.rim(0), false), R = Math.hypot(q[0], q[1]);
  const want = Math.atan(10 * 6 / R) * 180 / Math.PI, got = sh.rim_tilt();
  check('rim tilt matches the formula', Math.abs(got - want) < 1.5, got.toFixed(1) + ' vs ' + want.toFixed(1) + ' deg');
  const top = sh.clay_top(K);
  check('rim tilt is passed to the engine', top && Math.abs(top.tilt - got) < 1e-9, 'tilt ' + (top && top.tilt.toFixed(1)));
  check('flat rims report 0', shp('TUMBLER', {}).rim_tilt() === 0, shp('TUMBLER', {}).rim_tilt());
}

// 3. the default hanger tabs and tulip stay under the 60 degree refusal
check('ornament default tabs under 60', shp('ORNAMENT', { rim: 'TABS' }).rim_tilt() < 60, shp('ORNAMENT', { rim: 'TABS' }).rim_tilt().toFixed(1) + ' deg');
check('tulip default under 60', shp('TULIP', {}).rim_tilt() < 60, shp('TULIP', {}).rim_tilt().toFixed(1) + ' deg');

// 4. cage rim lift lands on its dot on twisted pieces (it used to drift up to 15 degrees)
{
  let off = 0;
  for (const tw of [-180, -90, 0, 90, 180]) {
    const lift = Array(8).fill(0); lift[2] = -12;
    const sh = shp('VASE', { twist: tw, pattern: 'NONE', cage: { rings: 4, points: 8, scale: Array(32).fill(1), lift } }, 720);
    let best = -1, bi = 0; for (let i = 0; i < sh.n; i++) { const d = sh.Hb - sh.rim(i); if (d > best) { best = d; bi = i; } }
    let o = Math.abs(bi - sh.n / 4); o = Math.min(o, sh.n - o); off = Math.max(off, o / sh.n * 360);
  }
  check('cage rim dip lands on its dot', off <= 1, 'worst ' + off.toFixed(2) + ' deg');
}

// 5. sculpting and the cage never go past what was actually set
{
  const g = G.make(); G.brush(g, 0.25, 0.5, 0.03, 0.08, 9, 'ADD', -5, 5); G.brush(g, 0.31, 0.5, 0.03, 0.08, -9, 'ADD', -5, 5);
  const a = shp('TUMBLER', { pattern: 'NONE', sculpt: G.encode(g, true) }), b = shp('TUMBLER', { pattern: 'NONE' });
  let lo = 0, hi = 0;
  for (let i = 0; i < 400; i++) for (let z = 20; z < 75; z += 0.5) { const p = a.point(i, z, false), q = b.point(i, z, false); const d = Math.hypot(p[0], p[1]) - Math.hypot(q[0], q[1]); lo = Math.min(lo, d); hi = Math.max(hi, d); }
  check('sculpting stays within the brushed range', lo >= -5.0001 && hi <= 5.0001, lo.toFixed(3) + ' / ' + hi.toFixed(3) + ' mm');
  const NP = 8, sc = []; for (let r = 0; r < 4; r++) for (let p = 0; p < NP; p++) sc.push(r === 2 ? (p % 2 ? 0.8 : 1.25) : 1);
  const c = shp('TUMBLER', { pattern: 'NONE', cage: { rings: 4, points: NP, scale: sc, lift: [8, -12, 8, -12, 8, -12, 8, -12] } });
  let mn = 9, mx = 0; for (let i = 0; i < 400; i++) { const v = c._cage_scale(i, 2 / 3); mn = Math.min(mn, v); mx = Math.max(mx, v); }
  const L = c._liftI; check('cage stays within its dots', mn >= 0.8 - 1e-9 && mx <= 1.25 + 1e-9 && Math.min(...L) >= -12 - 1e-9 && Math.max(...L) <= 8 + 1e-9,
    'scale ' + mn.toFixed(3) + '-' + mx.toFixed(3) + ', lift ' + Math.min(...L).toFixed(1) + '/' + Math.max(...L).toFixed(1));
}

// ---- G-code readers for checks 7-10 ----
function moves(gcode) {          // print and travel moves with layer, section, start and end
  const out = []; let x = 0, y = 0, z = 0, e = 0, layer = -1, typ = '';
  for (const l of gcode) {
    if (l.startsWith(';LAYER:')) { layer = +l.slice(7); continue; }
    if (l.startsWith(';TYPE:')) { typ = l.slice(6).trim(); continue; }
    if (l.startsWith('G92')) { const m = /E(-?[\d.]+)/.exec(l); if (m) e = +m[1]; continue; }
    if (!l.startsWith('G0') && !l.startsWith('G1')) continue;
    const g = k => { const m = new RegExp(k + '(-?[\\d.]+)').exec(l.split(';')[0]); return m ? +m[1] : null; };
    const nx = g('X') ?? x, ny = g('Y') ?? y, nz = g('Z') ?? z, ne = g('E') ?? e;
    out.push({ layer, typ, x0: x, y0: y, z0: z, x: nx, y: ny, z: nz, de: ne - e, g0: l.startsWith('G0') });
    x = nx; y = ny; z = nz; e = ne;
  }
  return out;
}
// Clay thickness map of one base layer: each move's clay spread over the 3 mm line width (0.25 mm grid).
function baseMap(mv, layer, ePerMm, w = 3.0, H = 1.0, g = 0.25) {
  const S = [];
  for (const m of mv) {
    if (m.layer !== layer || m.typ !== 'PIECE' || m.de <= 0) continue;
    const d = Math.hypot(m.x - m.x0, m.y - m.y0); if (d < 1e-6) continue;
    const n = Math.max(1, Math.floor(d / g)), v = w * H * (m.de / d) / ePerMm;
    for (let k = 0; k < n; k++) S.push([m.x0 + (m.x - m.x0) * (k + 0.5) / n, m.y0 + (m.y - m.y0) * (k + 0.5) / n, v * d / n]);
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [a, b] of S) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  x0 -= 4; y0 -= 4; const W = Math.ceil((x1 + 4 - x0) / g) + 1, Hh = Math.ceil((y1 + 4 - y0) / g) + 1;
  const T = new Float32Array(W * Hh), r = w / 2, R = Math.ceil(r / g) + 1, area = Math.PI * r * r;
  for (const [sx, sy, v] of S) {
    const ci = Math.floor((sx - x0) / g), cj = Math.floor((sy - y0) / g);
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if ((i * g) ** 2 + (j * g) ** 2 <= r * r) T[(cj + j) * W + ci + i] += v / area;
  }
  // inside = everything not reachable from the edge through empty cells; gaps = inside cells with almost no clay
  const out = new Uint8Array(W * Hh), st = [0]; out[0] = 1;
  while (st.length) { const c = st.pop(), i = c % W, j = (c - i) / W;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= W || jj >= Hh) continue;
      const q = jj * W + ii; if (!out[q] && T[q] <= 0.3) { out[q] = 1; st.push(q); } } }
  const gap = new Uint8Array(W * Hh); let thick = 0, over25 = 0;
  for (let q = 0; q < W * Hh; q++) if (!out[q]) { if (T[q] < 0.5) gap[q] = 1; if (T[q] > 0.3) { thick = Math.max(thick, T[q]); if (T[q] > 2.5) over25++; } }
  const seen = new Uint8Array(W * Hh); let total = 0, largest = 0;
  for (let q = 0; q < W * Hh; q++) if (gap[q] && !seen[q]) {
    let cnt = 0; const s2 = [q]; seen[q] = 1;
    while (s2.length) { const c = s2.pop(), i = c % W, j = (c - i) / W; cnt++;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= W || jj >= Hh) continue;
        const p = jj * W + ii; if (gap[p] && !seen[p]) { seen[p] = 1; s2.push(p); } } }
    total += cnt; largest = Math.max(largest, cnt);
  }
  return { thick, over25: over25 * g * g, gaps: total * g * g, largest: largest * g * g };
}
const ePerMm = 1.2473;          // E per mm of path at 1 mm layers and a 3 mm line (the engine's own figure)
function sliced(key, extra, opts) {
  const sh = shp(key, extra), r = C.generate(sh.clay_slicer(K), 0, sh.H * K, lib.settings(C), Object.assign({ top: sh.clay_top(K) }, opts || {}));
  return { r, mv: moves(r.gcode) };
}

// 7. bases hold together: every layer of every starting shape's base is solid, with no heaps (2.5 left holes of
//    120-960 mm2 and heaps up to 4 mm thick on the pouring cup)
{
  let worst = { gap: 0, total: 0, over: 0, where: '' }, bad = [];
  for (const key of Object.keys(S.PRESETS)) {
    const { mv } = sliced(key, {});
    for (let L = 0; L < 3; L++) {
      const b = baseMap(mv, L, ePerMm);
      if (b.largest > worst.gap) worst = Object.assign(worst, { gap: b.largest, where: key + ' layer ' + (L + 1) });
      worst.total = Math.max(worst.total, b.gaps); worst.over = Math.max(worst.over, b.over25);
      if (b.largest > 15 || b.gaps > 70 || b.over25 > 10) bad.push(key + ' layer ' + (L + 1));
    }
  }
  check('every base is solid, without gaps or heaps', bad.length === 0,
    'largest gap ' + worst.gap.toFixed(0) + ' mm2 (' + worst.where + '), most gaps in a layer ' + worst.total.toFixed(0) +
    ' mm2, most clay over 2.5 mm ' + worst.over.toFixed(0) + ' mm2' + (bad.length ? '; failing: ' + bad.join(', ') : ''));
}

// 8. initials: grooves, not a window, and one more solid layer above them
{
  const { r, mv } = sliced('ESPRESSO', {}, { initials: 'AZ' }), plain = sliced('ESPRESSO', {});
  const solid = res => +((/\((\d+) solid/.exec(String(res.info)) || [0, 0])[1]);     // "Layers: N (k solid concentric base)"
  const nb = solid(r) - solid(plain.r);
  const b1 = baseMap(mv, 0, ePerMm), b2 = baseMap(mv, 1, ePerMm);
  check('initials are grooves with a solid layer above', nb === 1 && b1.gaps < 400 && b2.largest <= 15,
    'extra layers ' + nb + ', grooves ' + b1.gaps.toFixed(0) + ' mm2 in layer 1 (2.5 cut a ~650 mm2 window), layer 2 largest gap ' + b2.largest.toFixed(0) + ' mm2');
}

// 9. tilted (non-planar) layers are never thicker than the layer setting
{
  let worst = 0;
  for (const key of ['TULIP', 'POURING']) {
    const info = String(sliced(key, {}).r.info), m = /NON-PLANAR TOP: \d+ wall layers, ([\d.]+)-([\d.]+) mm thick/.exec(info);
    if (m) worst = Math.max(worst, +m[2]);
  }
  check('tilted layers no thicker than the layer setting', worst > 0 && worst <= 1.0 + 1e-9, 'thickest ' + worst.toFixed(2) + ' mm at 1 mm layers (2.5 went to 1.25)');
}

// 10. long travels lift clear of the clay
{
  const { mv } = sliced('POURING', { width: 76, length: 87 }, { initials: 'MZ' });
  let low = 0, n = 0;
  for (const m of mv) if (m.g0 && m.typ === 'PIECE' && m.layer >= 1 && Math.hypot(m.x - m.x0, m.y - m.y0) > 20) { n++; if (m.z - m.layer < 3 - 1e-6) low++; }
  check('long travels lift at least 3 mm', n > 0 && low === 0, n + ' long travels, ' + low + ' lower than 3 mm above the layer');
}

// 6. everything still slices
{
  const set = lib.settings(C); let bad = 0;
  for (const key of Object.keys(S.PRESETS)) { const sh = shp(key, {}); const r = C.generate(sh.clay_slicer(K), 0, sh.H * K, set, { top: sh.clay_top(K) }); if (!r.ok) bad++; }
  check('every starting shape slices', bad === 0, bad + ' failed');
}
console.log(fails ? fails + ' check(s) failed' : 'all shape checks passed');
process.exit(fails ? 1 : 0);
