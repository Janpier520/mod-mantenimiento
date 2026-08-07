# Design: CI Pipeline on GitHub Actions

## Technical Approach

Add a single-job GitHub Actions workflow (`.github/workflows/ci.yml`) that machine-enforces the pre-commit gate from AGENTS.md on push/PR to `main`: `check → format:check → test → test:coverage`. Land the Prettier debt fix (12 files) as its own first commit so the pipeline is green from run #1; pin `engines` so `engine-strict=true` is meaningful; exclude `openspec/` from Prettier so the archive audit trail is never reformatted. Maps to proposal approach and spec CC-1..CC-8.

## Architecture Decisions

### Decision: Workflow YAML structure

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Multi-job matrix | Parallel, faster | ❌ Reject — single job (~2 min), YAGNI |
| Pinned action tags (`@v4`) | Reproducible builds | ✅ Adopt — never `@main` |
| Concurrency group + cancel | Kill stale runs on same ref | ✅ Adopt |

Exact file — `.github/workflows/ci.yml` (create `.github/workflows/` — only `.github/ISSUE_TEMPLATE/` exists today):

```yaml
# CI quality gate for mod-mantenimiento.
# ESLint is intentionally NOT a gate: 170 pre-existing errors (verified 2026-08-06).
# Follow-up change: eslint-debt.
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run check

      - name: Format check
        run: npm run format:check

      - name: Tests
        run: npm run test

      - name: Coverage gate (>=70% statements)
        run: npm run test:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          if-no-files-found: error
```

**GOTCHA for apply**: Prettier formats YAML too. After writing, run `npx prettier --write .github/workflows/ci.yml` so `format:check` stays green (prettier may normalize quoting/indentation).

### Decision: `format:check` script

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `prettier --check . --ignore-path .prettierignore` | Explicit, but redundant — that is the default ignore filename | ❌ Reject |
| `prettier --check .` | Auto-loads `.prettierignore` from cwd; matches existing `lint` style | ✅ Adopt |
| Dedicated `scripts/format-check.mjs` | Over-engineering for one command | ❌ Reject |

`"format:check": "prettier --check ."` — satisfies CC-4 (checks all files not excluded by `.prettierignore`).

### Decision: `.prettierignore` additions

Add (root-anchored, matching existing `/static/`, `/drizzle/` style):

```
# SDD artifacts — archive is an audit trail, never re-formatted
/openspec/
```

Covers all 13 currently-flagged openspec files (archive, changes/archive, proposals, specs — all under `/openspec/`). Documented tradeoff: openspec/ docs are no longer prettier-checked, so SDD artifacts may drift stylistically — accepted because archives are immutable and active change docs are agent-written.

### Decision: `engines` pin

Verified against installed toolchain (`node_modules/*/package.json` engines): vite `^20.19.0 || >=22.12.0`, vitest `^20||^22||>=24`, vite-plugin-svelte `^20.19||^22.12||>=24`, kit `>=18.13`, svelte-check `>=18`, prettier `>=14`. `^20.19.0 || >=22.12.0` is a valid intersection of all. Add after `"type": "module"`:

```json
"engines": { "node": "^20.19.0 || >=22.12.0" }
```

Local Node v24.16.0 is in range; CI pins Node 24. `engine-strict=true` (`.npmrc`) now actually enforces.

### Decision: Prettier debt execution — exclude openspec/, format exactly 12 files

The 13 flagged openspec files stay untouched (archive = audit trail, per proposal). Exact file list (verified via `prettier --check .` on 2026-08-06):

1. `DESIGN.md`
2. `src/lib/ui/ActionIconButton.svelte`
3. `src/lib/ui/Badge.svelte`
4. `src/routes/+layout.svelte`
5. `src/routes/equipos/+page.svelte`
6. `src/routes/equipos/tipos/+page.svelte`
7. `src/routes/login/+page.svelte`
8. `src/routes/mantenimiento/+page.server.ts`
9. `src/routes/mantenimiento/+page.svelte`
10. `src/routes/proveedores/+page.svelte`
11. `src/routes/tickets/+page.svelte`
12. `src/routes/usuarios/+page.svelte`

