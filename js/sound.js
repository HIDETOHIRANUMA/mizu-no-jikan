// All sound is synthesized here with Web Audio: water drops, a low drone and soft rain.
const PENTA = [0, 2, 4, 7, 9];

export class Sound {
  constructor() { this.ctx = null; this.on = false; this.last = 0; this.recent = 0; }

  start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC(); } catch { return false; }
    const c = this.ctx;
    if (c.resume) c.resume();
    this.master = c.createGain();
    this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
    this.bus = c.createGain();
    const dry = c.createGain(); dry.gain.value = 0.8;
    const rev = c.createConvolver(); rev.buffer = this.impulse(3.8, 3.0);
    const wet = c.createGain(); wet.gain.value = 0.42;
    this.bus.connect(dry); this.bus.connect(rev); rev.connect(wet);
    dry.connect(this.master); wet.connect(this.master);
    this.master.connect(comp); comp.connect(c.destination);
    this.master.gain.setTargetAtTime(0.85, c.currentTime, 0.5);
    this.drone();
    this.rain();
    this.on = true;
    return true;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  impulse(sec, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  drone() {
    const c = this.ctx;
    this.droneGain = c.createGain();
    this.droneGain.gain.value = 0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 160;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start();
    for (const [f, g] of [[55, 0.5], [82.41, 0.32], [110.3, 0.16], [164.8, 0.07]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = g;
      o.connect(og); og.connect(lp); o.start();
    }
    lp.connect(this.droneGain); this.droneGain.connect(this.master);
  }

  rain() {
    const c = this.ctx;
    const len = c.sampleRate * 4;
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    let p = 0;
    for (let i = 0; i < len; i++) { p = 0.97 * p + 0.03 * (Math.random() * 2 - 1); d[i] = p * 6 + (Math.random() * 2 - 1) * 0.08; }
    const src = c.createBufferSource(); src.buffer = b; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
    this.rainGain = c.createGain(); this.rainGain.gain.value = 0;
    src.connect(bp); bp.connect(this.rainGain); this.rainGain.connect(this.master);
    src.start();
  }

  level(drone, rain, sec = 2) {
    if (!this.on) return;
    const t = this.now;
    this.droneGain.gain.setTargetAtTime(drone, t, sec / 3);
    this.rainGain.gain.setTargetAtTime(rain, t, sec / 3);
  }

  // one water drop. pitch: 0 (low) .. 1 (high); pan: -1 .. 1
  drop(pitch, pan = 0, vel = 1) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime;
    // thin out dense moments so that a cloud of drops stays a texture, not a roar
    const dt = t - this.last;
    this.recent = Math.max(0, this.recent - dt * 14) + 1;
    this.last = t;
    if (this.recent > 6 && Math.random() < 0.8) return;
    const step = Math.round(Math.max(0, Math.min(1, pitch)) * 14);
    const midi = 57 + Math.floor(step / 5) * 12 + PENTA[step % 5];
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const g = 0.11 * vel / Math.sqrt(Math.max(1, this.recent * 0.6));
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.018);
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.76;
    const env = c.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(g, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0008, t + 0.9);
    const env2 = c.createGain();
    env2.gain.setValueAtTime(0, t);
    env2.gain.linearRampToValueAtTime(g * 0.22, t + 0.003);
    env2.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
    const pn = c.createStereoPanner ? c.createStereoPanner() : null;
    o.connect(env); o2.connect(env2);
    if (pn) { pn.pan.value = Math.max(-1, Math.min(1, pan)); env.connect(pn); env2.connect(pn); pn.connect(this.bus); }
    else { env.connect(this.bus); env2.connect(this.bus); }
    o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 0.3);
  }

  // a soft bell for a scene change
  bell(pitch = 0.5) {
    if (!this.on) return;
    const c = this.ctx, t = c.currentTime;
    const f = 220 * Math.pow(2, pitch * 2);
    for (const [m, g, d] of [[1, 0.07, 4], [2.01, 0.03, 2.5], [3.0, 0.015, 1.6]]) {
      const o = c.createOscillator(); o.frequency.value = f * m;
      const e = c.createGain();
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.02);
      e.gain.exponentialRampToValueAtTime(0.0005, t + d);
      o.connect(e); e.connect(this.bus); o.start(t); o.stop(t + d + 0.1);
    }
  }

  fadeOut(sec = 3) {
    if (!this.on) return;
    this.master.gain.setTargetAtTime(0, this.now, sec / 3);
  }
  fadeIn(sec = 1) {
    if (!this.on) return;
    this.master.gain.setTargetAtTime(0.85, this.now, sec / 3);
  }
}
