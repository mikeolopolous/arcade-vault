# SPEC 03 — Página "Acerca de" con formulario de contacto vía Resend

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (`01-mvp-pantallas-visuales.md`: sesión y estilos base), SPEC 02 (`02-home-landing.md`: nav con "Inicio", `RevealObserver`)
> **Fecha:** 2026-11-27
> **Objetivo:** Portar `references/templates/home-about/about.jsx` a `/acerca` y hacer que su formulario de contacto envíe un correo real con Resend.

---

## Por qué existe este spec

SPEC 02 dejó fuera la pantalla "Acerca de" y su enlace del nav. La plantilla solo simula el envío del formulario (`setSent`), así que este spec añade la primera pieza de servidor del proyecto: una Server Action que envía el mensaje con Resend. La parte visual se copia tal cual de la plantilla; lo único nuevo en la UI son los estados "enviando" y "error", que la plantilla no tiene.

---

## Alcance

**Dentro:**

- Ruta `/acerca` con las tres partes de `about.jsx`: hero (kicker, título, misión y tres highlights con iconos pixel), divisor de píxeles animado y sección de contacto (intro, tips y formulario).
- Formulario con nombre, correo y mensaje que envía un correo real con Resend mediante una Server Action.
- Validación en cliente (campos vacíos → shake, como la plantilla) y en servidor (formato y longitudes).
- Honeypot oculto contra bots.
- Estado "enviando": botón y campos deshabilitados, texto "▶ TRANSMITIENDO…".
- Estado "error": se conserva lo escrito, shake y línea de error bajo el botón.
- Estado "éxito": terminal `VAULT-OS // TERMINAL` de la plantilla y botón "ENVIAR OTRO MENSAJE" que vacía el formulario.
- Prefill del campo nombre con `user.name` si hay sesión y el campo está vacío.
- Enlace "Acerca de" en el nav de escritorio y en el panel móvil, después de "Salón de la Fama", activo en `/acerca`.
- Estilos de la sección `/* ===== ABOUT PAGE ===== */` de `home-about/styles.css` en `app/globals.css`.
- Metadatos de `/acerca`.
- Dependencia `resend` y variables de entorno documentadas en `.env.example`.

**Fuera de alcance (para otros specs):**

- Correo de confirmación automático al usuario.
- Rate limit por IP, CAPTCHA o Turnstile.
- Plantilla HTML o React Email para el correo.
- Guardar los mensajes en base de datos o en `localStorage`.
- Verificación de dominio propio en Resend (es configuración, no código).
- Cambios de diseño sobre la plantilla más allá de los estados "enviando" y "error".
- Tests automatizados.

---

## Modelo de datos

Archivos nuevos: `lib/contact.ts` (tipos y validación, sin `"use server"`) y `app/acerca/actions.ts` (Server Action).

```ts
// lib/contact.ts
export type ContactField = "name" | "email" | "msg";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }            // nombre ya recortado
  | { status: "error"; message: string };          // texto para la línea [ERR]

export const CONTACT_LIMITS = {
  name: { max: 80 },
  email: { max: 254 },
  msg: { min: 10, max: 2000 },
} as const;

export const HONEYPOT_FIELD = "website";
```

