import fs from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

const isSheet = (file: string) => /(^|[\/])[^_\/][^\/]*\.md$/.test(file);

/**
 * Las fichas publicables de una colección (los borradores sólo se ven en desarrollo).
 * Si la carpeta aún no tiene ninguna, responde vacío sin molestar a Astro,
 * que de otro modo repite un aviso por cada consulta.
 */
export async function getSheets<C extends CollectionKey>(name: C): Promise<CollectionEntry<C>[]> {
  const folder = path.join(process.cwd(), 'src', 'content', name);
  const any = fs.existsSync(folder) && fs.readdirSync(folder, { recursive: true }).some((file) => isSheet(String(file)));
  if (!any) return [];
  const entries = await getCollection(name);
  return entries.filter((entry) => import.meta.env.DEV || !(entry.data as { draft?: boolean }).draft);
}
