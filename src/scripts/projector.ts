import { onPage } from './page';

/**
 * El proyector: los mandos propios de la sala de proyección.
 *
 * La cinta arranca sola al entrar y gira en bucle hasta que alguien la detiene.
 * El estado vive en [data-projector][data-state]:
 *   paused ⇄ playing
 * y las hojas de estilo hacen el resto (mandos, aviso de bobina ilegible).
 */

type FilmElement = HTMLVideoElement & {
  mozHasAudio?: boolean;
  webkitAudioDecodedByteCount?: number;
  audioTracks?: { length: number };
  webkitEnterFullscreen?: () => void;
};

const SPEEDS = [1, 1.25, 1.5, 0.5, 0.75];

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function initProjector(): void {
  onPage(() => {
    const root = document.querySelector<HTMLElement>('[data-projector]');
    const film = root?.querySelector<FilmElement>('[data-film]');
    if (!root || !film) return;

    const html = document.documentElement;
    const screen = root.querySelector<HTMLElement>('[data-screen]')!;
    const seek = root.querySelector<HTMLInputElement>('[data-seek]')!;
    const part = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
    const button = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

    // Una cinta muda puede traer una pista de sonido vacía: no cuenta
    const silent = root.hasAttribute('data-silent');

    const abort = new AbortController();
    const on = { signal: abort.signal };
    let idle = 0;
    let scrubbing = false;
    let speed = 0;
    let ducked = false;
    let inView = true;

    function setState(state: 'playing' | 'paused' | 'error'): void {
      root!.dataset.state = state;
      html.classList.toggle('is-projecting', state === 'playing');
      button('toggle').setAttribute('aria-label', state === 'playing' ? 'Pausar' : 'Proyectar');
      if (state !== 'playing') rest(false);
    }

    /** Mientras nadie toca nada, los mandos y la cabecera se retiran. */
    function rest(resting: boolean): void {
      root!.classList.toggle('is-resting', resting);
      html.classList.toggle('is-watching', resting);
    }

    function stir(): void {
      rest(false);
      window.clearTimeout(idle);
      // La cinta ya no se acaba: fuera de la vista de la pantalla, la cabecera no se esconde
      idle = window.setTimeout(() => rest(inView && !film!.paused && !scrubbing), 2600);
    }

    const hasSound = () =>
      !silent && Boolean(film.mozHasAudio || film.webkitAudioDecodedByteCount || film.audioTracks?.length);

    /** Si la cinta trae música, la tormenta y la lumbre bajan la voz. */
    function duck(): void {
      button('mute').hidden = !hasSound();
      const should = hasSound() && !film!.paused && !film!.muted && film!.volume > 0;
      if (should === ducked) return;
      ducked = should;
      document.dispatchEvent(new CustomEvent('an:duck', { detail: should ? 0.25 : 1 }));
    }

    function paint(): void {
      seek.style.setProperty('--progress', `${seek.valueAsNumber / 10}%`);
    }

    /** Sin un gesto del visitante, el navegador sólo deja arrancar una cinta en silencio. */
    function play(): void {
      film!.play().catch((error: DOMException) => {
        if (error.name !== 'NotAllowedError' || film!.muted) return;
        film!.muted = true;
        film!.play().catch(() => {
          /* tampoco así: queda en pausa, con los mandos a la vista */
        });
      });
    }

    function toggle(): void {
      if (film!.ended) film!.currentTime = 0;
      if (film!.paused) play();
      else film!.pause();
    }

    function fullscreen(): void {
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (screen.requestFullscreen) screen.requestFullscreen().catch(() => {});
      else film!.webkitEnterFullscreen?.();
    }

    const actions: Record<string, () => void> = {
      toggle,
      fullscreen,
      speed() {
        speed = (speed + 1) % SPEEDS.length;
        film.playbackRate = SPEEDS[speed];
        part('speed').textContent = `${String(SPEEDS[speed]).replace('.', ',')}×`;
      },
      loop() {
        film.loop = !film.loop;
        button('loop').setAttribute('aria-pressed', String(film.loop));
      },
      mute() {
        film.muted = !film.muted;
      },
    };

    /** Las grabaciones sin cabecera declaran una duración infinita hasta que se han leído enteras. */
    const length = () => (Number.isFinite(film.duration) ? film.duration : 0);

    const sync = () => {
      part('duration').textContent = clock(film.duration);
      if (film.videoWidth) screen.style.setProperty('--ratio', `${film.videoWidth} / ${film.videoHeight}`);
      // Si la ficha no traía la duración, se anota la que declara el propio archivo
      const runtime = document.querySelector<HTMLElement>('[data-runtime=""]');
      if (runtime && length()) {
        const total = Math.max(1, Math.round(length()));
        runtime.textContent = `${Math.floor(total / 60)}′ ${String(total % 60).padStart(2, '0')}″`;
        runtime.dataset.runtime = 'read';
      }
    };

    // Con el dedo, el primer toque sólo despierta los mandos; el segundo ya pausa
    let wokeByTouch = false;
    screen.addEventListener(
      'pointerdown',
      (event) => {
        wokeByTouch = event.pointerType === 'touch' && root.classList.contains('is-resting');
      },
      on,
    );
    for (const type of ['pointermove', 'pointerdown', 'focusin'] as const) {
      screen.addEventListener(type, stir, on);
    }

    root.addEventListener(
      'click',
      (event) => {
        const control = (event.target as Element).closest<HTMLElement>('[data-action]');
        const onPicture = event.target === film || event.target === screen;
        if (control) actions[control.dataset.action!]?.();
        else if (onPicture && !wokeByTouch) toggle();
        wokeByTouch = false;
        stir();
      },
      on,
    );
    film.addEventListener('dblclick', fullscreen, on);

    film.addEventListener('loadedmetadata', sync, on);
    film.addEventListener('durationchange', sync, on);
    film.addEventListener(
      'playing',
      () => {
        // En bucle, el navegador puede volver a avisar en cada vuelta: los mandos sólo salen al arrancar
        const starting = root.dataset.state !== 'playing';
        setState('playing');
        if (starting) stir();
        window.setTimeout(duck, 900);
      },
      on,
    );
    film.addEventListener(
      'pause',
      () => {
        setState('paused');
        duck();
      },
      on,
    );
    film.addEventListener(
      'volumechange',
      () => {
        button('mute').setAttribute('aria-pressed', String(film.muted));
        duck();
      },
      on,
    );
    film.addEventListener('error', () => setState('error'), on);
    film.addEventListener(
      'timeupdate',
      () => {
        part('time').textContent = clock(film.currentTime);
        if (scrubbing || !length()) return;
        seek.value = String(Math.round((film.currentTime / length()) * 1000));
        paint();
      },
      on,
    );

    seek.addEventListener(
      'input',
      () => {
        scrubbing = true;
        if (length()) film.currentTime = (seek.valueAsNumber / 1000) * length();
        paint();
        stir();
      },
      on,
    );
    seek.addEventListener('change', () => (scrubbing = false), on);

    const watcher = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (!inView) rest(false);
        else if (!film.paused) stir();
      },
      { threshold: 0.4 },
    );
    watcher.observe(screen);

    document.addEventListener(
      'keydown',
      (event) => {
        if (!inView || event.ctrlKey || event.metaKey || event.altKey) return;
        if ((event.target as Element).closest('input, textarea, select, button, a, dialog')) return;
        switch (event.key) {
          case ' ':
          case 'k':
            toggle();
            break;
          case 'ArrowLeft':
            film.currentTime = Math.max(0, film.currentTime - 5);
            break;
          case 'ArrowRight':
            film.currentTime = Math.min(length() || Infinity, film.currentTime + 5);
            break;
          case 'f':
            fullscreen();
            break;
          case 'm':
            if (hasSound()) film.muted = !film.muted;
            break;
          default:
            return;
        }
        event.preventDefault();
        stir();
      },
      on,
    );

    button('mute').setAttribute('aria-pressed', String(film.muted));
    if (film.readyState >= 1) sync();
    if (film.error) setState('error');
    else play();

    return () => {
      abort.abort();
      watcher.disconnect();
      window.clearTimeout(idle);
      film.pause();
      html.classList.remove('is-projecting', 'is-watching');
      if (ducked) document.dispatchEvent(new CustomEvent('an:duck', { detail: 1 }));
    };
  });
}
