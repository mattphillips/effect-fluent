# WIP: DateTime combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/DateTime.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/DateTime.ts`.

**Fully covered.** All 87 upstream exports have fluent counterparts:

- Result-style union: `DateTimeUtc` / `DateTimeZoned` behind the `DateTime`
  type + const, with Zoned-only members (`zone`, `zonedOffset`,
  `zonedOffsetIso`, `formatIsoZoned`) on the subclass, reachable after
  `isZoned()` / `match` narrowing.
- 33 statics (constructors, `now*`, zone helpers, `withCurrentZone*` over
  fluent Effects, `Equivalence`/`Order` re-typed over the fluent class,
  `CurrentTimeZone` re-export); self-first combinators as instance methods;
  self-only operations as getters (`toEpochMillis`, `toParts*`, `formatIso*`,
  `toUtc`, `isFuture`/`isPast`, ...).

Fluent integration choices:

- Option-returning members return the fluent `Option`; Effect-returning
  members return the fluent `Effect`; `distance` returns the fluent
  `Duration`; `addDuration`/`subtractDuration` accept the widened fluent
  `Duration.Input`.
- `DateTime.Input` is widened to accept fluent DateTimes, and upstream's
  identity-preservation guarantees hold at the fluent level (`make` returns a
  fluent input as-is; `min`/`max`/`clamp` return the original instances).
- Variant preservation is typed as `this` on the twelve variant-preserving
  combinators, so `zoned.add({ days: 1 }).formatIsoZoned` typechecks.
- `TimeZone` values stay core leaf data (like `Cause`'s Reasons); the zone
  helpers are statics over core zones, and the TimeZone types are re-exported
  flat on the namespace (`DateTime.TimeZone`, `.TimeZoneOffset`,
  `.TimeZoneNamed`).
- `layerCurrentZone*` return core Layers (no fluent Layer yet) — provide them
  through core interop.

Upstream tests are ported in `packages/effect/test/DateTime.test.ts` (all 49
definitions incl. the 39-case disambiguation table; one upstream `it.skip`
preserved), plus core-interop coverage.

## Naming differences (covered, no action needed)

- `isDateTime` — covered by our static `DateTime.is`.
- Our `wrap` / `dateTime` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
