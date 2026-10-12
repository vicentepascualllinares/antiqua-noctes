/**
 * Datos generales de la casa. Todo lo que cambia de un sitio a otro
 * (nombre, lema, logo, estancias) vive aquí.
 */

export interface LogoImage {
  /** Ruta dentro de /public, p. ej. '/brand/logo.svg' */
  src: string;
  width: number;
  height: number;
}

export const site = {
  name: 'Antiqua Noctes',
  /** El nombre partido en líneas, para la cabecera grande. */
  wordmark: ['Antiqua', 'Noctes'],
  tagline: 'Cintas, lecturas y retratos de otro tiempo, para las noches sin prisa.',
  invitation: 'Arde la lumbre, llueve en los cristales y nadie le espera mañana.',
  description:
    'Películas, lecturas y fotografías de otro tiempo, reunidas para verlas despacio, de noche y a solas.',
  lang: 'es',
  /**
   * LOGO. Mientras sea `null` se muestra el nombre compuesto en tipos.
   * Cuando exista la imagen, cópiala en /public/brand y descomenta:
   *   logo: { src: '/brand/logo.svg', width: 640, height: 220 },
   */
  logo: null as LogoImage | null,
} as const;

export type RoomId = 'films' | 'literature' | 'photographs' | 'shop';

export interface Room {
  id: RoomId;
  numeral: string;
  /** Nombre de la estancia. */
  label: string;
  /** Qué hay dentro, dicho en llano. */
  plain: string;
  href: string;
  blurb: string;
  /** Lo que se lee mientras la estancia no tiene contenido. */
  closedNote: string;
}

export const rooms: Room[] = [
  {
    id: 'films',
    numeral: 'I',
    label: 'Cinematógrafo',
    plain: 'Películas',
    href: '/peliculas/',
    blurb: 'Cintas de los primeros días de la imagen en movimiento.',
    closedNote: 'Todavía no hay cintas en el programa. Vuelva otra noche.',
  },
  {
    id: 'literature',
    numeral: 'II',
    label: 'Biblioteca',
    plain: 'Lecturas',
    href: '/lecturas/',
    blurb: 'Cuentos, poemas y novelas para leer a media luz.',
    closedNote: 'Estamos disponiendo los anaqueles. Vuelva otra noche.',
  },
  {
    id: 'photographs',
    numeral: 'III',
    label: 'Galería',
    plain: 'Fotografías',
    href: '/fotografias/',
    blurb: 'Retratos y vistas en placas de plata y de vidrio.',
    closedNote: 'Las placas aún se están revelando. Vuelva otra noche.',
  },
  {
    id: 'shop',
    numeral: 'IV',
    label: 'Bazar',
    plain: 'Ediciones físicas',
    href: '/tienda/',
    blurb: 'Cintas en disco, libros impresos y otros objetos para llevarse la noche a casa.',
    closedNote: 'Los estantes están todavía vacíos. Vuelva otra noche.',
  },
];

export const roomById = (id: RoomId): Room => rooms.find((room) => room.id === id)!;
