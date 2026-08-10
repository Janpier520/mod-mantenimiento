# Archive: Project README

## Change Summary

- **Propuesta**: `openspec/changes/archive/2026-08-07-project-readme/proposal.md`
- **Spec**: `openspec/specs/project-readme.md` (nueva capability, 10 requisitos RD-1..RD-10)
- **Design**: fase de diseño SKIPPEADA por decisión de spec (cambio documental puro, un archivo, sin decisiones de arquitectura)
- **Tasks**: `openspec/changes/archive/2026-08-07-project-readme/tasks/tasks.md` (13/13 completadas, single work unit)
- **Verify**: `openspec/archive/verify-report-project-readme.md` ✅ PASS (10/10 compliant, 10/10 escenarios cubiertos)
- **Commits**: 7af6b5c (`docs: replace scaffold README with project documentation`) — 1 commit, single work unit en `main`

## Intent

`README.md` era el scaffold genérico de `sv` (42 líneas de boilerplate) — no documentaba este proyecto. El conocimiento real vivía en `AGENTS.md` y en el estado verificado del repo. Este cambio reemplaza el README con documentación real en español (prosa en español, identificadores en inglés) para tesistas, tutores y colaboradores: puerta de entrada al proyecto, con `AGENTS.md` como fuente de verdad.

## Scope

Reemplazo completo de `README.md` cubriendo 11 secciones: título + descripción (ERP de mantenimiento), stack, quick start (Node `^20.19.0 || >=22.12.0` + `engine-strict`, `npm install`, `.env` con `DATABASE_URL`, `dev`, `db:seed`/`db:reset`), tabla de 17 scripts, testing (177 tests / 82.3% date-stamped a 2026-08-07, in-memory `test-helpers.ts`), CI (`ci.yml` gates), arquitectura (rutas + roles, service layer), estructura de carpetas condensada, SDD/OpenSpec, credenciales `admin`/`admin123` + datos demo, nota de contexto de tesis, y enlaces a `AGENTS.md` y `DESIGN.md`.

**Out of scope**: traducir `AGENTS.md` (sigue en español, es la fuente de verdad), docs de API, guías de contribución nuevas, y cualquier cambio de código, configuración o CI.

## Decisiones

- **README reemplazado** (RD-1): cero texto scaffold `sv` — verificado con grep (`sv create`, `# sv`, `npx sv` → 0 matches); título "Módulo Mantenimiento de Equipos" + descripción ERP.
- **Cambio 100% documental** (RD-4, RD-6): sin tocar código, schema, seed ni CI — commit `7af6b5c` toca `README.md` únicamente; los 177 tests pasan sin modificación.
- **Fase de diseño skippeada**: decisión registrada en `tasks.md` — cambio de un archivo, sin decisiones de arquitectura ni tradeoffs.
- **Veracidad de números** (RD-5): stats date-stamped "Estado a 2026-08-07: 177 tests (12 archivos), statements 82.3% (665/808)" — mitiga el riesgo de números stale.
- **Prettier-compliant** (RD-9): `README.md` pasa `format:check` y queda FUERA de `.prettierignore` (Prettier formatea markdown).
- **Enlaces a docs** (RD-10): `AGENTS.md` (fuente de verdad de arquitectura/convenciones/comandos) + `DESIGN.md` (sistema de diseño), cada uno con su rol explícito.

## Outcomes

- **10/10 requisitos spec COMPLIANT** (RD-1..RD-10), 10/10 escenarios cubiertos (estático + gates)
- **`README.md` reescrito** (177 líneas): sin scaffold `sv`, quick start y tabla de scripts verbatim de `package.json` (17 scripts), arquitectura post-service-layer-refactor, CI resumido fiel a `ci.yml`, credenciales del seed correctas
- **177 tests siguen verdes** — cero cambios de código (gates check 0/0, test 177/177 intactos)
- **`npx prettier --check README.md` verde** — README fuera de `.prettierignore`
- Single work unit: 1 commit convencional (`docs:`), sin atribución AI

## Known Deviations (documentadas en verify report)

- Ninguna. Cero issues CRITICAL/WARNING en el verify report; solo sugerencias de mantenimiento (actualizar stats date-stamped junto a cambios futuros de tests; reflejar en README los cambios de convenciones que primero aterricen en `AGENTS.md`).

## Archivo

Este cambio se considera COMPLETO y ARCHIVADO. Carpeta movida a `openspec/changes/archive/2026-08-07-project-readme/` (audit trail completo: proposal, specs, tasks, verify-report). Spec sincronizada a la fuente de verdad `openspec/specs/project-readme.md`.
