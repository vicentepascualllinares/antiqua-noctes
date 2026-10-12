# Antiqua Noctes · web

Sitio estático hecho con [Astro](https://astro.build). Sin base de datos ni servidor propio:
el contenido son archivos en carpetas.

```bash
npm install      # sólo la primera vez
npm run dev      # http://localhost:4321, se actualiza al guardar
npm run build    # genera la web publicable en dist/
```

## Dónde va cada cosa

| Qué | Dónde | Notas |
| --- | --- | --- |
| **Películas** | `public/media/films/` | `.mp4` (H.264) o `.webm`. Aparecen solas al copiarlas. |
| Carteles | `public/media/films/` | Imagen con el mismo nombre que el vídeo. Opcional: si falta, se usa un fotograma. |
| Fichas de películas | `src/content/films/` | Opcional. Mismo nombre que el vídeo, en `.md`. Ver `_plantilla.md`. |
| Lecturas | `src/content/literature/` | Un `.md` por obra, con el texto dentro. |
| Fotografías | `public/media/photographs/` + ficha en `src/content/photographs/` | |
| Artículos del bazar | `src/content/products/` (+ imagen en `public/media/products/`) | |
| Logo | `public/brand/` y activarlo en `src/config/site.ts` | Hoy se compone el nombre en tipos. |

Una estancia sin contenido se muestra «a oscuras»; en cuanto tiene una ficha, se abre sola.

Cada película se abre en su propia página (proyector + ficha + texto); la cinta arranca sola y gira
en bucle, sin cartelas de entrada ni de salida. La ficha admite, además de
año, dirección y país: **cámara** (`cinematographer`), **reparto** (`cast`), **producción** (`studio`)
y una lista libre de **datos sueltos** (`facts:` con `term`/`detail`) para lo propio de cada cinta.

**Sesión continua** (`/sala/`): todas las películas encadenadas sin fin, barajadas de nuevo en cada
visita. Se entra desde el Cinematógrafo y desde la portada; con una sola cinta, va en bucle. Las
cintas de pocos segundos dan varias vueltas (hasta sumar unos quince) antes de ceder la pantalla.

### Una película, paso a paso

1. Copia `1896 - The Kiss.mp4` en `public/media/films/` (los vídeos se nombran «año - título», sin
   nada más). Ya sale en el programa como «The Kiss», 1896: el título y el año se deducen del nombre.
2. Para darle título, director, sinopsis y texto, copia `src/content/films/_plantilla.md`
   como `src/content/films/1896-the-kiss.md` (el mismo nombre, en minúsculas y con guiones) y rellénala.

Vídeos muy pesados: en la ficha, `video:` admite una dirección `https://…` en lugar de un archivo local.

## Cómo está organizado

```
src/
  config/site.ts        nombre, lema, logo y lista de estancias
  content.config.ts     qué campos admite cada tipo de ficha
  content/              las fichas (Markdown)
  lib/                  lectura del catálogo: fichas + archivos de public/media
  layouts/Base.astro    esqueleto común de todas las páginas
  components/
    layout/             cabecera, pie, logo y capas de ambiente
    home/               secciones de la portada
    films/              placa de linterna (tarjeta) y proyector (reproductor)
    ui/, ornaments/     piezas pequeñas reutilizables
  pages/                una carpeta por estancia: peliculas, lecturas, fotografias, tienda
  scripts/              comportamiento en el navegador (ambiente, proyector, cabecera…)
  styles/               tokens (colores, tipos, medidas) y estilos globales
```

Para añadir una estancia nueva: una entrada en `rooms` (`src/config/site.ts`), su colección en
`src/content.config.ts`, una función en `src/lib/collections.ts` y su carpeta en `src/pages/`.

## Ambiente

La lumbre, las pavesas, los relámpagos, la luz de vela y el sonido (lluvia, fuego y truenos,
sintetizados en el navegador) viven en `src/components/layout/Ambience*.astro` y
`src/scripts/ambience/`. El visitante puede apagarlos desde «Ambiente», en la cabecera, y todo
respeta la preferencia de movimiento reducido del sistema.
