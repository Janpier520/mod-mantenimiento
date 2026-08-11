# Tasks: ESLint Debt — Lint as CI Gate

Change: `2026-08-10-eslint-debt` · Source: proposal.md + specs (`eslint-debt`, `ci-cd`, `project-readme`) · Design: skipped (zero architectural surface) · Mode: openspec · TDD: none (strict_tdd=false)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~230–330 (additions + deletions; B6 any-fixes carry the widest range) |
| Files touched | 33 (22 `.svelte` + 9 `.ts` with errors + `utils.ts` + `ci.yml` + `README.md`) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR, 12 per-batch commits (EL-5 revertibility) |
| Delivery strategy | ask-on-risk (not overridden by orchestrator) |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium
```

No chained PRs needed: estimate stays under the 400-line budget and EL-5 already guarantees independent rollback via per-batch commits. If apply discovers B6 is much deeper than estimated (>120 lines), escalate before continuing.

### Suggested Work Units (commit units within the single PR)

| Unit | Batch | Goal | Verify |
|------|-------|------|--------|
| 1 | B1–B3 | Trivial removals (34 errors) | eslint scoped per batch |
| 2 | B4–B5 | Keys + resolve() (43 errors) | eslint + check + nav smoke |
| 3 | B6 | any → precise types (43 errors) | eslint + check |
| 4 | B7–B10 | Misc ts + reactivity + utils (17 errors) | eslint + check + tests |
| 5 | B11–B12 | CI gate + README | yaml order + README grep |
| 6 | B13 | Integration gate suite | full lint/check/test/coverage |

## Ground truth (verified 2026-08-10, `npx eslint "src/**/*.svelte" --no-warn-ignored` + `npx eslint "src/**/*.ts"`)

139 `.svelte` errors in 22 files + 12 `.ts` errors in 9 files = 151 total. Rule split: no-useless-mustaches 5 · no-unused-svelte-ignore 24 · no-unused-vars 13 svelte + 6 ts · require-each-key 24 · no-navigation-without-resolve 19 · no-explicit-any 41 svelte + 2 ts · prefer-svelte-reactivity 5 svelte + 3 ts (SvelteMap) · prefer-writable-derived 4 · no-unused-expressions 3 · no-constant-binary-expression 1 · no-empty 1 (in `Toast.svelte`, missed by earlier inventory).
Only the 5 no-useless-mustaches are `--fix`-able; everything else is manual.

---

## Phase 1: Rule-batch fixes (EL-1, EL-2, EL-5)

**Common Done definition per batch**: `npx eslint <files> --no-warn-ignored` reports 0 occurrences of the batch's rule (other rules on the same files may still appear until their batch). After each batch also run `npm run format` on touched files.

### B1 — svelte/no-useless-mustaches (5, auto-fixable) — `fix(lint): remove useless mustaches in svelte files`
- [x] 1.1 Files: `src/routes/equipos/+page.svelte` (L244) · `src/routes/equipos/tipos/+page.svelte` (L90) · `src/routes/tickets/+page.svelte` · `src/routes/usuarios/+page.svelte` (×2)
  Fix: `npx eslint <4 files> --fix` unwraps string-literal mustaches; review diff — must be literal-only, no value changes. Verify: eslint scoped → 0 `no-useless-mustaches`; Done = 0 on these 4 files.

### B2 — svelte/no-unused-svelte-ignore (24) — `fix(lint): drop unused svelte-ignore comments`
- [x] 2.1 Files: `src/lib/ui/CommandPalette.svelte` (L360) · `src/routes/config/+page.svelte` (L8 ×7) · `src/routes/mantenimiento/+page.svelte` (L245 ×2) · `src/routes/proveedores/+page.svelte` (L20 ×7) · `src/routes/sessions/+page.svelte` (L10 ×7)
  Fix: delete each `svelte-ignore` comment flagged "used, but not warned" (warning no longer fires → safe, behavior-neutral). config/proveedores/sessions have 7 errors on one line each — likely one multi-line comment; remove the whole block. Verify: eslint scoped → 0 `no-unused-svelte-ignore`; Done = 0 on these 5 files.

### B3 — @typescript-eslint/no-unused-vars (13 svelte + 6 ts) — `fix(lint): remove unused variables and imports`
- [x] 3.1 Svelte files: `src/lib/ui/CommandPalette.svelte` (L3 `browser`, L205 `sections`) · `src/lib/ui/DataTable.svelte` (L102 `_`, `i`, L104 `col` — drop unused each-block params, e.g. `as item, i` → `as item`) · `src/routes/+layout.svelte` (L5 `fade`) · `src/routes/auth/forgot-password/+page.svelte` (L3 `page`, L9 `data`) · `src/routes/config/+page.svelte` (L3 `fade`) · `src/routes/login/+page.svelte` (L8 `data`) · `src/routes/mantenimiento/+page.svelte` (L14 `ChevronDown`, L16 `Check`) · `src/routes/sessions/+page.svelte` (L45 `update`)
  Fix: remove unused imports from their import statements; remove unused bindings/params. Verify each removal with grep that the name isn't used elsewhere in the file.
- [x] 3.2 TS files: `src/hooks.server.ts` (L4 `clearSessionCookie`) · `src/lib/server/auth.ts` (L51 `ipAddress`) · `src/lib/server/db/schema.ts` (L1 `real`) · `src/routes/auth/reset-password/+page.server.ts` (L4 `hashPassword`) · `src/routes/sessions/+page.server.ts` (L27 `cookies`) — delete unused import/binding/param. `src/lib/server/state-machines.ts` (L27): `VALID_USER_ROLES` only used as type → add `export` (matches sibling `VALID_*` consts; keeps `typeof` single-source at L33). Verify: eslint scoped → 0 `no-unused-vars`; `npm run check` green (removals must not break types); Done = 0 on these 14 files + check clean.

### B4 — svelte/require-each-key (24) — `fix(lint): add keys to each blocks`
- [x] 4.1 Files: `src/lib/ui/CommandPalette.svelte` (L417, L466) · `src/lib/ui/DataTable.svelte` (L86, L102, L104, L137, L151) · `src/lib/ui/FilterBar.svelte` (L81, L92) · `src/lib/ui/FormField.svelte` (L89) · `src/routes/+layout.svelte` (L320, L321, L341, L362) · `src/routes/+page.svelte` (L377, L414) · `src/routes/config/+page.svelte` (L41) · `src/routes/mantenimiento/+page.svelte` (L527, L544, L678) · `src/routes/reportes/+page.svelte` (L264, L400) · `src/routes/sessions/+page.svelte` (L29) · `src/routes/tickets/+page.svelte`
  Fix (spec EL-2): key = stable unique `id` when the iterated item has one; `index` ONLY for static/immutable lists with inline comment `<!-- ponytail: static list, index key ok -->`. DataTable rows/cols: prefer item id. Verify: eslint scoped → 0 `require-each-key`; `npm run check` green; Done = 0 on these 11 files.

### B5 — svelte/no-navigation-without-resolve (19) — `fix(lint): wrap internal links with resolve()`
- [x] 5.1 Files: `src/lib/components/ui/button/button.svelte` (L70) · `src/lib/ui/CommandPalette.svelte` (L278, L346 `goto()`) · `src/routes/+layout.svelte` (L325, L366) · `src/routes/+page.svelte` (L316, L327, L338, L349, L379, L416) · `src/routes/auth/forgot-password/+page.svelte` (L84) · `src/routes/auth/reset-password/+page.svelte` (L66, L147) · `src/routes/equipos/+page.svelte` (L129 `goto()`) · `src/routes/login/+page.svelte` (L108) · `src/routes/proveedores/+page.svelte` (L92 `goto()`) · `src/routes/tickets/+page.svelte` · `src/routes/usuarios/+page.svelte`
  Fix: `import { resolve } from '$app/paths'`; wrap literal hrefs → `href={resolve('/ruta')}`; `goto(resolve('/ruta'))`; preserve existing params/query. button.svelte: generic component — resolve at call site or keep href with `resolve()` applied to the passed value. Verify: eslint scoped → 0 `no-navigation-without-resolve`; `npm run check`; manual nav smoke (sidebar, dashboard quick links, login/auth links); Done = 0 on these 11 files + links navigate identically.

### B6 — @typescript-eslint/no-explicit-any (41 svelte + 2 ts) — `fix(lint): replace explicit any with precise types`
- [x] 6.1 Files: `src/lib/ui/ActionIconButton.svelte` (L9) · `src/lib/ui/CommandPalette.svelte` (L231, L236, L237) · `src/lib/ui/DataTable.svelte` (L28, L36, L38) · `src/lib/ui/EmptyState.svelte` (L13) · `src/routes/+layout.svelte` (L155) · `src/routes/mantenimiento/+page.svelte` (×15) · `src/routes/tickets/+page.svelte` (×12) · `src/routes/usuarios/+page.svelte` (×5) · `src/routes/+page.server.ts` (L16, L20)
  Fix: precise types first (component props, `Record<string, unknown>`, generics); `unknown` + narrowing where unclear; DataTable: type rows as `Record<string, unknown>`/generic `T`; `eslint-disable` only as last resort WITH `// ponytail:` comment (listed in PR per EL-3). Verify: eslint scoped → 0 `no-explicit-any`; `npm run check` green (type declarations may ripple); Done = 0 on these 9 files + check clean.

