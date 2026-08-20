# Módulo Mantenimiento de Equipos

Sistema de gestión de equipos informáticos (ERP de mantenimiento): inventario de equipos, tickets de soporte, mantenimiento preventivo con planes y ejecuciones, proveedores, reportes, y administración de usuarios y configuración. Construido con SvelteKit 5, Drizzle ORM sobre SQLite (libSQL), Tailwind CSS v4 y shadcn-svelte, con autenticación por sesión y control de acceso por roles (`admin`, `tecnico`, `consultor`).

Este README es la puerta de entrada al proyecto. La fuente de verdad de arquitectura, convenciones y comandos es [`AGENTS.md`](./AGENTS.md); el sistema de diseño vive en [`DESIGN.md`](./DESIGN.md).

## Stack

| Capa          | Elección                                              |
| ------------- | ----------------------------------------------------- |
| Framework     | SvelteKit 5 (runes mode forzado en `vite.config.ts`)  |
| Lenguaje      | TypeScript 6                                          |
| Base de datos | SQLite vía `@libsql/client`                           |
| ORM           | Drizzle ORM con relaciones declarativas               |
| CSS           | Tailwind CSS v4 (theming con CSS variables, `@theme`) |
| UI            | shadcn-svelte, Chart.js, SortableJS                   |
| Auth          | bcryptjs + session tokens en cookies httponly         |
| Adapter       | `@sveltejs/adapter-node`                              |

## Quick start

**Prerrequisitos**

- Node.js `^20.19.0 || >=22.12.0` (definido en `engines` de `package.json`). El proyecto activa `engine-strict=true` en `.npmrc`: `npm` aborta si la versión instalada no coincide.