Command (targeted paths — NEVER run `prettier --write .` before `/openspec/` is in `.prettierignore`, it would reformat the 13 archive files):

```bash
npx prettier --write DESIGN.md src/lib/ui/ActionIconButton.svelte src/lib/ui/Badge.svelte src/routes/+layout.svelte src/routes/equipos/+page.svelte src/routes/equipos/tipos/+page.svelte src/routes/login/+page.svelte src/routes/mantenimiento/+page.server.ts src/routes/mantenimiento/+page.svelte src/routes/proveedores/+page.svelte src/routes/tickets/+page.svelte src/routes/usuarios/+page.svelte
```

Order within commit 1: edit `.prettierignore` first → run targeted `--write` → confirm `npx prettier --check .` is green (25 flags → 0).

### Decision: ESLint deferral

Verified: `npx eslint .` → **170 errors, 0 warnings** (5 auto-fixable) — matches proposal. CI MUST NOT gate on lint (CC-6); the decision is recorded in the ci.yml header comment (above) and this doc. Follow-up change: `eslint-debt`.

## Data Flow

```
push/PR → main
   │
   ▼
concurrency group (cancel stale run on same ref)
   │
   ▼
checkout@v4 → setup-node@v4 (Node 24, npm cache) → npm ci
   │
   ▼
npm run check → format:check → test → test:coverage (≥70%)
   │
   ▼
upload coverage/ artifact (for PR review)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Create | CI workflow (push + PR on main) |
| `.prettierignore` | Modify | + `/openspec/` |
| `package.json` | Modify | + `format:check` script, + `engines` field |
| 12 files listed above | Modify | Prettier-only formatting (commit 1) |

## Interfaces / Contracts

`package.json` additions:

```json
"format:check": "prettier --check .",
"engines": { "node": "^20.19.0 || >=22.12.0" }
```

Coverage contract already satisfied: `vitest.config.ts` has `thresholds.statements: 70` and html reporter → `coverage/` (gitignored, so the artifact path never pollutes the repo).

## Commit Plan (2 commits, per orchestrator)

1. `style: fix prettier debt on 12 files and ignore openspec/` — 12 formatted files + `.prettierignore`. Verify: `npx prettier --check .` green. (No `format:check` script yet — verify with the bare command.)
2. `ci: add GitHub Actions quality-gate pipeline` — `ci.yml` + `package.json` (`format:check`, `engines`). Verify: all four gates green locally.

## Verification Plan (no push possible — GH Actions cannot run locally)

| Layer | What | Approach |
|-------|------|----------|
| Gates | CI order | Local replay in CI order: `npm run check` → `npm run format:check` → `npm run test` → `npm run test:coverage`, all green |
| YAML syntax | ci.yml parses | `npx prettier --check .github/workflows/ci.yml` (prettier parses YAML; malformed YAML fails); optional `actionlint` if available |
| Spec conformance | CC-1..CC-8 | Structural review checklist: triggers `main`-only; `permissions: contents: read`; concurrency group; actions pinned to v4 (no `@main`); `node-version: '24'` + `cache: npm`; `npm ci` (lockfile exists, verified); gate order check → format:check → test → test:coverage; upload path `coverage/`; NO lint step; NO build/deploy step |
| Expected red | `npm run lint` | Still 170 errors — intentional, not a gate |
| First real run | Post-merge | First green run happens on the first push/PR to main; monitor run #1 |

## Migration / Rollout

No DB/schema/runtime impact. Rollback: delete `.github/workflows/ci.yml`; `git revert` commit 2 and commit 1 (whitespace-only, no conflict risk).

## Open Questions

None.
