# Tasks: CI Pipeline on GitHub Actions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100-150 (12 formatted files, mostly small; ci.yml ~60; package.json ~5; .prettierignore ~2) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR, 2 work-unit commits |
| Delivery strategy | exception-ok |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Prettier debt fix: format 12 files, ignore `/openspec/` | PR 1 | Commit 1 only; must land first so CI is green from run #1 |
| 2 | CI pipeline: `ci.yml` + `package.json` (engines, format:check) | PR 1 | Same PR, commit 2; depends on unit 1 |

## Phase 1: Foundation — Formatting Debt

- [x] 1.1 Add `/openspec/` to `.prettierignore` (root-anchored, comment: SDD artifacts — archive is audit trail, never re-formatted). MUST precede any write (CC-5).
- [x] 1.2 Run targeted `npx prettier --write` on the exact 12-file list from design (DESIGN.md + 11 src/**). NEVER `prettier --write .` (CC-5).
- [x] 1.3 Verify: `npx prettier --check .` green — 25 flags → 0 (CC-5).
- [x] 1.4 Commit 1: `style: fix prettier debt on 12 files and ignore openspec/` — 12 formatted files + `.prettierignore` only.

## Phase 2: Core — CI Workflow + package.json

- [x] 2.1 `package.json`: add `"format:check": "prettier --check ."` script + `"engines": { "node": "^20.19.0 || >=22.12.0" }` after `"type": "module"` (CC-2, CC-4).
- [x] 2.2 Create `.github/workflows/ci.yml` with the EXACT YAML from design: triggers main-only; `permissions: contents: read`; concurrency group cancel; `checkout@v4`; `setup-node@v4` node `"24"` + `cache: npm`; `npm ci`; gates check → format:check → test → test:coverage; `upload-artifact@v4` path `coverage/` (CC-1, CC-3, CC-6, CC-7, CC-8).
- [x] 2.3 GOTCHA: run `npx prettier --write .github/workflows/ci.yml` after writing (prettier normalizes YAML) so `format:check` stays green.
- [x] 2.4 Commit 2: `ci: add GitHub Actions quality-gate pipeline` — `ci.yml` + `package.json` (format:check, engines).

## Phase 3: Verification — Local Gate Replay

- [x] 3.1 Replay gates in CI order: `npm run check` → `npm run format:check` → `npm run test` → `npm run test:coverage` — all green (expect 139/139 tests, coverage ≥ 70%).
- [x] 3.2 YAML parse: `npx prettier --check .github/workflows/ci.yml` (prettier parses YAML); optional `actionlint` if available.
- [x] 3.3 Structural checklist CC-1..CC-8: main-only triggers; pinned v4 actions (no `@main`); node `'24'` + cache npm; `npm ci`; gate order; upload `coverage/`; NO lint step; NO build/deploy step.
- [x] 3.4 Confirm `npm run lint` still red (170 errors) — intentional, NOT a gate (CC-6).

## Phase 4: Cleanup — Docs/Config

- [x] 4.1 `openspec/config.yaml`: no-op — verified no `ci` field nor `rules.tasks` section exists; no config change required.
- [x] 4.2 Rollback documented: delete `ci.yml`, `git revert` commit 2 then commit 1 (whitespace-only, no conflict risk).
