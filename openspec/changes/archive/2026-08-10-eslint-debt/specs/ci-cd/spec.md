# Delta for CI/CD

## MODIFIED Requirements

### CC-4: Gate Order and Coverage

The workflow MUST run gates in order: `npm run check` → `npm run format:check` → `npm run lint` → `npm run test` → `npm run test:coverage`. `package.json` MUST provide a `format:check` script running Prettier in check mode over all files not excluded by `.prettierignore`. `test:coverage` MUST fail when statement coverage drops below 70% (threshold enforced in `vitest.config.ts`).
(Previously: gate order was `check` → `format:check` → `test` → `test:coverage`, without lint.)

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

### CC-6: Lint Policy

`npm run lint` MUST pass on the whole repository and MUST gate CI: the workflow MUST run `npm run lint` after `format:check` and before `test`, and a non-zero exit MUST fail the pipeline. The workflow header comment MUST state that lint gates CI. This reversal MUST be recorded in the change's design.
(Previously: lint SHALL remain red (170 pre-existing eslint errors, explicitly out of scope) and MUST NOT gate CI; CI gated on `format:check` instead, with no lint step.)

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
