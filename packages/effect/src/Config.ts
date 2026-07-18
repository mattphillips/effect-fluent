import * as _Config from 'effect/Config';
import type * as ConfigProvider from 'effect/ConfigProvider';
import * as _Effect from 'effect/Effect';
import type * as _LogLevel from 'effect/LogLevel';
import { hasProperty } from 'effect/Predicate';
import type * as Redacted from 'effect/Redacted';
import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import { Duration } from './Duration.js';
import { Effect } from './Effect.js';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

/**
 * Unique symbol identifying the fluent `Config` class.
 *
 * Used by {@link Config.is} to recognize fluent Config instances at runtime.
 */
export const ConfigTypeId: unique symbol = Symbol.for('~effect-fluent/Config') as ConfigTypeId;

/**
 * The type of {@link ConfigTypeId}.
 */
export type ConfigTypeId = typeof ConfigTypeId;

/**
 * A fluent wrapper around effect's `Config`, a description of configuration
 * values that can be read from a `ConfigProvider`.
 *
 * A `Config<T>` explains which keys to read, how to decode and validate them,
 * and how to combine defaults, fallbacks, nested paths, and multiple settings.
 *
 * Fluent Configs implement the core `Effect` interface so they can be yielded
 * directly inside `Effect.gen` (resolving the current `ConfigProvider` from
 * the context). For any other core usage, unbox explicitly with the
 * {@link Config.config | config} getter.
 *
 * `ConfigProvider` and the error plumbing (`ConfigError`, `SourceError`,
 * `SchemaError`) are core leaf types and are used unwrapped.
 *
 * @example
 * ```ts
 * import { ConfigProvider } from "effect"
 * import { Config, Effect } from "effect-fluent"
 *
 * const port = Config.port("PORT").withDefault(8080)
 *
 * const program = Effect.gen(function* () {
 *   const value = yield* port
 *   console.log(value)
 * })
 * // provide a ConfigProvider layer and run to read the config
 * ```
 */
export class Config<out T> extends Inspectable implements _Effect.Effect<T, _Config.ConfigError> {
  readonly [ConfigTypeId]: ConfigTypeId = ConfigTypeId;

  // Brand for compatibility with `_Effect.Effect<T, ConfigError>` so fluent
  // Configs are yieldable wherever core effects are expected. Evaluation
  // always happens on the underlying `_config` via `[Symbol.iterator]()`
  // delegation below.
  get [_Effect.TypeId](): _Effect.Variance<T, _Config.ConfigError, never> {
    return (this._config as any)[_Effect.TypeId];
  }

  /**
   * Wraps a core effect `Config` in the fluent `Config` class.
   *
   * This is the bridge from effect's data-first API into the fluent API and
   * has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { Config as CoreConfig } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const host = Config.wrap(CoreConfig.string("HOST")).withDefault("localhost")
   * ```
   */
  static wrap<T>(config: _Config.Config<T>): Config<T> {
    return new Config(config);
  }

  /**
   * Checks whether a value is a fluent `Config`.
   *
   * Corresponds to upstream `isConfig`, but recognizes instances of the
   * fluent class rather than core Configs.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * console.log(Config.is(Config.string("HOST"))) // true
   * console.log(Config.is("not a config")) // false
   * ```
   */
  static is(u: unknown): u is Config<unknown> {
    return hasProperty(u, ConfigTypeId);
  }

  /**
   * The core `ConfigError` class, the error type produced when config loading
   * or validation fails.
   *
   * Wraps either a `SourceError` (the provider could not read data) or a
   * `SchemaError` (the data did not match the schema). This is core leaf
   * plumbing and is used unwrapped.
   *
   * @example
   * ```ts
   * import { Schema, SchemaIssue, Option } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const error = new Config.ConfigError(
   *   new Schema.SchemaError(new SchemaIssue.InvalidValue(Option.none(), { message: "invalid" }))
   * )
   * console.log(error._tag) // "ConfigError"
   * ```
   */
  static readonly ConfigError: typeof _Config.ConfigError = _Config.ConfigError;

