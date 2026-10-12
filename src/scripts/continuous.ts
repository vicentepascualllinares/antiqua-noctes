import { onPage } from './page';

/**
 * Sesión continua: las cintas se encadenan sin fin, como en un cine de entrada
 * libre. El orden se baraja de nuevo en cada visita, así que nunca se entra dos
 * veces a lo mismo. Con una sola película, se proyecta en bucle.
 *
 * Las cintas mudas arrancan solas (sin sonido, que es lo que el navegador
 * permite); una con sonido propio empieza muda y se puede encender a mano.
 *
 * Las hay de dos o tres segundos: ésas dan varias vueltas seguidas antes de
 * ceder la pantalla, para que dé tiempo a verlas.
 */

/** Lo menos que una cinta pasa en pantalla, en segundos. */
const MIN_ON_SCREEN = 15;

interface Reel {
  slug: string;
  title: string;
  year?: number;
  href: string;
  video: string;
  silent: boolean;
}

type Film = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Baraja una copia (Fisher-Yates); si puede, evita repetir de salida la última vista. */
function shuffle<T>(list: T[], avoidFirst?: T): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (avoidFirst !== undefined && out.length > 1 && out[0] === avoidFirst) {
    [out[0], out[1]] = [out[1], out[0]];
  }
  return out;
}

