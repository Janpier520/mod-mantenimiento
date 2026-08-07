# Component Design: test-helpers.ts (+ test-setup.ts)

## Purpose

Programmatically create a fresh schema and minimal seed on the per-file in-memory SQLite DB, and provide a pre-hashed password so no test pays bcrypt cost twice.

## test-setup.ts (setupFiles entry)

```ts
// src/lib/server/db/test-setup.ts
process.env.DATABASE_URL = 'file::memory:';
process.env.NODE_ENV = 'test';
```

Executed by Vitest in the worker **before** the test file's module graph loads, so `db/index.ts` (which reads `DATABASE_URL` at module load and creates the libSQL client eagerly) always binds to `:memory:`. Per-file module isolation (`isolate: true` default) means each test file gets its own client and its own in-memory DB — this is the spec TC-2 / TC-11 "fresh DB per file" mechanism.

## Public API — test-helpers.ts

```ts
// src/lib/server/db/test-helpers.ts
import * as schema from './schema';
import { db } from './index'; // in-memory (env set by test-setup.ts)

export const TEST_PASSWORD = 'test-password-123';

// bcrypt hash computed ONCE per worker (module-level cached promise)
export function getTestPasswordHash(): Promise<string>;

// Idempotent per file: pushes schema + seeds. Call in beforeAll of every DB test file.
export async function initTestDb(): Promise<void>;

// Seed data + IDs for route tests. Returns stable ids by name.
export interface SeedIds {
	adminId: string;
	tecnicoId: string;
	consultorId: string;
	tipoPcId: string;
	tipoNotebookId: string;
	eqOperativoId: string;
	eqReparacionId: string;
	eqPrestadoId: string;
	eqBajaId: string; // covers all 4 equipment states
	proveedorId: string;
}
export async function seedTestData(): Promise<SeedIds>;
```

### Schema push — primary path

```ts
import { pushSQLiteSchema } from 'drizzle-kit/api';

let initialized = false;
export async function initTestDb(): Promise<void> {
	if (initialized) return; // module-level flag → idempotent within a file
	const { apply } = await pushSQLiteSchema({ schema }, db);
	await apply();
	await seedTestData();
	initialized = true;
}
```

- `imports` is `Record<string, unknown>` — key `'schema'` is the module label consumed by `prepareFromExports` (verified against `node_modules/drizzle-kit/api.js` line 75363; signature in `api.d.ts` line 3107).
- `pushSQLiteSchema` internally calls `db.all(sql.raw(...))` / `db.run(sql.raw(...))` — requires `drizzle-orm` resolvable at runtime (it is; it's a dependency).
- `db` comes from `./index` so the pushed schema lands on the SAME instance the code under test uses.

### Schema push — documented fallback (if `pushSQLiteSchema` unavailable)

```ts
import { generateSQLiteDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { sql } from 'drizzle-orm';

const prev = await generateSQLiteDrizzleJson({}); // empty DB snapshot
const cur = await generateSQLiteDrizzleJson({ schema }); // target schema snapshot
const statements = await generateMigration(prev, cur); // string[] of SQL DDL
for (const stmt of statements) await db.run(sql.raw(stmt));
```

Same net effect as `drizzle-kit push` with zero migration files on disk. Only used if the primary import fails.

### Seed — minimal but sufficient

- Users: `admin` (admin, activo), `tecnico1` (tecnico, activo), `consultor1` (consultor, activo) — all `password_hash = await getTestPasswordHash()`.
- Equipment types: `PC`, `Notebook` (+ unique names used by duplicate-check tests).
- Equipment: 4 rows covering `operativo`, `en_reparacion`, `prestado`, `dado_de_baja` (TC-8 transition/role-guard fixtures).
- Proveedores: 1 row (equipos form accepts `proveedor_id`).

Tickets, PM plans/tasks/executions, comments are **not** seeded — route tests insert their own referential fixtures inline via `db.insert` so each guard test controls its own data.

## Gotchas

- `PRAGMA journal_mode=WAL` in `db/index.ts` is a no-op on in-memory DBs (returns `'memory'`, does not throw); `busy_timeout` is harmless. Low risk.
- `crypto.randomUUID()` in schema `$defaultFn` works — Node 24 exposes global `crypto`.
- `getTestPasswordHash()` must be awaited from `beforeAll`, never synchronously.
- Keep `initTestDb` in `beforeAll` of every DB-backed file: `auth.test.ts`, `validators.db.test.ts`, and the 3 route tests. Pure unit files (state-machines, validators, utils) never import it.
