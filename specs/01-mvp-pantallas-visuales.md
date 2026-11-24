# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Estado:** Implementado
> **Depende de:** Ninguna (el tema y las fuentes ya están en `app/globals.css` y `app/layout.tsx` desde el commit `54deac0`)
> **Fecha:** 2026-11-20
> **Objetivo:** Implementar en Next.js las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor simulado, acceso y salón de la fama) como MVP solo visual, sin ningún juego real.

---

## Por qué existe este spec

`references/templates/` contiene un prototipo en React con Babel en el navegador (`.jsx`, `styles.css`, navegación por estado y hash). Hay que portarlo al stack real del repo: Next 16 con App Router, `cacheComponents`, TypeScript estricto y Tailwind v4. El spec fija cómo se mapea cada pantalla para que la implementación no improvise.

---

## Alcance

**Dentro:**

- Pantalla Biblioteca con hero, búsqueda por nombre, chips de categoría, grilla de tarjetas con efecto tilt y estado vacío.
- Pantalla Detalle de juego con portada, etiquetas, descripción, franja de estadísticas, botón de jugar y tabla de mejores puntuaciones.
- Pantalla Reproductor con HUD, marco CRT, arena decorativa, puntaje simulado, pausa, fin de juego y modal para guardar la puntuación.
- Pantalla Acceso con pestañas Iniciar sesión / Crear cuenta, modo invitado y botones sociales decorativos.
- Pantalla Salón de la Fama con selector de juego, podio, tabla y fila "tu mejor marca".
- Navegación superior (con panel móvil) y pie de página compartidos en el layout.
- Rutas reales de App Router para cada pantalla.
- Sesión simulada con `localStorage` (`av_user`) y guardado de puntuaciones (`av_scores`).
- Datos de ejemplo tipados (`GAMES`, `CATS`, `seededScores`).
- Estilos de componentes portados desde `references/templates/styles.css` a `app/globals.css`.

**Fuera de alcance (para otros specs):**

- Cualquier juego jugable. El reproductor es una arena decorativa.
- Backend, base de datos o autenticación real (contraseñas, OAuth de Google/GitHub, correo).
- Leer `av_scores` para mostrarlo en el salón o el detalle. Solo se guarda; las tablas usan datos sembrados.
- Contador de créditos funcional. "CRÉDITOS · 03" es texto fijo.
- Tests automatizados (no hay framework configurado).
- Panel "tweaks" (`.tw-*` en `styles.css`) y `Arcade Vault.html`: son andamiaje del prototipo.
- Internacionalización. Todo el texto queda en español.
- Mejoras de diseño sobre la plantilla. La fidelidad visual es el objetivo.

---

## Modelo de datos

Archivo nuevo: `lib/data.ts`. Se porta de `references/templates/data.jsx` con tipos explícitos.

```ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Accent = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;        // slug de la URL, ej. "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // descripción de tarjeta
  long: string;      // descripción de detalle
  cat: Category;
  cover: string;     // clase CSS, ej. "cover-bricks"
  color: Accent;     // color del botón JUGAR
  best: number;      // mejor puntuación global
  plays: string;     // "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: "dd/mm/2026"

export const GAMES: Game[];                    // 8 juegos, copiados de data.jsx
export const CATS: ["TODOS", ...Category[]];
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista
```

Sesión y puntuaciones guardadas, en `lib/session.tsx` (client):

```ts
export type User = { name: string };                          // en mayúsculas, máx. 10 caracteres
export type SavedScore = { game: string; score: number; name: string; at: number };

// localStorage
// "av_user"   → JSON de User, o ausente si es invitado
// "av_scores" → JSON de SavedScore[]
```

Convenciones:

- Las rutas usan `Game.id` como segmento dinámico. Un `id` desconocido responde con `notFound()`.
- Números con `toLocaleString("es-ES")`, igual que la plantilla.
- Todo acceso a `localStorage` va en `try/catch` y solo después de montar el componente, para evitar errores de hidratación.

---

## Mapa de rutas

