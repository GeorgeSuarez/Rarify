# Vendored anti-slop provenance

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop).

- **Installed revision:** `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10), `skills/install-anti-slop/assets/anti-slop/`. This directory is byte-identical to that snapshot.
- **Previous base:** `9b80d9a5c317d3af94d88a577bdbde4d9a45f7be` (2026-08-12), `skills/install-anti-slop/assets/anti-slop/`. The pre-update copy matched this snapshot byte-for-byte, so the update was a clean adopt with no local rule edits to reconcile.
- **Local deviations:** none in the vendored source. Project policy (enabled rules, ignores, plugin registration) lives in `oxlint.config.ts` and `.oxfmtrc.json`.
- **Adopted in this update:** `no-array-filter-map`, `no-reduce-accumulator-copy`, and `require-readable-spacing` (with `vendor/eslint-stylistic/`), plus the `effect/` plugin (`no-service-constructor-imports`, `no-manual-effect-error-tag`, `no-manual-tag-comparison`, `no-manual-tagged-construction`, `prefer-effect-match`) and upstream's shared-helper extraction (`shared/scope.ts`, `array-method.ts`, `function-parameters.ts`, `lexical-type-parameters.ts`, `type-alias-resolution.ts`).
- **Verification:** focused RuleTester cases in `tests/anti-slop-rules.test.ts` and CLI autofix/stability coverage in `tests/anti-slop-cli.test.ts`, ported from the installed revision's `src/**/*.test.ts` suites (the skill-asset sync intentionally excludes upstream tests). The full upstream RuleTester suite for this revision was also run against this tree during the update.
- **Dependencies:** `oxlint` and `@oxlint/plugins` at `^1.79.0` (installed 1.79.0). The installed source uses `eslintCompatPlugin` and `createOnce`, both supported by this pair; upstream's own manifest pins 1.78.0.
- **Deferred/conflicting changes:** none. The nested `vendor/eslint-stylistic/UPSTREAM.md` records that vendored rule's own source and adaptations.

For the next update, fetch an explicit upstream commit, diff `skills/install-anti-slop/assets/anti-slop/` against this directory, and revise this record. Treat this tree as the base of the next three-way merge.
