# CI/CD — Specification

## Purpose

Add a GitHub Actions pipeline that machine-enforces the pre-commit quality gate on every push and pull request to `main`, plus a one-time Prettier debt commit and an `engines` pin so `engine-strict=true` is meaningful. All requirements here are ADDED — no existing behavior changes.

## Requirements

### CC-1: CI Workflow File

`.github/workflows/ci.yml` MUST exist and MUST trigger on `push` and `pull_request` events targeting the `main` branch only.

#### Scenario: PR and push to main

- GIVEN a push or pull_request event targeting `main`
- WHEN the workflow trigger evaluates
- THEN the pipeline MUST run
- AND events on any other branch MUST NOT run it

### CC-2: Node Environment

The workflow MUST use `actions/setup-node` with `node-version: 24` (satisfies the engines range) with npm cache enabled. `package.json` MUST declare `"engines": { "node": "^20.19.0 || >=22.12.0" }` so `engine-strict=true` (`.npmrc`) is enforced.

#### Scenario: Engine-strict compliance

- GIVEN a runner pinned to Node 24
- WHEN `npm ci` runs
- THEN the engine check MUST pass and the install MUST succeed
- AND setup-node MUST restore/save the npm cache

### CC-3: Reproducible Install

The workflow MUST install dependencies with `npm ci` (not `npm install`) so installs are lockfile-authoritative from `package-lock.json`.

#### Scenario: Lockfile-authoritative install

- GIVEN a committed `package-lock.json`
- WHEN the install step runs `npm ci`
- THEN the install MUST fail if the lockfile drifts from `package.json`

### CC-4: Gate Order and Coverage

The workflow MUST run gates in order: `npm run check` → `npm run format:check` → `npm run lint` → `npm run test` → `npm run test:coverage`. `package.json` MUST provide a `format:check` script running Prettier in check mode over all files not excluded by `.prettierignore`. `test:coverage` MUST fail when statement coverage drops below 70% (threshold enforced in `vitest.config.ts`).

#### Scenario: Green pipeline

- GIVEN a PR that typechecks, is Prettier-clean, passes lint, passes all tests, and has ≥70% statement coverage
- WHEN the pipeline runs
- THEN all five gates MUST pass in order

#### Scenario: Coverage regression

- GIVEN a PR whose statement coverage is below 70%
- WHEN `npm run test:coverage` runs
- THEN the gate MUST fail and the pipeline MUST report failure

#### Scenario: Format failure

- GIVEN a PR with a Prettier-invalid file
- WHEN `npm run format:check` runs
- THEN the gate MUST fail with the offending file listed

### CC-5: Prettier Debt Commit

The 12 pre-existing unformatted files (11 `src/**` + `DESIGN.md`) MUST be formatted with `prettier --write` in a SEPARATE first commit, before the workflow commit. `.prettierignore` MUST add `openspec/` so archived change docs are never modified.

#### Scenario: Debt lands first

- GIVEN the debt commit is applied before the CI commit
- WHEN CI first runs
- THEN `format:check` MUST be green on the 12 files

#### Scenario: Archive untouched

- GIVEN `openspec/` is in `.prettierignore`
- WHEN `prettier --write` or `format:check` runs
- THEN no file under `openspec/` MUST be modified or flagged

### CC-6: Lint Policy

`npm run lint` MUST pass on the whole repository and MUST gate CI: the workflow MUST run `npm run lint` after `format:check` and before `test`, and a non-zero exit MUST fail the pipeline. The workflow header comment MUST state that lint gates CI. This reversal MUST be recorded in the change's design.

#### Scenario: Lint gates CI

- GIVEN the workflow's step list
- WHEN CI runs
- THEN a lint step MUST execute after `format:check` and before `test`
- AND a failing `npm run lint` MUST fail the pipeline

#### Scenario: Green pipeline requires lint

- GIVEN a pipeline where every gate except lint passes
- WHEN `npm run lint` exits non-zero
- THEN the pipeline MUST report failure
- AND the workflow header comment MUST NOT claim lint is excluded from CI

### CC-7: Coverage Artifact

The workflow SHOULD upload the coverage HTML report via `actions/upload-artifact` for PR review.

#### Scenario: Artifact uploaded

- GIVEN the pipeline reaches the coverage step
- WHEN `test:coverage` completes
- THEN the HTML report MUST be uploaded as an artifact

### CC-8: No Deployment

Deployment via adapter-node MUST NOT be included in this change; build and deploy steps are deferred.

#### Scenario: No build or deploy step

- GIVEN the workflow file
- WHEN its steps are enumerated
- THEN no build or deploy step MUST exist

## Out of Scope

Deployment (adapter-node), matrix builds, dependabot, secrets/env management, eslint debt fix, and `npm run build` in CI.
