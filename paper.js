/* The paper the homepage and the three job pages press their pictures out of.
 *
 * Each picture is a height map drawn in 2D — shapes raised out of the sheet, ink where a bar or a
 * line is printed — then lit in WebGL, so its edges catch the light the way embossed card does.
 * The words sit on top as ordinary HTML, so they stay sharp and selectable, and still read on a
 * device without WebGL, where the shapes become plain white cards instead.
 *
 * A page mounts a sheet with RosterPaper.mount(root, config), or marks an element
 * data-paper="<preset>" for one of the still pictures defined here. Only sheets on screen are
 * drawn, and a sheet that has stopped moving is not redrawn at all. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const back = t => { const c1 = .8, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- what gets pressed out: shapes in the paper, words printed on them ----------
   Coordinates are fractions of the press area. z is how far the shape rises, d when it starts (0–1). */
const R = (x, y, w, h, z, d, o = {}) => ({ t: 'r', x, y, w, h, z, d, r: .01, ink: 0, ...o });
const Ln = (pts, z, d, o = {}) => ({ t: 'l', pts, z, d, ink: 1, lw: .008, ...o });
const Lb = (x, y, w, h, d, html, cls = '') => ({ t: 'b', x, y, w, h, d, html, cls });
// faint embossed gridlines across a chart panel
const grid = (x0, x1, ys, d) => ys.map(y => Ln([[x0, y], [x1, y]], .035, d, { ink: 0, lw: .0016 }));

function setup() {
  const e = [R(.01, .01, .98, .98, .1, 0, { r: .014 })];
  e.push(Lb(.05, .045, .6, .08, .08, '<span><b>Bloom &amp; Co.</b> · Spring sale</span>', 'title'));
  e.push(R(.76, .058, .19, .055, .16, .12, { r: .03 }), Lb(.76, .058, .19, .055, .12, 'Ready · paused', 'pill'));
  [['Daily budget', '$50 · 30 days'], ['Audience', 'Women 25–44, Austin'], ['Goal', 'Online orders']].forEach(([k, v], i) => {
    const x = .05 + i * .3033, d = .16 + i * .08;
    e.push(R(x, .16, .29, .16, .18, d), Lb(x, .16, .29, .16, d, `<span class="k">${k}</span><span class="v">${v}</span>`, 'kpi sm'));
  });
  e.push(Lb(.05, .335, .9, .05, .3, 'Ads · 3 drafted', 'cap'));
  [['Spring blooms, 20% off', 'Fresh bouquets delivered across Austin today.'],
   ['Same-day flowers in Austin', 'Order by 2pm. Hand-tied by local florists.'],
   ["Brighten someone's week", 'Seasonal bouquets from $39. Free delivery.']].forEach(([h, s], i) => {
    const y = .39 + i * .195, d = .42 + i * .13;
    e.push(R(.05, y, .9, .165, .15, d), R(.05, y, .006, .165, .2, d, { ink: 1, r: .002 }));
    e.push(Lb(.05, y, .9, .165, d, `<span class="n">Ad ${i + 1}</span><span class="h">${h}</span><span class="s">${s}</span>`, 'ad'));
  });
  return e;
}

