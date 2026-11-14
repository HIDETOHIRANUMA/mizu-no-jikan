// この水は、いつの雨だろう。 / When did this water fall as rain?
// Canvas 2D + Web Audio. Everything runs in the browser; nothing is sent anywhere.
import { makeGlass, makeRain, yearInfo } from './model.js';
import { T } from './text.js';
import { Sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const cv = $('cv');
const ctx = cv.getContext('2d');
const lineEl = $('line');
const pickEl = $('pick');
const rainBtn = $('rain');
const endEl = $('end');

const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');           // exhibition: never waits for a touch
const dateParam = params.get('date');      // yyyy-mm-dd, for checking another day
const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(dateParam + 'T12:00:00') : new Date();

let lang = 'ja';
const t = (k, ...a) => { const v = T[lang][k]; return typeof v === 'function' ? v(...a) : v; };

const glass = makeGlass(today);
const rain = makeRain(today);
const Ynow = Math.floor(glass.now);
const snd = new Sound();
const FONT = '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';

// ---------------------------------------------------------------- helpers
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);

function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}
// position along a Catmull-Rom spline through points [[x,y],...] at u in 0..1
function spline(pts, u) {
  const n = pts.length - 1;
  const f = clamp(u, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const v = f - i;
  const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(n, i + 2)];
  return [catmull(a[0], b[0], c[0], d[0], v), catmull(a[1], b[1], c[1], d[1], v)];
}