### B7 — ts misc: SvelteMap + no-constant-binary-expression + no-empty (5) — `fix(lint): use SvelteMap, fix nullish and empty catch`
- [x] 7.1 Files: `src/lib/stores/toast.svelte.ts` (L15–17: 3 built-in `Map` → `SvelteMap` from `svelte/reactivity`, same constructor args) · `src/routes/proveedores/+page.server.ts` (L14: `Number(url.searchParams.get('page')) ?? 1` → `Number(url.searchParams.get('page') ?? 1)` — nullish moves inside `Number()`, same result for all inputs incl. NaN) · `src/lib/ui/Toast.svelte` (L152: `catch {}` → `catch { /* releasePointerCapture failure is non-fatal */ }` — comment satisfies `no-empty`)
  Verify: eslint scoped → 0 on these 3 files; `npm run test` green (toast store is exercised); Done = 0 on these 3 files.

### B8 — svelte/prefer-svelte-reactivity (5) + svelte/prefer-writable-derived (4) — `fix(lint): use svelte reactivity primitives and derived state`
- [x] 8.1 Reactivity: `src/routes/+layout.svelte` (L53 `Set` → `SvelteSet`) · `src/routes/equipos/+page.svelte` (L122 `URLSearchParams` → `SvelteURLSearchParams`) · `src/routes/proveedores/+page.svelte` (L87 same) · `src/routes/tickets/+page.svelte` · `src/routes/usuarios/+page.svelte` — swap constructor + import; methods unchanged.
- [x] 8.2 Derived: `src/lib/ui/CommandPalette.svelte` (L27) · `src/routes/config/+page.svelte` (L9) · `src/routes/equipos/tipos/+page.svelte` (L19) · `src/routes/sessions/+page.svelte` (L11) — rewrite `$state` + `$effect` pair into `$derived` / `$derived.by`, keeping the computed expression byte-identical (spec EL-2: identical update timing).
  Verify: eslint scoped → 0 on these 9 files; `npm run check`; `npm run test` (177) green; Done = 0 on these 9 files + tests green.

