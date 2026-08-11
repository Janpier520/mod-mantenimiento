# Project README — Specification

## Purpose

Reemplazar el scaffold de `sv` en `README.md` por documentación real del proyecto en español, derivada de `AGENTS.md` y hechos verificados. Sin cambios de código, esquema, seed ni CI. Dominio nuevo — requisitos ADDED.

## Requirements

### RD-1: README replaced

`README.md` MUST be fully replaced: no `sv` scaffold text SHALL remain, and it MUST document Módulo Mantenimiento de Equipos (ERP de mantenimiento) in Spanish prose with English identifiers.

#### Scenario: No scaffold residue

- GIVEN the new `README.md`
- WHEN searching for scaffold markers (`# sv`, `npx sv create`)
- THEN no scaffold text MUST be found AND the content MUST present the project title and description

### RD-2: Quick start accuracy

The README MUST include quick start (prerequisites→install→.env→dev→seed/reset) with every command matching `package.json` exactly; Node `^20.19.0 || >=22.12.0` + `engine-strict=true`; `DATABASE_URL` per `.env.example`.

#### Scenario: New dev runs the app in five steps

- GIVEN a fresh checkout, Node matching `engines`
- WHEN following install→.env→dev→db:seed / db:reset
- THEN each command MUST succeed and match `package.json` verbatim

#### Scenario: Commands mirror package.json

- GIVEN the quick start command list
- WHEN diffing against `package.json` scripts
- THEN no command MUST be invented, renamed, or misspelled

### RD-3: Scripts table

The README MUST document every `package.json` script in a table, at minimum: `dev`, `build`, `preview`, `check`, `lint`, `format`, `format:check`, `test`, `test:coverage`, `db:push`, `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:reset`.

#### Scenario: Table matches package.json

- GIVEN the scripts table
- WHEN comparing names and commands to `package.json`
- THEN every script MUST carry the exact command and none SHALL be invented

### RD-4: Architecture accuracy

The README MUST document the CURRENT architecture: routes + roles table, load functions + form actions delegating to `src/lib/server/services/`, auth in `src/hooks.server.ts`, schema at `src/lib/server/db/schema.ts`, post-service-layer-refactor.

#### Scenario: Routes and roles match the app

- GIVEN the routes + roles table
- WHEN comparing against `hooks.server.ts` `ROLE_ROUTES` and the route tree
- THEN every route and role MUST match, with routes as thin adapters over the service layer
- AND no removed pattern (REST/tRPC layer, pre-refactor layout) MUST be described

### RD-5: Testing section

The README MUST document test/coverage commands (`npm run test`, `npm run test:coverage`), the in-memory SQLite strategy (`src/lib/server/db/test-helpers.ts`), and date-stamped numbers: 177 tests, 82.3% as of 2026-08-07.

#### Scenario: Numbers are date-stamped

- GIVEN the testing section
- WHEN reading the stats
- THEN "177 tests / 82.3%" MUST carry the date 2026-08-07 AND the in-memory helper MUST be explained with its path

### RD-6: CI section

The README MUST summarize `.github/workflows/ci.yml`: push + PR to `main`, Node 24, `npm ci`, gates `check`→`format:check`→`lint`→`test`→`test:coverage` (≥70% statements), and MUST state that lint is a CI gate.

#### Scenario: CI summary matches workflow

- GIVEN the CI section
- WHEN comparing against `ci.yml`
- THEN triggers, Node version, gate order including lint, and the 70% threshold MUST match

#### Scenario: No stale exclusion statement

- GIVEN the CI section
- WHEN searching for "ESLint no es gate" or the 170-error count
- THEN neither MUST be present
- AND lint MUST be described as a required CI gate

### RD-7: SDD/OpenSpec section

The README MUST document the SDD workflow: `openspec/` layout (`changes/`, `specs/`, `archive/`) and artifact flow (proposal→spec→design→tasks→apply→verify→archive).

#### Scenario: Layout described

- GIVEN the SDD section
- WHEN reading it
- THEN directory roles and phase flow MUST match `openspec/`

### RD-8: Credentials & demo

The README MUST state seeded credentials `admin`/`admin123` (from `db:seed`) and the seed's demo data (equipment types, providers, default config).

#### Scenario: Credentials match seed

- GIVEN the credentials note
- WHEN comparing to `src/lib/server/db/seed.ts`
- THEN `admin` / `admin123` MUST match AND demo-data scope MUST be described

### RD-9: Format compliance

`README.md` MUST be Prettier-clean: `npm run format:check` MUST stay green (README.md is not in `.prettierignore`).

#### Scenario: format:check stays green

- GIVEN the new `README.md` committed
- WHEN running `npm run format:check`
- THEN it MUST pass with no README diff and README.md MUST stay out of `.prettierignore`

### RD-10: Links

The README MUST reference `AGENTS.md` (source of truth) and `DESIGN.md`.

#### Scenario: Docs linked

- GIVEN the README
- WHEN checking links
- THEN `AGENTS.md` and `DESIGN.md` MUST be referenced with their roles
