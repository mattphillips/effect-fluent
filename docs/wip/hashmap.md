# WIP: HashMap combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/HashMap.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/HashMap.ts`.

**Fully covered.** All 38 upstream exports have fluent counterparts: `empty`, `make`,
`fromIterable`, `isHashMap` (as `HashMap.is`), and `compact` as statics; zero-arg
operations (`size`, `isEmpty`, `keys`, `values`, `toValues`, `entries`, `toEntries`,
`beginMutation`, `endMutation`) as getters; the rest as instance methods.

Fluent integration choices:

- `get` / `getHash` / `findFirst` return the fluent `Option`.
- `modifyAt` / `modifyHash` callbacks receive and return the fluent `Option`.
- `filterMap` callbacks return the fluent `Result`.
- `compact` is a static since it constrains the value type to `Option<A>`.
- `mutate` passes a fluent wrapper around the mutable core map; `set`/`remove`
  inside the callback mutate in place and return the same wrapper.
- No-op combinators preserve reference equality by returning the same wrapper.

Upstream tests are ported in `packages/effect/test/HashMap.test.ts`, plus added
coverage for `getHash`, `hasHash`, and `modifyHash` (untested upstream).

## Naming differences (covered, no action needed)

- `isHashMap` — covered by our static `HashMap.is`.
- Our `wrap` / `hashMap` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
