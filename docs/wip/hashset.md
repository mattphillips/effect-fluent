# WIP: HashSet combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/HashSet.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/HashSet.ts`.

**Fully covered.** All 18 upstream exports have fluent counterparts: `empty`, `make`,
`fromIterable`, and `isHashSet` (as `HashSet.is`) as statics; `add`, `has`, `remove`,
`union`, `intersection`, `difference`, `isSubset`, `map`, `filter`, `some`, `every`,
and `reduce` as instance methods; `size` and `isEmpty` as getters.

Upstream tests are ported in `packages/effect/test/HashSet.test.ts`, including the
reference-equality guarantees for no-op operations (`add` of an existing value
returns the same set).

## Naming differences (covered, no action needed)

- `isHashSet` — covered by our static `HashSet.is`.
- Our `wrap` / `hashSet` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
