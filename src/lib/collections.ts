import type { CollectionEntry } from 'astro:content';
import { roomById } from '@/config/site';
import { slugify } from './format';
import { IMAGE_EXTENSIONS, listMedia, resolveMedia } from './media';
import { getSheets } from './sheets';

/**
 * Las demás estancias. Cada función devuelve su colección ya ordenada
 * y con las imágenes resueltas; una colección vacía deja la estancia a oscuras.
 */


type Sortable = { data: { order?: number; year?: number; title: string } };

const inOrder = (a: Sortable, b: Sortable) =>
  (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
  (a.data.year ?? Infinity) - (b.data.year ?? Infinity) ||
  a.data.title.localeCompare(b.data.title, 'es');

export interface Reading {
  slug: string;
  href: string;
  entry: CollectionEntry<'literature'>;
}

export async function getReadings(): Promise<Reading[]> {
  const entries = (await getSheets('literature')).sort(inOrder);
  return entries.map((entry) => {
    const slug = slugify(entry.id);
    return { slug, href: `${roomById('literature').href}${slug}/`, entry };
  });
}

export interface Photograph {
  slug: string;
  href: string;
  image?: string;
  entry: CollectionEntry<'photographs'>;
}

export async function getPhotographs(): Promise<Photograph[]> {
  const files = listMedia('photographs', IMAGE_EXTENSIONS);
  const entries = (await getSheets('photographs')).sort(inOrder);
  return entries.map((entry) => {
    const slug = slugify(entry.id);
    return {
      slug,
      href: `${roomById('photographs').href}${slug}/`,
      image: resolveMedia(entry.data.image, files),
      entry,
    };
  });
}

export interface Product {
  slug: string;
  image?: string;
  entry: CollectionEntry<'products'>;
}

export async function getProducts(): Promise<Product[]> {
  const files = listMedia('products', IMAGE_EXTENSIONS);
  const entries = (await getSheets('products')).sort(inOrder);
  return entries.map((entry) => ({
    slug: slugify(entry.id),
    image: resolveMedia(entry.data.image, files),
    entry,
  }));
}

/** Artículos del bazar ligados a una obra, p. ej. «films/el-beso». */
export async function getProductsFor(reference: string): Promise<Product[]> {
  return (await getProducts()).filter((product) => product.entry.data.related === reference);
}
