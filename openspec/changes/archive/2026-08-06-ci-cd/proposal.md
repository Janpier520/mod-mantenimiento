# Proposal: CI Pipeline on GitHub Actions

## Intent

The project has zero CI ("No CI/CD configurado" per AGENTS.md) — every quality gate (format → lint → check → test) is enforced by discipline alone, so regressions ship silently. This change adds a minimal GitHub Actions workflow that runs the quality gate on every push and PR to `main`, making the pre-commit contract machine-enforced.

## Scope

### In Scope

- `.github/workflows/ci.yml`: single job, ubuntu-latest, Node 24 (matches local v24.16.0; satisfies Vite 8 `^20.19||>=22.12`, Vitest 4 `^20||^22||>=24`), npm cache via `setup-node`
- Steps: checkout → setup-node → `npm ci` → `npm run check` → `npm run format:check` → `npm run test` → `npm run test:coverage` (70% v8 threshold enforced) → upload coverage artifact
- Prettier debt fix as a SEPARATE commit (own work unit): `prettier --write` on 12 real files (11 `src/**` + `DESIGN.md`)
- Add `openspec/` to `.prettierignore` — 13 flagged openspec docs stay untouched (archived changes are audit trail; "never delete or modify archived changes")
- `package.json`: add `format:check` script + `engines` field (`^20.19.0 || >=22.12.0`) — `engine-strict=true` is a no-op without `engines`

### Out of Scope

- Deployment (adapter-node), matrix builds, dependabot, secrets/env management
- **eslint debt (170 pre-existing errors)** — too large for this change; follow-up `eslint-debt` change
- `npm run lint` in CI (blocked by eslint debt); CI gates on `format:check` instead
- Build step (`npm run build`) — deferred; CI covers check/test only

## Capabilities

### New Capabilities

- `ci-cd`: GitHub Actions pipeline enforcing format, typecheck, tests, and coverage on push/PR to `main`

### Modified Capabilities

None — no spec-level behavior changes.

## Approach

1. **Work unit 1 (debt)**: `prettier --write` on the 12 real files; add `openspec/` to `.prettierignore`; add `format:check` script. Landed first so CI is never red on format.
2. **Work unit 2 (CI)**: `ci.yml` — trigger `push + pull_request` on `main` only (origin/HEAD = main; stale `master` ref ignored). `npm ci` (lockfile exists) + npm cache. Gate order mirrors AGENTS.md pre-commit: check → format:check → test → test:coverage.
3. **Engines pin**: add `engines` to `package.json` so `engine-strict` actually enforces locally; CI pins Node 24.

## Affected Areas

| Area                       | Impact   | Description                            |
| -------------------------- | -------- | -------------------------------------- |
| `.github/workflows/ci.yml` | New      | CI workflow (push + PR on main)        |
| `.prettierignore`          | Modified | + `openspec/`                          |
| `package.json`             | Modified | `format:check` script, `engines` field |
| 11 `src/**` + `DESIGN.md`  | Modified | Prettier formatting only, own commit   |

## Risks

| Risk                                           | Likelihood | Mitigation                                                      |
| ---------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `npm run lint` red (eslint, 170 errors)        | Certain    | CI uses `format:check`; eslint deferred to follow-up change     |
| Prettier debt reds CI on first run             | Certain    | Debt commit lands first as separate work unit                   |
| Modifying archived openspec files              | Med        | `openspec/` excluded via `.prettierignore` (audit trail)        |
| Node mismatch vs `engine-strict`               | Low        | CI pins Node 24 (matches local); `engines` covers 20.19+/22.12+ |
| `master` vs `main` confusion                   | Low        | origin/HEAD = main; triggers pinned to `main` only              |
| `npm ci` fails if lockfile drifts from package | Low        | Lockfile committed; `npm ci` is lockfile-authoritative          |

## Rollback Plan

Delete `.github/workflows/ci.yml`; `git revert` the package.json and `.prettierignore` commits; `git revert` the format commit (whitespace-only, no conflicts expected). No DB, schema, or runtime impact.

## Dependencies

- `package-lock.json` (exists) — required for `npm ci`
- GitHub Actions public runners: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`

## Success Criteria

- [ ] `.github/workflows/ci.yml` runs on push and PR to `main`
- [ ] `npm run format:check` green after the debt commit
- [ ] Pipeline green end-to-end on a PR: check 0 errors, format clean, 139/139 tests, coverage ≥ 70%
- [ ] `npm run check` and `npm run test:coverage` behave identically in CI and locally