function track() {
  const e = [R(.01, .01, .98, .98, .1, 0, { r: .014 })];
  e.push(Lb(.05, .045, .6, .08, .08, '<span><b>Spring sale</b> · day 18 of 30</span>', 'title'));
  e.push(R(.79, .058, .16, .055, .16, .12, { r: .03 }), Lb(.79, .058, .16, .055, .12, 'On pace', 'pill good'));
  // budget pacing: $882 spent of $1,500; $900 planned by today
  e.push(Lb(.05, .145, .9, .05, .14, 'Budget pacing', 'cap'));
  e.push(R(.05, .2, .9, .03, .08, .14, { r: .015 }));
  e.push(R(.05, .2, .9 * .588, .03, .16, .22, { ink: 1, r: .015 }));
  e.push(R(.05 + .9 * .6 - .0015, .188, .003, .054, .2, .3, { r: .001 }));
  e.push(Lb(.05, .24, .9, .05, .26, '<span><b>$882</b> spent · $900 planned by today · $1,500 budget</span>', 'meta'));
  // daily spend against the $50 plan, days 9–18
  e.push(R(.05, .32, .43, .63, .1, .32), Lb(.05, .32, .43, .08, .32, 'Daily spend vs plan', 'cap'));
  const ys = v => .86 - v / 70 * .4, xs = i => .09 + i * (.35 / 9);
  e.push(...grid(.08, .46, [ys(0), ys(25), ys(50)], .36));
  e.push(Ln([[xs(0), ys(50)], [xs(9), ys(50)]], .1, .4, { ink: 0, lw: .003, dash: .01 }));
  e.push(Lb(.36, ys(50) - .055, .1, .04, .45, '$50 plan', 'axis right'));
  e.push(Ln([46, 52, 49, 55, 48, 51, 44, 53, 50, 47].map((v, i) => [xs(i), ys(v)]), .14, .46, { lw: .005 }));
  e.push(Lb(.06, .875, .1, .04, .5, 'Day 9', 'axis'), Lb(.37, .875, .1, .04, .5, 'Day 18', 'axis right'));
  [['Ad 1 · Spring blooms', '3.2%', 'Healthy', ''], ['Ad 2 · Same-day flowers', '2.7%', 'Healthy', ''], ["Ad 3 · Brighten someone's week", '0.4%', 'Pause suggested', 'bad']].forEach(([h, ctr, st, c], i) => {
    const y = .32 + i * .215, d = .44 + i * .14;
    e.push(R(.51, y, .44, .19, c ? .22 : .14, d));
    e.push(Lb(.51, y, .44, .19, d, `<span class="h">${h}</span><span class="s">CTR ${ctr}</span><span class="st ${c}">${st}</span>`, 'row'));
  });
  return e;
}

function report() {
  const e = [R(.01, .01, .98, .98, .1, 0, { r: .014 })];
  e.push(Lb(.05, .045, .6, .08, .08, '<span><b>Bloom &amp; Co.</b> · October report</span>', 'title'));
  e.push(Lb(.6, .045, .35, .08, .08, 'Oct 1–31 · vs Sep', 'meta right'));
  [['Spend', '$12,480', '+8%', ''], ['Orders', '312', '+15%', 'up'], ['Cost per order', '$40.00', '−6%', 'up'], ['Return on ad spend', '4.1×', '+0.3', 'up']].forEach(([k, v, dl, c], i) => {
    const x = .05 + i * .2275, d = .12 + i * .08;
    e.push(R(x, .15, .21, .2, .18, d));
    e.push(Lb(x, .15, .21, .2, d, `<span class="k">${k}</span><span class="v">${v}</span><span class="dl ${c}">${dl} vs Sep</span>`, 'kpi'));
  });
  e.push(R(.05, .4, .44, .55, .1, .34), Lb(.05, .4, .44, .08, .34, 'Orders by week', 'cap'));
  const by = v => .88 - v / 80 * .34;
  e.push(...grid(.08, .46, [by(0), by(40), by(80)], .38));
  [52, 61, 70, 58, 71].forEach((v, i) => {
    const x = .1 + i * .074, d = .44 + i * .06;
    e.push(R(x, by(v), .044, .88 - by(v), .16, d, { ink: 1, r: .003 }));
    e.push(Lb(x - .015, by(v) - .045, .074, .04, d, String(v), 'val'));
    e.push(Lb(x - .015, .89, .074, .04, d, `W${i + 1}`, 'axis center'));
  });
  e.push(R(.51, .4, .44, .55, .1, .38), Lb(.51, .4, .44, .08, .38, 'Cost per order, weekly', 'cap'));
  const cy = v => .88 - (v - 30) / 20 * .34, cx = i => .56 + i * .085;
  e.push(...grid(.54, .92, [cy(30), cy(40), cy(50)], .42));
  e.push(Ln([44, 41, 38, 42, 37].map((v, i) => [cx(i), cy(v)]), .14, .52, { lw: .005 }));
  [44, 41, 38, 42, 37].forEach((v, i) => e.push(Lb(cx(i) - .035, .89, .07, .04, .52, `W${i + 1}`, 'axis center')));
  e.push(Lb(cx(0) - .035, cy(44) - .06, .07, .04, .6, '$44', 'val'), Lb(cx(4) - .035, cy(37) - .06, .07, .04, .7, '$37', 'val strong'));
  return e;
}