  /**
   * Creates a `Config<T>` from a `Schema.Codec`.
   *
   * The optional `path` sets the local path segment(s) for the config lookup.
   * It is appended to the logical path prefix accumulated from outer
   * {@link Config.nested | nested} calls. Pass a single string for a flat key
   * or an array for nested paths.
   *
   * Convenience constructors such as `string`, `number`, and `boolean`
   * delegate to this API.
   *
   * @example
   * ```ts
   * import { ConfigProvider, Schema } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const DbConfig = Config.schema(
   *   Schema.Struct({ host: Schema.String, port: Schema.Int }),
   *   "db"
   * )
   *
   * const provider = ConfigProvider.fromUnknown({
   *   db: { host: "localhost", port: 5432 }
   * })
   * // DbConfig.parse(provider) yields { host: "localhost", port: 5432 }
   * ```
   */
  static schema<T>(codec: Schema.ConstraintCodec<T, unknown>, path?: string | ConfigProvider.Path): Config<T> {
    return new Config(_Config.schema(codec, path));
  }

  /**
   * Creates a config that always succeeds with the given value, ignoring the
   * provider entirely.
   *
   * Useful for hardcoded config values, such as inside
   * {@link Config.orElse | orElse} or tests.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const host = Config.string("HOST").orElse(() => Config.succeed("localhost"))
   * ```
   */
  static succeed<T>(value: T): Config<T> {
    return new Config(_Config.succeed(value));
  }

  /**
   * Creates a config that always fails with the given error.
   *
   * Useful to re-raise a specific config error, such as inside
   * {@link Config.orElse | orElse}. The error is core leaf plumbing: a
   * `SourceError` or `SchemaError`.
   *
   * @example
   * ```ts
   * import { Schema, SchemaIssue, Option } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const failing = Config.fail(
   *   new Schema.SchemaError(new SchemaIssue.Forbidden(Option.none(), { message: "failure message" }))
   * )
   * ```
   */
  static fail(err: ConfigProvider.SourceError | Schema.SchemaError): Config<never> {
    return new Config(_Config.fail(err));
  }

  /**
   * Creates a config for a single string value.
   *
   * Shortcut for `Config.schema(Schema.String, name)`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const host = Config.string("HOST")
   *
   * const provider = ConfigProvider.fromUnknown({ HOST: "localhost" })
   * // host.parse(provider) yields "localhost"
   * ```
   */
  static string(name?: string): Config<string> {
    return new Config(_Config.string(name));
  }

  /**
   * Creates a config for a non-empty string value. Fails if the value is an
   * empty string.
   *
   * Shortcut for `Config.schema(Schema.NonEmptyString, name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const name = Config.nonEmptyString("SERVICE_NAME")
   * ```
   */
  static nonEmptyString(name?: string): Config<string> {
    return new Config(_Config.nonEmptyString(name));
  }

  /**
   * Creates a config for a numeric value (including `NaN`, `Infinity`).
   *
   * Shortcut for `Config.schema(Schema.Number, name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const timeout = Config.number("TIMEOUT_MS")
   * ```
   */
  static number(name?: string): Config<number> {
    return new Config(_Config.number(name));
  }

  /**
   * Creates a config for a finite number (rejects `NaN` and `Infinity`).
   *
   * Shortcut for `Config.schema(Schema.Finite, name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const ratio = Config.finite("RATIO")
   * ```
   */
  static finite(name?: string): Config<number> {
    return new Config(_Config.finite(name));
  }

  /**
   * Creates a config for an integer value. Rejects floats.
   *
   * Shortcut for `Config.schema(Schema.Int, name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const workers = Config.int("WORKER_COUNT")
   * ```
   */
  static int(name?: string): Config<number> {
    return new Config(_Config.int(name));
  }

  /**
   * Creates a config that only accepts a specific literal value.
   *
   * Shortcut for `Config.schema(Schema.Literal(literal), name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const env = Config.literal("production", "ENV")
   * ```
   */
  static literal<L extends SchemaAST.LiteralValue>(literal: L, name?: string): Config<L> {
    return new Config(_Config.literal(literal, name));
  }

  /**
   * Creates a config that only accepts one of the specified literal values.
   *
   * Shortcut for `Config.schema(Schema.Literals(literals), name)`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const env = Config.literals(["development", "production"], "ENV")
   * ```
   */
  static literals<const L extends ReadonlyArray<SchemaAST.LiteralValue>>(literals: L, name?: string): Config<L[number]> {
    return new Config(_Config.literals(literals, name));
  }

