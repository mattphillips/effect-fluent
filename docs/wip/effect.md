# WIP: Effect combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Effect.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Effect.ts`. Grouped by the
upstream `@category` JSDoc tags. Some entries are self-first combinators that map
naturally to instance methods/getters; others are constructors or environment-level
helpers that belong as statics on the fluent `Effect` class.

## Mapping & sequencing

- [ ] `mapError`
- [ ] `zip`
- [ ] `zipWith`
- [ ] `flatten` (instance getter — we only have the static)

## Eager variants

- [ ] `mapEager`
- [ ] `mapBothEager`
- [ ] `mapErrorEager`
- [ ] `flatMapEager`
- [ ] `catchEager`
- [ ] `matchEager`
- [ ] `matchCauseEager`
- [ ] `matchCauseEffectEager`
- [ ] `fnUntracedEager`

## Error handling

- [ ] `catch` (exported as `catch_ as catch`)
- [ ] `catchCause`
- [ ] `catchCauseFilter`
- [ ] `catchCauseIf`
- [ ] `catchDefect`
- [ ] `catchFilter`
- [ ] `catchIf`
- [ ] `catchNoSuchElement`
- [ ] `catchReason`
- [ ] `catchReasons`
- [ ] `catchTag`
- [ ] `catchTags`
- [ ] `ignore`
- [ ] `ignoreCause`
- [x] `retry`
- [x] `retryOrElse`
- [ ] `sandbox`
- [ ] `unwrapReason`
- [ ] `withErrorReporting`
- [ ] `orDie`

## Fallback

- [ ] `firstSuccessOf`
- [ ] `orElseSucceed`
- [ ] `withExecutionPlan`

## Pattern matching

- [ ] `match`
- [ ] `matchEffect`
- [ ] `matchCause`
- [ ] `matchCauseEffect`

## Filtering

- [ ] `filter`
- [ ] `filterMap`
- [ ] `filterMapEffect`
- [ ] `filterMapOrElse`
- [ ] `filterMapOrFail`
- [ ] `filterOrElse`
- [ ] `filterOrFail`

## Conditional & condition checking

- [ ] `when`
- [ ] `isFailure`
- [ ] `isSuccess`

## Collecting

- [ ] `findFirst`
- [ ] `findFirstFilter`
- [ ] `replicate`
- [ ] `replicateEffect`
- [ ] `whileLoop`

## Error accumulation

- [ ] `validate`

## Converting

- [ ] `fromNullishOr`
- [ ] `transposeOption`

## Do notation

- [ ] `Do`
- [ ] `bind`
- [ ] `bindTo`
- [ ] `let` (exported as `let_ as let`)

## Delays & timeouts

- [ ] `delay`
- [ ] `timed`
- [ ] `timeout`
- [ ] `timeoutOption`
- [ ] `timeoutOrElse`

## Repetition & scheduling

- [x] `eventually`
- [x] `forever`
- [x] `repeat`
- [x] `repeatOrElse`
- [x] `schedule`
- [x] `scheduleFrom`

## Racing

- [ ] `race`
- [ ] `raceFirst`
- [ ] `raceAll`
- [ ] `raceAllFirst`

## Caching

- [ ] `cached`
- [ ] `cachedWithTTL`
- [ ] `cachedInvalidateWithTTL`

## Resource management

- [ ] `acquireRelease`
- [ ] `acquireUseRelease`
- [ ] `acquireDisposable`
- [ ] `addFinalizer`
- [ ] `ensuring`
- [ ] `onError`
- [ ] `onErrorFilter`
- [ ] `onErrorIf`
- [ ] `onExit`
- [ ] `onExitFilter`
- [ ] `onExitIf`
- [ ] `onExitPrimitive`
- [ ] `scope`
- [ ] `scopedWith`

## Interruption

- [ ] `abortSignal`
- [ ] `interruptible`
- [ ] `interruptibleMask`
- [ ] `onInterrupt`
- [ ] `uninterruptible`
- [ ] `uninterruptibleMask`

## Supervision & fibers

- [x] `awaitAllChildren`
- [x] `fiber`
- [x] `fiberId`
- [x] `forkChild`
- [x] `forkDetach`
- [x] `forkIn`
- [x] `forkScoped`
- [x] `withFiber`

## Context / environment

- [ ] `context`
- [ ] `contextWith`
- [ ] `provide`
- [ ] `provideContext`
- [ ] `provideService`
- [ ] `provideServiceEffect`
- [ ] `service`
- [ ] `serviceOption`
- [ ] `setContext`
- [ ] `updateContext`
- [ ] `updateService`

## Running

- [ ] `runSync`
- [ ] `runSyncExit`
- [ ] `runSyncWith`
- [ ] `runSyncExitWith`
- [ ] `runPromise`
- [ ] `runPromiseExit`
- [ ] `runPromiseWith`
- [ ] `runPromiseExitWith`
- [ ] `runFork`
- [ ] `runForkWith`
- [ ] `runCallback`
- [ ] `runCallbackWith`

## Logging

- [ ] `log`
- [ ] `logTrace`
- [ ] `logDebug`
- [ ] `logInfo`
- [ ] `logWarning`
- [ ] `logError`
- [ ] `logFatal`
- [ ] `logWithLevel`
- [ ] `annotateLogs`
- [ ] `annotateLogsScoped`
- [ ] `withLogger`
- [ ] `withLogSpan`

## Tracing

- [ ] `withSpan`
- [ ] `withSpanScoped`
- [ ] `withParentSpan`
- [ ] `annotateSpans`
- [ ] `annotateCurrentSpan`
- [ ] `currentSpan`
- [ ] `currentParentSpan`
- [ ] `linkSpans`
- [ ] `makeSpan`
- [ ] `makeSpanScoped`
- [ ] `spanAnnotations`
- [ ] `spanLinks`
- [ ] `tracer`
- [ ] `useSpan`
- [ ] `withTracer`
- [ ] `withTracerEnabled`
- [ ] `withTracerTiming`

## Metrics / tracking

- [ ] `track`
- [ ] `trackDefects`
- [ ] `trackDuration`
- [ ] `trackErrors`
- [ ] `trackSuccesses`

## Requests & batching

- [ ] `request`
- [ ] `requestUnsafe`

## Transactions

- [ ] `tx`
- [ ] `txRetry`

## Function helpers

- [ ] `fn`
- [ ] `fnUntraced`
- [ ] `effectify`

## References / clock / misc

- [ ] `withConcurrency`
- [ ] `clockWith`
- [ ] `yieldNowWith`

## Probably not applicable

Upstream exports that likely don't need a fluent counterpart:

- `TypeId` — we have our own `EffectTypeId` brand.
- `isEffect` — covered by our static `Effect.is`.
- `satisfiesErrorType` / `satisfiesServicesType` / `satisfiesSuccessType` — type-level
  assertion helpers; only useful with core's curried style.
