import { createCandle } from './candle';
import { startEmbers } from './embers';
import { loadPrefs, savePrefs, type AtmosKey } from './prefs';
import { NightSound } from './sound';
import { createStorm } from './storm';

/**
 * Gobierno del ambiente. Las capas (lumbre, pavesas, relámpago, vela) viven en
 * elementos que sobreviven al cambio de página, así que esto arranca una sola vez.
 *
 * Mandos, en cualquier parte del documento:
 *   <button data-atmos="sound|storm|candle" data-on="…" data-off="…">
 *     <span data-atmos-state></span>
 *   </button>
 */
export function initAmbience(): void {
  const embers = document.querySelector<HTMLCanvasElement>('[data-embers]');
  const stormLayer = document.querySelector<HTMLElement>('[data-storm]');
  const candle = document.querySelector<HTMLElement>('[data-candle]');
  if (!embers || !stormLayer || !candle) return;

  const prefs = loadPrefs();
  const sound = new NightSound();
  const storm = createStorm(stormLayer, ({ intensity, delay }) => sound.thunder(intensity, delay));

  startEmbers(embers);
  createCandle(candle);

  function render(): void {
    storm.setFlashes(prefs.storm);
    candle!.dataset.state = prefs.candle ? 'on' : 'off';
    for (const control of document.querySelectorAll<HTMLElement>('[data-atmos]')) {
      const on = prefs[control.dataset.atmos as AtmosKey];
      control.setAttribute('aria-pressed', String(on));
      const state = control.querySelector('[data-atmos-state]');
      if (state) {
        state.textContent = (on ? control.dataset.on : control.dataset.off) ?? (on ? 'encendido' : 'apagado');
      }
    }
    for (const flame of document.querySelectorAll('[data-sound-flame]')) {
      flame.classList.toggle('is-on', prefs.sound);
    }
  }

  async function toggle(key: AtmosKey): Promise<void> {
    prefs[key] = !prefs[key];
    if (key === 'sound') {
      if (prefs.sound) prefs.sound = await sound.start();
      else sound.stop();
    }
    savePrefs(prefs);
    render();
  }

  document.addEventListener('click', (event) => {
    const control = (event.target as Element).closest<HTMLElement>('[data-atmos]');
    if (control) void toggle(control.dataset.atmos as AtmosKey);
  });

  // Los navegadores no dejan sonar nada hasta el primer gesto: si la última vez
  // se dejó el sonido encendido, se reanuda en cuanto el visitante toca algo.
  if (prefs.sound) {
    const resume = () => {
      if (prefs.sound && !sound.isPlaying) void sound.start();
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  document.addEventListener('an:duck', (event) => sound.setDuck((event as CustomEvent<number>).detail));
  document.addEventListener('astro:page-load', render);
  render();

  if (import.meta.env.DEV) Object.assign(window, { antiqua: { storm, sound } });
}
