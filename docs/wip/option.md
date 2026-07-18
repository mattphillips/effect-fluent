# WIP: Option combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Option.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Option.ts`. Coverage is nearly
complete — 59 upstream exports, 5 remaining.

## Constructors

- [ ] `void` (constant: `Option.some(undefined)`)

## Error handling

- [ ] `orElseResult` — like `orElse` but tracks which side won as a `Result<B, A>`

## Combining (Combiner/Reducer integration)

- [ ] `makeReducer`
- [ ] `makeCombinerFailFast`
- [ ] `makeReducerFailFast`

## Naming differences (covered, no action needed)

- `isOption` — covered by our static `Option.is`.
- Our `wrap` / `with` have no upstream counterpart (fluent-only additions).
- Upstream `getEquivalence`/`getOrder` era names are `makeEquivalence`/`makeOrder` in
  beta.98, matching ours.
