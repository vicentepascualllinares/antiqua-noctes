import { onPage, prefersReducedMotion } from './page';

/**
 * Placas de linterna (las tarjetas de cada cinta).
 *   · Sin cartel, la placa toma un fotograma de la propia película cuando se acerca a la vista.
 *   · Al posar el puntero, la lámpara se enciende y la cinta corre en pequeño, muda.
 */

function showFrame(video: HTMLVideoElement): void {
  if (video.src) return;
  const slide = video.closest('[data-slide]');
  video.addEventListener(
    'loadedmetadata',
    () => {
      const at = Number(video.dataset.at ?? 2);
      video.currentTime = Math.min(at, (video.duration || at) * 0.4);
    },
    { once: true },
  );
  video.addEventListener('seeked', () => slide?.classList.add('has-frame'), { once: true });
  video.preload = 'metadata';
  video.src = video.dataset.src!;
}

export function initSlides(): void {
  onPage(() => {
    const slides = [...document.querySelectorAll<HTMLElement>('[data-slide]')];
    if (!slides.length) return;

    const abort = new AbortController();
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion();
    const timers = new WeakMap<HTMLElement, number>();

    const nearby = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          nearby.unobserve(entry.target);
          const video = entry.target.querySelector<HTMLVideoElement>('video[data-src]');
          if (video) showFrame(video);
        }
      },
      { rootMargin: '240px' },
    );

    for (const slide of slides) {
      const video = slide.querySelector<HTMLVideoElement>('video[data-src]');
      if (!video) continue;
      if (!slide.hasAttribute('data-has-poster')) nearby.observe(slide);
      if (!canHover) continue;

      slide.addEventListener(
        'pointerenter',
        () => {
          const timer = window.setTimeout(() => {
            showFrame(video);
            video.muted = true;
            video.loop = true;
            video
              .play()
              .then(() => slide.classList.add('is-running'))
              .catch(() => {});
          }, 320);
          timers.set(slide, timer);
        },
        { signal: abort.signal },
      );

      slide.addEventListener(
        'pointerleave',
        () => {
          window.clearTimeout(timers.get(slide));
          slide.classList.remove('is-running');
          video.pause();
        },
        { signal: abort.signal },
      );
    }

    return () => {
      abort.abort();
      nearby.disconnect();
      for (const slide of slides) window.clearTimeout(timers.get(slide));
    };
  });
}