### B9 — @typescript-eslint/no-unused-expressions (3) — `fix(lint): remove unused expressions`
- [x] 9.1 Files: `src/lib/ui/CommandPalette.svelte` (L257: ternary statement `open ? close() : openPalette()` → `if (open) close(); else openPalette();`) · `src/routes/+page.svelte` (L155–156: `$effect` touch refs `isDark;` / `timePeriod;` → `void isDark;` / `void timePeriod;` — verified `void` passes this config; keeps effect dependency behavior)
  Verify: eslint scoped → 0 `no-unused-expressions`; Done = 0 on these 2 files.

### B10 — EL-3: pre-existing disable in `src/lib/utils.ts` (L15–18) — `fix(lint): replace any with unknown in cn utility types`
- [x] 10.1 `src/lib/utils.ts`: replace `child?: any` / `children?: any` with `child?: unknown` / `children?: unknown` in `WithoutChild`/`WithoutChildren` (behavior-neutral: optional-property conditional check is identical for `unknown`). Verify `npm run check` green across consumers (components using `WithoutChildrenOrChild`). Fallback ONLY if typecheck breaks: keep the disables, add `// ponytail: shadcn type-level wildcard...` above each, and list both in the PR (EL-3 requires every remaining `eslint-disable` be ponytail-documented).
  Verify: `npm run check` green; Done = 0 `no-explicit-any` in utils.ts and no un-justified `eslint-disable` anywhere.

