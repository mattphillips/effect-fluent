# WIP: Cause combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Cause.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Cause.ts`.

**Covered** (52 of 57 upstream exports):

- Constructors as statics: `empty`, `fail`, `die`, `interrupt`, `fromReasons`,
  `makeFailReason`, `makeDieReason`, `makeInterruptReason`.
- Reason guards as statics: `isReason`, `isFailReason`, `isDieReason`,
  `isInterruptReason` (Reasons are core leaf data, exposed unwrapped), plus
  `reasonAnnotations`.
- Zero-arg operations as getters: `reasons`, `squash`, `hasFails`, `hasDies`,
  `hasInterrupts`, `hasInterruptsOnly`, `findFail`, `findError`,
  `findErrorOption`, `findDie`, `findDefect`, `findInterrupt`, `interruptors`,
  `filterInterruptors`, `annotations`, `pretty`.
- Instance methods: `map`, `combine`, `annotate`, `prettyErrors`.
- Error classes and guards re-exported as statics: `NoSuchElementError`,
  `TimeoutError`, `IllegalArgumentError`, `ExceededCapacityError`,
  `AsyncFiberError`, `UnknownError` and their `isX` guards; `Done`, `isDone`,
  and `done` (returning the fluent `Effect`).
- `find*` / `filterInterruptors` return the fluent `Result` (causes on the
  failure side wrapped fluent); `findErrorOption` returns the fluent `Option`.

## Not re-exported (intentional)

- `TypeId` / `ReasonTypeId` and the error `XTypeId` string constants — we use
  our own `CauseTypeId` symbol brand; core TypeIds are reachable via
  `effect/Cause` when needed.
- `StackTrace` / `InterruptorStackTrace` — tracing services, not cause
  combinators; use `effect/Cause` directly.

## Naming differences (covered, no action needed)

- `isCause` — covered by our static `Cause.is`.
- Our `wrap` / `cause` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
