export type AtmosKey = 'sound' | 'storm' | 'candle';
export type Prefs = Record<AtmosKey, boolean>;

const KEY = 'an:ambiente';
const DEFAULTS: Prefs = { sound: false, storm: true, candle: true };

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento vedado: la preferencia dura lo que dure la visita */
  }
}
