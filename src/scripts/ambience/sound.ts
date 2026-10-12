/**
 * El sonido de la velada, sintetizado en el momento (no hay archivos de audio):
 * la lluvia contra los cristales, el rumor y los chasquidos de la lumbre y,
 * cuando cae un rayo, el trueno que le corresponde.
 */

const LEVEL = 0.8;

type Filter = [type: BiquadFilterType, frequency: number, q: number];

function noise(ctx: AudioContext, seconds: number, colour: 'white' | 'brown'): AudioBuffer {
  const length = Math.floor(seconds * ctx.sampleRate);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (colour === 'white') {
        data[i] = white;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
    if (colour === 'brown') {
      // Se endereza la deriva para que el bucle empalme sin chasquido
      const drift = data[length - 1] - data[0];
      for (let i = 0; i < length; i++) data[i] -= (i / length) * drift;
    }
  }
  return buffer;
}

export class NightSound {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private white!: AudioBuffer;
  private brown!: AudioBuffer;
  private timer = 0;
  private playing = false;
  private duck = 1;

  get isPlaying(): boolean {
    return this.playing;
  }

  async start(): Promise<boolean> {
    try {
      this.ctx ??= this.build();
      await this.ctx.resume();
    } catch {
      return false;
    }
    if (this.ctx.state !== 'running') return false;
    this.playing = true;
    this.fade(LEVEL * this.duck, 1.1);
    this.crackleLoop();
    return true;
  }

  stop(): void {
    this.playing = false;
    window.clearTimeout(this.timer);
    this.fade(0, 0.45);
    window.setTimeout(() => {
      if (!this.playing) void this.ctx?.suspend();
    }, 2800);
  }

  /** Atenúa el ambiente (de 0 a 1) mientras suena otra cosa: una cinta con música, por ejemplo. */
  setDuck(amount: number): void {
    this.duck = amount;
    if (this.playing) this.fade(LEVEL * amount, 0.5);
  }

  private fade(to: number, timeConstant: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(to, now, timeConstant);
  }

  private build(): AudioContext {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.01;
    limiter.release.value = 0.4;
    this.out.connect(limiter).connect(ctx.destination);
    this.white = noise(ctx, 3, 'white');
    this.brown = noise(ctx, 6, 'brown');

    // Lluvia: un siseo ancho, el repiqueteo en el cristal y el peso del agua sobre el tejado
    this.bed(ctx, this.white, 1, [['highpass', 950, 0.5], ['lowpass', 7600, 0.5]], 0.09);
    const patter = this.bed(ctx, this.white, 1.31, [['bandpass', 2500, 1.2]], 0.035);
    this.sway(ctx, patter.gain, 0.09, 0.02);
    this.bed(ctx, this.brown, 1, [['lowpass', 380, 0.7]], 0.22);

    // Lumbre: el rumor grave del fuego, que respira
    const roar = this.bed(ctx, this.brown, 0.72, [['bandpass', 230, 0.6]], 0.32);
    this.sway(ctx, roar.gain, 0.21, 0.1);
    return ctx;
  }

  /** Un lecho continuo de ruido filtrado. */
  private bed(ctx: AudioContext, buffer: AudioBuffer, rate: number, filters: Filter[], level: number): GainNode {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = rate;
    let node: AudioNode = source;
    for (const [type, frequency, q] of filters) {
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      node.connect(filter);
      node = filter;
    }
    const gain = ctx.createGain();
    gain.gain.value = level;
    node.connect(gain).connect(this.out);
    source.start(0, Math.random() * buffer.duration);
    return gain;
  }

  /** Un vaivén lento sobre un parámetro, para que nada suene a máquina. */
  private sway(ctx: AudioContext, target: AudioParam, hertz: number, depth: number): void {
    const lfo = ctx.createOscillator();
    const amount = ctx.createGain();
    lfo.frequency.value = hertz;
    amount.gain.value = depth;
    lfo.connect(amount).connect(target);
    lfo.start();
  }

  private pan(ctx: AudioContext, width: number): AudioNode {
    if (!ctx.createStereoPanner) return this.out;
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * width;
    panner.connect(this.out);
    return panner;
  }

  /** Los chasquidos llegan a rachas irregulares, como en la leña de verdad. */
  private crackleLoop(): void {
    window.clearTimeout(this.timer);
    const tick = () => {
      if (!this.playing || !this.ctx) return;
      const burst = Math.random() < 0.12 ? 3 + Math.floor(Math.random() * 4) : 1;
      for (let i = 0; i < burst; i++) {
        this.crackle(this.ctx, this.ctx.currentTime + i * (0.02 + Math.random() * 0.07));
      }
      this.timer = window.setTimeout(tick, 30 - Math.log(1 - Math.random()) * 270);
    };
    tick();
  }

  private crackle(ctx: AudioContext, when: number): void {
    // Casi todos son leves; de vez en cuando salta uno de verdad
    const force = Math.random() ** 3;
    const length = 0.006 + Math.random() * 0.03 + force * 0.05;
    const source = ctx.createBufferSource();
    source.buffer = this.white;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 700 + Math.random() ** 2 * 5200;
    filter.Q.value = 1.5 + Math.random() * 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.05 + force * 0.5, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    source.connect(filter).connect(gain).connect(this.pan(ctx, 0.7));
    source.start(when, Math.random() * (this.white.duration - 0.2), length + 0.05);
  }

  /** El trueno de un rayo: un estampido si cae cerca y, siempre, el redoble que se aleja. */
  thunder(intensity: number, delay: number): void {
    if (!this.playing || !this.ctx) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const length = 4.5 + Math.random() * 4.5;
    const peak = 0.35 + intensity * 0.8;
    const out = this.pan(ctx, 1.2);

    const rumble = ctx.createBufferSource();
    rumble.buffer = this.brown;
    rumble.loop = true;
    rumble.playbackRate.value = 0.5 + Math.random() * 0.3;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240 + intensity * 520, start);
    filter.frequency.exponentialRampToValueAtTime(70, start + length);

    // Envolvente: golpe inicial y varios redobles que van perdiendo fuerza
    const steps = 72;
    const curve = new Float32Array(steps);
    const rolls = 5 + Math.random() * 9;
    const phase = Math.random() * 6.28;
    for (let i = 0; i < steps; i++) {
      const p = i / (steps - 1);
      curve[i] = peak * Math.exp(-3.4 * p) * (0.6 + 0.4 * Math.sin(p * rolls * 6.28 + phase));
    }
    curve[0] = 0;
    curve[steps - 1] = 0;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueCurveAtTime(curve, start, length);
    rumble.connect(filter).connect(gain).connect(out);
    rumble.start(start, Math.random() * this.brown.duration);
    rumble.stop(start + length + 0.2);

    if (intensity > 0.72) {
      const crack = ctx.createBufferSource();
      crack.buffer = this.white;
      const bite = ctx.createBiquadFilter();
      bite.type = 'highpass';
      bite.frequency.value = 1400;
      const snap = ctx.createGain();
      snap.gain.setValueAtTime(0.16 * intensity, start);
      snap.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      crack.connect(bite).connect(snap).connect(out);
      crack.start(start, Math.random(), 0.4);
    }
  }
}
