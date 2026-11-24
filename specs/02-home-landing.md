# SPEC 02 — Página de inicio (Home) de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: nav, sesión, `lib/data.ts`, estilos base y Biblioteca)
> **Fecha:** 2026-11-24
> **Objetivo:** Portar la landing de `references/templates/home-about/home.jsx` a la ruta `/` y mover la Biblioteca a `/biblioteca`.

---

## Por qué existe este spec

La plantilla `references/templates/home-about/` añade una landing (hero, ventajas, juegos destacados, estadísticas, actividad, precios y CTA final) y un nav con "Inicio". Hoy `/` es la Biblioteca. Este spec fija cómo encaja la Home en el App Router sin romper lo implementado en SPEC 01.

---

## Alcance

**Dentro:**

- Home en `/` con las siete secciones de `home.jsx`: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA" (6 primeras de `GAMES`), franja de estadísticas, "ACTIVIDAD EN VIVO" (ticker + top jugadores), "PRECIOS" (tarjeta + FAQ) y CTA final.
- Animación de aparición `.reveal` al hacer scroll (IntersectionObserver).
- Biblioteca movida de `/` a `/biblioteca`.
- Nav (escritorio y panel móvil) con enlaces "Inicio", "Biblioteca" y "Salón de la Fama".
- Enlaces existentes que significaban "biblioteca" apuntan a `/biblioteca`.
- `/acceso?modo=registro` abre la pestaña "CREAR CUENTA".
- Estilos de las secciones HOME PAGE, ACTIVITY y PRICING de `home-about/styles.css` en `app/globals.css`.
- Metadatos de `/` y `/biblioteca`.

**Fuera de alcance (para otros specs):**

- Pantalla "Acerca de" / contacto y su enlace en el nav (SPEC 03).
- Datos reales en "Actividad en vivo", top jugadores o estadísticas. Son constantes fijas copiadas de la plantilla, incluido "12+ JUEGOS".
- Ocultar o cambiar los CTAs "CREAR CUENTA" / "EMPEZAR GRATIS" cuando hay sesión.
- Estilos `GAMEPAD`, `Theme variants` y `ABOUT PAGE` de `home-about/styles.css`.
- Mejoras de diseño sobre la plantilla, `prefers-reduced-motion` incluido.
- Tests automatizados.

---

## Modelo de datos

Archivo nuevo: `lib/home-data.ts`. Constantes tipadas copiadas literalmente de `home.jsx`; no introduce persistencia.

```ts
import type { Accent } from "@/lib/data";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type Feature = { icon: FeatureIconKind; title: string; desc: string; color: Accent };
export type HomeStat = { n: string; u: string; s: string };                       // "12+", "JUEGOS", "Y CONTANDO"
export type RecentScore = { player: string; game: string; score: number; ago: string; color: Accent };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];          // 4
export const HOME_STATS: HomeStat[];       // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];     // 5
export const PRICING_PERKS: string[];      // 6
export const FAQS: Faq[];                  // 3
```

Convenciones:

- Números con `toLocaleString("es-ES")`, como en SPEC 01.
- El ancho de la barra del top es `100 - índice * 16` (%), igual que la plantilla.
- El parámetro de búsqueda es `modo`; solo el valor `registro` tiene efecto. Cualquier otro valor o su ausencia abre "INICIAR SESIÓN".

---

## Mapa de rutas y archivos

| Ruta | Archivo | Tipo |
| --- | --- | --- |
| `/` | `app/page.tsx` (reemplazado) | Server: compone las secciones |
| `/biblioteca` | `app/biblioteca/page.tsx` (nuevo) | Server + `components/library.tsx` (sin cambios) |

Archivos nuevos:

- `lib/home-data.ts` — constantes de la Home.
- `components/home-art.tsx` (server) — `FloatingSilhouettes` y `FeatureIcon` (SVG pixel de la plantilla).
- `components/mini-card.tsx` (server) — tarjeta pequeña como `<Link href="/juegos/[id]">`.
- `components/reveal-observer.tsx` (client) — efecto que añade `.in` a los `.reveal` visibles.

