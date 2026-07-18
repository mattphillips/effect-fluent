# WIP: Result combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Result.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Result.ts`.

**Fully covered.** All 40 upstream exports (including the keyword-aliased `try`,
`void`, and `let`) have fluent counterparts.

## Naming differences (covered, no action needed)

- `isResult` — covered by our static `Result.is`.
- Our `wrap` / `with` have no upstream counterpart (fluent-only additions).
