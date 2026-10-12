import { onPage } from './page';

/**
 * Cabecera: se retira al bajar y vuelve al subir, esconde el nombre mientras el
 * rótulo grande de la portada sigue a la vista, y abre el panel de ambiente y el índice.
 */
export function initHeader(): void {
  let lastY = 0;

  const header = () => document.querySelector<HTMLElement>('[data-header]');
  const panel = () => document.querySelector<HTMLElement>('[data-atmos-panel]');

  function setPanel(open: boolean): void {
    const el = panel();
    if (!el || el.hidden === !open) return;
    el.hidden = !open;
    document.querySelector('[data-atmos-open]')?.setAttribute('aria-expanded', String(open));
  }

  window.addEventListener(
    'scroll',
    () => {
      const el = header();
      if (!el) return;
      const y = window.scrollY;
      el.classList.toggle('is-scrolled', y > 24);
      if (panel()?.hidden !== false) el.classList.toggle('is-away', y > lastY && y > 320);
      lastY = y;
    },
    { passive: true },
  );

  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    const menu = document.querySelector<HTMLDialogElement>('[data-menu]');

    if (target.closest('[data-atmos-open]')) setPanel(panel()?.hidden ?? false);
    else if (!target.closest('[data-atmos-panel]')) setPanel(false);

    if (target.closest('[data-menu-open]')) menu?.showModal();
    // Cierra el botón y también el clic sobre el fondo, fuera de la lista
    if (target.closest('[data-menu-close]') || target === menu) menu?.close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPanel(false);
  });

  onPage(() => {
    const el = header();
    const masthead = document.querySelector('[data-masthead]');
    lastY = window.scrollY;
    if (!el || !masthead) return;
    const watcher = new IntersectionObserver(
      ([entry]) => el.classList.toggle('is-over-masthead', entry.isIntersecting),
      { rootMargin: '-12% 0px 0px 0px' },
    );
    watcher.observe(masthead);
    return () => watcher.disconnect();
  });
}