| Pantalla (plantilla) | Ruta | Archivo | Tipo |
| --- | --- | --- | --- |
| Biblioteca (`biblioteca.jsx`) | `/` | `app/page.tsx` | Server + `components/library.tsx` (client, filtros) |
| Detalle (`detalle.jsx`) | `/juegos/[id]` | `app/juegos/[id]/page.tsx` | Server |
| Reproductor (`reproductor.jsx`) | `/juegos/[id]/jugar` | `app/juegos/[id]/jugar/page.tsx` | Server + `components/game-player.tsx` (client) |
| Acceso (`auth.jsx`) | `/acceso` | `app/acceso/page.tsx` | Server + `components/auth-form.tsx` (client) |
| Salón (`salon.jsx`) | `/salon` | `app/salon/page.tsx` | Server + `components/hall-of-fame.tsx` (client, pestañas y usuario) |

Archivos compartidos:

- `components/nav.tsx` (client: `usePathname`, panel móvil, sesión).
- `components/footer.tsx` (server).
- `components/game-card.tsx` (client: tilt).
- `lib/data.ts`, `lib/session.tsx`.
- `app/layout.tsx` (modificado: monta `SessionProvider`, `Nav` y `Footer`).
- `app/globals.css` (modificado: se añaden los estilos de componentes).

---

## Plan de implementación

Antes de empezar: leer en `node_modules/next/dist/docs/01-app` las guías de rutas dinámicas, `generateStaticParams`, `notFound` y `cacheComponents`, y respetar los avisos de deprecación.