  /**
   * Creates a config for a boolean value parsed from common string
   * representations.
   *
   * Shortcut for `Config.schema(Config.Boolean, name)`. Accepted values:
   * `true`, `false`, `yes`, `no`, `on`, `off`, `1`, `0`, `y`, `n`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const flag = Config.boolean("FEATURE_FLAG")
   *
   * const provider = ConfigProvider.fromEnv({ env: { FEATURE_FLAG: "yes" } })
   * // flag.parse(provider) yields true
   * ```
   */
  static boolean(name?: string): Config<boolean> {
    return new Config(_Config.boolean(name));
  }

  /**
   * Creates a config for a fluent `Duration` value parsed from a
   * human-readable string.
   *
   * Unlike upstream, the parsed value is our fluent `Duration`, so you can
   * keep chaining. Accepts any string that `Duration.fromInput` can parse
   * (e.g. `"10 seconds"`, `"500 millis"`, `"Infinity"`, `"-Infinity"`).
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const timeout = Config.duration("TIMEOUT").map((duration) => duration.toMillis)
   *
   * const provider = ConfigProvider.fromUnknown({ TIMEOUT: "10 seconds" })
   * // timeout.parse(provider) yields 10000
   * ```
   */
  static duration(name?: string): Config<Duration> {
    return new Config(_Config.map(_Config.duration(name), Duration.wrap));
  }

  /**
   * Creates a config for a port number (integer in 1–65535).
   *
   * Shortcut for `Config.schema(Config.Port, name)`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const port = Config.port("PORT")
   *
   * const provider = ConfigProvider.fromEnv({ env: { PORT: "8080" } })
   * // port.parse(provider) yields 8080
   * ```
   */
  static port(name?: string): Config<number> {
    return new Config(_Config.port(name));
  }

  /**
   * Creates a config for a log level string.
   *
   * Shortcut for `Config.schema(Config.LogLevel, name)`. Accepted values:
   * `"All"`, `"Fatal"`, `"Error"`, `"Warn"`, `"Info"`, `"Debug"`, `"Trace"`,
   * `"None"`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const logLevel = Config.logLevel("LOG_LEVEL")
   *
   * const provider = ConfigProvider.fromEnv({ env: { LOG_LEVEL: "Info" } })
   * // logLevel.parse(provider) yields "Info"
   * ```
   */
  static logLevel(name?: string): Config<_LogLevel.LogLevel> {
    return new Config(_Config.logLevel(name));
  }

  /**
   * Creates a config for a redacted string value. The parsed result is
   * wrapped in a core `Redacted` container that hides the value from logs and
   * `toString`.
   *
   * Shortcut for `Config.schema(Schema.Redacted(Schema.String), name)`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const apiKey = Config.redacted("API_KEY")
   *
   * const provider = ConfigProvider.fromEnv({ env: { API_KEY: "sk-1234" } })
   * // apiKey.parse(provider) yields <redacted>
   * ```
   */
  static redacted(name?: string): Config<Redacted.Redacted<string>> {
    return new Config(_Config.redacted(name));
  }

  /**
   * Creates a config for a `URL` value parsed from a string.
   *
   * Shortcut for `Config.schema(Schema.URL, name)`. Fails if the string
   * cannot be parsed by the `URL` constructor.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const url = Config.url("URL")
   *
   * const provider = ConfigProvider.fromEnv({ env: { URL: "https://example.com" } })
   * // url.parse(provider) yields new URL("https://example.com")
   * ```
   */
  static url(name?: string): Config<URL> {
    return new Config(_Config.url(name));
  }

  /**
   * Creates a config for a `Date` value parsed from a string.
   *
   * Shortcut for `Config.schema(Schema.DateValid, name)`. Fails with a
   * `SchemaError` if the string produces an invalid `Date`.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const createdAt = Config.date("CREATED_AT")
   *
   * const provider = ConfigProvider.fromUnknown({ CREATED_AT: "2024-01-15" })
   * // createdAt.parse(provider) yields new Date("2024-01-15")
   * ```
   */
  static date(name?: string): Config<Date> {
    return new Config(_Config.date(name));
  }