// small, calm versions for the tiles on the homepage
function miniCreate() {
  const e = [R(.02, .03, .96, .94, .1, 0, { r: .03 })];
  e.push(Lb(.07, .07, .86, .12, .05, '<span><b>Spring sale</b> · 3 ads</span>', 'title'));
  ['Spring blooms, 20% off', 'Same-day flowers in Austin', "Brighten someone's week"].forEach((h, i) => {
    const y = .25 + i * .235, d = .2 + i * .26;
    e.push(R(.07, y, .86, .19, .15, d, { r: .02 }), R(.07, y, .012, .19, .2, d, { ink: 1, r: .004 }));
    e.push(Lb(.07, y, .86, .19, d, `<span class="h">${h}</span>`, 'ad'));
  });
  return e;
}
function miniTrack() {
  const e = [R(.02, .03, .96, .94, .1, 0, { r: .03 })];
  e.push(Lb(.07, .07, .86, .12, .05, '<span><b>Spring sale</b> · on pace</span>', 'title'));
  e.push(R(.07, .25, .86, .05, .08, .15, { r: .025 }), R(.07, .25, .86 * .588, .05, .16, .25, { ink: 1, r: .025 }));
  e.push(Lb(.07, .31, .86, .07, .3, '$882 of $1,500', 'meta'));
  const ys = v => .88 - v / 70 * .42, xs = i => .1 + i * (.8 / 9);
  e.push(...grid(.07, .93, [ys(0), ys(35), ys(70)], .35));
  e.push(Ln([46, 52, 49, 55, 48, 51, 44, 53, 50, 47].map((v, i) => [xs(i), ys(v)]), .14, .45, { lw: .01 }));
  return e;
}
function miniReport() {
  const e = [R(.02, .03, .96, .94, .1, 0, { r: .03 })];
  e.push(Lb(.07, .07, .86, .12, .05, '<span><b>October report</b></span>', 'title'));
  [['Spend', '$12,480'], ['Orders', '312'], ['ROAS', '4.1×']].forEach(([k, v], i) => {
    const x = .07 + i * .293, d = .15 + i * .1;
    e.push(R(x, .22, .27, .22, .18, d), Lb(x, .22, .27, .22, d, `<span class="k">${k}</span><span class="v">${v}</span>`, 'kpi'));
  });
  const by = v => .9 - v / 80 * .36;
  [52, 61, 70, 58, 71].forEach((v, i) => e.push(R(.1 + i * .17, by(v), .1, .9 - by(v), .16, .45 + i * .08, { ink: 1, r: .006 })));
  return e;
}

const S = (k, d, o = -1) => ({ k, d, o });
// a still picture is drawn once, fully risen: opened on purpose, it shows the finished result
const STILL = [S('rise', 1, 0), S('hold', 1, 0)];
const PRESETS = {
  create: { outs: [setup] },
  track: { outs: [track] },
  report: { outs: [report] },
  'mini-create': { outs: [miniCreate], spread: .6 },
  'mini-track': { outs: [miniTrack], spread: .6 },
  'mini-report': { outs: [miniReport], spread: .6 },
};
for (const p of Object.values(PRESETS)) Object.assign(p, { steps: STILL, still: true });

