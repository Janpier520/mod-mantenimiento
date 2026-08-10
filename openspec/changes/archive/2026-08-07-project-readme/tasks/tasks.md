# Tasks: Project README (project-readme)

Design phase skipped per spec recommendation: pure doc change, one file, no architecture decisions.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-250 (README.md only) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single commit on main |
| Delivery strategy | exception-ok |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Rewrite README.md + verify gates + commit | Commit on main | Docs with the change they explain; single work unit |

## Phase 1: Draft README.md (RD-1..RD-8, RD-10)

- [ ] 1.1 Replace `README.md` scaffold fully: remove all `sv` boilerplate; title "Módulo Mantenimiento de Equipos" + ERP description, Spanish prose, English identifiers (RD-1)
- [ ] 1.2 Quick start: Node `^20.19.0 || >=22.12.0` + engine-strict; `npm install`; `.env` from `.env.example` with `DATABASE_URL` (mirror `file:local.db`, NOT stale `equip-lab.db`); `npm run dev`; `npm run db:seed` / `npm run db:reset` — commands verbatim from package.json (RD-2)
- [ ] 1.3 Scripts table: all 17 scripts with exact commands — `dev`, `build`, `preview`, `prepare`, `check`, `check:watch`, `lint`, `format`, `format:check`, `db:push`, `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:reset`, `test`, `test:coverage` (RD-3)
- [ ] 1.4 Testing section: `npm run test` / `npm run test:coverage` (v8), in-memory SQLite via `src/lib/server/db/test-helpers.ts` (`file::memory:`, `initTestDb`), date-stamped 177 tests / 82.3% as of 2026-08-07 (RD-5)
- [ ] 1.5 CI section: summarize `.github/workflows/ci.yml` — push+PR to main, Node 24, `npm ci`, gates `check` → `format:check` → `test` → `test:coverage` (≥70% statements); ESLint not a gate (RD-6)
- [ ] 1.6 Architecture: routes+roles table from `src/hooks.server.ts` (`PUBLIC_ROUTES`, `ROLE_ROUTES`), thin routes (load functions + form actions) delegating to `src/lib/server/services/`, auth in hooks, schema in `src/lib/server/db/schema.ts`, no REST/tRPC (RD-4)
- [ ] 1.7 Condensed project tree: `src/routes/`, `src/lib/server/{services,db}/`, `scripts/`, `.github/workflows/`
- [ ] 1.8 SDD/OpenSpec: `openspec/` layout (`changes/`, `specs/`, `archive/`) + artifact flow proposal→spec→design→tasks→apply→verify→archive (RD-7)
- [ ] 1.9 Credentials & demo: `admin`/`admin123` (seed), demo data = 10 equipment types, 2 proveedores, 5 config keys, demo users/equipos/tickets (RD-8)
- [ ] 1.10 Links to `AGENTS.md` (source of truth) + `DESIGN.md` with roles; brief thesis-context note (RD-10)

## Phase 2: Verification gates

- [ ] 2.1 Accuracy cross-check: commands vs package.json; routes/roles vs hooks.server.ts; CI vs ci.yml; credentials vs seed.ts — no stale AGENTS.md values
- [ ] 2.2 Prettier: `npx prettier --write README.md` then `npm run format:check` green; README.md stays out of `.prettierignore` (RD-9)
- [ ] 2.3 `npm run check` — 0/0 (no code changes expected)
- [ ] 2.4 `npm run test` — 177/177 (unchanged; confirm)

## Phase 3: Commit

- [ ] 3.1 Stage `README.md` only; commit `docs: replace scaffold README with project documentation` (conventional, no AI attribution)
