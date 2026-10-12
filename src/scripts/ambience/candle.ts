/** Una vela en la mano: un cerco de luz cálida que sigue al puntero con algo de retraso. */
export function createCandle(light: HTMLElement): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let frame = 0;
  let lit = false;

  function follow(): void {
    x += (targetX - x) * 0.13;
    y += (targetY - y) * 0.13;
    light.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.4 ? requestAnimationFrame(follow) : 0;
  }

  document.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!lit) {
        x = targetX;
        y = targetY;
        lit = true;
        light.classList.add('is-lit');
      }
      if (!frame) frame = requestAnimationFrame(follow);
    },
    { passive: true },
  );

  document.documentElement.addEventListener('mouseleave', () => {
    lit = false;
    light.classList.remove('is-lit');
  });
}
