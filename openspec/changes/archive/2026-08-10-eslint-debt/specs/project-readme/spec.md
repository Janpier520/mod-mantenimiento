# Delta for Project README

## MODIFIED Requirements

### RD-6: CI section

The README MUST summarize `.github/workflows/ci.yml`: push + PR to `main`, Node 24, `npm ci`, gates `check`→`format:check`→`lint`→`test`→`test:coverage` (≥70% statements), and MUST state that lint is a CI gate.
(Previously: gate order listed without lint, and the section stated "ESLint no es gate: ~170 errores preexistentes (2026-08-06)".)

#### Scenario: CI summary matches workflow

- GIVEN the CI section
- WHEN comparing against `ci.yml`
- THEN triggers, Node version, gate order including lint, and the 70% threshold MUST match

#### Scenario: No stale exclusion statement

- GIVEN the CI section
- WHEN searching for "ESLint no es gate" or the 170-error count
- THEN neither MUST be present
- AND lint MUST be described as a required CI gate
