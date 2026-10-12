import { onPage, prefersReducedMotion } from './page';

/** Enciende cada [data-reveal] cuando entra en la vista. */
export function initReveal(): void {
  onPage(() => {
    const targets = document.querySelectorAll('[data-reveal]:not(.is-lit)');
    if (!targets.length) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-lit'));
      return;
    }

    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-lit');
          watcher.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -9% 0px', threshold: 0.08 },
    );
    targets.forEach((target) => watcher.observe(target));
    return () => watcher.disconnect();
  });
}
