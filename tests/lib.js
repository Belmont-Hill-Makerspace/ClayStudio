// Loads the two engines straight out of index.html, so the tests always run what is deployed.
const fs = require('fs');
exports.load = function (file) {
  const html = fs.readFileSync(file, 'utf8');
  const sc = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const C = new Function(sc.find(s => /var ClayCore\s*=/.test(s)) + '\nreturn ClayCore;')();
  const S = new Function(sc.find(s => /var ClayShapes\s*=/.test(s)) + '\nreturn ClayShapes;')();
  return { C, S, K: 1 / (1 - 0.12) };
};
// the app's default clay settings (student mode)
exports.settings = C => C.settings({ LayerH: 1, LineW: 3, Speed: 25, Mix: 0.85, BaseLayers: 3, MaxStep: 35, Spiral: true, Adaptive: true, SkirtLaps: 2, SkirtGap: 5, FirstSpeed: 15 });
// a preset the way the app builds its spec (see spec() and loadPreset() in index.html)
exports.spec = function (S, key, extra, K) {
  const sp = Object.assign({ length: 60, tip_width: 20, wave_n: 4, wave_d: 12, handle: false, stack: false }, JSON.parse(JSON.stringify(S.PRESETS[key])), extra || {});
  sp.stack = !!sp.stack; sp.stack_lw = sp.handle_lw = 3 / K; sp.handle = !!sp.handle && sp.outline === 'CIRCLE' && !sp.stack;
  return sp;
};
