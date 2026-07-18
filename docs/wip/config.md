# WIP: Config combinators not yet in the fluent API

Comparison of `repos/effect/packages/effect/src/Config.ts` (effect `4.0.0-beta.98`,
subtree commit `8df19f4f`) against `packages/effect/src/Config.ts`.

**Fully covered.** All 35 public upstream exports (the module also has two
`@internal` schemas, `TrueValues`/`FalseValues`, which are not public API) have
fluent counterparts, including the keyword-aliased `ArrayConfig as Array`
export:

- Constructors as statics: `schema`, `succeed`, `fail`, `string`,
  `nonEmptyString`, `number`, `finite`, `int`, `literal`, `literals`,
  `boolean`, `duration`, `port`, `logLevel`, `redacted`, `url`, `date`, `all`,
  `unwrap`.
- Schema values as static readonly fields (core `Schema` leaf plumbing,
  re-exported untouched): `Boolean`, `Port`, `LogLevel`, `Record`, `Array`.
- The `ConfigError` class as a static readonly field plus a matching
  `Config.ConfigError` namespace type (core leaf plumbing, used unwrapped).
- Self-first combinators as instance methods: `parse` (returns the fluent
  `Effect`), `map`, `mapOrFail` (callback returns the fluent `Effect`),
  `orElse`, `withDefault`, `nested`.
- Zero-arg `option` as a getter, yielding the fluent `Option`.
- Utility types in the namespace: `Success`, `Wrap` (both re-typed over the
  fluent class).

Fluent integration choices:

- Core `Config<T>` is Effect-like (its interface extends
  `Effect<T, ConfigError>` and it is yieldable). Following the Exit
  precedent, the fluent class implements the core `Effect` interface (a
  `TypeId` variance getter plus `[Symbol.iterator]` delegation to the
  underlying core config), so fluent Configs are `yield*`-able inside both
  fluent and core `Effect.gen`, resolving the current `ConfigProvider` from
  the context. The run-loop evaluate protocol is deliberately not forwarded —
  for any other core usage the supported path is explicit unboxing via the
  `config` getter.
- `parse` returns the fluent `Effect`; `duration` yields the fluent
  `Duration`; `option` yields the fluent `Option`.
- `ConfigProvider` and the error plumbing (`ConfigError`, `SourceError`,
  `SchemaError`) stay core (leaf/plumbing, like `TimeZone` in DateTime and
  `Reason` in Cause), as do the `Schema` codecs fed to `Config.schema`.
- `unwrap` preserves upstream's identity guarantee: a fluent `Config` input is
  returned as-is; record inputs are recursively unboxed to the core `Wrap`
  shape.
- Core Config does not implement `Equal`/`Hash` (configs are recipes compared
  by reference), so the fluent class does not either.
- `toJSON`/`toString` delegate to the core representation (`{ _id: "Config" }`).

Upstream tests are ported in `packages/effect/test/Config.test.ts` (all 103
cases, with fluent `Duration`/`Option` expected values where the altitude
changed; the data-first and pipe forms of `map` collapse to the same fluent
method). Added coverage for upstream holes: the `Array` schema value (untested
upstream), `Boolean`/`Port`/`LogLevel` used directly with `Config.schema`,
`parse` with an explicit `pathPrefix`, `parse` chaining, fluent-Duration and
fluent-Option altitudes, `unwrap` identity on a Config input, the `Success`
utility type, `toJSON`/`toString`, yieldability inside fluent `Effect.gen`,
and core interop (wrap/`config` round-trip, `is` guard incl. core-value
rejection, explicit unboxing for core execution, `with`).

## Naming differences (covered, no action needed)

- `isConfig` — covered by our static `Config.is`.
- Our `wrap` / `config` / `with` have no upstream counterpart (fluent-only
  additions for core interop).
