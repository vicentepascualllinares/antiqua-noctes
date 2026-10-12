import fs from 'node:fs';
import path from 'node:path';

/**
 * Acceso a los archivos de public/media. Sólo se usa al construir las páginas
 * (nunca en el navegador).
 */

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m4v', '.mov', '.ogv'];
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

const PUBLIC_DIR = path.join(process.cwd(), 'public');

export interface MediaFile {
  /** Nombre completo: «el-beso.mp4» */
  name: string;
  /** Sin extensión: «el-beso» */
  base: string;
  ext: string;
  abs: string;
  url: string;
}

const siteBase = () => import.meta.env.BASE_URL.replace(/\/$/, '');

export const isRemote = (ref: string) => /^https?:\/\//i.test(ref);

/**
 * Un tramo de dirección a partir de un nombre de archivo. La coma y compañía se
 * dejan tal cual: son válidas en una ruta y, codificadas, el servidor de
 * desarrollo no encuentra el archivo («Monkeyshines, No. 1.mp4»).
 */
const encodeSegment = (segment: string) =>
  encodeURIComponent(segment).replace(/%(?:3B|40|26|3D|2B|24|2C)/gi, decodeURIComponent);

export function mediaUrl(folder: string, file: string): string {
  return `${siteBase()}/media/${folder}/${file.split('/').map(encodeSegment).join('/')}`;
}

export function listMedia(folder: string, extensions: string[]): MediaFile[] {
  const dir = path.join(PUBLIC_DIR, 'media', folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const ext = path.extname(entry.name);
      return {
        name: entry.name,
        base: entry.name.slice(0, -ext.length),
        ext: ext.toLowerCase(),
        abs: path.join(dir, entry.name),
        url: mediaUrl(folder, entry.name),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
}

/** Busca un archivo por el nombre escrito en una ficha, sin exigir mayúsculas exactas. */
export function findByName(files: MediaFile[], name: string): MediaFile | undefined {
  const wanted = name.toLowerCase();
  return files.find((file) => file.name === name) ?? files.find((file) => file.name.toLowerCase() === wanted);
}

/**
 * Convierte la referencia de una ficha en una dirección utilizable:
 * una URL completa se respeta; un nombre de archivo se busca en su carpeta de media.
 */
export function resolveMedia(ref: string | undefined, files: MediaFile[]): string | undefined {
  if (!ref) return undefined;
  if (isRemote(ref)) return ref;
  return findByName(files, ref)?.url;
}

/**
 * Duración de un MP4/MOV leyendo su cabecera (átomo moov › mvhd), sin dependencias.
 * Devuelve undefined si el archivo no la declara o tiene otro formato.
 */
export function readVideoDuration(file: MediaFile): number | undefined {
  if (!['.mp4', '.m4v', '.mov'].includes(file.ext)) return undefined;
  let fd: number | undefined;
  try {
    fd = fs.openSync(file.abs, 'r');
    const { size } = fs.fstatSync(fd);
    const moov = findAtom(fd, 'moov', 0, size);
    if (!moov) return undefined;
    const mvhd = findAtom(fd, 'mvhd', moov.start, moov.end);
    if (!mvhd) return undefined;
    const body = Buffer.alloc(32);
    fs.readSync(fd, body, 0, 32, mvhd.start);
    const version = body[0];
    const timescale = version === 1 ? body.readUInt32BE(20) : body.readUInt32BE(12);
    const duration = version === 1 ? Number(body.readBigUInt64BE(24)) : body.readUInt32BE(16);
    const seconds = timescale ? duration / timescale : 0;
    return seconds > 0 && Number.isFinite(seconds) ? seconds : undefined;
  } catch {
    return undefined;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function findAtom(fd: number, wanted: string, from: number, to: number) {
  const head = Buffer.alloc(16);
  let pos = from;
  while (pos + 8 <= to) {
    fs.readSync(fd, head, 0, 16, pos);
    let size = head.readUInt32BE(0);
    let headerSize = 8;
    if (size === 1) {
      size = Number(head.readBigUInt64BE(8));
      headerSize = 16;
    } else if (size === 0) {
      size = to - pos;
    }
    if (size < headerSize) return undefined;
    if (head.toString('latin1', 4, 8) === wanted) {
      return { start: pos + headerSize, end: pos + size };
    }
    pos += size;
  }
  return undefined;
}
