# Fluent API candidates: datatype assessment

Assessment of every module in `repos/effect/packages/effect/src` (effect
`4.0.0-beta.98`, subtree commit `8df19f4f`) for whether it's worth a fluent wrapper.

Criteria:

- **Chaining is the natural usage pattern** — self-first combinators that users
  compose in sequence today via `pipe`.
- **Value/handle types only** — the user holds an instance and transforms it.
  Function-shaped modules (type classes, predicates) fit `pipe` better.
- **Cost of wrapping** — pure data types are mechanical; types entangled with
  Effect/Scope need the fluent Effect surface to exist first.
- **Consistency** — effectful handles are worth wrapping mainly so their operations
  return *our* fluent `Effect` instead of a core one.

## Already implemented

`Effect`, `Option`, `Result`, `Ref` (see `docs/wip/` for combinator coverage).

## Tier 1 — natural fits with immediate payoff

- **Exit** / **Cause** — already leak into our API surface (`.exit` getter,
  `tapCause` callbacks); fluent versions close the loop. Value types with
  match/inspection combinators, no new design questions.
- **Duration** — tiny surface, consumed by half the upcoming Effect combinators
  (`delay`, `timeout`, `sleep`, schedules). Cheap, do early.
- **Schedule** — retry/repeat policies are built by chaining
  (`Schedule.exponential(...).intersect(...).jittered`); exactly what fluent is for.
  Needed the moment `retry`/`repeat` land on fluent Effect.
- **Fiber** — handle whose operations (`join`, `interrupt`, `await`) return
  Effects; required once the `fork*` family lands so forked fibers stay in the
  fluent world.
- **HashSet** (18 exports) / **HashMap** (38 exports) — persistent collections whose
  whole usage pattern is chained transformation. Pure data, zero Effect
  entanglement, and they need exactly the machinery our Option/Result wrappers
  already prove out (`Equal`/`Hash` delegation, iterator preservation, underlying
  value getter). Lowest cost-per-value in the codebase; HashSet first as the
  template.

## Tier 2 — high value, larger effort

- **Stream** — the biggest win after Effect itself: hundreds of self-first
  combinators everyone chains via `pipe` today. A milestone of its own. Brings a
  family of companion types that should ship with it or not at all:
  - **Chunk** (77 exports) — Stream's collection type; also useful standalone.
  - **Sink**, **Take**, **Channel**, **Pull** — Stream plumbing; wrap only the
    parts Stream's own signatures force us to expose.
- **Layer** — DI graphs are composed by chaining (`provide`, `merge`, `tap`);
  very app-facing. Medium surface. When it lands: it joins the Effect SCC in
  `internal/core.ts` (its combinators take/return fluent Effects and
  `Effect.provide` will need a runtime `Layer.is`), and the Layer task must
  also widen `Effect.provide` to accept fluent Layers alongside core ones
  (the Duration → `Effect.sleep` widening pattern, planned this time).
- **DateTime** — rich, chainable, immutable, highly app-facing.
- **BigDecimal** — arithmetic chains naturally; self-contained.
- **Config** — combinator-rich value type (`map`, `orElse`, `zip`, `withDefault`)
  that users compose declaratively. Self-contained; `ConfigProvider` stays core
  (it's environment plumbing consumed by Effect, not chained by users).

## Tier 3 — effectful handles, wrap for consistency

Modest combinator surfaces, but methods return Effects — wrapping keeps user code
in one idiom (operations yield fluent `Effect`). Fill in opportunistically as
Effect combinators demand them:

Note on urgency: several of these are already method-shaped upstream —
`Semaphore` in particular is an interface of methods on the handle
(`sem.withPermits(n)(effect)`, `sem.take(n)`, `sem.releaseAll`), with the
module-level functions as thin data-first delegates. Since core Effects are
directly `yield*`-able inside fluent `Effect.gen`, such handles are largely
usable today unwrapped; a wrapper's value-add is the altitude fix (methods
accepting/returning fluent Effects for chaining without `Effect.wrap`) plus
small shape cleanups (e.g. flattening curried `withPermits(n)(effect)`).
Batch them (Queue/Deferred/Latch/Semaphore share the pattern) rather than
doing them piecemeal.

