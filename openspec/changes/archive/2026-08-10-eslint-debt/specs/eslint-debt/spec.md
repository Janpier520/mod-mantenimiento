# ESLint Debt — Specification

## Purpose

Eliminate the pre-existing ESLint debt (139 `.svelte` + 12 `.ts` errors, verified 2026-08-10) so `npm run lint` exits 0 repo-wide and ESLint becomes a CI gate. Fixes target code, not rules. Dominio nuevo — requisitos ADDED.

## Requirements

### EL-1: Lint zero-errors

`npm run lint` MUST exit 0 across the whole repository with zero errors and zero warnings. The `lint` script in `package.json` (`prettier --check . && eslint .`) MUST remain unchanged, preserving the Prettier-first short-circuit.

#### Scenario: Whole-repo lint passes

- GIVEN the full repository with all ESLint fixes applied
- WHEN running `npm run lint`
- THEN it MUST exit 0 with 0 errors and 0 warnings

#### Scenario: Prettier short-circuit preserved

- GIVEN a Prettier-invalid file in the repo
- WHEN running `npm run lint`
- THEN the run MUST fail on the Prettier stage before ESLint executes
- AND the `lint` script MUST remain unchanged

### EL-2: Rule fixes preserve behavior

Every ESLint fix MUST be behavior-neutral: no change to runtime logic, navigation targets, or reactive semantics. Type-only changes MUST NOT alter values or control flow.

#### Scenario: any-type narrowing

- GIVEN a file using `any` flagged by `no-explicit-any`
- WHEN the type is replaced with a precise type, or `unknown` with narrowing
- THEN runtime behavior MUST be unchanged AND the file MUST typecheck

#### Scenario: each-key correctness

- GIVEN an `{#each}` block flagged by `require-each-key`
- WHEN a key is added
- THEN the key MUST be a stable unique identifier when available
- AND `index` MUST only be used for static/immutable lists, justified inline

#### Scenario: resolve() preserves navigation

- GIVEN an internal link flagged by `no-navigation-without-resolve`
- WHEN the link is wrapped with `resolve()` from `$app/paths`
- THEN the link MUST navigate to the same route with the same params as before

#### Scenario: Reactivity semantics identical

- GIVEN code flagged by `prefer-svelte-reactivity` or `prefer-writable-derived`
- WHEN rewritten with `$derived` / `SvelteMap`
- THEN computed values and update timing MUST remain identical to the original

### EL-3: No rule disabling

`eslint.config.js` MUST remain unchanged unless a rule is provably wrong; any such deviation MUST be justified in the PR. `eslint-disable` comments MUST NOT be introduced except to mark deliberate simplifications documented by `ponytail:` comments, each justified in the PR.

#### Scenario: Config unchanged

- GIVEN the merged change
- WHEN diffing `eslint.config.js`
- THEN no change MUST exist unless a provably-wrong rule was justified in the PR

#### Scenario: Disables justified

- GIVEN the repository after the change
- WHEN searching for `eslint-disable`
- THEN every remaining occurrence, including pre-existing ones in `src/lib/utils.ts`, MUST correspond to a `ponytail:`-documented simplification listed in the PR

### EL-4: Gates stay green

`npm run check` MUST report 0 errors and 0 warnings; `npm run test` MUST pass all 177 tests; `npm run test:coverage` MUST report ≥70% statement coverage.

#### Scenario: Full gate suite green

- GIVEN all lint fixes applied
- WHEN running `npm run check`, `npm run test`, and `npm run test:coverage`
- THEN check MUST be clean, all 177 tests MUST pass, and coverage MUST be ≥70%

### EL-5: Commits per rule-batch

Implementation commits MUST be grouped by ESLint rule category — trivial (~49), `require-each-key` (24), `no-navigation-without-resolve` (19), `no-explicit-any` (43), reactivity (12) — so each batch can be reverted independently.

#### Scenario: Batch commits revertible

- GIVEN the implementation branch
- WHEN listing its commits
- THEN each commit MUST contain fixes for a single rule category
- AND reverting any one commit MUST leave the other categories' fixes intact