export function initContinuous(): void {
  onPage(() => {
    const root = document.querySelector<HTMLElement>('[data-continuous]');
    const film = root?.querySelector<Film>('[data-film]');
    if (!root || !film) return;

    let reels: Reel[];
    try {
      reels = JSON.parse(root.querySelector('[data-reels]')?.textContent ?? '[]');
    } catch {
      return;
    }
    if (!reels.length) return;

    const html = document.documentElement;
    const screen = root.querySelector<HTMLElement>('[data-screen]')!;
    const list = root.querySelector<HTMLOListElement>('[data-order]')!;
    const part = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
    const button = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

    const abort = new AbortController();
    const on = { signal: abort.signal };
    let order = shuffle(reels);
    let idx = 0;
    let idle = 0;
    let ducked = false;
    let wantPlay = false; // si la sesión debería estar corriendo (y no pausada a mano)
    let passesLeft = 0; // vueltas que aún debe dar una cinta breve
    let lastTime = 0;

    const hasSound = () => Boolean(!order[idx].silent && film.duration);

    function rest(resting: boolean): void {
      root!.classList.toggle('is-resting', resting);
      html.classList.toggle('is-watching', resting);
    }

    function stir(): void {
      rest(false);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => rest(!film!.paused), 2800);
    }

    function duck(): void {
      const should = hasSound() && !film!.paused && !film!.muted && film!.volume > 0;
      if (should === ducked) return;
      ducked = should;
      document.dispatchEvent(new CustomEvent('an:duck', { detail: should ? 0.25 : 1 }));
    }

    /** La programación de la sesión, en el orden barajado. */
    function paintOrder(): void {
      list.replaceChildren();
      order.forEach((reel, i) => {
        const li = document.createElement('li');
        li.className = 'continuous__item';
        const control = document.createElement('button');
        control.type = 'button';
        control.dataset.jump = String(i);
        const dot = document.createElement('span');
        dot.className = 'continuous__dot';
        const name = document.createElement('span');
        name.className = 'continuous__name';
        name.textContent = reel.title;
        control.append(dot, name);
        if (reel.year) {
          const year = document.createElement('span');
          year.className = 'continuous__year';
          year.textContent = String(reel.year);
          control.append(year);
        }
        li.append(control);
        list.append(li);
      });
    }

    function marquee(): void {
      const now = order[idx];
      const next = order[(idx + 1) % order.length];
      part('now').textContent = now.title + (now.year ? ` · ${now.year}` : '');
      part('nowLink').setAttribute('href', now.href);
      const onlyOne = order.length < 2;
      part('next').textContent = onlyOne ? '' : next.title;
      part('nextLabel').hidden = onlyOne;
      root!.classList.remove('is-titled');
      void root!.offsetWidth; // reinicia la animación del rótulo
      root!.classList.add('is-titled');
      for (const item of list.querySelectorAll('[aria-current]')) item.removeAttribute('aria-current');
      list.children[idx]?.setAttribute('aria-current', 'true');
      button('mute').hidden = !hasSound();
    }

    function play(): void {
      film!.play().catch(() => {
        /* el navegador lo impidió; el visitante puede darle a reproducir */
      });
    }

    function load(autoplay: boolean): void {
      root!.dataset.state = 'loading';
      passesLeft = 0;
      lastTime = 0;
      film!.loop = order.length < 2;
      film!.src = order[idx].video;
      film!.load();
      marquee();
      if (autoplay) {
        wantPlay = true;
        play();
      }
    }

    function advance(step: number): void {
      idx += step;
      if (idx >= order.length) {
        // Vuelta completa: se baraja otra vez para que el bucle no sea idéntico
        order = order.length > 1 ? shuffle(reels, order[order.length - 1]) : order;
        idx = 0;
        if (order.length > 1) paintOrder();
      } else if (idx < 0) {
        idx = order.length - 1;
      }
      load(true);
    }

    function fullscreen(): void {
      if (document.fullscreenElement) void document.exitFullscreen();
      else if (screen.requestFullscreen) screen.requestFullscreen().catch(() => {});
      else film!.webkitEnterFullscreen?.();
    }

    const actions: Record<string, () => void> = {
      toggle() {
        wantPlay = film!.paused;
        if (film!.paused) play();
        else film!.pause();
      },
      next: () => advance(1),
      previous: () => advance(film!.currentTime > 3 ? 0 : -1),
      mute() {
        film!.muted = !film!.muted;
      },
      fullscreen,
    };

    root.addEventListener(
      'click',
      (event) => {
        const control = (event.target as Element).closest<HTMLElement>('[data-action]');
        const jump = (event.target as Element).closest<HTMLElement>('[data-jump]');
        if (control) actions[control.dataset.action!]?.();
        else if (jump) {
          idx = Number(jump.dataset.jump);
          load(true);
        } else if (event.target === film || event.target === screen) {
          actions.toggle();
        }
        stir();
      },
      on,
    );

    film.addEventListener('dblclick', fullscreen, on);
    film.addEventListener(
      'loadedmetadata',
      () => {
        if (order.length < 2 || !Number.isFinite(film.duration) || film.duration <= 0) return;
        passesLeft = Math.ceil(MIN_ON_SCREEN / film.duration) - 1;
        film.loop = passesLeft > 0;
      },
      on,
    );
    film.addEventListener(
      'timeupdate',
      () => {
        // En bucle no hay «ended»: la vuelta se nota porque el reloj retrocede
        if (passesLeft > 0 && film.currentTime < lastTime) {
          passesLeft -= 1;
          if (!passesLeft) film.loop = false; // la última pasada sí termina, y da paso a la siguiente
        }
        lastTime = film.currentTime;
      },
      on,
    );
    film.addEventListener(
      'canplay',
      () => {
        // El primer play() puede pedirse antes de que la cinta esté lista: se reintenta aquí
        if (wantPlay && film.paused) play();
        root.dataset.state = film.paused ? 'paused' : 'playing';
      },
      on,
    );
    film.addEventListener(
      'playing',
      () => {
        // Una cinta que da otra vuelta no vuelve a anunciarse ni a sacar los mandos
        const starting = root.dataset.state !== 'playing';
        root.dataset.state = 'playing';
        html.classList.add('is-projecting');
        button('toggle').setAttribute('aria-label', 'Pausar');
        if (starting) stir();
        window.setTimeout(duck, 800);
      },
      on,
    );
    film.addEventListener(
      'pause',
      () => {
        if (!film.ended) root.dataset.state = 'paused';
        html.classList.remove('is-projecting');
        button('toggle').setAttribute('aria-label', 'Reanudar');
        rest(false);
        duck();
      },
      on,
    );
    film.addEventListener('ended', () => advance(1), on);
    // Una cinta que falle no detiene la sesión: se pasa a la siguiente
    film.addEventListener('error', () => order.length > 1 && advance(1), on);
    film.addEventListener(
      'volumechange',
      () => {
        button('mute').setAttribute('aria-pressed', String(film.muted));
        duck();
      },
      on,
    );

    for (const type of ['pointermove', 'pointerdown', 'focusin'] as const) {
      screen.addEventListener(type, stir, on);
    }

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if ((event.target as Element).closest('input, textarea, select, button, a')) return;
        const keys: Record<string, () => void> = {
          ' ': actions.toggle,
          k: actions.toggle,
          n: actions.next,
          ArrowRight: actions.next,
          p: actions.previous,
          ArrowLeft: actions.previous,
          f: fullscreen,
          m: () => {
            if (hasSound()) actions.mute();
          },
        };
        if (!keys[event.key]) return;
        event.preventDefault();
        keys[event.key]();
        stir();
      },
      on,
    );

    paintOrder();
    load(true);

    return () => {
      abort.abort();
      window.clearTimeout(idle);
      film.pause();
      html.classList.remove('is-projecting', 'is-watching');
      if (ducked) document.dispatchEvent(new CustomEvent('an:duck', { detail: 1 }));
    };
  });
}
