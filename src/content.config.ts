import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Cada colección es una carpeta de fichas en Markdown dentro de src/content.
 * Los archivos que empiezan por «_» (las plantillas) se ignoran.
 */
const sheets = (folder: string) =>
  glob({ pattern: '**/[^_]*.md', base: `./src/content/${folder}` });

const films = defineCollection({
  loader: sheets('films'),
  schema: z.object({
    title: z.string(),
    originalTitle: z.string().optional(),
    year: z.number().int().optional(),
    director: z.string().optional(),
    /** Quien estuvo tras la cámara. */
    cinematographer: z.string().optional(),
    /** Reparto, uno por línea. */
    cast: z.array(z.string()).optional(),
    /** Casa productora, estudio o expedición. */
    studio: z.string().optional(),
    country: z.string().optional(),
    /** Frase breve para tarjetas y portada. */
    summary: z.string().optional(),
    /**
     * Datos sueltos para lo propio de cada cinta (su aparato, su procedencia…).
     * En la ficha se escriben como una lista:
     *   facts:
     *     - term: Aparato
     *       detail: Revólver fotográfico
     */
    facts: z.array(z.object({ term: z.string(), detail: z.string() })).optional(),
    /** Archivo dentro de public/media/films o dirección completa (https://…). */
    video: z.string().optional(),
    /** Imagen dentro de public/media/films o dirección completa. */
    poster: z.string().optional(),
    /** Segundo del que se toma el fotograma cuando no hay cartel. */
    posterTime: z.number().nonnegative().optional(),
    /** Duración en segundos; sólo hace falta si no se puede leer del archivo. */
    duration: z.number().positive().optional(),
    silent: z.boolean().default(true),
    colour: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const literature = defineCollection({
  loader: sheets('literature'),
  schema: z.object({
    title: z.string(),
    author: z.string().optional(),
    year: z.number().int().optional(),
    /** Cuento, poema, novela, ensayo… */
    kind: z.string().optional(),
    translator: z.string().optional(),
    summary: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const photographs = defineCollection({
  loader: sheets('photographs'),
  schema: z.object({
    title: z.string(),
    /** Archivo dentro de public/media/photographs o dirección completa. */
    image: z.string(),
    author: z.string().optional(),
    year: z.number().int().optional(),
    place: z.string().optional(),
    /** Daguerrotipo, albúmina, colodión… */
    process: z.string().optional(),
    summary: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: sheets('products'),
  schema: z.object({
    title: z.string(),
    /** Disco, libro, lámina, objeto… */
    kind: z.string(),
    /** Tal como debe leerse: «18 €». */
    price: z.string().optional(),
    /** Imagen dentro de public/media/products o dirección completa. */
    image: z.string().optional(),
    /** Enlace de compra (tienda externa). Sin él se anuncia como «próximamente». */
    url: z.string().optional(),
    summary: z.string().optional(),
    /** Ficha de la obra con la que se relaciona, p. ej. «films/le-manoir-du-diable». */
    related: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { films, literature, photographs, products };