1. **Estilos de componentes.** Copiar a `app/globals.css` las secciones de `references/templates/styles.css` desde `/* ===== app frame ===== */` hasta el final, omitiendo lo que ya existe (tema, `.av-bg`, `.av-noise`, reglas base) y el bloque `/* tweaks */`. Verificar: `npm run dev` carga `/` sin errores y el fondo sigue igual.
2. **Datos.** Crear `lib/data.ts` con tipos, `GAMES`, `CATS` y `seededScores`. Verificar: `npx tsc --noEmit` pasa.
3. **Sesión.** Crear `lib/session.tsx` con `SessionProvider` y `useSession()` (`user`, `login`, `signOut`, `saveScore`) que lee `av_user` tras montar. Verificar: `tsc` pasa.
4. **Layout compartido.** Crear `components/nav.tsx` y `components/footer.tsx`; montarlos junto al `SessionProvider` en `app/layout.tsx`, dentro de `#root`, con `<main className="av-main">`. Verificar: el nav y el pie se ven en `/`; el panel móvil abre y cierra a menos de 840 px.
5. **Biblioteca.** Crear `components/game-card.tsx` y `components/library.tsx`; reemplazar `app/page.tsx`. Verificar: las 8 tarjetas se ven, la búsqueda y los chips filtran, y el estado vacío aparece con una búsqueda sin resultados.
6. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES` y `notFound()` para ids desconocidos. Verificar: clic en una tarjeta lleva a `/juegos/bloque-buster` con su portada, estadísticas y tabla.
7. **Acceso.** Crear `components/auth-form.tsx` y `app/acceso/page.tsx`. Verificar: las pestañas alternan el campo de correo, enviar guarda `av_user` y vuelve a `/`, "Jugar como invitado" vuelve a `/` sin sesión.
8. **Reproductor.** Crear `components/game-player.tsx` y `app/juegos/[id]/jugar/page.tsx`. Verificar: el puntaje sube solo, Pausa lo detiene y muestra "EN PAUSA", Fin abre el modal, Guardar escribe en `av_scores`, Salir vuelve al detalle.
9. **Salón de la fama.** Crear `components/hall-of-fame.tsx` y `app/salon/page.tsx`. Verificar: cambiar de pestaña cambia podio y tabla; con sesión aparece la fila "TU MEJOR MARCA".
10. **Metadatos.** Añadir `generateMetadata` con título por pantalla en detalle y reproductor, y `metadata` estático en acceso y salón. Verificar: el título de la pestaña cambia entre rutas.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de Next.
- [ ] `npm run lint` termina sin errores.
- [ ] `/`, `/juegos/bloque-buster`, `/juegos/bloque-buster/jugar`, `/acceso` y `/salon` responden 200 y se ven con el tema neón de la plantilla.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` responden 404.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna de las cinco rutas.
- [ ] La biblioteca muestra exactamente 8 tarjetas con el filtro "TODOS".
- [ ] El chip "PUZZLE" deja solo la tarjeta CAÍDA.
- [ ] Buscar "zzz" muestra el texto "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]`.
- [ ] El botón "▶ JUGAR AHORA" del detalle navega a `/juegos/[id]/jugar`.
- [ ] El botón "SALIR" del reproductor navega a `/juegos/[id]`.
- [ ] En el reproductor el puntaje aumenta mientras no hay pausa y no cambia en pausa.
- [ ] Al pulsar FIN aparece el modal con la puntuación final; "GUARDAR PUNTUACIÓN" añade una entrada a `av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] "VOLVER AL VAULT" del modal navega a `/`.
- [ ] Enviar el formulario de acceso con usuario `kai` guarda `{"name":"KAI"}` en `av_user` y el nav muestra `KAI ▾`.
- [ ] Recargar la página conserva la sesión.
- [ ] Clic en `KAI ▾` cierra la sesión: se borra `av_user` y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] "Jugar como invitado" navega a `/` sin crear `av_user`.
- [ ] En el salón, elegir otro juego cambia el nombre del campeón del podio.
- [ ] En el salón, la fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] A 375 px de ancho no hay scroll horizontal; el nav muestra el botón `≡` y oculta los enlaces.
- [ ] El enlace activo del nav es "Biblioteca" en `/`, `/juegos/*` y `/juegos/*/jugar`, y "Salón de la Fama" en `/salon`.
- [ ] No existe ningún archivo `.jsx` nuevo ni uso de `any` en el código añadido.

---

## Decisiones

- **Sí:** rutas reales de App Router. URLs compartibles, prefetch y encaje con `cacheComponents` y `partialPrefetching`.
- **No:** una sola ruta con estado y hash como la plantilla. Ignora el App Router y rompe el botón atrás y los enlaces directos.
- **Sí:** sesión simulada con `localStorage` (`av_user`, `av_scores`), igual que la plantilla. Permite ver el flujo completo sin backend.
- **No:** autenticación real. Requiere backend y decisiones de seguridad que merecen su propio spec.
- **Sí:** guardar en `av_scores` aunque nada lo lea. Deja el contrato de datos listo para el spec de puntuaciones reales.
- **Sí:** reproductor con arena simulada y puntaje aleatorio. Es el marcador de posición para juegos futuros y respeta que "no hay que implementar ningún juego".
- **Sí:** copiar el CSS a `globals.css` y reescribir cada `.jsx` como `.tsx`. Máxima fidelidad con mínimo riesgo; el tema ya vive ahí.
- **No:** reescribir con utilidades Tailwind ni CSS Modules. Más trabajo y riesgo de diferencias visuales sin beneficio para un MVP visual.
- **Sí:** `generateStaticParams` sobre `GAMES` en las rutas `[id]`. Mantiene el prerenderizado compatible con `cacheComponents`.
- **Sí:** componentes de servidor por defecto y `"use client"` solo donde hay estado, efectos o `localStorage`.
- **Sí:** datos sembrados deterministas (`seededScores`). Evitan diferencias entre servidor y cliente.
- **No:** leer `av_scores` en el salón. Mezclarlo con datos sembrados exige reglas de orden y duplicados; se deja para otro spec.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Error de hidratación al leer `localStorage` | `SessionProvider` lee `av_user` solo tras montar; el nav renderiza el estado de invitado en el primer render. |
| `cacheComponents` falla con datos dinámicos en rutas `[id]` | `generateStaticParams` sobre `GAMES` y consulta previa de la guía en `node_modules/next/dist/docs`. |
| `Math.random` en el reproductor rompe el prerenderizado | Solo se usa dentro de `useEffect` en un client component. |
| `localStorage` bloqueado (modo privado) | Todo acceso va en `try/catch`; la app funciona sin persistir. |
| Duplicar estilos que ya están en `globals.css` | El paso 1 indica explícitamente qué secciones omitir. |
| Las fuentes cambian la métrica respecto al prototipo | Las variables `--pixel` y `--mono` ya apuntan a `next/font`; revisar visualmente tras el paso 4. |

---

## Qué **no** entra en este spec

- Ningún juego jugable.
- Backend, base de datos o autenticación real.
- OAuth con Google o GitHub.
- Mostrar en el salón o el detalle las puntuaciones guardadas en `av_scores`.
- Créditos funcionales.
- Tests automatizados.
- Panel "tweaks" y `Arcade Vault.html`.
- Cambios de diseño sobre la plantilla.

Cada uno de ellos, si se aborda, va en su propio spec.
