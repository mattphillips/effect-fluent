# WIP: Duration combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Duration.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Duration.ts`.

**Fully covered.** All 52 upstream exports have fluent counterparts:

- Constructors as statics: `nanos`, `micros`, `millis`, `seconds`, `minutes`,
  `hours`, `days`, `weeks`, `fromInput`, `fromInputUnsafe`; constants `zero`,
  `infinity`, `negativeInfinity` as static readonly fields.
- Typeclass instances re-typed over the fluent class: `Order`, `Equivalence`,
  `ReducerSum`, `CombinerMax`, `CombinerMin`.
- Zero-arg operations as getters: `isFinite`, `isZero`, `isNegative`, `isPositive`,
  `abs`, `negate`, `toMillis`, `toSeconds`, `toMinutes`, `toHours`, `toDays`,
  `toWeeks`, `toNanos`, `toNanosUnsafe`, `toHrTime`, `parts`, `format`.
- The rest as instance methods: `match`, `matchPair`, `between`, `min`, `max`,
  `clamp`, `divide`, `divideUnsafe`, `times`, `sum`, `subtract`, `isLessThan`,
  `isLessThanOrEqualTo`, `isGreaterThan`, `isGreaterThanOrEqualTo`, `equals`.

Fluent integration choices:

- `Duration.Input` is widened to also accept fluent Durations; `fromInputUnsafe`
  preserves upstream's identity guarantee (a Duration input is returned as-is).
- `fromInput`, `toNanos`, and `divide` return the fluent `Option`.
- `matchPair`'s `onInfinity` callback receives the fluent wrappers.
- `toString` delegates to core so `String(d)` output matches upstream exactly.

Upstream tests are ported in `packages/effect/test/Duration.test.ts`, plus added
coverage for `matchPair` (untested upstream) and core interop.

## Naming differences (covered, no action needed)

- `isDuration` — covered by our static `Duration.is`.
- Our `wrap` / `duration` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
