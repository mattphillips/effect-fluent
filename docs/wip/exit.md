# WIP: Exit combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Exit.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Exit.ts`.

**Fully covered.** All 26 upstream exports have fluent counterparts:

- Constructors as statics: `succeed`, `fail`, `failCause` (accepts the fluent
  `Cause`), `die`, `interrupt`, `void`, `asVoidAll`.
- Type guards as instance methods: `isSuccess`, `isFailure`, `hasFails`,
  `hasDies`, `hasInterrupts` (all narrow `this`).
- Instance methods: `match` (whose `onFailure` receives the fluent `Cause`),
  `map`, `mapError`, `mapBoth`.
- Zero-arg operations as getters: `asVoid`, `filterSuccess`, `filterValue`,
  `filterFailure`, `filterCause`, `findError`, `findDefect`, `getSuccess`,
  `getCause`, `findErrorOption`.

Fluent integration choices:

- `Exit<A, E>` is a `Success | Failure` union (like `Result`); `Failure.cause`
  is the fluent `Cause`.
- Fluent Exits implement the core `Effect` interface and are yieldable inside
  `Effect.gen`.
- `filter*` / `find*` return the fluent `Result` with fluent contents;
  `get*` return the fluent `Option`.
- `Effect`'s `.exit` getter now yields the fluent `Exit`, and
  `Effect.failCause` / `tapCause*` use the fluent `Cause`.

Upstream tests are ported in `packages/effect/test/Exit.test.ts` — upstream only
tests `toString`, so nearly the whole suite is hole-patching coverage
(constructors, guards, matching, mapping, filters, getters, generator interop,
and core interop).

## Naming differences (covered, no action needed)

- `isExit` — covered by our static `Exit.is`.
- Our `wrap` / `exit` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
