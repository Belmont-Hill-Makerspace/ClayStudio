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

// 6. everything still slices
{
  const set = lib.settings(C); let bad = 0;
  for (const key of Object.keys(S.PRESETS)) { const sh = shp(key, {}); const r = C.generate(sh.clay_slicer(K), 0, sh.H * K, set, { top: sh.clay_top(K) }); if (!r.ok) bad++; }
  check('every starting shape slices', bad === 0, bad + ' failed');
}
console.log(fails ? fails + ' check(s) failed' : 'all shape checks passed');
process.exit(fails ? 1 : 0);