Archivos modificados:

- `app/globals.css` — secciones HOME PAGE, ACTIVITY y PRICING.
- `components/nav.tsx` — enlace "Inicio" y nuevo cálculo de enlace activo.
- `components/auth-form.tsx` — pestaña inicial según `?modo=registro`.
- `app/acceso/page.tsx` — `<Suspense>` alrededor de `AuthForm` si `useSearchParams` lo exige con `cacheComponents`.
- `app/juegos/[id]/page.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx` — enlaces "VOLVER AL VAULT" / "VOLVER A LA BIBLIOTECA" → `/biblioteca`.

Destinos de los botones de la Home:

| Botón | Destino |
| --- | --- |
| "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →", "INSERTAR MONEDA →" | `/biblioteca` |
| "✦ CREAR CUENTA", "EMPEZAR GRATIS →" | `/acceso?modo=registro` |
| "VER SALÓN →" | `/salon` |
| Tarjeta mini | `/juegos/[id]` |

---

## Plan de implementación

Antes de empezar: leer en `node_modules/next/dist/docs/01-app` las guías de `useSearchParams`, `Suspense` y `cacheComponents`, y respetar los avisos de deprecación.

1. **Estilos.** Añadir al final de `app/globals.css` las secciones `/* ===== HOME PAGE ===== */` (incluye `.reveal`, `@keyframes float` y `bounce`), `/* ===== ACTIVITY ===== */` y `/* ===== PRICING ===== */` de `references/templates/home-about/styles.css`, sin duplicar `.fade-in`, `pulse` ni `blink`. Verificar: `npm run dev` carga sin errores y las pantallas de SPEC 01 se ven igual.
2. **Mover la Biblioteca.** Crear `app/biblioteca/page.tsx` que renderiza `<Library />` con `metadata` ("Biblioteca · Arcade Vault"). `app/page.tsx` aún sin tocar. Verificar: `/biblioteca` muestra las 8 tarjetas.
3. **Enlaces a la Biblioteca.** Cambiar a `/biblioteca` los destinos de `app/juegos/[id]/page.tsx:84`, `components/game-player.tsx:164` y `components/hall-of-fame.tsx:126`. Las redirecciones de `auth-form.tsx` (enviar e invitado) siguen yendo a `/`. Verificar: los tres botones llevan a `/biblioteca`.
4. **Nav.** Añadir "Inicio" (`/`) antes de "Biblioteca" (`/biblioteca`) en escritorio y panel móvil. Activo: "Inicio" solo en `/`; "Biblioteca" en `/biblioteca` y `/juegos/*`; "Salón" en `/salon`. El logo sigue en `/`. Verificar: el resaltado es correcto en las cuatro rutas.
5. **Datos y piezas.** Crear `lib/home-data.ts`, `components/home-art.tsx`, `components/mini-card.tsx` y `components/reveal-observer.tsx`. Verificar: `npx tsc --noEmit` pasa.
6. **Home.** Reemplazar `app/page.tsx` por la Home (server) con las siete secciones, `<RevealObserver />` y `metadata` ("Arcade Vault · Portal Retro"). Verificar: `/` muestra la landing, las secciones aparecen al hacer scroll y todos los botones navegan según la tabla.
7. **Pestaña de registro.** `auth-form.tsx` lee `modo` con `useSearchParams` y arranca en `"up"` si vale `registro`; envolver en `<Suspense>` en `app/acceso/page.tsx` si la build lo exige. Verificar: `/acceso?modo=registro` muestra el campo de correo; `/acceso` no.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de Next.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" y las siete secciones de la plantilla.
- [ ] `/biblioteca` muestra exactamente 8 tarjetas con el filtro "TODOS".
- [ ] "JUEGOS DISPONIBLES AHORA" muestra exactamente 6 tarjetas mini y la primera lleva a `/juegos/bloque-buster`.
- [ ] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/biblioteca`.
- [ ] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/acceso?modo=registro` y la pestaña "CREAR CUENTA" está activa con el campo de correo visible.
- [ ] `/acceso` sin parámetro abre la pestaña "INICIAR SESIÓN".
- [ ] "VER SALÓN →" navega a `/salon`.
- [ ] Al cargar `/`, las secciones con `.reveal` bajo el pliegue están ocultas y reciben la clase `in` al entrar en pantalla.
- [ ] El nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" en escritorio y en el panel móvil; no muestra "Acerca de".
- [ ] Enlace activo: "Inicio" en `/`; "Biblioteca" en `/biblioteca`, `/juegos/*` y `/juegos/*/jugar`; "Salón de la Fama" en `/salon`.
- [ ] "VOLVER AL VAULT" del detalle y del modal del reproductor, y "VOLVER A LA BIBLIOTECA" del salón, navegan a `/biblioteca`.
- [ ] Iniciar sesión o "Jugar como invitado" navega a `/`.
- [ ] La consola no muestra errores de hidratación en `/`, `/biblioteca` ni `/acceso?modo=registro`.
- [ ] A 375 px de ancho `/` no tiene scroll horizontal y las rejillas pasan a una o dos columnas.
- [ ] No existe ningún archivo `.jsx` nuevo ni uso de `any` en el código añadido.

