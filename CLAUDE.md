# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El repo está en etapa inicial (solo el scaffold de Create Next App); el desarrollo sigue Spec Driven Design (`/spec` y `/spec-impl`) con las skills de `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Comandos

```bash
npm run dev     # servidor de desarrollo (Turbopack)
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # eslint (flat config en eslint.config.mjs)
```

No hay framework de tests configurado todavía.

## Next.js: versión con cambios incompatibles

Next 16.4.6 + React 19.3. Según `AGENTS.md`, las APIs y convenciones difieren de lo conocido: **lee la guía relevante en `node_modules/next/dist/docs/`** (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next. Hace caso a los avisos de deprecación. `AGENTS.md` lo regenera `next dev`; no lo borres.

## Arquitectura / configuración

- App Router en `app/` (`layout.tsx`, `page.tsx`, `globals.css`). El layout usa el tipo global `LayoutProps<"/">` (generado por Next, sin import).
- `next.config.ts` activa flags experimentales: `cacheComponents: true`, `partialPrefetching: true` y `experimental.agentFeedback`. `cacheComponents` cambia el modelo de caché/renderizado (Partial Prerendering), así que consulta los docs antes de usar fetching de datos o APIs dinámicas.
- Tailwind CSS v4 se procesa vía Turbopack con la regla `@tailwindcss/turbopack` para `*.css` (en `next.config.ts`), no con PostCSS. Los tokens de tema están en `app/globals.css` (`@theme inline`, modo oscuro por `prefers-color-scheme`).
- Alias de imports: `@/*` → raíz del repo.
- TypeScript en modo `strict`.