- **Concurrency primitives**: `Queue`, `PubSub`, `Deferred`, `Latch`, `Semaphore`,
  `PartitionedSemaphore`.
- **Ref family**: `SynchronizedRef`, `SubscriptionRef` (obvious next two after
  `Ref`), `ScopedRef`, `LayerRef`.
- **Caching/pooling**: `Cache`, `ScopedCache`, `Pool`, `Resource`, `RcRef`, `RcMap`,
  `LayerMap`.
- **Fiber collections**: `FiberMap`, `FiberSet`, `FiberHandle`.
- **Tx family**: `TxRef`, `TxQueue`, `TxHashMap`, `TxHashSet`, `TxChunk`,
  `TxDeferred`, `TxSemaphore`, `TxPubSub`, `TxPriorityQueue`,
  `TxSubscriptionRef`, `TxReentrantLock` — same story, gated on `tx` support in
  fluent Effect.
- **Metric** — handle with `track*` integration points on Effect; wrap alongside
  the `track*` combinators.
- **Request** / **RequestResolver** — batching layer; niche, wrap when `request`
  lands on fluent Effect.
- **ManagedRuntime** — run-side handle (`runPromise` etc.); small, wrap alongside
  the `run*` family.

## Specialized — demand-driven only

- **Trie** (28 exports) — prefix-search string maps; fluent-friendly shape, niche
  audience.
- **Graph** (61 exports) — large surface but a specialized algorithms toolkit
  (traversals, topological sort), not an everyday chaining type.
- **HashRing** (8 exports) — consistent-hashing utility for sharding; tiny, niche.
- **Cron** — parse/match value type; small surface, little chaining.
- **Redacted** — tiny wrapper value; little to chain.
- **ExecutionPlan** — builder consumed by `withExecutionPlan`; revisit when that
  combinator lands.

## Not applicable

- **Primitive/collection helpers** — `String`, `Number`, `Boolean`, `BigInt`,
  `Symbol`, `RegExp`, `Array`, `Record`, `Struct`, `Tuple`, `Iterable`,
  `NonEmptyIterable`, `UndefinedOr`, `Ordering`, `Encoding`: operate on native JS
  values; fluent would mean boxing primitives.
- **Type classes & function-shaped modules** — `Order`, `Equivalence`, `Combiner`,
  `Reducer`, `Differ`, `Hash`, `Equal`, `Predicate`, `Filter`, `Function`: values
  are functions; `pipe` genuinely fits better.
- **Already fluent upstream** — `Match`, `Optic`: builder-style APIs already.
- **Schema family** — `Schema`, `SchemaAST`, `SchemaParser`, `SchemaIssue`,
  `SchemaError`, `SchemaGetter`, `SchemaTransformation`, `SchemaRepresentation`,
  `SchemaUtils`, `JsonSchema`, `ChannelSchema`, `JsonPointer`, `JsonPatch`,
  `Formatter`: enormous, class-based, and already method-chained in v4; out of
  scope.
- **Services & environment** — `Context`, `Scope`, `Clock`, `Random`, `Console`,
  `Logger`, `Tracer`, `ErrorReporter`, `Scheduler`, `References`, `Runtime`,
  `ConfigProvider`, and the platform interfaces (`FileSystem`, `Path`, `Terminal`,
  `Stdio`, `Crypto`, `PlatformError`): consumed *through* Effect combinators
  (`provide*`, `service`), not chained on directly. Their operations return core
  Effects, but users reach them via `yield*` inside `gen`, where the distinction
  doesn't bite.
- **Type-level / infrastructure** — `Data`, `Brand`, `Newtype`, `HKT`, `Types`,
  `Unify`, `Utils`, `Pipeable`, `Inspectable`, `Effectable`, `PrimaryKey`,
  `Redactable`, `LogLevel`: no runtime chaining surface.
