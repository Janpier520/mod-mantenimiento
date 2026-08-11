# Proposal: ESLint Debt — Lint as CI Gate

## Intent

Make `npm run lint` pass repo-wide so ESLint becomes a CI gate. Today `lint` short-circuits on prettier, hiding **139 `.svelte` + 12 `.ts` errors** (verified 2026-08-10). This reverses `ci-cd` spec CC-6 (lint MUST NOT gate CI).

## Scope

### In Scope
- Fix all 139 `.svelte` + 12 `.ts` ESLint errors (fix code, not rules)
- `eslint.config.js` unchanged unless a rule is provably wrong; `ponytail:` comments may justify a targeted `eslint-disable` for deliberate unused code
- `lint` script unchanged; add lint step to `.github/workflows/ci.yml` after `format:check`; update stale header comment (lines 2–3)
- Update README RD-6 (remove "~170 errores preexistentes", lint IS gate)
- `check` + `test` (177) + coverage ≥70% stay green

### Out of Scope
- Logic refactors beyond lint compliance, dependency upgrades, coverage changes, other tooling

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ci-cd`: CC-6 reversed — lint MUST gate CI after `format:check`; "Lint excluded from CI" scenario replaced
- `project-readme`: RD-6 updated — CI section states lint IS a gate

## Approach

Batch by rule, each batch = own commit for clean revert:
- **(a) Trivial (~49)**: `no-useless-mustaches` (5), `no-unused-svelte-ignore` (24, delete dead comments), `no-unused-vars` (13 svelte + 5 ts: unused imports/params in `hooks.server.ts`, `auth.ts`, `schema.ts`, `reset-password`, `sessions`), `no-unused-expressions` (3), `no-constant-binary-expression` (1). `state-machines.ts`: type from `as const` value
- **(b) `require-each-key` (24)**: stable unique `id` when available; `index` only for static/immutable lists, justified inline
- **(c) `no-navigation-without-resolve` (19)**: internal links wrapped with `resolve()` from `$app/paths`; verify routes/params
- **(d) `no-explicit-any` (41 svelte + 2 ts)**: precise types; `unknown` + narrowing where unclear; `eslint-disable` last resort
- **(e) Reactivity (12)**: `prefer-svelte-reactivity` (5 + 3 in `toast.svelte.ts` → `SvelteMap`), `prefer-writable-derived` (4 → `$derived`); semantics identical

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/**/*.svelte` | Modified | 139 fixes (any, keys, resolve, reactivity) |
| `src/lib/stores/toast.svelte.ts` | Modified | `Map` → `SvelteMap` |
| 8 `.ts` server files | Modified | 12 fixes (listed above) |
| `.github/workflows/ci.yml` | Modified | lint step + comment |
| `README.md` | Modified | RD-6 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `resolve()` changes link behavior | Med | Verify routes exist, params preserved |
| Reactivity refactors alter derived-state timing | Med | Keep expressions identical; check + tests |
| each-key index misuse | Low | id-first policy, review per key |
| Rule disabled to dodge work | Med | Config changes need justification |

## Rollback Plan

Per-batch commits → `git revert` per batch; CI step is a one-line revert.

## Dependencies

None (eslint 10, eslint-plugin-svelte 3.x already installed).

## Success Criteria

- [ ] `npm run lint` exits 0 on whole repo
- [ ] CI runs lint after `format:check`; green on main
- [ ] README RD-6 updated; ci.yml comment current
- [ ] `npm run check` green; `npm run test` green (177); coverage ≥70%
