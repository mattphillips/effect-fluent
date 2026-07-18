# WIP: Fiber combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Fiber.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against the fluent `Fiber` in
`packages/effect/src/internal/core.ts` (façade: `packages/effect/src/Fiber.ts`).

**Fully covered.** All 12 upstream exports (including the keyword-aliased
`await`) have fluent counterparts:

- Statics: `awaitAll`, `joinAll`, `interruptAll`, `interruptAllAs`,
  `getCurrent`, `isFiber` (as `Fiber.is`).
- Zero-arg operations as getters: `await` (yielding the fluent `Exit`), `join`,
  `interrupt`, `pollUnsafe` (fluent `Exit | undefined`), `id`.
- Instance methods: `interruptAs`, `interruptUnsafe`, `addObserver` (callback
  receives the fluent `Exit`), `runIn` (identity-preserving).

The `fork*` family and fiber accessors landed on the fluent Effect at the same
time: `forkChild`, `forkDetach`, `forkIn`, `forkScoped`, `awaitAllChildren`,
and the statics `fiber`, `fiberId`, `withFiber` (all fluent-Fiber-valued) —
checked off in `docs/wip/effect.md`.

Fiber lives in `internal/core.ts` (it joins the Effect/Cause/Exit/Schedule
strongly-connected component).

## Intentionally unwrapped

The core Fiber interface's low-level runtime surface (`context`, `getRef`,
`setContext`, `currentScheduler`, `currentDispatcher`, `currentSpan`,
log levels, `currentOpCount`, `maxOpsBeforeYield`, `currentStackFrame`,
`currentPreventYield`) stays reachable via the `fiber` getter rather than being
wrapped — it is runtime plumbing, not a chaining surface.

## Naming differences (covered, no action needed)

- `isFiber` — covered by our static `Fiber.is`.
- Our `wrap` / `fiber` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