```ts
// app/acerca/actions.ts  ("use server")
export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

| Variable | Obligatoria | Valor por defecto | Uso |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Sí | — | Cliente `new Resend(...)` |
| `CONTACT_TO_EMAIL` | Sí | — | Destinatario del equipo |
| `CONTACT_FROM_EMAIL` | No | `Arcade Vault <onboarding@resend.dev>` | Remitente |

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: correo escrito por el usuario.
- `subject`: `[Arcade Vault] Mensaje de {nombre}`.
- `text`: tres bloques `Nombre: …`, `Correo: …` y `Mensaje:` seguido del mensaje. Sin `html`.

Reglas de validación en servidor (todas con `trim()`):

- Nombre: 1–80 caracteres.
- Correo: 1–254 caracteres y formato `algo@algo.algo` (regex simple).
- Mensaje: 10–2000 caracteres.
- Honeypot `website` con contenido → devuelve `success` sin llamar a Resend.

Textos de error (línea bajo el botón, prefijo `[ERR]`):

| Caso | Texto |
| --- | --- |
| Validación de servidor | `[ERR] REVISA LOS CAMPOS: …` con el motivo del primer campo inválido |
| Faltan `RESEND_API_KEY` o `CONTACT_TO_EMAIL` | `[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` (el detalle va a `console.error` del servidor) |
| Resend devuelve `error` o lanza excepción | `[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` |

---

## Mapa de rutas y archivos

| Ruta | Archivo | Tipo |
| --- | --- | --- |
| `/acerca` | `app/acerca/page.tsx` (nuevo) | Server: hero, divisor, intro de contacto, `<ContactForm />`, `<RevealObserver />` |

Archivos nuevos:

- `app/acerca/page.tsx` — página server con `metadata` ("Acerca de · Arcade Vault").
- `app/acerca/actions.ts` — Server Action `sendContact`.
- `lib/contact.ts` — tipos, límites y función de validación compartida.
- `components/about-art.tsx` (server) — `HighlightIcon` (HEART, BROWSER, PLANT) copiado de la plantilla.
- `components/contact-form.tsx` (client) — formulario con `useActionState`, shake, prefill de sesión, estados enviando / error / éxito.
- `.env.example` — las tres variables con valores vacíos o de ejemplo.

Archivos modificados:

- `package.json` / `package-lock.json` — dependencia `resend`.
- `app/globals.css` — sección ABOUT PAGE.
- `components/nav.tsx` — enlace "Acerca de".

Se reutiliza `components/reveal-observer.tsx` sin cambios. `.gitignore` ya ignora `.env*`; hay que añadir la excepción `!.env.example`.

---

## Plan de implementación

Antes de empezar: leer `node_modules/next/dist/docs/01-app/02-guides/forms.md`, `server-actions.md`, `environment-variables.md` y `01-getting-started/07-mutating-data.md`, y respetar los avisos de deprecación. Consultar la documentación actual del SDK `resend` para la firma de `emails.send` (`replyTo`, respuesta `{ data, error }`).

1. **Estilos.** Añadir al final de `app/globals.css` la sección `/* ===== ABOUT PAGE ===== */` de `references/templates/home-about/styles.css` (de `.about` hasta `.term-body .caret`, incluye `@keyframes pxblink` y `shake` y `.btn.press:active`). No duplicar `.divider`, `.field` ni `blink`. Añadir `.contact-form .form-error` (color magenta/rojo de la paleta, fuente mono, 12px) y `.btn:disabled` si no existe. Verificar: `npm run dev` sin errores y las pantallas existentes se ven igual.
2. **Página estática.** Crear `components/about-art.tsx` y `app/acerca/page.tsx` con hero, highlights, divisor y la intro de contacto; en lugar del formulario, un hueco temporal. Incluir `<RevealObserver />`. Verificar: `/acerca` se ve como la plantilla y el divisor y el contacto aparecen al hacer scroll.
3. **Nav.** Añadir "Acerca de" (`/acerca`) tras "Salón de la Fama" en escritorio y panel móvil, activo con `pathname.startsWith("/acerca")`. Verificar: resaltado correcto en `/`, `/biblioteca`, `/salon` y `/acerca`.
4. **Formulario sin servidor.** Crear `components/contact-form.tsx` con los campos, placeholders y el botón "▶  ENVIAR MENSAJE" de la plantilla, más el honeypot `website` oculto (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`, fuera de la vista). Validación de vacíos en cliente con shake de 400 ms. Prefill del nombre derivado en el render (`draft.name ?? user?.name ?? ""`, con `draft.name = null` mientras el usuario no haya escrito), sin efecto. Montarlo en la página. Verificar: enviar vacío hace shake; con sesión el nombre aparece relleno.
5. **Validación y tipos.** Crear `lib/contact.ts` con `ContactState`, `CONTACT_LIMITS`, `HONEYPOT_FIELD` y `validateContact(input)` que devuelve el primer error o los datos limpios. Verificar: `npx tsc --noEmit` pasa.
6. **Resend y entorno.** `npm install resend`. Crear `.env.example` y la excepción `!.env.example` en `.gitignore`. Verificar: `git status` muestra `.env.example` y no `.env.local`.
7. **Server Action.** Crear `app/acerca/actions.ts` (`"use server"`): lee el `FormData`, devuelve `success` si el honeypot viene relleno, valida con `validateContact`, comprueba las variables de entorno, llama a `resend.emails.send` con el texto plano y traduce `{ error }` o excepciones al `ContactState` de error. Nunca devuelve la API key ni el detalle de Resend al cliente. Verificar: `npx tsc --noEmit` pasa.
8. **Conectar formulario y acción.** En `contact-form.tsx` usar `useActionState(sendContact, { status: "idle" })` y `<form action={formAction}>`. La validación de vacíos en cliente se ejecuta antes (en `onSubmit` con `preventDefault` solo si hay vacíos). Durante `pending`: botón y campos `disabled`, texto "▶ TRANSMITIENDO…". En `error`: shake, valores conservados (inputs controlados) y línea `.form-error` bajo el botón con `role="alert"`. En `success`: terminal de la plantilla con `GRACIAS, {NOMBRE}.`; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío. Verificar: con un `.env.local` válido llega el correo a `CONTACT_TO_EMAIL` y se ve la terminal.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores de TypeScript ni de Next.
- [ ] `npm run lint` termina sin errores.
- [ ] `/acerca` muestra "ACERCA DE ARCADE VAULT", el texto de misión, tres highlights (corazón magenta, navegador cian, planta verde), el divisor de 24 píxeles y la sección "CONTÁCTANOS" con tres tips.
- [ ] El divisor y la sección de contacto reciben la clase `in` al entrar en pantalla.
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de" en escritorio y en el panel móvil; "Acerca de" está activo solo en `/acerca`.
- [ ] Enviar con algún campo vacío hace shake y no llama a la Server Action (sin petición en la pestaña Network).
- [ ] Con sesión iniciada como `PX_KAI`, el campo nombre aparece con `PX_KAI` al cargar `/acerca`; sin sesión aparece vacío con placeholder `px_kai`.
- [ ] Durante el envío el botón muestra "▶ TRANSMITIENDO…" y botón y campos están deshabilitados.
- [ ] Con `.env.local` válido, enviar nombre, correo y un mensaje de ≥10 caracteres entrega un correo en `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {nombre}`, cuerpo en texto plano y `Reply-To` igual al correo escrito.
- [ ] Tras un envío correcto se ve la terminal con "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}." y "ENVIAR OTRO MENSAJE" devuelve el formulario vacío.
- [ ] Con un mensaje de menos de 10 caracteres aparece una línea `[ERR] REVISA LOS CAMPOS: …`, el formulario hace shake y los valores se conservan.
- [ ] Sin `RESEND_API_KEY` en el entorno aparece `[ERR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.`, los valores se conservan y el servidor registra el motivo en consola.
- [ ] Rellenar el campo `website` (vía DevTools) muestra la terminal de éxito y no se envía ningún correo.
- [ ] El campo `website` no es visible ni alcanzable con Tab.
- [ ] Ningún bundle de cliente contiene `RESEND_API_KEY` ni su valor (`grep` sobre `.next/static`).
- [ ] `.env.example` está versionado con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`; `.env.local` no.
- [ ] La consola no muestra errores de hidratación en `/acerca`, con y sin sesión.
- [ ] A 375 px de ancho `/acerca` no tiene scroll horizontal y highlights y contacto pasan a una columna.
- [ ] No existe ningún archivo `.jsx` nuevo ni uso de `any` en el código añadido.

---

## Decisiones

- **Sí:** ruta `/acerca`. Corta y en español, coherente con `/salon`, `/acceso` y `/biblioteca`.
- **No:** `/acerca-de` ni `/contacto`. La primera es más larga; la segunda oculta la parte de misión.
- **Sí:** Server Action con `useActionState`. Idiomático en App Router, sin endpoint público que mantener.
- **No:** Route Handler `POST /api/contacto`. Más código y una superficie expuesta sin necesidad actual.
- **Sí:** remitente y destinatario por variables de entorno, con `onboarding@resend.dev` por defecto. Funciona sin dominio verificado y se cambia sin tocar código.
- **Sí:** `replyTo` con el correo del usuario. El equipo responde directamente desde su cliente.
- **Sí:** correo en texto plano. Sin dependencias extra ni riesgo de inyección HTML.
- **No:** React Email ni HTML escapado a mano. Complejidad sin valor para un correo interno.
- **Sí:** honeypot + validación de longitudes en servidor. Freno básico a bots sin fricción para el usuario.
- **No:** rate limit por IP en memoria. No es fiable en serverless; si hace falta, va en otro spec con almacenamiento externo.
- **Sí:** el honeypot devuelve éxito falso. El bot no aprende que fue detectado.
- **Sí:** línea de error bajo el botón conservando lo escrito. Mínimo diseño nuevo y el usuario puede reintentar.
- **No:** terminal en modo error. Diseño que no está en la plantilla.
- **Sí:** botón y campos deshabilitados durante el envío. Evita envíos dobles.
- **Sí:** prefill del nombre derivado en el render del client component, sin `useEffect`. `useSession` devuelve `null` en el servidor y en la hidratación (`getServerSnapshot`), así que no hay desajuste; la regla `react-hooks/set-state-in-effect` del linter prohíbe copiarlo con un efecto.
- **No:** correo de confirmación al usuario. Requiere dominio verificado; queda para otro spec.
- **Sí:** validación compartida en `lib/contact.ts`, fuera del archivo `"use server"`. Un archivo `"use server"` solo puede exportar funciones async.
- **Sí:** el detalle de errores de Resend solo en logs de servidor. No se filtra información interna al cliente.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Con `onboarding@resend.dev`, Resend solo entrega al correo de la cuenta propietaria | `CONTACT_TO_EMAIL` debe ser ese correo hasta verificar un dominio; documentado en `.env.example`. |
| La API key acaba en el bundle de cliente | Solo se lee en `app/acerca/actions.ts` (`"use server"`), sin prefijo `NEXT_PUBLIC_`; criterio de aceptación con `grep` sobre `.next/static`. |
| `cacheComponents` o el prerenderizado chocan con la Server Action o con `useSession` | Leer las guías del paso previo; la página es estática y el formulario es un client component. |
| Desajuste de hidratación por el prefill de sesión | El nombre se deriva de `useSession`, que da `null` en el servidor y en la hidratación; el valor de sesión llega después. |
| Spam pese al honeypot | Límites de longitud en servidor; rate limit o CAPTCHA en un spec posterior si aparece abuso. |
| Clases genéricas de la plantilla (`.highlight`, `.tip`, `.field`) chocan con estilos existentes | Paso 1 indica qué no duplicar; revisar `/`, `/acceso` y `/salon` tras añadir el CSS. |
| La firma del SDK `resend` cambia entre versiones | Consultar la documentación del SDK instalado antes del paso 7. |

---

## Qué **no** entra en este spec

- Correo de confirmación al usuario.
- Rate limit, CAPTCHA o Turnstile.
- Plantilla HTML o React Email.
- Persistencia de mensajes.
- Verificación de dominio en Resend.
- Cambios de diseño sobre la plantilla.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
