const ROMAN: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(value: number): string {
  let rest = Math.floor(value);
  if (rest <= 0) return '';
  let out = '';
  for (const [amount, glyph] of ROMAN) {
    while (rest >= amount) {
      out += glyph;
      rest -= amount;
    }
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 46 → «0′ 46″» · 198 → «3′ 18″» · 4320 → «1 h 12′» */
export function formatDuration(seconds?: number): string | undefined {
  if (!seconds || !Number.isFinite(seconds)) return undefined;
  const total = Math.max(1, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours} h ${String(minutes).padStart(2, '0')}′`;
  return `${minutes}′ ${String(secs).padStart(2, '0')}″`;
}

/** Para el atributo datetime de <time>. */
export function isoDuration(seconds?: number): string | undefined {
  if (!seconds || !Number.isFinite(seconds)) return undefined;
  const total = Math.max(1, Math.round(seconds));
  return `PT${Math.floor(total / 60)}M${total % 60}S`;
}

/**
 * Saca un título presentable (y el año, si lo lleva) del nombre de un archivo:
 * «le-manoir-du-diable_1896» → { title: 'Le manoir du diable', year: 1896 }
 */
export function titleFromFilename(base: string): { title: string; year?: number } {
  const yearMatch = base.match(/(?<!\d)(1[89]\d{2})(?!\d)/);
  let title = base;
  if (yearMatch) {
    title = title.replace(/[\s._-]*[([]?(?<!\d)1[89]\d{2}(?!\d)[)\]]?[\s._-]*/, ' ');
  }
  title = /\s/.test(title.trim()) ? title.replace(/_+/g, ' ') : title.replace(/[-_.]+/g, ' ');
  title = title.replace(/\s+/g, ' ').replace(/^[\s\-–—,.]+|[\s\-–—,.]+$/g, '');
  if (title && title === title.toLowerCase()) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return { title: title || base, year: yearMatch ? Number(yearMatch[1]) : undefined };
}
