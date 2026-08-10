# Proposal: README de Proyecto (project-readme)

## Intent

`README.md` es el scaffold genérico de `sv` (42 líneas de boilerplate) — no documenta este proyecto. El conocimiento real vive en `AGENTS.md` y en el estado verificado del repo. Este cambio reemplaza el README con documentación real en español (prosa en español, identificadores en inglés), para tesistas, tutores y colaboradores.

## Scope

### In Scope

Reemplazar `README.md` completo, cubriendo:

1. Título + descripción (Módulo Mantenimiento de Equipos — ERP de mantenimiento)
2. Stack: SvelteKit 5 (runes), TS 6, Drizzle + SQLite/libSQL, Tailwind v4, shadcn-svelte, bcryptjs
3. Quick start: Node (`^20.19.0 || >=22.12.0`, `engine-strict`), `npm install`, `.env` (`DATABASE_URL`), `dev`, `db:seed` / `db:reset`
4. Tabla de scripts (`dev`/`build`/`preview`/`check`/`lint`/`format`/`format:check`/`test`/`test:coverage`/`db:*`)
5. Testing: comandos, cobertura v8, DB in-memory (`test-helpers.ts`), estado (177 tests, 82.3%)
6. CI: resumen `ci.yml` (push + PR a main, Node 24, gate `check → format:check → test → coverage ≥70%`)
7. Arquitectura: tabla rutas + roles, load functions + form actions + service layer, auth `hooks.server.ts`, schema en `db/schema.ts`
8. Estructura de carpetas condensada
9. SDD/OpenSpec: dirs y flujo de artefactos
10. Credenciales: `admin / admin123` (seed) + datos demo
11. Nota breve de contexto de tesis
- Enlaces a `AGENTS.md` y `DESIGN.md`

### Out of Scope

- Traducir `AGENTS.md` (sigue en español; es la fuente de verdad)
- Docs de API ni nuevas guías de contribución
- Cambios de código, configuración o CI

## Capabilities

### New Capabilities

None — cambio documental, sin comportamiento runtime.

### Modified Capabilities

None — ningún spec existente (`ci-cd`, `service-layer`, `test-coverage`, etc.) cambia.

## Approach

Un work unit: reescribir `README.md` derivado de `AGENTS.md` + hechos verificados (177 tests ✅, seed ✅, `ci.yml` ✅). Estructura cognitive-doc-design: respuesta primero, tablas, progressive disclosure. Verificar `npm run format:check` pre-commit — `README.md` no está en `.prettierignore` y Prettier formatea markdown.

## Affected Areas

| Area      | Impact   | Description                        |
| --------- | -------- | ---------------------------------- |
| `README.md` | Modified | Scaffold `sv` reemplazado por doc real |

## Risks

| Risk                          | Likelihood | Mitigation                        |
| ----------------------------- | ---------- | --------------------------------- |
| README desincronizado de AGENTS.md | Low    | Derivar de AGENTS.md + enlazarlo  |
| Números de tests/cobertura stale | Med      | Anotar "estado a 2026-08-07"      |
| Prettier rompe CI (README formateado) | Low | Correr `format:check` pre-commit  |

## Rollback Plan

`git revert` del commit del README (`git checkout HEAD~1 -- README.md` restaura el scaffold). Sin impacto en DB ni runtime.

## Dependencies

- `AGENTS.md` (fuente de verdad), `DESIGN.md` (existe), hechos verificados del repo

## Success Criteria

- [ ] `README.md` sin texto scaffold `sv`
- [ ] Cubre las 11 secciones del scope
- [ ] `npm run format:check` verde con el nuevo README
- [ ] Credenciales coinciden con el seed (`admin / admin123`)
- [ ] `npm run check` y `npm run test` intactos (sin cambios de código)