  /**
   * Combines multiple configs into a single config that parses all of them.
   *
   * Accepts a tuple (preserves positions), an iterable, or a record of fluent
   * Configs. Returns a config whose parsed value mirrors the input shape.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const dbConfig = Config.all({
   *   host: Config.string("host"),
   *   port: Config.number("port")
   * })
   *
   * const provider = ConfigProvider.fromUnknown({ host: "localhost", port: 5432 })
   * // dbConfig.parse(provider) yields { host: "localhost", port: 5432 }
   * ```
   */
  static all<const Arg extends Iterable<Config<any>> | Record<string, Config<any>>>(
    arg: Arg
  ): Config<
    [Arg] extends [ReadonlyArray<Config<any>>]
      ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never }
      : [Arg] extends [Iterable<Config<infer A>>]
        ? Array<A>
        : [Arg] extends [Record<string, Config<any>>]
          ? { -readonly [K in keyof Arg]: [Arg[K]] extends [Config<infer A>] ? A : never }
          : never
  > {
    const coreArg = Array.isArray(arg)
      ? arg.map((config: Config<any>) => config.config)
      : Symbol.iterator in arg
        ? Array.from(arg as Iterable<Config<any>>, (config) => config.config)
        : Object.fromEntries(
            Object.entries(arg).map(([key, config]) => [key, (config as Config<any>).config])
          );
    return new Config(_Config.all(coreArg as any)) as any;
  }

  /**
   * Constructs a `Config<T>` from a value matching `Config.Wrap<T>`.
   *
   * If the input is already a fluent `Config`, it is returned as-is,
   * preserving identity. Otherwise, each key is recursively unwrapped and
   * combined.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * interface Options {
   *   key: string
   * }
   *
   * const makeConfig = (config: Config.Wrap<Options>): Config<Options> =>
   *   Config.unwrap(config)
   * ```
   */
  static unwrap<T>(wrapped: Config.Wrap<T>): Config<T> {
    // Preserve upstream's identity guarantee: an input that is already a
    // Config is returned as-is.
    if (Config.is(wrapped)) return wrapped as Config<T>;
    return new Config(_Config.unwrap(unwrapWrap(wrapped) as _Config.Wrap<T>));
  }

  /**
   * Schema for boolean values encoded as strings, for use with
   * {@link Config.schema | schema}.
   *
   * Accepted string values: `true`, `false`, `yes`, `no`, `on`, `off`, `1`,
   * `0`, `y`, `n` (case-sensitive). This is a core `Schema` value (leaf
   * plumbing).
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const flag = Config.schema(Config.Boolean, "FEATURE_FLAG")
   * ```
   */
  static readonly Boolean: typeof _Config.Boolean = _Config.Boolean;

  /**
   * Schema for port numbers (integers in 1–65535), for use with
   * {@link Config.schema | schema}. This is a core `Schema` value (leaf
   * plumbing).
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const port = Config.schema(Config.Port, "PORT")
   * ```
   */
  static readonly Port: typeof _Config.Port = _Config.Port;

  /**
   * Schema for `LogLevel` string literals, for use with
   * {@link Config.schema | schema}.
   *
   * Accepted values: `"All"`, `"Fatal"`, `"Error"`, `"Warn"`, `"Info"`,
   * `"Debug"`, `"Trace"`, `"None"`. This is a core `Schema` value (leaf
   * plumbing).
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const level = Config.schema(Config.LogLevel, "LOG_LEVEL")
   * ```
   */
  static readonly LogLevel: typeof _Config.LogLevel = _Config.LogLevel;

  /**
   * Schema for key-value record types that can also be parsed from a flat
   * separated string like `"key1=val1,key2=val2"`, for use with
   * {@link Config.schema | schema}.
   *
   * The `separator` (default `","`) and `keyValueSeparator` (default `"="`)
   * can be customized. This is a core `Schema` constructor (leaf plumbing).
   *
   * @example
   * ```ts
   * import { ConfigProvider, Schema } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const attributes = Config.schema(
   *   Config.Record(Schema.String, Schema.String),
   *   "OTEL_RESOURCE_ATTRIBUTES"
   * )
   *
   * const provider = ConfigProvider.fromEnv({
   *   env: { OTEL_RESOURCE_ATTRIBUTES: "service.name=my-service" }
   * })
   * // attributes.parse(provider) yields { "service.name": "my-service" }
   * ```
   */
  static readonly Record: typeof _Config.Record = _Config.Record;

  /**
   * Schema for array types that can also be parsed from a flat separated
   * string like `"a,b,c"`, for use with {@link Config.schema | schema}.
   *
   * The `separator` defaults to `","` and can be customized. Corresponds to
   * the keyword-aliased upstream export `Array`. This is a core `Schema`
   * constructor (leaf plumbing).
   *
   * @example
   * ```ts
   * import { ConfigProvider, Schema } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const exporters = Config.schema(Config.Array(Schema.String), "EXPORTERS")
   *
   * const provider = ConfigProvider.fromEnv({ env: { EXPORTERS: "otlp,console" } })
   * // exporters.parse(provider) yields ["otlp", "console"]
   * ```
   */
  static readonly Array: typeof _Config.Array = _Config.Array;

  private readonly _config: _Config.Config<T>;

  private constructor(config: _Config.Config<T>) {
    super();
    this._config = config;
  }

  /**
   * The underlying core effect `Config`.
   *
   * Use this to hand the value back to data-first effect APIs. Fluent Configs
   * are yieldable inside `Effect.gen`; for any other core usage, unbox
   * explicitly with this getter. This escape hatch has no upstream
   * counterpart.
   *
   * @example
   * ```ts
   * import { Config as CoreConfig } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const host = Config.string("HOST")
   * const core = CoreConfig.map(host.config, (value) => value.toUpperCase())
   * ```
   */
  get config(): _Config.Config<T> {
    return this._config;
  }

  /**
   * Makes fluent Configs yieldable with `yield*` inside `Effect.gen`,
   * resolving the current `ConfigProvider` from the context.
   */
  [Symbol.iterator](): _Effect.EffectIterator<Config<T>> {
    return this._config[Symbol.iterator]() as any;
  }

  /**
   * A plain-object representation of the `Config` for inspection.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * console.log(Config.string("HOST").toJSON()) // { _id: "Config" }
   * ```
   */
  toJSON(): unknown {
    return (this._config as any).toJSON?.() ?? { _id: 'Config' };
  }

  /**
   * Runs this config against a specific provider, returning a fluent
   * `Effect`.
   *
   * The optional `pathPrefix` is the logical scope accumulated from outer
   * {@link Config.nested | nested} calls.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const host = Config.string("HOST")
   * const provider = ConfigProvider.fromUnknown({ HOST: "localhost" })
   *
   * const program = host.parse(provider).map((value) => value.toUpperCase())
   * // yields "LOCALHOST"
   * ```
   */
  parse(provider: ConfigProvider.ConfigProvider, pathPrefix?: ConfigProvider.Path): Effect<T, _Config.ConfigError> {
    return Effect.wrap(this._config.parse(provider, pathPrefix));
  }

  /**
   * Transforms the parsed value of this config with a pure function.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const upper = Config.string("name").map((s) => s.toUpperCase())
   *
   * const provider = ConfigProvider.fromUnknown({ name: "alice" })
   * // upper.parse(provider) yields "ALICE"
   * ```
   */
  map<B>(f: (a: T) => B): Config<B> {
    return new Config(_Config.map(this._config, f));
  }

  /**
   * Transforms the parsed value with a function that may fail.
   *
   * The function returns a fluent `Effect` that can produce a `ConfigError`
   * (e.g. parsing a URL, checking a range).
   *
   * @example
   * ```ts
   * import { Config, Effect } from "effect-fluent"
   *
   * const trimmed = Config.string("name").mapOrFail((s) => Effect.succeed(s.trim()))
   * ```
   */
  mapOrFail<B>(f: (a: T) => Effect<B, _Config.ConfigError>): Config<B> {
    return new Config(_Config.mapOrFail(this._config, (a) => f(a).effect));
  }

  /**
   * Provides a fallback config when parsing fails with a `ConfigError`.
   *
   * Unlike {@link Config.withDefault | withDefault}, this catches **all**
   * `ConfigError`s (not just missing data). The fallback function receives
   * the core `ConfigError` and returns a new fluent `Config`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const host = Config.string("HOST").orElse(() => Config.succeed("localhost"))
   * ```
   */
  orElse<T2>(that: (error: _Config.ConfigError) => Config<T2>): Config<T | T2> {
    return new Config(_Config.orElse(this._config, (error) => that(error).config));
  }

  /**
   * Provides a fallback value when this config fails due to missing data.
   *
   * Only applies when the error is a `SchemaError` caused exclusively by
   * missing data (missing keys, undefined values). Validation errors (wrong
   * type, out of range) still propagate.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const port = Config.number("port").withDefault(3000)
   *
   * const provider = ConfigProvider.fromUnknown({})
   * // port.parse(provider) yields 3000
   * ```
   */
  withDefault<const T2>(defaultValue: T2): Config<T | T2> {
    return new Config(_Config.withDefault(this._config, defaultValue));
  }

  /**
   * Makes this config optional: yields `Some(value)` on success and `None`
   * when data is missing.
   *
   * Unlike upstream, the parsed value is our fluent `Option`, so you can keep
   * chaining. Like {@link Config.withDefault | withDefault}, only
   * missing-data errors produce `None`; validation errors still propagate.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const maybePort = Config.number("port").option
   *
   * const provider = ConfigProvider.fromUnknown({})
   * // maybePort.parse(provider) yields Option.none()
   * ```
   */
  get option(): Config<Option<T>> {
    return new Config(_Config.map(_Config.option(this._config), Option.wrap));
  }

  /**
   * Scopes this config under a named prefix.
   *
   * The prefix is prepended to every key the inner config reads. With
   * `ConfigProvider.fromUnknown` this means an extra object level; with
   * `ConfigProvider.fromEnv` it means a `_`-separated prefix on env var
   * names. Multiple `nested` calls compose: the outermost name becomes the
   * outermost path segment.
   *
   * @example
   * ```ts
   * import { ConfigProvider } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const dbConfig = Config.all({
   *   host: Config.string("host"),
   *   port: Config.number("port")
   * }).nested("database")
   *
   * const provider = ConfigProvider.fromUnknown({
   *   database: { host: "localhost", port: "5432" }
   * })
   * // dbConfig.parse(provider) yields { host: "localhost", port: 5432 }
   * ```
   */
  nested(name: string): Config<T> {
    return new Config(_Config.nested(this._config, name));
  }

  /**
   * Applies a function to the underlying core Config and wraps the result
   * back into a fluent Config.
   *
   * This is an escape hatch for using core `Config` combinators that are not
   * exposed on the fluent class; it has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { Config as CoreConfig } from "effect"
   * import { Config } from "effect-fluent"
   *
   * const doubled = Config.number("N").with((core) => CoreConfig.map(core, (n) => n * 2))
   * ```
   */
  with<B>(f: (config: _Config.Config<T>) => _Config.Config<B>): Config<B> {
    return new Config(f(this._config));
  }
}

