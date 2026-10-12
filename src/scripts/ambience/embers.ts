import { prefersReducedMotion } from '../page';

/** Pavesas que suben desde la lumbre, fuera de cuadro, y se apagan en el aire. */

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  phase: number;
  sway: number;
}

const TAU = Math.PI * 2;

function makeSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 48;
  const ctx = sprite.getContext('2d')!;
  const glow = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
  glow.addColorStop(0, 'rgba(255, 238, 196, 1)');
  glow.addColorStop(0.18, 'rgba(250, 176, 96, 0.9)');
  glow.addColorStop(0.5, 'rgba(217, 100, 42, 0.28)');
  glow.addColorStop(1, 'rgba(143, 54, 19, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 48, 48);
  return sprite;
}

export function startEmbers(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || prefersReducedMotion()) return;

  const sprite = makeSprite();
  const embers: Ember[] = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let last = 0;

  const wanted = () => (width < 720 ? 11 : 24);

  function kindle(ember: Ember, scattered: boolean): void {
    // Dos tiradas sumadas: la mayoría nace cerca del centro, donde arde el fuego
    const spread = (Math.random() + Math.random()) / 2;
    ember.x = width * (0.08 + spread * 0.84);
    ember.y = scattered ? height * (0.45 + Math.random() * 0.55) : height + 12 + Math.random() * 40;
    ember.vx = (Math.random() - 0.5) * 9;
    ember.vy = -(16 + Math.random() * 44);
    ember.life = 0;
    ember.ttl = 3.5 + Math.random() * 6;
    ember.size = 0.5 + Math.random() ** 2 * 2.1;
    ember.phase = Math.random() * TAU;
    ember.sway = 0.5 + Math.random() * 1.7;
  }

  function resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    while (embers.length < wanted()) {
      const ember = {} as Ember;
      kindle(ember, true);
      embers.push(ember);
    }
    embers.length = wanted();
  }

  function draw(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx!.clearRect(0, 0, width, height);
    ctx!.globalCompositeOperation = 'lighter';

    for (const ember of embers) {
      ember.life += dt;
      if (ember.life >= ember.ttl || ember.y < -20) kindle(ember, false);
      ember.vy *= 1 - 0.1 * dt;
      ember.x += (ember.vx + Math.sin(ember.phase + ember.life * ember.sway) * 13) * dt;
      ember.y += ember.vy * dt;

      const age = ember.life / ember.ttl;
      const fadeIn = Math.min(ember.life / 0.5, 1);
      const flicker = 0.62 + 0.38 * Math.sin(ember.life * 9 + ember.phase * 3);
      const alpha = fadeIn * (1 - age) ** 1.6 * flicker;
      if (alpha <= 0.01) continue;

      const side = ember.size * 9;
      ctx!.globalAlpha = alpha;
      ctx!.drawImage(sprite, ember.x - side / 2, ember.y - side / 2, side, side);
    }

    ctx!.globalAlpha = 1;
    frame = requestAnimationFrame(draw);
  }

  function wake(): void {
    cancelAnimationFrame(frame);
    if (document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', wake);
  resize();
  wake();
}
