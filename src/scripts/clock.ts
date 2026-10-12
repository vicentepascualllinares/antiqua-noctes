import { onPage } from './page';

/**
 * El reloj de la casa: marca la hora del visitante en la esfera del pie
 * y la dice con palabras. De día, invita a correr las cortinas.
 */

function partOfDay(hour: number): { label: string; night: boolean } {
  if (hour < 6) return { label: 'de la madrugada', night: true };
  if (hour < 13) return { label: 'de la mañana', night: false };
  if (hour < 21) return { label: 'de la tarde', night: false };
  return { label: 'de la noche', night: true };
}

function tell(now: Date): void {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const part = partOfDay(hour);
  const twelve = hour % 12 || 12;
  const time = `${twelve === 1 ? 'Es la' : 'Son las'} ${twelve}:${String(minute).padStart(2, '0')} ${part.label}.`;
  const aside = part.night ? 'La noche es suya.' : 'Corra las cortinas: aquí dentro ya es de noche.';

  for (const el of document.querySelectorAll('[data-clock-time]')) el.textContent = time;
  for (const el of document.querySelectorAll('[data-clock-aside]')) el.textContent = aside;
  for (const el of document.querySelectorAll('[data-clock-hour]')) {
    el.setAttribute('transform', `rotate(${((hour % 12) + minute / 60) * 30} 32 32)`);
  }
  for (const el of document.querySelectorAll('[data-clock-minute]')) {
    el.setAttribute('transform', `rotate(${minute * 6} 32 32)`);
  }
}

export function initClock(): void {
  onPage(() => {
    if (!document.querySelector('[data-clock-time]')) return;
    tell(new Date());
    const timer = window.setInterval(() => tell(new Date()), 15_000);
    return () => window.clearInterval(timer);
  });
}
