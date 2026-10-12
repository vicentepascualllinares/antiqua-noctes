import { prefersReducedMotion } from '../page';

/**
 * La tormenta queda al otro lado de la ventana: de tarde en tarde un relámpago
 * proyecta su luz fría (y la sombra de los cuarterones) sobre la estancia.
 * El resplandor es tenue y lento a propósito; nunca destella de forma brusca.
 */

export interface Strike {
  /** De 0 (lejano) a 1 (encima de la casa). */
  intensity: number;
  /** Segundos que tarda en llegar el trueno. */
  delay: number;
}

export interface Storm {
  setFlashes(enabled: boolean): void;
  strike(): void;
}

export function createStorm(layer: HTMLElement, onStrike: (strike: Strike) => void): Storm {
  let flashes = true;
  let timer = 0;

  function schedule(min: number, max: number): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(strike, min + Math.random() * (max - min));
  }

  function flash(intensity: number): void {
    layer.style.setProperty('--shift', `${(Math.random() * 16 - 8).toFixed(1)}vw`);
    layer.style.setProperty('--lean', `${(-20 + Math.random() * 9).toFixed(1)}deg`);
    layer.hidden = false;

    const peak = 0.5 + intensity * 0.5;
    const animation = layer.animate(
      [
        { opacity: 0 },
        { opacity: peak * 0.85, offset: 0.07 },
        { opacity: peak * 0.22, offset: 0.17 },
        { opacity: peak, offset: 0.25 },
        { opacity: peak * 0.4, offset: 0.4 },
        { opacity: peak * 0.55, offset: 0.47 },
        { opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: 'ease-out' },
    );
    animation.onfinish = animation.oncancel = () => {
      layer.hidden = true;
    };
  }

  function strike(): void {
    schedule(18_000, 62_000);
    if (document.hidden) return;
    const intensity = 0.3 + Math.random() * 0.7;
    if (flashes && !prefersReducedMotion()) flash(intensity);
    // Cuanto más cerca cae, antes llega el trueno
    onStrike({ intensity, delay: 0.35 + (1 - intensity) * (2 + Math.random() * 4) });
  }

  schedule(7_000, 15_000);

  return {
    setFlashes(enabled) {
      flashes = enabled;
    },
    strike,
  };
}