**Pasos**

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` copiando `.env.example` (el único valor requerido es la base de datos):

```bash
# .env
DATABASE_URL=file:overhaul.db
```

3. Inicializar la base de datos. Para una base desde cero (esquema + datos demo) usar `db:reset`; si el esquema ya existe, `db:seed` siembra de forma idempotente:

```bash
npm run db:reset
# o: npm run db:seed
```

4. Levantar el servidor de desarrollo:

```bash
npm run dev
```

5. Abrir http://localhost:5173 y entrar con las credenciales por defecto del seed: `admin` / `admin123` (ver [Credenciales y datos demo](#credenciales-y-datos-demo)).

> `npm run db:reset` borra los archivos de la base, hace `drizzle-kit push --force` y corre el seed. Detener antes el servidor de desarrollo: en Windows el archivo de la base queda bloqueado.

## Scripts

Los 17 scripts de `package.json`:

| Script          | Comando                                                              | Descripción                                             |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `dev`           | `vite dev`                                                           | Servidor de desarrollo (http://localhost:5173)          |
| `build`         | `vite build`                                                         | Build de producción → `build/`                          |
| `preview`       | `vite preview`                                                       | Preview del build                                       |
| `prepare`       | `svelte-kit sync \|\| echo ''`                                       | Sync de SvelteKit (se ejecuta en `npm install`)         |
| `check`         | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`         | Typecheck                                               |
| `check:watch`   | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch` | Typecheck en watch                                      |
| `lint`          | `prettier --check . && eslint .`                                     | Formato + ESLint                                        |
| `format`        | `prettier --write .`                                                 | Formatea todo                                           |
| `format:check`  | `prettier --check .`                                                 | Verifica formato (gate de CI)                           |
| `db:push`       | `drizzle-kit push`                                                   | Push del esquema a la DB                                |
| `db:generate`   | `drizzle-kit generate`                                               | Genera migraciones                                      |
| `db:migrate`    | `drizzle-kit migrate`                                                | Aplica migraciones                                      |
| `db:studio`     | `drizzle-kit studio`                                                 | UI de inspección de la DB                               |
| `db:seed`       | `npx tsx src/lib/server/db/seed.ts`                                  | Siembra datos (admin, tipos, proveedores, config, demo) |
| `db:reset`      | `node scripts/db-reset.mjs`                                          | Recrea la DB desde cero (borra archivos + push + seed)  |
| `test`          | `vitest run`                                                         | Corre la suite de tests                                 |
| `test:coverage` | `vitest run --coverage`                                              | Tests + reporte de cobertura v8 (threshold ≥70%)        |

## Testing

- Correr la suite: `npm run test`
- Tests + cobertura: `npm run test:coverage` (proveedor v8, threshold de statements en 70% definido en `vitest.config.ts`)

**Estrategia de DB en tests**: cada archivo de test usa SQLite en memoria (`DATABASE_URL=file::memory:`, seteado en `src/lib/server/db/test-setup.ts` antes de que cargue el grafo de imports). El helper `src/lib/server/db/test-helpers.ts` expone `initTestDb()` (idempotente por archivo), que hace push programático del esquema con `drizzle-kit/api` y siembra un dataset mínimo con `seedTestData()` (usuarios, tipos, proveedores y equipos en todos los estados).

**Estado a 2026-08-19**: 233 tests (13 archivos) pasando, cobertura de statements 82.7%.

## CI

`.github/workflows/ci.yml` corre un quality gate en push y pull request a `main` (ubuntu-latest, Node 24 con cache npm, `npm ci`):

1. `npm run check` — typecheck
2. `npm run format:check` — formato Prettier
3. `npm run lint` — ESLint (gate obligatorio)
4. `npm run test` — suite de tests
5. `npm run test:coverage` — cobertura ≥70% statements

Además sube el reporte de cobertura como artifact. ESLint es un gate obligatorio de CI: `npm run lint` corre después de `format:check` y cualquier error de lint falla el pipeline.

## Arquitectura

- **Sin capa de API REST/tRPC**: cada ruta expone server load functions (`+page.server.ts`) y form actions con `use:enhance`. Los adaptadores de ruta son delgados: validan la entrada y delegan la lógica en la capa de servicios `src/lib/server/services/` (`equipos.ts`, `tickets.ts`, `mantenimiento.ts`, `usuarios.ts`, `attachments.ts`, `activity.ts`).
- **Auth en `src/hooks.server.ts`**: validación de sesión (cookie httponly, sliding window) + role guard por prefijo de ruta vía `ROLE_ROUTES`.
- **Schema en un solo archivo**: `src/lib/server/db/schema.ts` con relaciones declarativas; init de la DB en `src/lib/server/db/index.ts` (PRAGMA WAL + busy_timeout).
- **Layout único**: sidebar fija con navegación filtrada por rol y topbar con logout + toggle de dark mode (clase `.dark` persistida en localStorage).

### Rutas y roles

| Ruta                                                      | Acceso               |
| --------------------------------------------------------- | -------------------- |
| `/` (dashboard)                                           | todos (autenticados) |
| `/login`, `/auth/forgot-password`, `/auth/reset-password` | público              |
| `/equipos` (+ `/equipos/tipos`)                           | todos                |
| `/tickets`                                                | todos                |
| `/mantenimiento`                                          | todos                |
| `/sessions`                                               | todos                |
| `/proveedores`                                            | admin, consultor     |
| `/reportes`                                               | admin, consultor     |
| `/usuarios`                                               | admin                |
| `/config`                                                 | admin                |

## Estructura del proyecto

```
.
├── src/
│   ├── hooks.server.ts          # auth: sesión + role guard
│   ├── routes/                  # páginas: load functions + form actions
│   │   ├── +layout.svelte       # layout único (sidebar + topbar)
│   │   ├── login/ auth/         # rutas públicas
│   │   ├── equipos/ tickets/ mantenimiento/
│   │   ├── proveedores/ reportes/ sessions/ usuarios/ config/
│   │   └── +page.server.ts      # adaptadores → capa de servicios
│   └── lib/
│       ├── server/
│       │   ├── db/              # schema.ts, index.ts, seed.ts, test-helpers.ts
│       │   ├── services/        # capa de servicios (equipos, tickets, mantenimiento, usuarios, attachments, activity)
│       │   └── auth.ts          # hash de passwords + sesiones
│       └── test/mocks/$app      # mocks de $app para vitest
├── scripts/
│   └── db-reset.mjs             # respalda a npm run db:reset
├── .github/workflows/ci.yml     # quality gate (check → format:check → lint → test → test:coverage)
├── openspec/                    # artefactos SDD (ver sección siguiente)
├── AGENTS.md                    # fuente de verdad: arquitectura y convenciones
├── DESIGN.md                    # sistema de diseño (tokens, paleta, tipografía)
└── package.json
```

## SDD / OpenSpec

El proyecto sigue SDD (Spec-Driven Development) con artefactos en `openspec/`:

- `openspec/config.yaml` — configuración del proyecto SDD
- `openspec/changes/` — cambios activos: `proposal.md`, `specs/<dominio>/spec.md`, `design/`, `tasks/tasks.md`, `verify-report.md`
- `openspec/specs/` — specs de línea base (main specs, sincronizados al archivar)
- `openspec/proposals/`, `openspec/designs/`, `openspec/tasks/` — artefactos de cada fase
- `openspec/archive/` — cambios completados (audit trail)

Flujo de artefactos: `proposal → spec → design → tasks → apply → verify → archive`. Estrategia de PR: stacked-to-main vía feature branches.

## Funcionalidades clave

- **Tickets con SLA**: `fecha_limite` auto-calculada por prioridad (crítica=1d, alta=3d, media=7d, baja=14d), badge "Vencido" en listas y detalle, historial de actividad por ticket (`activity_log`).
- **Adjuntos en tickets**: upload con filtro MIME y límite de 5 MB (`uploads/` gitignored), descarga con `Content-Disposition`, borrado por propietario/admin (los archivos se eliminan del disco al borrar el ticket).
- **Mantenimiento preventivo**: planes con frecuencia en días, tareas secuenciadas, programación de ejecuciones, completar con resultado (completado/fallido/omitido) y auto-programación de la siguiente ejecución; cancelar y reprogramar ejecuciones pendientes; alerta de ejecuciones vencidas en la página del módulo.
- **Historial de actividad**: `activity_log` registra crear/transiciones/comentarios/adjuntos/eliminaciones en tickets y cambios de estado de equipos (`equipment_status_history`).
- **Control por roles**: `consultor` es solo lectura en toda la app (acciones ocultas en UI y 403 en servidor); `tecnico` ejecuta mantenimiento y trabaja tickets; `admin` administra usuarios, proveedores, tipos y configuración.
- **Seguridad**: hashes bcrypt (passwords y respuestas de seguridad), rate limit de login por usuario, renovación deslizante de sesión, cookies httpOnly+SameSite, foreign keys activas, número de serie de equipos único.

## Credenciales y datos demo

El seed (`npm run db:seed` / `db:reset`) crea el usuario administrador y datos demo:

- **Admin**: `admin` / `admin123` (con preguntas de seguridad por defecto).
- **Usuarios demo**: `tecnico1` / `tecnico123` (rol `tecnico`), `consultor1` / `consultor123` (rol `consultor`). Los usuarios demo tienen preguntas de seguridad sembradas para poder probar el flujo de recuperación de contraseña.
- **Catálogos**: 10 tipos de equipo (PC, Notebook, Impresora, Monitor, Router, Switch, Servidor, UPS, Escáner, Teléfono), 2 proveedores (Deltron SA, Bytec SA) y 4 claves de configuración.
- **Datos de demostración**: 6 equipos, 4 tickets con comentarios, planes de mantenimiento preventivo, tareas y ejecuciones (se crean solo si la tabla de equipos está vacía).

> ⚠️ Las credenciales por defecto son para desarrollo. Cambiar la contraseña del admin antes de exponer el sistema.

## Documentación relacionada

- [`AGENTS.md`](./AGENTS.md) — fuente de verdad: arquitectura, rutas, convenciones de código y comandos exactos.
- [`DESIGN.md`](./DESIGN.md) — sistema de diseño: tokens, paleta de colores, tipografía y reglas de UI.