/* ---------- the paper: a height map drawn in 2D, lit in WebGL ---------- */
const VS = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uH; uniform vec2 uTx; uniform vec2 uCss;
uniform vec3 uLo; uniform vec3 uMid; uniform vec3 uHi; uniform vec3 uInk;
float raw(vec2 uv){ return texture2D(uH, uv).r * 2.0 - 1.0; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
// fine paper: an even, faint tooth with the odd longer fibre
float paper(vec2 p){ return noise(p * 1.2) * .5 + noise(p * .4) * .35 + noise(p * vec2(.05, .8)) * .15; }
void main(){
  vec2 uv = vUv; vec2 px = uv * uCss;
  vec2 ox = vec2(uTx.x, 0.), oy = vec2(0., uTx.y);
  float h = raw(uv);
  // a one-texel difference keeps the pressed edges crisp
  vec3 n = vec3(-(raw(uv + ox) - raw(uv - ox)) * 2.6, -(raw(uv + oy) - raw(uv - oy)) * 2.6, 1.);
  float p0 = paper(px);
  n.x -= (paper(px + vec2(.5, 0.)) - p0) * .05;
  n.y -= (paper(px + vec2(0., .5)) - p0) * .05;
  n = normalize(n);
  vec3 L = normalize(vec3(-.5, .7, .8));
  float diff = clamp(dot(n, L), 0., 1.);
  float f0 = L.z;
  vec3 col = diff < f0 ? mix(uLo, uMid, diff / f0) : mix(uMid, uHi, (diff - f0) / (1. - f0));
  col *= 1. + (p0 - .5) * .025;
  float occ = 0.;
  vec2 dir = normalize(L.xy) * uTx * 2.;
  for (int i = 1; i <= 8; i++) { float fi = float(i); occ = max(occ, raw(uv + dir * fi) - h - fi * .018); }
  col *= 1. - clamp(occ * 1.3, 0., .16);
  float ink = texture2D(uH, uv).g;
  col = mix(col, uInk * (.9 + .15 * diff), ink * .95);
  vec2 v = uv - .5; col *= 1. - dot(v, v) * .16;
  gl_FragColor = vec4(col, 1.);
}`;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

function initGL(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const u = n => gl.getUniformLocation(pr, n);
  gl.uniform3fv(u('uLo'), rgb('#98a2af')); gl.uniform3fv(u('uMid'), rgb('#eef0f3'));
  gl.uniform3fv(u('uHi'), rgb('#ffffff')); gl.uniform3fv(u('uInk'), rgb('#1a73e8'));
  return { gl, uTx: u('uTx'), uCss: u('uCss') };
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else c.rect(x, y, w, h);
  c.fill();
}
function progress(e, ph, sp) {
  if (!ph) return 0;
  if (ph.k === 'rise') return clamp((ph.p - e.d * sp) / (1 - sp));
  if (ph.k === 'hold') return 1;
  if (ph.k === 'sink') return 1 - clamp((ph.p - (1 - e.d) * .25) / .6);
  return 0;
}
function level(e, ph, sp) {
  if (!ph) return 0;
  if (ph.k === 'rise') return back(clamp((ph.p - e.d * sp) / (1 - sp)));
  if (ph.k === 'sink') return 1 - ease(clamp((ph.p - (1 - e.d) * .25) / .6));
  return ph.k === 'hold' ? 1 : 0;
}

// one sheet of paper: a canvas, the area things rise from, and the timeline that drives them
class Press {
  constructor(root, cfg) {
    this.root = root; this.cfg = cfg; this.spread = cfg.spread ?? .45;
    this.press = $('.press', root);
    this.outs = cfg.outs.map(f => {
      const o = f(), layer = document.createElement('div');
      layer.className = 'out';
      layer.setAttribute('aria-hidden', 'true');
      for (const e of o) if (e.t === 'b') {
        const n = document.createElement('div'); n.className = 'lab ' + e.cls; n.innerHTML = e.html;
        Object.assign(n.style, { left: e.x * 100 + '%', top: e.y * 100 + '%', width: e.w * 100 + '%', height: e.h * 100 + '%' });
        e.node = n; layer.appendChild(n);
      }
      this.press.appendChild(layer);
      return o;
    });
    this.total = cfg.steps.reduce((a, s) => a + s.d, 0);
    let acc = 0, fixed = 0;
    cfg.steps.forEach(s => { if (s.k === 'hold') fixed = acc + s.d / 2; acc += s.d; });
    this.fixedT = cfg.once ? this.total : fixed;
    this.canvas = $('canvas.gl', root);
    this.h = document.createElement('canvas'); this.hc = this.h.getContext('2d');
    try { this.g = initGL(this.canvas); } catch (err) { console.warn(err); this.g = null; }
    if (!this.g) root.classList.add('nogl', 'inked');
    this.lines = []; this.t0 = cfg.once ? null : performance.now();
    this.resize();
  }
  restart(delay = 0) { this.t0 = performance.now() + delay * 1000; this.sig = ''; }
  resize() {
    const sr = this.root.getBoundingClientRect(), pr = this.press.getBoundingClientRect();
    if (!sr.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.cw = sr.width; this.ch = sr.height;
    this.sig = ''; this.clean = '';
    this.canvas.width = Math.max(2, sr.width * dpr | 0); this.canvas.height = Math.max(2, sr.height * dpr | 0);
    // the height map runs at one texel per CSS pixel so pressed edges stay sharp
    this.h.width = Math.max(2, sr.width | 0); this.h.height = Math.max(2, sr.height | 0);
    this.P = { x: pr.left - sr.left, y: pr.top - sr.top, w: pr.width, h: pr.height };
  }
  // an element's box on this sheet, for pressing it into the paper
  boxOf(el, r) {
    const sr = this.root.getBoundingClientRect(), b = el.getBoundingClientRect();
    return { x: b.left - sr.left, y: b.top - sr.top, w: b.width, h: b.height, r };
  }
  // press a real page into the paper, one piece at a time in reading order, the way the report gets built:
  // each element marked data-z rises where it sits on screen, and its words (and anything marked data-print)
  // fade in as it lands. Anything inside the scrolling area is cut off at its edges.
  pressLive(c, st) {
    const live = this.cfg.live, sp = this.spread;
    const ph = st.k === 'rise' || st.k === 'hold' ? st : null;
    if (!ph) return;
    const sr = this.root.getBoundingClientRect(), lr = live.getBoundingClientRect();
    const scEl = $('.scroll', live), sc = scEl.getBoundingClientRect();
    const tone = (h, ink, lv) => `rgb(${Math.min(250, 128 + h * 120) | 0},${ink * clamp(lv) * 255 | 0},0)`;
    const baseH = .1 * level({ d: 0 }, ph, sp);
    c.fillStyle = tone(baseH, 0, 1);
    rr(c, lr.left - sr.left, lr.top - sr.top, lr.width, lr.height, 14);
    // what can be seen right now builds in turn; whatever is scrolled out of view is simply there at the end
    const all = [...live.querySelectorAll('[data-z], [data-print]')];
    const seen = all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width && !(scEl.contains(el) && (r.bottom < sc.top || r.top > sc.bottom));
    });
    const step = seen.length > 1 ? 1 / (seen.length - 1) : 0;
    all.forEach(el => {
      const i = seen.indexOf(el), d = i < 0 ? 1 : .04 + i * step * .96;
      const svg = el instanceof SVGElement;
      if (!svg) {
        const op = ph.k === 'hold' ? 1 : clamp((progress({ d }, ph, sp) - .72) / .28);
        if (el._op !== op) { el._op = op; el.style.opacity = op === 1 ? '' : op; }
      }
      if (i < 0) return;
      const isOn = el.matches('.live-side .on');
      if (!el.dataset.z && !isOn) return;
      const lv = level({ d }, ph, sp);
      if (lv <= .002) return;
      const r = el.getBoundingClientRect(), inScroll = scEl.contains(el);
      const z = isOn ? .18 : +el.dataset.z, ink = +(el.dataset.ink || 0);
      c.save();
      if (inScroll) { c.beginPath(); c.rect(sc.left - sr.left, sc.top - sr.top, sc.width, sc.height); c.clip(); }
      if (el.tagName.toLowerCase() === 'polyline') {
        const m = el.getScreenCTM();
        c.strokeStyle = tone(baseH + (z - .1) * lv, ink, lv); c.lineWidth = 2.6 * m.a; c.lineCap = c.lineJoin = 'round';
        c.beginPath();
        [...el.points].forEach((p, k) => { const q = new DOMPoint(p.x, p.y).matrixTransform(m); c[k ? 'lineTo' : 'moveTo'](q.x - sr.left, q.y - sr.top); });
        c.stroke();
      } else {
        el._r ??= parseFloat(getComputedStyle(el).borderRadius) || (+el.getAttribute('rx') || 3) * (r.width / (+el.getAttribute('width') || r.width));
        c.fillStyle = tone(baseH + (z - .1) * lv, ink, lv);
        rr(c, r.left - sr.left, r.top - sr.top, r.width, r.height, el._r);
      }
      c.restore();
    });
  }
  at(t) {
    if (t == null) return { k: 'idle', p: 0, o: -1 };
    if (t < 0) return { k: 'rest', p: 0, o: -1 };
    if (this.cfg.once && t >= this.total) return { k: 'hold', p: 1, o: this.outs.length - 1 };
    let tt = t % this.total;
    for (const s of this.cfg.steps) { if (tt < s.d) return { k: s.k, p: tt / s.d, o: s.o }; tt -= s.d; }
    return { k: 'rest', p: 1, o: -1 };
  }
  frame(now) {
    if (!this.P) return;
    const st = this.at(this.t0 == null ? null : RM || this.cfg.still ? this.fixedT : (now - this.t0) / 1000);
    // between movements the paper is still: skip the redraw and leave the last frame on screen
    const moving = st.k === 'rise' || st.k === 'sink' || st.k === 'absorb';
    // a live page under the paper also changes when it scrolls or its menu moves
    const live = this.cfg.live ? '|' + Math.round($('.scroll', this.cfg.live).scrollTop) + ($('.live-side .on', this.cfg.live)?.dataset.sec || '') : '';
    const sig = st.k + st.o + (moving ? st.p.toFixed(4) : '') + live;
    if (sig === this.sig) return;
    this.sig = sig;
    const c = this.hc, P = this.P, W = this.h.width, H = this.h.height, sp = this.spread;
    // only the press and anything pressed in by hand ever change, so only those get cleared
    c.fillStyle = 'rgb(128,0,0)';
    if (this.clean !== W + 'x' + H) { c.fillRect(0, 0, W, H); this.clean = W + 'x' + H; }
    c.fillRect(P.x - 4, P.y - 4, P.w + 8, P.h + 8);
    for (const l of this.lines) c.fillRect(l.x - 2, l.y - 2, l.w + 4, l.h + 4);
    if (st.k === 'absorb') {
      // whatever was on the paper presses into it, then the paper swallows it
      const p = st.p, deb = p < .4 ? ease(p / .4) : 1 - ease((p - .4) / .6);
      c.fillStyle = `rgb(${128 - deb * 80 | 0},0,0)`;
      for (const l of this.lines) rr(c, l.x, l.y, l.w, l.h, l.r ?? l.h / 2);
    }
    this.outs.forEach((o, oi) => {
      const ph = st.o === oi ? st : null;
      // everything sits on the sheet (the first shape), so each piece rises from the sheet's height
      const base = o[0], baseH = base.z * level(base, ph, sp);
      for (const e of o) {
        if (e.t === 'b') {
          const op = clamp((progress(e, ph, sp) - .72) / .28);
          if (e.op !== op) { e.op = op; e.node.style.opacity = op; e.node.style.transform = op < 1 ? `translateY(${(1 - op) * 6}px)` : ''; }
          continue;
        }
        const lv = level(e, ph, sp);
        if (lv <= .002) continue;
        const z = e === base ? baseH : baseH + (e.z - base.z) * lv;
        const col = `rgb(${Math.min(250, 128 + z * 120) | 0},${e.ink * clamp(lv) * 255 | 0},0)`;
        if (e.t === 'r') { c.fillStyle = col; rr(c, P.x + e.x * P.w, P.y + e.y * P.h, e.w * P.w, e.h * P.h, e.r * P.w); }
        else {
          c.strokeStyle = col; c.lineWidth = e.lw * P.w; c.lineCap = c.lineJoin = 'round';
          c.setLineDash(e.dash ? [e.dash * P.w, e.dash * 1.3 * P.w] : []);
          c.beginPath(); e.pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](P.x + x * P.w, P.y + y * P.h)); c.stroke();
          c.setLineDash([]);
        }
      }
    });
    if (this.cfg.live) this.pressLive(c, st);
    if (!this.g) return;
    const { gl, uTx, uCss } = this.g;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.h);
    gl.uniform2f(uTx, 1 / W, 1 / H); gl.uniform2f(uCss, this.cw, this.ch);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // the first lit frame is when the sheet fades in, so nobody sees blank paper being inked
    if (!this.inked) { this.inked = true; this.root.classList.add('inked'); }
  }
}

/* ---------- which sheets get drawn ---------- */
const sheets = new Set(), shown = new Set();
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const e of entries) { const p = e.target._paper; if (p) e.isIntersecting ? shown.add(p) : shown.delete(p); }
}, { rootMargin: '160px 0px' }) : null;
// a sheet only needs measuring again when its own size changes, not on every window resize: on a
// phone the address bar coming and going would otherwise redraw everything mid-scroll
const ro = 'ResizeObserver' in window ? new ResizeObserver(entries => {
  for (const e of entries) e.target._paper?.resize();
}) : null;
let running = false;
function loop(now) {
  for (const p of shown) p.frame(now);
  requestAnimationFrame(loop);
}
function mount(root, cfg) {
  const p = new Press(root, cfg);
  root._paper = p; sheets.add(p);
  if (io) io.observe(root); else shown.add(p);
  if (ro) ro.observe(root);
  else addEventListener('resize', () => p.resize());
  if (!running) { running = true; requestAnimationFrame(loop); }
  return p;
}
// the words settle into their final shapes once the fonts arrive, so measure everything again then
document.fonts?.ready.then(() => sheets.forEach(p => p.resize()));
document.querySelectorAll('[data-paper]').forEach(el => { if (PRESETS[el.dataset.paper]) mount(el, PRESETS[el.dataset.paper]); });

window.RosterPaper = { mount, S };
})();
