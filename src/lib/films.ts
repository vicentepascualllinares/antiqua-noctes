import type { CollectionEntry } from 'astro:content';
import { roomById } from '@/config/site';
import { slugify, titleFromFilename } from './format';
import {
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  findByName,
  isRemote,
  listMedia,
  readVideoDuration,
  resolveMedia,
  type MediaFile,
} from './media';
import { getSheets } from './sheets';

/**
 * El programa de cintas.
 *
 * Sale de dos sitios que se casan por el nombre:
 *   - los archivos de public/media/films aparecen solos;
 *   - las fichas de src/content/films les ponen título, año y texto.
 * Un archivo sin ficha se anuncia con el título que se deduce de su nombre.
 */

export const FILMS_FOLDER = 'films';

export interface Film {
  slug: string;
  href: string;
  /** Lugar que ocupa en el programa, empezando por 1. */
  number: number;
  title: string;
  originalTitle?: string;
  year?: number;
  director?: string;
  cinematographer?: string;
  cast?: string[];
  studio?: string;
  country?: string;
  summary?: string;
  /** Datos sueltos propios de esta cinta, para la ficha. */
  facts?: Array<{ term: string; detail: string }>;
  /** Dirección del vídeo; falta si la ficha existe pero el archivo no. */
  video?: string;
  /** Nombre del archivo que la ficha esperaba encontrar. */
  expectedFile?: string;
  poster?: string;
  posterTime: number;
  /** En segundos. */
  duration?: number;
  silent: boolean;
  colour?: string;
  featured: boolean;
  order?: number;
  sheet?: CollectionEntry<'films'>;
}

type Draft = Omit<Film, 'number'>;

const hrefFor = (slug: string) => `${roomById('films').href}${slug}/`;

/** Entre dos archivos de la misma cinta se prefiere el formato más compatible. */
const byPreference = (a: MediaFile, b: MediaFile) =>
  VIDEO_EXTENSIONS.indexOf(a.ext) - VIDEO_EXTENSIONS.indexOf(b.ext);

async function loadFilms(): Promise<Film[]> {
  const sheets = await getSheets('films');
  const videos = listMedia(FILMS_FOLDER, VIDEO_EXTENSIONS);
  const images = listMedia(FILMS_FOLDER, IMAGE_EXTENSIONS);
  const posterFor = (base: string) => images.find((image) => slugify(image.base) === slugify(base))?.url;

  const claimed = new Set<string>();
  const drafts = new Map<string, Draft>();

  for (const sheet of sheets) {
    const slug = slugify(sheet.id);
    const data = sheet.data;
    const candidates = videos.filter((video) => slugify(video.base) === slug).sort(byPreference);
    const remote = data.video && isRemote(data.video) ? data.video : undefined;
    const file = remote ? undefined : data.video ? findByName(videos, data.video) : candidates[0];
    if (file) claimed.add(file.name);
    candidates.forEach((candidate) => claimed.add(candidate.name));

    drafts.set(slug, {
      slug,
      href: hrefFor(slug),
      title: data.title,
      originalTitle: data.originalTitle,
      year: data.year,
      director: data.director,
      cinematographer: data.cinematographer,
      cast: data.cast,
      studio: data.studio,
      country: data.country,
      summary: data.summary,
      facts: data.facts,
      video: remote ?? file?.url,
      expectedFile: remote || file ? undefined : (data.video ?? `${sheet.id}.mp4`),
      poster: resolveMedia(data.poster, images) ?? posterFor(file?.base ?? sheet.id),
      posterTime: data.posterTime ?? 2,
      duration: data.duration ?? (file ? readVideoDuration(file) : undefined),
      silent: data.silent,
      colour: data.colour,
      featured: data.featured,
      order: data.order,
      sheet,
    });
  }

  for (const video of [...videos].sort(byPreference)) {
    if (claimed.has(video.name)) continue;
    const slug = slugify(video.base);
    if (!slug || drafts.has(slug)) continue;
    const guess = titleFromFilename(video.base);
    drafts.set(slug, {
      slug,
      href: hrefFor(slug),
      title: guess.title,
      year: guess.year,
      video: video.url,
      poster: posterFor(video.base),
      posterTime: 2,
      duration: readVideoDuration(video),
      silent: true,
      featured: false,
    });
  }

  return [...drafts.values()]
    .sort(
      (a, b) =>
        (a.order ?? Infinity) - (b.order ?? Infinity) ||
        (a.year ?? Infinity) - (b.year ?? Infinity) ||
        a.title.localeCompare(b.title, 'es'),
    )
    .map((draft, index) => ({ ...draft, number: index + 1 }));
}

let cache: Promise<Film[]> | undefined;

/** En desarrollo se relee la carpeta en cada visita: una cinta recién copiada aparece al recargar. */
export function getFilms(): Promise<Film[]> {
  if (import.meta.env.DEV) return loadFilms();
  return (cache ??= loadFilms());
}

/** La cinta de portada: la marcada como `featured` o, si ninguna lo está, la primera del programa. */
export function pickFeatured(films: Film[]): Film | undefined {
  const playable = films.filter((film) => film.video);
  return playable.find((film) => film.featured) ?? playable[0];
}