## Phase 2: Gates & docs (CC-4, CC-6, RD-6)

### B11 — CI lint gate — `ci: gate on eslint after format check`
- [x] 11.1 `.github/workflows/ci.yml`: replace header L2–3 ("ESLint is intentionally NOT a gate: 170 pre-existing errors… Follow-up change: eslint-debt") with a statement that lint gates CI; add step `Lint` (`run: npm run lint`) after `Format check` (L39–40) and before `Tests` (L42). Final order: check → format:check → lint → test → test:coverage.
  Verify: step order matches CC-4; YAML parses (`node -e "require('yaml')…"` or npx yaml-lint); Done = order + comment correct.

### B12 — README RD-6 — `docs(readme): lint is now a CI gate`
- [x] 12.1 `README.md`: CI section (~L91–100): remove "ESLint **no** es gate: hay ~170 errores preexistentes (verificado 2026-08-06, seguimiento en el cambio `eslint-debt`)" → state lint IS a required gate; gate order incl. lint (L93 bullet list); update tree comment L144 `quality gate (check → format → test → coverage)` → add lint.
  Verify: `grep -n "ESLint no es gate\|170" README.md` → no matches; CI section matches ci.yml (RD-6 scenario); Done = no stale exclusion text.

## Phase 3: Integration (EL-1, EL-3, EL-4)

### B13 — Full gate suite — `chore(lint): all lint gates green` (only if residual fixes needed)
- [x] 13.1 Run, in order: `npm run format` → `npm run lint` → `npm run check` → `npm run test` → `npm run test:coverage` — ALL exit 0; coverage ≥70% statements. (2026-08-11: all green — lint 0/0, check 0 errors, 177/177, coverage 82.3% stmts)
- [x] 13.2 EL-3 audit: `git diff` on `eslint.config.js` is EMPTY; `grep -rn "eslint-disable" src/` shows only ponytail-justified occurrences listed in the PR. (2026-08-11: diff empty; 0 matches — B10 removed the last two)
- [x] 13.3 EL-5 audit: `git log --oneline` shows one commit per batch (B1–B12); reverting any batch commit leaves the others' fixes intact. (2026-08-11: B8 6384baa, B9 a3334c9, B11 20f6a8d, B12 316d076, B10 805c1be; B1–B7 before 4c6274c — all conventional)
  Done = all five gates green + both audits pass.

---

## Execution order & rationale

B1→B12 exactly as numbered: trivial/mechanical first (safe diffs, --fix batch, comment deletions, unused code), then behavior-touching (keys, resolve), then the heavy type work (any), then reactivity (highest semantic risk, last code batch so `check`+`test` verify it), then config/docs (only meaningful when lint is green), integration last. B7 stays before B8 because toast.svelte.ts (SvelteMap) and reactivity rewrite share the `svelte/reactivity` import surface. Files appearing in multiple batches (CommandPalette, +layout, +page, equipos, proveedores, sessions, tickets, usuarios, config, DataTable, mantenimiento) are edited by several commits — fine, each commit is line-scoped and revertible.

## Spec traceability

| Requirement | Covered by |
|---|---|
| EL-1 lint 0/0 | B1–B12 + B13.1 |
| EL-2 behavior-neutral | per-batch fixes + B8 check/test + B13 |
| EL-3 no rule disabling | B10 + B13.2 |
| EL-4 gates green | B13.1 |
| EL-5 per-batch commits | B1–B12 commits + B13.3 |
| CC-4 gate order | B11 |
| CC-6 lint gates CI | B11 |
| RD-6 README CI | B12 |
