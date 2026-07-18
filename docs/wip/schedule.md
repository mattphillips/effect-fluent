# WIP: Schedule combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Schedule.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Schedule.ts`.

**Fully covered.** All 31 upstream exports (including the aliased `while` and
`identity`) have fluent counterparts:

- Constructors as statics: `forever` (readonly), `identity`, `recurs`, `spaced`,
  `fixed`, `windowed`, `exponential`, `fibonacci`, `duration`, `during`, `cron`,
  `min`, `max`, `fromStep`, `fromStepWithMetadata`; `CurrentMetadata` re-exported.
- Instance methods: `addDelay`, `modifyDelay`, `andThen`, `andThenResult`,
  `map`, `tap`, `while`, `upTo`, `setInputType`.
- Zero-arg operations as getters: `jittered`, `passthrough`, `toStep`,
  `toStepWithMetadata`, `toStepWithSleep`.

Fluent integration choices:

- Duration-emitting constructors (`exponential`, `fibonacci`, `duration`,
  `during`, `cron`) and `min`/`max` output the fluent `Duration`;
  `andThenResult` outputs the fluent `Result`.
- All `Duration.Input` parameters accept our widened input type (fluent
  Durations included).
- Callbacks receive the core `Metadata` record (per-tick leaf data — its
  `duration` field is a core Duration) and return fluent `Effect`s; `map` and
  `while` also accept plain values.
- The `toStep*` getters return fluent `Effect`s of the core step functions
  (`Pull` types stay core).

Note: the fluent Effect now has `repeat` / `repeatOrElse` / `retry` /
`retryOrElse` / `schedule` / `scheduleFrom` / `forever` / `eventually`, so
schedules are driven fluently end to end.

## Naming differences (covered, no action needed)

- `isSchedule` — covered by our static `Schedule.is`.
- Our `wrap` / `schedule` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
