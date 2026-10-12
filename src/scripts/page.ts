/**
 * Con el paso de páginas en iris el documento no se recarga: cada módulo
 * prepara lo suyo al llegar a una página y lo recoge al salir de ella.
 */
type Teardown = void | (() => void);

export function onPage(setup: () => Teardown): void {
  let teardown: Teardown;
  document.addEventListener('astro:page-load', () => {
    teardown?.();
    teardown = setup();
  });
  document.addEventListener('astro:before-swap', () => {
    teardown?.();
    teardown = undefined;
  });
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
