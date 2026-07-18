# WIP: Option combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Option.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against the fluent `Option` in
`packages/effect/src/internal/data.ts` (façade: `packages/effect/src/Option.ts`).

**Fully covered.** All 59 upstream exports have fluent counterparts, including
the previously missing `void`, `orElseResult` (returning the fluent
`Option<Result<B, A>>`), and the Combiner/Reducer builders `makeReducer`,
`makeCombinerFailFast`, `makeReducerFailFast` (typed over the fluent Option).

Fluent integration notes:

- Option and Result are mutually recursive (`orElseResult`, `getSuccess`,
  `getFailure`, `partitionMap`, `filterMap` on one side; `fromOption`,
  `transposeOption`, `succeedNone` on the other), so both live in
  `internal/data.ts` — their own co-located SCC module below `internal/core.ts`.
- The Result-touching members speak the fluent `Result` end to end:
  `getSuccess`/`getFailure` take fluent Results, and `partitionMap`/`filterMap`
  callbacks return fluent Results (previously core-typed).

## Naming differences (covered, no action needed)

- `isOption` — covered by our static `Option.is`.
- Our `wrap` / `option` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
- Upstream `getEquivalence`/`getOrder` era names are `makeEquivalence`/`makeOrder`
  in beta.98, matching ours.