// ---------------------------------------------------------------- colour of a drop by its age
const STOPS = [[0, [236, 252, 255]], [6, [176, 238, 250]], [15, [98, 206, 238]], [28, [70, 150, 236]], [45, [104, 116, 228]], [62, [146, 108, 214]], [80, [182, 116, 196]]];
function ageColor(a) {
  for (let i = 1; i < STOPS.length; i++) {
    if (a <= STOPS[i][0]) {
      const [a0, c0] = STOPS[i - 1], [a1, c1] = STOPS[i];
      const u = (a - a0) / (a1 - a0);
      return c0.map((v, k) => Math.round(lerp(v, c1[k], u)));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

// ---------------------------------------------------------------- layout
let W = 0, H = 0, DPR = 1;
const L = {};
const sprites = [];
let groundCv = null;
const GY = new Float32Array(513);

function smooth(pts, per) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < per; k++) out.push(spline(pts, (i + k / per) / (pts.length - 1)));
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function gy(x) {
  const f = clamp(x / W, 0, 1) * 512;
  const i = Math.min(511, Math.floor(f));
  return lerp(GY[i], GY[i + 1], f - i);
}

function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(320, window.innerWidth);
  H = Math.max(320, window.innerHeight);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  const P = H > W * 1.1;
  L.P = P;
  L.axisY = H * (P ? 0.13 : 0.125);
  L.ax0 = W * (P ? 0.07 : 0.07);
  L.ax1 = W * (P ? 0.93 : 0.93);
  L.curtain = H * (P ? 0.15 : 0.2);
  const pts = P
    ? [[0, .47], [.1, .41], [.2, .345], [.31, .42], [.46, .49], [.6, .535], [.78, .555], [1, .56]]
    : [[0, .53], [.09, .465], [.165, .39], [.245, .465], [.35, .53], [.48, .59], [.6, .625], [.72, .642], [1, .652]];
  const g = smooth(pts.map(([x, y]) => [x * W, y * H]), 24);
  let j = 0;
  for (let i = 0; i <= 512; i++) {
    const x = (i / 512) * W;
    while (j < g.length - 2 && g[j + 1][0] < x) j++;
    const [x0, y0] = g[j], [x1, y1] = g[j + 1];
    GY[i] = lerp(y0, y1, clamp((x - x0) / Math.max(1e-6, x1 - x0), 0, 1));
  }
  L.peakX = pts[2][0] * W;
  L.bottom = H * (P ? 0.78 : 0.88);
  L.springX = W * (P ? 0.6 : 0.69);
  L.springY = gy(L.springX);
  L.glassH = P ? Math.min(H * 0.12, W * 0.3) : H * 0.17;
  L.glassW = L.glassH * 0.7;
  L.glassX = W * (P ? 0.81 : 0.815);
  L.glassB = gy(L.glassX) - 1;
  L.glassT = L.glassB - L.glassH;
  L.yearX = W * (P ? 0.66 : 0.8);
  L.yearY = P ? H * 0.37 : H * 0.42;
  L.small = clamp(Math.min(W, H) / 62, 10, 13);
  // drop size so that the fullest column fits under the axis
  const cols = 80, colW = (L.ax1 - L.ax0) / cols;
  const maxC = Math.max(glass.modeCount, rain.modeCount);
  let r = 3.4;
  for (; r > 0.9; r -= 0.05) {
    const per = Math.max(1, Math.floor(colW / (2.15 * r)));
    if (Math.ceil(maxC / per) * 2.15 * r <= L.curtain) break;
  }
  L.r = r;
  L.per = Math.max(1, Math.floor(colW / (2.15 * r)));
  L.dy = 2.15 * r;
  L.rGlass = clamp(L.glassW / 60, 0.8, 1.9);
  buildSprites();
  buildGround();
}

function buildSprites() {
  sprites.length = 0;
  for (let k = 0; k <= 40; k++) {
    const [r, g, b] = ageColor(k * 2);
    const R = Math.ceil(L.r * 3.2 * DPR) + 1;
    const c = document.createElement('canvas');
    c.width = c.height = R * 2;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(R, R, 0, R, R, R);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.24, `rgba(${r},${g},${b},0.92)`);
    gr.addColorStop(0.36, `rgba(${r},${g},${b},0.28)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, R * 2, R * 2);
    sprites.push(c);
  }
}
const spriteFor = (age) => sprites[clamp(Math.round(age / 2), 0, 40)];
function dot(x, y, age, size = 1, alpha = 1) {
  const s = spriteFor(age);
  const R = L.r * 3.2 * size;
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - R, y - R, R * 2, R * 2);
}

function buildGround() {
  groundCv = document.createElement('canvas');
  const GX = W * 0.4;   // extra width on each side
  groundCv.width = Math.round((W + GX * 2) * DPR);
  groundCv.height = Math.round(H * DPR);
  const g = groundCv.getContext('2d');
  g.scale(DPR, DPR);
  g.translate(GX, 0);
  // underground body
  g.beginPath();
  g.moveTo(-GX, gy(0));
  for (let i = 0; i <= 128; i++) g.lineTo((i / 128) * W, gy((i / 128) * W));
  g.lineTo(W + GX, gy(W)); g.lineTo(W + GX, H); g.lineTo(-GX, H); g.closePath();
  const fill = g.createLinearGradient(0, H * 0.35, 0, H);
  fill.addColorStop(0, 'rgba(22,28,38,1)');
  fill.addColorStop(0.55, 'rgba(12,16,23,1)');
  fill.addColorStop(1, 'rgba(6,8,12,1)');
  g.fillStyle = fill;
  g.fill();
  // strata, roughly parallel to the surface
  const rr = mulberry(7);
  for (let k = 1; k <= 7; k++) {
    const depth = Math.pow(k / 7, 1.35) * (L.bottom - H * 0.45) * 1.1;
    g.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = -GX + (i / 200) * (W + GX * 2);
      const y = gy(x) * (1 - k * 0.06) + (H * 0.6) * (k * 0.06) + depth * 0.55 + Math.sin(x / W * 9 + k * 1.7) * H * 0.006;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokeStyle = `rgba(160,180,210,${0.075 - k * 0.006})`;
    g.lineWidth = 1;
    g.stroke();
  }
  // granite grains
  const n = Math.round((W + GX * 2) * H / 420);
  for (let i = 0; i < n; i++) {
    const x = -GX + rr() * (W + GX * 2);
    const top = gy(x) + 4;
    const y = top + Math.pow(rr(), 0.8) * (H - top);
    const under = x < L.springX ? 1 : 0.45;
    const a = (0.04 + rr() * 0.12) * under * (1 - clamp((y - L.bottom) / (H - L.bottom), 0, 1));
    g.fillStyle = rr() < 0.18 ? `rgba(230,205,180,${a})` : `rgba(205,215,232,${a})`;
    const s = rr() < 0.08 ? 1.6 : 0.8;
    g.fillRect(x, y, s, s);
  }
  // ridge line
  g.beginPath();
  g.moveTo(-GX, gy(0));
  for (let i = 0; i <= 256; i++) { const x = (i / 256) * W; g.lineTo(x, gy(x)); }
  g.lineTo(W + GX, gy(W));
  g.strokeStyle = 'rgba(214,226,242,0.55)';
  g.lineWidth = 1.1;
  g.stroke();
  // fade the cross-section out at the bottom, where the words appear
  const fade = g.createLinearGradient(0, L.bottom - H * 0.06, 0, H);
  fade.addColorStop(0, 'rgba(5,7,11,0)');
  fade.addColorStop(1, 'rgba(5,7,11,1)');
  g.fillStyle = fade;
  g.fillRect(-GX, L.bottom - H * 0.06, W + GX * 2, H);
  L.GX = GX;
}
function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- the year axis
const dom = { d0: Ynow - 79, d1: Ynow + 1 };      // past view; the future view is Ynow .. Ynow+80
const xOf = (y) => L.ax0 + ((y - dom.d0) / (dom.d1 - dom.d0)) * (L.ax1 - L.ax0);
const colW = () => (L.ax1 - L.ax0) / (dom.d1 - dom.d0);
function slotPos(year, slot) {
  const x = xOf(year) + ((slot % L.per) + 0.5) * (colW() / L.per);
  const y = L.axisY + 7 + (Math.floor(slot / L.per) + 0.5) * L.dy;
  return [x, y];
}
function yearAt(x) { return Math.floor(dom.d0 + ((x - L.ax0) / (L.ax1 - L.ax0)) * (dom.d1 - dom.d0)); }

// ---------------------------------------------------------------- state
let simT = 0;
const timers = [];
const wait = (s) => new Promise((res) => timers.push({ t: simT + s, res }));
let tapRes = null;
const waitTap = (s) => new Promise((res) => {
  const tm = { t: simT + s, res: () => { tapRes = null; res(false); } };
  timers.push(tm);
  tapRes = (v) => { const i = timers.indexOf(tm); if (i >= 0) timers.splice(i, 1); tapRes = null; res(v || true); };
});

const S = {
  scene: 'start',
  cam: { s: 1, x: 0, y: 0 },
  camFrom: null, camTo: null, camT0: 0, camDur: 1,
  axisA: 0, labelsA: 0, groundA: 0, glassA: 0,
  t2: -1, launched: 0,
  pickYear: null, pickA: 0,
  t4: -1, domT0: -1,
  ripples: [],
  counter: null, counterA: 0,
  futureA: 0,
};
for (const d of glass.drops) { d.state = 0; d.tl = 0; d.path = null; }
for (const d of rain.drops) { d.state = -1; }

function camGlass() {
  const s = clamp((H * 0.5) / L.glassH, 1.6, 2.6);
  return { s, x: L.glassX - L.glassW * 0.05, y: (L.glassT + L.glassB) / 2 - L.glassH * 0.06 };
}
const camHome = () => ({ s: 1, x: W / 2, y: H / 2 });
function moveCam(to, dur) { S.camFrom = { ...S.cam }; S.camTo = to; S.camT0 = simT; S.camDur = dur; }

// ---------------------------------------------------------------- the glass
function glassGeom(fill) {
  const { glassX: x, glassB: b, glassH: h, glassW: w } = L;
  const inner = h * 0.86;
  const yb = b - h * 0.06;
  const ys = yb - inner * fill;
  const half = (y) => lerp(w * 0.39, w * 0.5, (b - y) / h) - 2.2;
  return { x, b, h, w, yb, ys, half, inner };
}
function glassFill() {
  let n = 0;
  for (const d of glass.drops) if (d.state === 0) n++;
  return n / glass.drops.length;
}
function glassPos(d, fill) {
  const G = glassGeom(fill);
  const y = G.yb - 2 - d.jy * (G.inner * fill - 4);
  const x = G.x + (d.jx * 2 - 1) * G.half(y) * 0.92;
  return [x + Math.sin(simT * 0.6 + d.ph) * 1.1, y + Math.cos(simT * 0.45 + d.ph * 1.7) * 0.9];
}
function drawGlass(alpha, fill) {
  if (alpha <= 0) return;
  const G = glassGeom(fill);
  const lw = 1.15 / S.cam.s;
  ctx.save();
  ctx.globalAlpha = alpha;
  // water
  if (fill > 0.002) {
    ctx.beginPath();
    ctx.moveTo(G.x - G.half(G.ys), G.ys);
    ctx.lineTo(G.x + G.half(G.ys), G.ys);
    ctx.lineTo(G.x + G.half(G.yb), G.yb);
    ctx.lineTo(G.x - G.half(G.yb), G.yb);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, G.ys, 0, G.yb);
    wg.addColorStop(0, 'rgba(140,200,235,0.16)');
    wg.addColorStop(1, 'rgba(70,130,190,0.10)');
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(G.x, G.ys, G.half(G.ys), G.w * 0.05, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,232,250,0.45)';
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  // glass
  ctx.strokeStyle = 'rgba(226,238,252,0.62)';
  ctx.lineWidth = lw;
  const top = G.b - G.h;
  ctx.beginPath();
  ctx.moveTo(G.x - G.w * 0.5, top); ctx.lineTo(G.x - G.w * 0.39, G.b);
  ctx.moveTo(G.x + G.w * 0.5, top); ctx.lineTo(G.x + G.w * 0.39, G.b);
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(G.x, top, G.w * 0.5, G.w * 0.06, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(G.x, G.b, G.w * 0.39, G.w * 0.05, 0, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(G.x, G.yb, G.w * 0.37, G.w * 0.045, 0, 0, Math.PI); ctx.globalAlpha = alpha * 0.5; ctx.stroke();
  // a highlight on the glass
  ctx.globalAlpha = alpha * 0.25;
  ctx.beginPath(); ctx.moveTo(G.x - G.w * 0.4, top + G.h * 0.12); ctx.lineTo(G.x - G.w * 0.33, G.b - G.h * 0.14);
  ctx.lineWidth = lw * 2.4; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- paths
function entryX(age, j) {
  const u = Math.pow(clamp(age / 70, 0, 1), 0.8);
  const x = lerp(W * (L.P ? 0.5 : 0.5), W * 0.05, u) + (j - 0.5) * W * 0.08;
  return clamp(x, W * 0.02, L.springX - W * 0.06);
}
function deepPoint(xe, age, j) {
  const u = clamp(age / 70, 0, 1);
  const x = lerp(xe, L.springX, 0.45 + (j - 0.5) * 0.2);
  const top = Math.max(gy(x), gy(xe));
  return [x, top + (0.2 + 0.72 * Math.pow(u, 0.85)) * (L.bottom - top) * 0.92];
}
function pathBack(d) {          // glass -> spring -> deep -> surface -> sky -> its year
  const g = glassPos(d, glassFill());
  const xe = entryX(d.age, d.jx);
  const [xd, yd] = deepPoint(xe, d.age, d.jy);
  const ye = gy(xe);
  const [fx, fy] = slotPos(d.year, d.slot);
  return [g, [L.glassX - L.glassW * 0.55, L.glassB - L.glassH * 0.15], [L.springX, L.springY + 3], [lerp(L.springX, xd, 0.5), lerp(L.springY, yd, 0.75)], [xd, yd], [lerp(xd, xe, 0.6), lerp(yd, ye, 0.55)], [xe, ye + 2], [lerp(xe, fx, 0.35), lerp(ye, fy, 0.45) - H * 0.03], [fx, fy]];
}

// ---------------------------------------------------------------- drawing
function drawAxis(alpha, labelAlpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(220,230,245,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L.ax0, L.axisY); ctx.lineTo(L.ax1, L.axisY); ctx.stroke();
  ctx.font = `400 ${L.small}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const y0 = Math.ceil(dom.d0), y1 = Math.floor(dom.d1);
  for (let y = y0; y <= y1; y++) {
    const x = xOf(y);
    if (x < L.ax0 - 0.5 || x > L.ax1 + 0.5) continue;
    const big = y % 10 === 0;
    ctx.globalAlpha = alpha * (big ? 0.8 : 0.3);
    ctx.beginPath(); ctx.moveTo(x, L.axisY); ctx.lineTo(x, L.axisY - (big ? 6 : 3)); ctx.stroke();
    if (big && labelAlpha > 0) {
      ctx.globalAlpha = alpha * labelAlpha * 0.75;
      ctx.fillStyle = 'rgba(226,234,246,1)';
      ctx.fillText(String(y), x, L.axisY - 10);
    }
  }
  // "now"
  const xn = L.ax0 + ((glass.now - dom.d0) / (dom.d1 - dom.d0)) * (L.ax1 - L.ax0);
  if (xn >= L.ax0 - 1 && xn <= L.ax1 + 1) {
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = 'rgba(232,212,160,0.9)';
    ctx.beginPath(); ctx.moveTo(xn, L.axisY - 12); ctx.lineTo(xn, L.axisY + 4); ctx.stroke();
    if (labelAlpha > 0) {
      ctx.globalAlpha = alpha * labelAlpha;
      ctx.fillStyle = 'rgba(232,212,160,1)';
      ctx.fillText(t('nowLabel'), xn, L.axisY - 24 - L.small * 0.2);
    }
  }
  ctx.restore();
}

function drawLabels(a) {
  if (a <= 0) return;
  ctx.save();
  ctx.font = `400 ${L.small}px ${FONT}`;
  ctx.fillStyle = 'rgba(214,224,240,1)';
  const lb = T[lang].labels;
  ctx.globalAlpha = a * 0.5;
  ctx.textAlign = 'center';
  ctx.fillText(lb.mountain, L.peakX, gy(L.peakX) - L.small * 1.2);
  ctx.globalAlpha = a * 0.4;
  ctx.textAlign = 'left';
  const gx = W * (L.P ? 0.12 : 0.2);
  ctx.fillText(lb.granite, gx, gy(gx) + (L.bottom - gy(gx)) * 0.5);
  ctx.textAlign = 'center';
  ctx.fillText(lb.spring, L.springX, L.springY + L.small * 2.1);
  // axis title, at the end away from "now"
  const f = S.futureA;
  ctx.globalAlpha = a * 0.55 * (1 - f);
  ctx.textAlign = 'left';
  if (f < 1) ctx.fillText(lb.past, L.ax0, L.axisY - L.small * 2.4);
  ctx.globalAlpha = a * 0.55 * f;
  ctx.textAlign = 'right';
  if (f > 0) ctx.fillText(lb.future, L.ax1, L.axisY - L.small * 2.4);
  ctx.restore();
}

function drawCounter() {
  if (S.counterA <= 0.01 || S.counter == null) return;
  ctx.save();
  ctx.globalAlpha = S.counterA;
  const fs = Math.min(H * 0.085, W * 0.085);
  ctx.font = `400 ${fs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(236,240,248,0.92)';
  const unit = t('yearUnit');
  const num = String(S.counter);
  if (unit) {
    const wNum = ctx.measureText(num).width;
    ctx.font = `400 ${fs * 0.38}px ${FONT}`;
    const wU = ctx.measureText(unit).width;
    const x0 = L.yearX - (wNum + wU + fs * 0.08) / 2;
    ctx.textAlign = 'left';
    ctx.font = `400 ${fs}px ${FONT}`;
    ctx.fillText(num, x0, L.yearY);
    ctx.font = `400 ${fs * 0.38}px ${FONT}`;
    ctx.fillText(unit, x0 + wNum + fs * 0.08, L.yearY);
  } else {
    ctx.fillText(num, L.yearX, L.yearY);
  }
  ctx.restore();
}

function drawPick() {
  if (S.pickA <= 0.01 || S.pickYear == null) return;
  const x0 = xOf(S.pickYear), x1 = xOf(S.pickYear + 1);
  ctx.save();
  ctx.globalAlpha = S.pickA;
  const hg = ctx.createLinearGradient(0, L.axisY, 0, L.axisY + L.curtain + 8);
  hg.addColorStop(0, 'rgba(240,220,170,0.12)');
  hg.addColorStop(1, 'rgba(240,220,170,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(x0, L.axisY - 4, x1 - x0, L.curtain + 8);
  ctx.strokeStyle = 'rgba(240,220,170,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, L.axisY - 6); ctx.lineTo((x0 + x1) / 2, L.axisY - 16); ctx.stroke();
  ctx.font = `600 ${L.small * 1.25}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(244,226,180,1)';
  ctx.fillText(String(S.pickYear), clamp((x0 + x1) / 2, L.ax0 + 20, L.ax1 - 20), L.axisY - 20);
  ctx.restore();
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#060a12');
  sky.addColorStop(0.5, '#0a111b');
  sky.addColorStop(1, '#05070b');
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // camera
  const c = S.cam;
  ctx.setTransform(DPR * c.s, 0, 0, DPR * c.s, DPR * (W / 2 - c.x * c.s), DPR * (H / 2 - c.y * c.s));

  if (S.groundA > 0) {
    ctx.globalAlpha = S.groundA;
    ctx.drawImage(groundCv, -L.GX, 0, W + L.GX * 2, H);
  }
  drawAxis(S.axisA, S.labelsA);
  drawLabels(S.labelsA * S.groundA);

  // ripples at the spring
  ctx.save();
  for (const rp of S.ripples) {
    const u = (simT - rp.t) / 1.6;
    if (u < 0 || u > 1) continue;
    ctx.globalAlpha = (1 - u) * 0.5;
    ctx.strokeStyle = 'rgba(190,230,250,1)';
    ctx.lineWidth = 0.8 / c.s;
    ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 4 + u * 22, 1.5 + u * 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  S.ripples = S.ripples.filter((rp) => simT - rp.t < 1.7);

  const fill = glassFill();
  drawGlass(S.glassA, fill);

  ctx.globalCompositeOperation = 'lighter';
  // drops of today's glass
  const fadePast = 1 - S.futureA;
  for (const d of glass.drops) {
    if (d.state === 0) {
      if (S.glassA <= 0) continue;
      const [x, y] = glassPos(d, fill);
      dot(x, y, d.age, 0.55 * L.rGlass / L.r, S.glassA * 0.55);
    } else if (d.state === 1) {
      const u = (simT - d.tl) / d.dur;
      const [x, y] = spline(d.path, ease(u));
      const under = y > gy(x) ? 0.7 : 1;
      dot(x, y, d.age, 1, under);
    } else if (d.state === 2) {
      const [x, y] = slotPos(d.year, d.slot);
      if (x < L.ax0 - 4 || x > L.ax1 + 4) continue;
      let a = fadePast;
      if (S.pickYear != null && S.pickA > 0) a *= d.year === S.pickYear ? 1 : 1 - 0.55 * S.pickA;
      dot(x, y, d.age, d.year === S.pickYear ? 1 + 0.25 * S.pickA : 1, a);
    }
  }
  // drops of today's rain
  for (const d of rain.drops) {
    if (d.state < 0) continue;
    if (d.state === 3) {
      const [x, y] = slotPos(d.year, d.slot);
      dot(x, y, d.age, 0.95, 1);
    } else {
      const p = rainPos(d);
      if (p) dot(p[0], p[1], d.age, 0.95, p[2]);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  drawPick();

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawCounter();
}

// ---------------------------------------------------------------- today's rain, into the future
const RAIN_FALL = 1.3, YEAR_SEC = 0.26, RISE = 1.5;
function startRain() {
  S.t4 = simT;
  for (const d of rain.drops) {
    d.state = 0;
    d.xe = entryX(d.age * 0.9, d.jx);
    d.x0 = d.xe + (d.jy - 0.5) * W * 0.05;
    d.delay = d.jy * 0.9;
    d.under = Math.max(0.5, d.age * YEAR_SEC);
    const [xd, yd] = deepPoint(d.xe, d.age, d.jx);
    const ye = gy(d.xe);
    d.pathU = [[d.xe, ye + 2], [lerp(d.xe, xd, 0.5), lerp(ye, yd, 0.7)], [xd, yd], [lerp(xd, L.springX, 0.6), lerp(yd, L.springY, 0.7)], [L.springX, L.springY + 3]];
  }
}
function rainPos(d) {
  const e = simT - S.t4 - d.delay;
  if (e < 0) return null;
  if (e < RAIN_FALL) {            // falling over the mountain
    const u = e / RAIN_FALL;
    const y0 = L.axisY + L.curtain + H * 0.03;
    return [lerp(d.x0, d.xe, u), lerp(y0, gy(d.xe), u * u), 0.9];
  }
  const e2 = e - RAIN_FALL;
  if (e2 < d.under) {             // travelling underground
    const [x, y] = spline(d.pathU, e2 / d.under);
    return [x, y, 0.72];
  }
  const e3 = e2 - d.under;
  if (d.state === 0) {
    d.state = 1;
    S.ripples.push({ t: simT, x: L.springX, y: L.springY });
    snd.drop(0.55 + 0.45 * (1 - d.age / 80), (L.springX / W) * 2 - 1, 0.8);
    const [fx, fy] = slotPos(d.year, d.slot);
    d.pathR = [[L.springX, L.springY], [L.springX + (fx - L.springX) * 0.15, L.springY - H * 0.12], [lerp(L.springX, fx, 0.7), lerp(L.springY, fy, 0.75)], [fx, fy]];
  }
  if (e3 < RISE) {
    // the column may slide while the axis moves; aim at the live slot
    const [fx, fy] = slotPos(d.year, d.slot);
    d.pathR[3] = [fx, fy];
    const [x, y] = spline(d.pathR, easeOut(e3 / RISE));
    return [x, y, 1];
  }
  d.state = 3;
  const [fx, fy] = slotPos(d.year, d.slot);
  return [fx, fy, 1];
}

// ---------------------------------------------------------------- update
function update(dt) {
  // camera
  if (S.camTo) {
    const u = ease((simT - S.camT0) / S.camDur);
    S.cam.s = lerp(S.camFrom.s, S.camTo.s, u);
    S.cam.x = lerp(S.camFrom.x, S.camTo.x, u);
    S.cam.y = lerp(S.camFrom.y, S.camTo.y, u);
    if (u >= 1) S.camTo = null;
  }
  // rewind: drops leave the glass in order of age
  if (S.t2 >= 0) {
    const el = simT - S.t2;
    for (const d of glass.drops) {
      if (d.state === 0 && el >= 1.2 + d.age * 0.3) {
        d.state = 1;
        d.tl = simT;
        d.dur = 3.4;
        d.path = pathBack(d);
        S.launched++;
        if (simT - (S.lastRipple || 0) > 0.22) { S.lastRipple = simT; S.ripples.push({ t: simT + 0.5, x: L.springX, y: L.springY }); }
      } else if (d.state === 1 && simT - d.tl >= d.dur) {
        d.state = 2;
        const [x] = slotPos(d.year, d.slot);
        snd.drop(1 - d.age / 80, (x / W) * 2 - 1, 0.9);
      }
    }
    if (S.scene === 'rewind') {
      const a = Math.max(0, (el - 1.2) / 0.3);
      S.counter = Math.max(glass.oldest.year, Math.floor(glass.now - a));
    }
  }
  // axis slides to the future
  if (S.domT0 >= 0) {
    const u = ease((simT - S.domT0) / 3.5);
    dom.d0 = lerp(Ynow - 79, Ynow, u);
    dom.d1 = dom.d0 + 80;
    S.futureA = u;
  }
  if (S.scene === 'future' && S.t4 >= 0) {
    const e = simT - S.t4 - RAIN_FALL - 0.45;
    S.counter = clamp(Math.floor(glass.now + Math.max(0, e) / YEAR_SEC), Ynow, rain.lastYear);
  }
}

function fadeTo(key, to, sec) {
  const from = S[key];
  const t0 = simT;
  S.fades = S.fades || [];
  S.fades = S.fades.filter((f) => f.key !== key);
  S.fades.push({ key, from, to, t0, sec });
}
function runFades() {
  if (!S.fades) return;
  for (const f of S.fades) S[f.key] = lerp(f.from, f.to, ease((simT - f.t0) / f.sec));
  S.fades = S.fades.filter((f) => simT - f.t0 < f.sec);
}

function step(dt) {
  simT += dt;
  for (let i = timers.length - 1; i >= 0; i--) {
    if (timers[i].t <= simT) { const tm = timers.splice(i, 1)[0]; tm.res(); }
  }
  runFades();
  update(dt);
}

// ---------------------------------------------------------------- words
let lineSeq = 0;
function setLine(text) {
  lineEl.textContent = text;
  lineEl.classList.toggle('long', text.length > (lang === 'ja' ? 46 : 110));
}
async function say(text, sec) {
  const id = ++lineSeq;
  setLine(text);
  lineEl.classList.add('on');
  await wait(sec);
  if (id === lineSeq) lineEl.classList.remove('on');
  await wait(0.9);
}
function show(text) { ++lineSeq; setLine(text); lineEl.classList.add('on'); }
function hide() { ++lineSeq; lineEl.classList.remove('on'); }

// ---------------------------------------------------------------- the piece
async function piece() {
  document.body.classList.add('playing');
  S.scene = 'glass';
  S.cam = camGlass();
  fadeTo('glassA', 1, 2.5);
  fadeTo('groundA', 0.35, 4);
  snd.level(0.05, 0.0, 3);
  await wait(1.6);
  await say(t('l1', today), 4.6);
  await say(t('l2'), 6.2);
  await say(t('l3'), 3.6);
  show(t('tapGlass'));
  S.scene = 'tapGlass';
  await waitTap(AUTO ? 2.5 : 9);
  hide();
  snd.bell(0.4);

  // rewind
  S.scene = 'rewind';
  moveCam(camHome(), 3.2);
  fadeTo('groundA', 1, 3);
  fadeTo('axisA', 1, 3);
  fadeTo('labelsA', 1, 4);
  fadeTo('counterA', 1, 2);
  snd.level(0.07, 0.015, 4);
  S.t2 = simT;
  await wait(2.2);
  await say(t('l4'), 4.6);
  await wait(1.0);
  await say(t('l5', glass.modeYear), 5.2);
  const tOld = S.t2 + 1.2 + glass.oldest.age * 0.3 + 3.4;
  if (simT < tOld) await wait(tOld - simT);
  await say(t('l6', glass.oldest), 4.4);
  fadeTo('counterA', 0, 1.5);
  await say(t('l7', Ynow - glass.oldest.year + 1), 4.6);

  // your year
  S.scene = 'pick';
  await say(t('l8'), 3.6);
  pickEl.hidden = false;
  $('pick-hint').textContent = t('pickHint');
  $('pick-next').textContent = t('next');
  fadeTo('pickA', 1, 0.8);
  picked = false;
  lastPickT = simT;
  const examples = [Math.min(Ynow - 30, 1995), Ynow - 4];
  let ex = 0;
  for (;;) {
    if (nextPressed) break;
    if (!picked) {
      if (ex < examples.length && simT - lastPickT > (ex === 0 ? (AUTO ? 1.5 : 4) : 8.5)) { choose(examples[ex++], false); lastPickT = simT; }
      else if (ex >= examples.length && simT - lastPickT > 9) break;
    } else if (simT - lastPickT > 22) break;
    await wait(0.1);
  }
  nextPressed = false;
  pickEl.hidden = true;
  fadeTo('pickA', 0, 0.8);
  hide();
  await wait(1.2);
  S.pickYear = null;

  // the future
  S.scene = 'toFuture';
  await say(t('l9'), 4.2);
  S.domT0 = simT;
  await wait(3.6);
  show(t('tapSky'));
  rainBtn.textContent = t('rainBtn');
  rainBtn.hidden = false;
  S.scene = 'tapSky';
  await waitTap(AUTO ? 2 : 10);
  rainBtn.hidden = true;
  hide();
  S.scene = 'future';
  snd.level(0.06, 0.09, 1.0);
  startRain();
  fadeTo('counterA', 1, 1.5);
  await wait(RAIN_FALL + 1.2);
  snd.level(0.07, 0.01, 4);
  const at = (y) => S.t4 + RAIN_FALL + 0.45 + (y - glass.now) * YEAR_SEC + RISE;
  if (simT < at(rain.modeYear)) await wait(at(rain.modeYear) - simT);
  await say(t('l10', rain.modeYear), 3.8);
  if (simT < at(rain.medianYear)) await wait(at(rain.medianYear) - simT);
  await say(t('l11', rain.medianYear), 3.8);
  if (simT < at(rain.lastYear)) await wait(at(rain.lastYear) - simT);
  await say(t('l12', rain.lastYear), 4);
  fadeTo('counterA', 0, 2);
  await say(t('l13', today, rain.modeYear), 6);

  // end
  S.scene = 'end';
  snd.bell(0.6);
  await say(t('e1'), 4.2);
  snd.level(0.04, 0, 6);
  show(t('e2'));
  document.body.classList.add('ended');
  endEl.hidden = false;
}

// ---------------------------------------------------------------- choosing a year
let picked = false, nextPressed = false, lastPickT = 0;
function choose(y, byUser) {
  y = clamp(y, Ynow - 79, Ynow);
  if (y === S.pickYear && !byUser) return;
  if (y !== S.pickYear) snd.drop(1 - (Ynow - y) / 80, 0, 0.7);
  S.pickYear = y;
  if (byUser) { picked = true; lastPickT = simT; }
  $('pick-year').textContent = lang === 'ja' ? `${y}年` : String(y);
  show(t('pick', yearInfo(glass, y)));
}

// ---------------------------------------------------------------- input
function toWorld(e) {
  const r = cv.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const c = S.cam;
  return [(sx - W / 2) / c.s + c.x, (sy - H / 2) / c.s + c.y];
}
let dragging = false;
cv.addEventListener('pointerdown', (e) => {
  if (S.scene === 'tapGlass' && tapRes) { tapRes(true); return; }
  if (S.scene === 'tapSky' && tapRes) { tapRes(true); return; }
  if (S.scene === 'pick') {
    const [x, y] = toWorld(e);
    if (y < L.axisY + L.curtain + H * 0.1) { dragging = true; choose(yearAt(x), true); cv.setPointerCapture(e.pointerId); }
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!dragging || S.scene !== 'pick') return;
  const [x] = toWorld(e);
  choose(yearAt(x), true);
});
const endDrag = () => { dragging = false; };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
$('pick-prev').addEventListener('click', () => choose((S.pickYear ?? Ynow - 30) - 1, true));
$('pick-next-year').addEventListener('click', () => choose((S.pickYear ?? Ynow - 30) + 1, true));
$('pick-next').addEventListener('click', () => { nextPressed = true; });
rainBtn.addEventListener('click', () => { if (tapRes) tapRes(true); });
window.addEventListener('keydown', (e) => {
  if (S.scene === 'pick' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    choose((S.pickYear ?? Ynow - 30) + (e.key === 'ArrowLeft' ? -1 : 1), true);
  } else if ((e.key === 'Enter' || e.key === ' ') && tapRes && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) {
    tapRes(true);
  }
});

// ---------------------------------------------------------------- the forecast as an image
async function saveTicket() {
  const w = 1200, h = 630;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#08101a'); bg.addColorStop(1, '#04060a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(236,240,248,0.95)';
  g.font = `600 40px ${FONT}`;
  g.fillText(T[lang].title, 64, 96);
  g.font = `400 22px ${FONT}`;
  g.fillStyle = 'rgba(232,212,160,0.95)';
  g.fillText(`${t('ticketHead')} · ${t('today', today)}`, 64, 140);
  // forecast columns
  const x0 = 64, x1 = w - 64, yA = 200, hA = 190;
  const cw = (x1 - x0) / 80;
  g.strokeStyle = 'rgba(220,230,245,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x0, yA); g.lineTo(x1, yA); g.stroke();
  g.font = `400 15px ${FONT}`; g.textAlign = 'center'; g.fillStyle = 'rgba(226,234,246,0.7)';
  for (let y = Ynow; y < Ynow + 80; y++) {
    if (y % 10 === 0) { const x = x0 + (y - Ynow) * cw; g.fillText(String(y), x, yA - 10); g.beginPath(); g.moveTo(x, yA); g.lineTo(x, yA - 5); g.stroke(); }
  }
  const maxC = rain.modeCount;
  for (const [y, n] of rain.count) {
    const x = x0 + (y - Ynow) * cw;
    const hh = (n / maxC) * hA;
    const [r, gg, b] = ageColor(y - glass.now);
    const gr = g.createLinearGradient(0, yA, 0, yA + hh);
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.95)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0.35)`);
    g.fillStyle = gr;
    g.fillRect(x + cw * 0.18, yA + 4, cw * 0.64, hh);
  }
  g.textAlign = 'left';
  const rows = T[lang].ticketRows(rain);
  rows.forEach(([k, v], i) => {
    g.font = `400 22px ${FONT}`; g.fillStyle = 'rgba(214,224,240,0.8)';
    g.fillText(k, 64 + i * 370, 470);
    g.font = `600 34px ${FONT}`; g.fillStyle = 'rgba(240,244,250,1)';
    g.fillText(v, 64 + i * 370, 514);
  });
  g.font = `400 16px ${FONT}`; g.fillStyle = 'rgba(214,224,240,0.55)';
  g.fillText(t('ticketNote'), 64, 574);
  g.textAlign = 'right';
  g.fillText(location.host ? location.host + location.pathname.replace(/index\.html$/, '') : '', w - 64, 574);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mizu-no-jikan-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------------------------------------------------------------- page
function applyLang() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  $('about-body').innerHTML = T[lang].aboutHtml;
}
async function begin(l) {
  lang = l;
  applyLang();
  $('start-ja').disabled = $('start-en').disabled = true;
  snd.start();
  piece();
}
$('start-ja').addEventListener('click', () => begin('ja'));
$('start-en').addEventListener('click', () => begin('en'));
$('save').addEventListener('click', saveTicket);
$('again').addEventListener('click', () => { location.reload(); });
for (const b of document.querySelectorAll('.about-open')) b.addEventListener('click', () => { $('about').hidden = false; $('about-close').focus(); });
$('about-close').addEventListener('click', () => { $('about').hidden = true; });

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  step(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  layout();
  if (S.scene === 'glass' || S.scene === 'tapGlass') S.cam = camGlass();
  else if (!S.camTo) S.cam = camHome();
  // flights in progress keep their old paths; landed drops follow the new layout
});

// for checking: advance the piece by a number of seconds without waiting
window.__ff = async (sec) => {
  const n = Math.round(sec * 60);
  for (let i = 0; i < n; i++) { step(1 / 60); if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0)); }
  draw();
};
window.__state = () => ({ scene: S.scene, simT, launched: S.launched, counter: S.counter, line: lineEl.textContent });
window.__tap = () => { if (tapRes) tapRes(true); };
window.__pick = (y) => choose(y, true);
window.__next = () => { nextPressed = true; };

applyLang();
layout();
S.cam = camGlass();
draw();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  document.body.classList.add('ready');
  if (!params.has('still')) requestAnimationFrame((t0) => { lastFrame = t0; requestAnimationFrame(frame); });
});
