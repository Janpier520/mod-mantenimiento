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
npm run lint          # prettier --check . && eslint . (gate de CI)
npm run format        # prettier --write .
npm run format:check  # prettier --check . (gate de CI)
npm run test          # vitest run (patrón: src/**/*.test.ts)
npm run test:coverage # vitest run + reporte v8 (umbral ≥70% statements, gate de CI)
npm run db:push       # drizzle-kit push (esquema → DB directo)
npm run db:reset      # recrea DB desde cero: borra archivos + push --force + seed (parar dev server antes)
npm run db:generate   # drizzle-kit generate (migraciones)
npm run db:migrate    # drizzle-kit migrate
npm run db:studio     # drizzle-kit studio (UI de inspección DB)
npm run db:seed       # npx tsx src/lib/server/db/seed.ts
```

**Orden de gates CI** (`.github/workflows/ci.yml`): `check → format:check → lint → test → test:coverage` (≥70% statements).

## Arquitectura

- **Sin API layer**: todo es server load functions (`+page.server.ts`) + form actions con `use:enhance`. No hay endpoints REST ni tRPC.
- **Capa de servicio**: `src/lib/server/services/` concentra la lógica de dominio (tickets, equipos, usuarios, mantenimiento, attachments, activity, inventory); las rutas son adapters finos que delegan en servicios. Cada servicio tiene su test (`services/<x>.test.ts`).
- **Auth en hooks.server.ts**: session validation + role guard (`admin`/`tecnico`/`consultor`) por prefijo de ruta.
- **Dark mode**: clase `.dark` en `<html>`, persistida en localStorage (`overhaul-theme`).
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
| `/inventario`    | todos                |
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
- DB local: `overhaul.db` (gitignored, generado por seed o drizzle push).
- `DATABASE_URL` en `.env` (default `file:overhaul.db`).

## Convenciones de código

- **UI en español neutro**, identificadores y comentarios técnicos en inglés.
- **Formato**: Prettier con tabs, single quotes, trailingComma none, printWidth 100.
- **Estado de listados**: search + filter params en URL, paginación con `PAGE_SIZE = 10`.
- **Comentarios `ponytail:`** marcan simplificaciones deliberadas. No borrarlas.
- **IDs**: `crypto.randomUUID()` generado en default de columna Drizzle.

## Testing

- Vitest con patrón `src/**/*.test.ts` (config en vitest.config.ts).
- **292 tests en 15 archivos** (estado 2026-08-25): auth, servicios, state machines, validators y CRUD de rutas.
- DB en tests: in-memory SQLite via `test-helpers.ts` (`initTestDb()` idempotente, push con `drizzle-kit/api`).
- Coverage: `test:coverage` con umbral **≥70% statements** (actual ~83%).
- **No hay strict TDD** — no hay expectativas de test-first.

## SDD / OpenSpec

- El proyecto usa SDD (Spec-Driven Development).
- Artefactos: `openspec/{proposals,specs,designs,tasks,archive}`.
- Cambios activos: `openspec/changes/{fecha}-{cambio}/` (proposal, specs delta, design, tasks, verify-report); al archivar se mueven a `openspec/changes/archive/` y las specs delta se fusionan en `openspec/specs/`.
- Config: `openspec/config.yaml`.
- Estrategia PR: stacked-to-main via feature branches.

## MVPs / gotchas

- `engine-strict=true` en `.npmrc` — falla si la versión de Node no coincide.
- `.svelte-kit/` es generado por `svelte-kit sync` (parte de `npm run check`), no se toca manualmente.
- `build/` es output del adapter-node.
- Los archivos `*.db`, `*.db-wal`, `*.db-shm` son SQLite y están gitignored.
- **CI/CD**: `.github/workflows/ci.yml` — Node 24, `npm ci`, gates `check → format:check → lint → test → test:coverage` (≥70%), upload de coverage como artifact. ESLint es gate obligatorio (0 errores, 0 warnings).
- **Windows CRLF**: `git status` puede mostrar `M` fantasma en archivos tocados (autocrlf). Verificar con `git diff --quiet <file>` antes de commitear.
