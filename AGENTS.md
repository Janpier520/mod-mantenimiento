# Módulo Mantenimiento de Equipos — AGENTS.md

Sistema de gestión de equipos (ERP de mantenimiento). SvelteKit 5 + Drizzle ORM (SQLite) + Tailwind v4 + shadcn-svelte.

## Stack

| Capa      | Elección                                           |
| --------- | -------------------------------------------------- |
| Framework | SvelteKit 5 (runes mode forzado en vite.config.ts) |
| Lenguaje  | TypeScript 6                                       |
| DB        | SQLite via `@libsql/client`                        |
| ORM       | Drizzle ORM con relaciones declarativas            |
| CSS       | Tailwind v4 (CSS-variable theming, `@theme`)       |
| UI        | shadcn-svelte, Chart.js, SortableJS                |
| Auth      | bcryptjs + session tokens en cookies httponly      |
| Adapter   | `@sveltejs/adapter-node`                           |

## Comandos exactos

```bash
npm run dev           # vite dev (http://localhost:5173)
npm run build         # build producción → build/
npm run preview       # preview del build
npm run check         # svelte-kit sync + svelte-check (typecheck)
npm run lint          # prettier --check . && eslint .
npm run format        # prettier --write .
npm run test          # vitest run (patrón: src/**/*.test.ts)
npm run db:push       # drizzle-kit push (esquema → DB directo)
npm run db:reset      # recrea DB desde cero: borra archivos + push --force + seed (parar dev server antes)
npm run db:generate   # drizzle-kit generate (migraciones)
npm run db:migrate    # drizzle-kit migrate
npm run db:studio     # drizzle-kit studio (UI de inspección DB)
npm run db:seed       # npx tsx src/lib/server/db/seed.ts
```

**Orden típico pre-commit**: `format → lint → check → test`

## Arquitectura

- **Sin API layer**: todo es server load functions (`+page.server.ts`) + form actions con `use:enhance`. No hay endpoints REST ni tRPC.
- **Auth en hooks.server.ts**: session validation + role guard (`admin`/`tecnico`/`consultor`) por prefijo de ruta.
- **Dark mode**: clase `.dark` en `<html>`, persistida en localStorage (`equip-lab-theme`).
- **Layout único**: sidebar fija con nav filtrada por rol, topbar con logout + dark mode toggle.
- **CRUD unificado**: cada ruta expone una sola action `crud` que switchea por campo `_action` (`create`/`update`/`delete`).

## Rutas principales

| Ruta             | Roles permitidos     |
| ---------------- | -------------------- |
| `/`              | todos (autenticados) |
| `/login`         | público              |
| `/equipos`       | todos                |
| `/tickets`       | todos                |
| `/mantenimiento` | todos                |
| `/proveedores`   | admin, consultor     |
| `/reportes`      | admin, consultor     |
| `/usuarios`      | admin                |
| `/config`        | admin                |
| `/sessions`      | todos                |
| `/auth/*`        | público              |

## DB

- Schema + relations: `src/lib/server/db/schema.ts` (todo en un archivo).
- Init: `src/lib/server/db/index.ts` — PRAGMA WAL + busy_timeout.
- Seed: `src/lib/server/db/seed.ts` crea admin (`admin` / `admin123`), tipos de equipo, proveedores y config por defecto.
- DB local: `equip-lab.db` (gitignored, generado por seed o drizzle push).
- `DATABASE_URL` en `.env` (default `file:equip-lab.db`).

## Convenciones de código

- **UI en español neutro**, identificadores y comentarios técnicos en inglés.
- **Formato**: Prettier con tabs, single quotes, trailingComma none, printWidth 100.
- **Estado de listados**: search + filter params en URL, paginación con `PAGE_SIZE = 10`.
- **Comentarios `ponytail:`** marcan simplificaciones deliberadas. No borrarlas.
- **IDs**: `crypto.randomUUID()` generado en default de columna Drizzle.

## Testing

- Vitest con patrón `src/**/*.test.ts` (config en vitest.config.ts).
- Solo hay un test: `src/lib/server/auth.test.ts` (hashing de passwords).
- **No hay strict TDD** — no hay expectativas de test-first.

## SDD / OpenSpec

- El proyecto usa SDD (Spec-Driven Development).
- Artefactos: `openspec/{proposals,specs,designs,tasks,archive}`.
- Config: `openspec/config.yaml`.
- Estrategia PR: stacked-to-main via feature branches.

## MVPs / gotchas

- `engine-strict=true` en `.npmrc` — falla si la versión de Node no coincide.
- `.svelte-kit/` es generado por `svelte-kit sync` (parte de `npm run check`), no se toca manualmente.
- `build/` es output del adapter-node.
- Los archivos `*.db`, `*.db-wal`, `*.db-shm` son SQLite y están gitignored.
- No hay CI/CD configurado.
