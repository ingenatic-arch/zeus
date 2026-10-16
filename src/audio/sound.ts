/**
 * The soundscape, all made in code with WebAudio: the sea breathing on the
 * shore, birds in the trees and gulls over the water, soft sounds when
 * something is built, cleared or refused, a little chime when a home goes up
 * a level, and footsteps and cart wheels near the camera when it is down in
 * the streets. No music.
 *
 * Browsers only let a page make sound after the player has clicked or
 * pressed a key, so nothing starts until then. The mute switch is remembered
 * per viewer in browser storage, which may be missing or throw: every touch
 * is wrapped, and without it the switch simply isn't remembered.
 *
 * Host code: random numbers here are Math.random, which is fine, because
 * nothing here feeds back into the simulation.
 */

const MUTE_KEY = 'zeus-remake.muted';

export type Cue = 'road' | 'plots' | 'build' | 'clear' | 'undo' | 'refuse' | 'rise' | 'decline' | 'save';

/** What the camera is looking at, for the ambience: where, and how close. */
export interface Listener {
  x: number;
  z: number;
  dist: number;
  /** 0 over open land … 1 right over the sea. */
  sea: number;
  /** 0 bare … 1 among trees. */
  trees: number;
  /** Walkers (people) and carts within earshot of the camera, when it is low. */
  walkers: number;
  carts: number;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* Not remembered in this window; the switch still works. */
  }
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private seaGain: GainNode | null = null;
  private seaFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private listener: Listener = { x: 0, z: 0, dist: 100, sea: 0.5, trees: 0, walkers: 0, carts: 0 };
  private nextBird = 0;
  private nextGull = 0;
  private nextStep = 0;
  private nextCreak = 0;
  private wave = 0;
  private changeFns: Array<(m: boolean) => void> = [];
  muted: boolean;
  /** Sounds played (for the smoke test). */
  played = 0;

  /** When each short cue last played (audio clock), so a busy town doesn't pile them up. */
  private lastCue = new Map<Cue, number>();

  constructor() {
    this.muted = readMuted();
    // Nothing is made while muted: the first click or key after unmuting starts it.
    const begin = (): void => {
      if (!this.muted) this.start();
      if (this.ctx) {
        removeEventListener('pointerdown', begin, true);
        removeEventListener('keydown', begin, true);
      }
    };
    addEventListener('pointerdown', begin, true);
    addEventListener('keydown', begin, true);
    // Quiet while the tab is hidden (the frames stop, but the sea would go on).
    document.addEventListener('visibilitychange', () => this.hold());
  }

  /** Whether the audio should be running now: started, not muted, the page visible. */
  private get wanted(): boolean {
    return !this.muted && document.visibilityState !== 'hidden';
  }

  /** Suspend or resume the audio to match `wanted` (a suspended context costs nothing). */
  private hold(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.wanted) {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    } else if (ctx.state === 'running') {
      // Let the master fade before stopping the clock.
      const c = ctx;
      setTimeout(() => {
        if (!this.wanted && c.state === 'running') void c.suspend().catch(() => undefined);
      }, 400);
    }
  }

  /** Whether sound has started (after the first click or key). */
  get started(): boolean {
    return this.ctx !== null;
  }

  /** The audio's state: 'none' before it starts, then 'running' or 'suspended' (held while muted or hidden). */
  get state(): string {
    return this.ctx?.state ?? 'none';
  }

  onChange(f: (m: boolean) => void): void {
    this.changeFns.push(f);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    writeMuted(m);
    // Unmuting is a click, so the audio may start here if it never has.
    if (!m) this.start();
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.08);
    this.hold();
    for (const f of this.changeFns) f(m);
  }

  toggle(): void {
    this.setMuted(!this.muted);
  }

  private start(): void {
    if (this.ctx) return;
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let ctx: AudioContext;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(comp);
    this.master = master;

    // Brown noise, a few seconds of it, looped: the sea and the wind are both made from it.
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    // Fade the loop's seam.
    for (let i = 0; i < 2000; i++) {
      const k = i / 2000;
      d[len - 1 - i] = d[len - 1 - i] * k + d[i] * (1 - k);
    }
    this.noise = buf;

    const sea = ctx.createBufferSource();
    sea.buffer = buf;
    sea.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    seaFilter.Q.value = 0.4;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0;
    sea.connect(seaFilter).connect(seaGain).connect(master);
    sea.start();
    this.seaGain = seaGain;
    this.seaFilter = seaFilter;

    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    wind.playbackRate.value = 0.6;
    wind.loopStart = 1.3;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start(ctx.currentTime, 1.3);
    this.windGain = windGain;
    const now = ctx.currentTime;
    this.nextBird = now + rand(1, 3);
    this.nextGull = now + rand(4, 9);
    this.nextStep = now + 0.5;
    this.nextCreak = now + rand(2, 5);
  }

  /** Where the camera is, once a frame or so. */
  listen(l: Listener): void {
    this.listener = l;
  }

  /** Keep the ambience going: call every frame. */
  update(dt: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.seaGain || !this.windGain || !this.seaFilter) return;
    if (ctx.state !== 'running') {
      // Held (muted or hidden), or the browser hasn't let it run yet.
      if (ctx.state === 'suspended' && this.wanted) void ctx.resume().catch(() => undefined);
      return;
    }
    const l = this.listener;
    const now = ctx.currentTime;
    // How far up the camera is: near the ground, the town; high up, the wind.
    const high = Math.min(1, Math.max(0, (l.dist - 20) / 120));
    const low = 1 - Math.min(1, Math.max(0, (l.dist - 6) / 40));
    // Waves: a slow swell, every eight seconds or so, and a hiss as each breaks.
    this.wave += dt * (Math.PI * 2) / 8;
    const swell = 0.55 + 0.45 * Math.sin(this.wave) ** 2;
    const seaLevel = (0.05 + 0.2 * l.sea) * swell * (1 - 0.4 * high);
    this.seaGain.gain.setTargetAtTime(seaLevel, now, 0.25);
    this.seaFilter.frequency.setTargetAtTime(300 + 500 * swell * (0.5 + 0.5 * l.sea), now, 0.3);
    this.windGain.gain.setTargetAtTime(0.012 + 0.05 * high, now, 0.6);

    if (now > this.nextBird) {
      const among = 0.2 + 0.8 * l.trees;
      if (Math.random() < among * (0.4 + 0.6 * low)) this.bird(0.025 + 0.05 * low * among);
      this.nextBird = now + rand(1.5, 6) / (0.5 + among);
    }
    if (now > this.nextGull) {
      if (l.sea > 0.25 && Math.random() < l.sea) this.gull(0.02 + 0.03 * l.sea);
      this.nextGull = now + rand(6, 16);
    }
    // Footsteps and wheels only down in the streets.
    if (low > 0.2 && l.walkers > 0 && now > this.nextStep) {
      this.step(0.05 * low * Math.min(1, 0.4 + l.walkers / 6));
      this.nextStep = now + rand(0.22, 0.4) / Math.min(3, 0.6 + l.walkers / 4);
    }
    if (low > 0.3 && l.carts > 0 && now > this.nextCreak) {
      this.creak(0.03 * low);
      this.nextCreak = now + rand(1.2, 3);
    }
  }

  /** A short sound for something that just happened. */
  play(cue: Cue): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    // A home going up or down: at most one chime a second, however fast the town grows.
    if (cue === 'rise' || cue === 'decline') {
      const last = this.lastCue.get(cue) ?? -Infinity;
      if (ctx.currentTime - last < 1) return;
      this.lastCue.set(cue, ctx.currentTime);
    }
    this.played++;
    switch (cue) {
      case 'road':
        for (let i = 0; i < 3; i++) this.burst(0.07, 1800 + i * 300, 2.2, 0.05, i * 0.06, 'highpass');
        this.thump(0.12, 120, 0.09);
        break;
      case 'plots':
        this.knock(0.16, 520, 0);
        this.knock(0.13, 610, 0.11);
        break;
      case 'build':
        this.thump(0.22, 110, 0.18);
        this.knock(0.14, 420, 0.03);
        this.knock(0.1, 350, 0.16);
        break;
      case 'clear':
        this.swish(0.12, 900, 3200, 0.32);
        break;
      case 'undo':
        this.swish(0.1, 2600, 700, 0.25);
        break;
      case 'refuse':
        this.tone(0.07, 247, 0.12, 'triangle', 0);
        this.tone(0.07, 196, 0.18, 'triangle', 0.11);
        break;
      case 'rise':
        // Two notes of a pentatonic bell, soft, up.
        this.bell(0.05, 784, 0);
        this.bell(0.045, 1047, 0.12);
        break;
      case 'decline':
        this.tone(0.05, 392, 0.3, 'sine', 0);
        this.tone(0.045, 311, 0.45, 'sine', 0.18);
        break;
      case 'save':
        this.bell(0.04, 659, 0);
        this.bell(0.035, 880, 0.09);
        break;
    }
  }

  private env(gain: number, at: number, attack: number, decay: number): GainNode {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    g.connect(this.master as GainNode);
    return g;
  }

  private tone(gain: number, freq: number, len: number, type: OscillatorType, delay: number): void {
    const ctx = this.ctx as AudioContext;
    const at = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(this.env(gain, at, 0.01, len));
    o.start(at);
    o.stop(at + len + 0.05);
  }

  private bell(gain: number, freq: number, delay: number): void {
    const ctx = this.ctx as AudioContext;
    const at = ctx.currentTime + delay;
    for (const [mul, g, len] of [
      [1, 1, 0.9],
      [2.76, 0.25, 0.4],
      [5.4, 0.08, 0.2],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mul;
      o.connect(this.env(gain * g, at, 0.005, len));
      o.start(at);
      o.stop(at + len + 0.05);
    }
  }

  private knock(gain: number, freq: number, delay: number): void {
    const ctx = this.ctx as AudioContext;
    const at = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 1.6, at);
    o.frequency.exponentialRampToValueAtTime(freq, at + 0.03);
    o.connect(this.env(gain, at, 0.002, 0.08));
    o.start(at);
    o.stop(at + 0.15);
    this.burst(gain * 0.5, freq * 2, 3, 0.03, delay, 'bandpass');
  }

  private thump(gain: number, freq: number, len: number): void {
    const ctx = this.ctx as AudioContext;
    const at = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.8, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.7, at + len);
    o.connect(this.env(gain, at, 0.004, len));
    o.start(at);
    o.stop(at + len + 0.05);
  }

  /** A burst of filtered noise. */
  private burst(gain: number, freq: number, q: number, len: number, delay: number, type: BiquadFilterType): void {
    const ctx = this.ctx as AudioContext;
    if (!this.noise) return;
    const at = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(gain, at, 0.003, len));
    src.start(at, rand(0, 3));
    src.stop(at + len + 0.05);
  }

  private swish(gain: number, from: number, to: number, len: number): void {
    const ctx = this.ctx as AudioContext;
    if (!this.noise) return;
    const at = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 3;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, at);
    f.frequency.exponentialRampToValueAtTime(to, at + len);
    src.connect(f).connect(this.env(gain, at, len * 0.4, len * 0.6));
    src.start(at, rand(0, 3));
    src.stop(at + len + 0.05);
  }

  /** A little bird: a few quick chirps. */
  private bird(gain: number): void {
    const ctx = this.ctx as AudioContext;
    if (this.muted) return;
    const base = rand(2600, 4200);
    const notes = 2 + Math.floor(Math.random() * 4);
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.8, 0.8);
    pan.connect(this.master as GainNode);
    let t = ctx.currentTime;
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const f0 = base * rand(0.85, 1.15);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * rand(1.15, 1.5), t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.1);
      t += rand(0.08, 0.16);
    }
  }

  /** A gull, far off over the water. */
  private gull(gain: number): void {
    const ctx = this.ctx as AudioContext;
    if (this.muted) return;
    const pan = ctx.createStereoPanner();
    pan.pan.value = rand(-0.7, 0.7);
    pan.connect(this.master as GainNode);
    const calls = 1 + Math.floor(Math.random() * 3);
    let t = ctx.currentTime;
    for (let i = 0; i < calls; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f0 = rand(1300, 1600);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.34);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(f).connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.4);
      t += rand(0.32, 0.45);
    }
  }

  /** A footstep on packed earth. */
  private step(gain: number): void {
    if (this.muted) return;
    this.burst(gain, rand(500, 900), 1.5, 0.045, 0, 'bandpass');
  }

  /** A cart's wheel creaking. */
  private creak(gain: number): void {
    const ctx = this.ctx as AudioContext;
    if (this.muted) return;
    const at = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = rand(170, 230);
    o.frequency.setValueAtTime(f0, at);
    o.frequency.linearRampToValueAtTime(f0 * 1.35, at + 0.22);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 4;
    o.connect(f).connect(this.env(gain, at, 0.04, 0.22));
    o.start(at);
    o.stop(at + 0.32);
  }
}