---

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/biblioteca`. Coincide con el nav de la plantilla y el logo lleva a la landing.
- **No:** Home en `/inicio`. Deja la landing fuera de la entrada principal.
- **Sí:** "Acerca de" en un spec aparte (SPEC 03), y su enlace del nav también. Mantiene el objetivo en una frase y evita un enlace roto.
- **Sí:** actividad, top jugadores y estadísticas como constantes fijas, incluido "12+" aunque `GAMES` tenga 8. Fidelidad visual y sin riesgo de hidratación.
- **No:** derivarlos de `seededScores` o `av_scores`. Se aleja de la plantilla y adelanta el spec de puntuaciones reales.
- **Sí:** `/acceso?modo=registro` abre "CREAR CUENTA". Los CTAs de registro cumplen lo que prometen con un cambio pequeño.
- **Sí:** página de la Home como server component; solo `RevealObserver` es client. Los botones son `<Link>`, no `onClick` + `navigate`.
- **Sí:** las redirecciones de acceso (enviar, invitado) siguen yendo a `/`, que ahora es la Home.
- **Sí:** copiar solo las secciones de CSS que usa la Home; el resto de `home-about/styles.css` ya está en `globals.css` o pertenece a otros specs.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `useSearchParams` en `AuthForm` rompe el prerenderizado con `cacheComponents` | Consultar la guía en `node_modules/next/dist/docs` y envolver en `<Suspense>`; el fallback es el formulario en "INICIAR SESIÓN". |
| `.reveal` deja secciones invisibles si el JS no carga o falta `IntersectionObserver` | `RevealObserver` añade `.in` a todos los `.reveal` si `IntersectionObserver` no existe. |
| Enlaces que apuntaban a `/` como Biblioteca quedan mal | El paso 3 lista los tres archivos; buscar `href="/"` y `push("/")` antes de cerrar. |
| CSS duplicado o en conflicto con `globals.css` | El paso 1 indica qué keyframes y utilidades no duplicar. |
| `.blink` del eyebrow no parpadea (en `globals.css` solo existe `.av-hero .sub .blink`) | Se respeta la plantilla; si se quiere el parpadeo, va en un spec de ajustes visuales. |

---

## Qué **no** entra en este spec

- Pantalla "Acerca de" / contacto y su enlace del nav.
- Datos reales en actividad, top o estadísticas.
- Cambios de CTAs según la sesión.
- Estilos de gamepad y variantes de tema.
- Cambios de diseño sobre la plantilla.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