// Recursively converts a fluent `Config.Wrap` structure into the core `Wrap`
// shape: fluent Configs are unboxed, plain objects are walked key by key.
const unwrapWrap = (wrapped: unknown): unknown =>
  Config.is(wrapped)
    ? wrapped.config
    : Object.fromEntries(Object.entries(wrapped as Record<string, unknown>).map(([key, value]) => [key, unwrapWrap(value)]));

type Self<A> = Config<A>;

type IsPlainObject<A> = [A] extends [Record<string, any>]
  ? [keyof A] extends [never]
    ? false
    : [keyof A] extends [string]
      ? true
      : false
  : false;

export namespace Config {
  /**
   * The core error type produced when config loading or validation fails.
   *
   * Wraps either a `SourceError` (the provider could not read data) or a
   * `SchemaError` (the data did not match the schema). Core leaf plumbing —
   * used unwrapped throughout the fluent API.
   */
  export type ConfigError = _Config.ConfigError;

  /**
   * Extracts the successfully parsed value type from a fluent `Config`.
   *
   * @example
   * ```ts
   * import { Config } from "effect-fluent"
   *
   * const port = Config.number("PORT")
   * type Port = Config.Success<typeof port> // number
   * ```
   */
  export type Success<C> = [C] extends [Self<infer A>] ? A : never;

  /**
   * Utility type that recursively replaces primitives with fluent `Config` in
   * a nested structure.
   *
   * `Config.Wrap<{ key: string }>` becomes
   * `{ key: Config<string> } | Config<{ key: string }>`.
   *
   * @see {@link Config.unwrap} to construct a `Config` from a `Wrap<T>`
   */
  export type Wrap<A> = [NonNullable<A>] extends [infer T]
    ? [IsPlainObject<T>] extends [true]
      ? { readonly [K in keyof A]: Wrap<A[K]> } | Self<A>
      : Self<A>
    : Self<A>;
}
