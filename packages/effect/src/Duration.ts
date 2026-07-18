import { Equal, Hash } from 'effect';
import * as Combiner from 'effect/Combiner';
import * as _Duration from 'effect/Duration';
import type * as Equivalence from 'effect/Equivalence';
import * as order from 'effect/Order';
import { hasProperty } from 'effect/Predicate';
import * as Reducer from 'effect/Reducer';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

/**
 * Unique symbol identifying the fluent `Duration` class.
 *
 * Used by {@link Duration.is} to recognize fluent Duration instances at
 * runtime.
 */
export const DurationTypeId: unique symbol = Symbol.for('~effect-fluent/Duration') as DurationTypeId;

/**
 * The type of {@link DurationTypeId}.
 */
export type DurationTypeId = typeof DurationTypeId;

const unwrapInput = (input: Duration.Input): _Duration.Input =>
  hasProperty(input, DurationTypeId) ? (input as Duration).duration : (input as _Duration.Input);

/**
 * A fluent wrapper around effect's `Duration`, representing an immutable span
 * of time.
 *
 * A `Duration` can be finite, positive infinity, or negative infinity. It is
 * the standard representation for delays, timeouts, intervals, and
 * time-to-live values. The class exposes constructors from common input
 * shapes, unit conversions, comparisons, arithmetic, and formatting as
 * chainable methods and getters.
 *
 * @example
 * ```ts
 * import { Duration } from "effect-fluent"
 *
 * const total = Duration.seconds(30).sum(Duration.seconds(30))
 * console.log(total.toMinutes) // 1
 * console.log(total.format) // "1m"
 *
 * const timeout = Duration.fromInputUnsafe("5 seconds")
 * console.log(timeout.toMillis) // 5000
 * ```
 */
export class Duration extends Inspectable {
  readonly [DurationTypeId]: DurationTypeId = DurationTypeId;

  /**
   * Wraps a core effect `Duration` in the fluent `Duration` class.
   *
   * This is the bridge from effect's data-first API into the fluent API and
   * has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   * import { Duration as CoreDuration } from "effect"
   *
   * const duration = Duration.wrap(CoreDuration.seconds(5))
   * console.log(duration.toMillis) // 5000
   * ```
   */
  static wrap(duration: _Duration.Duration): Duration {
    return new Duration(duration);
  }

  /**
   * Checks whether a value is a fluent `Duration`.
   *
   * Corresponds to upstream `isDuration`, but recognizes instances of the
   * fluent class rather than core Durations.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.is(Duration.seconds(1))) // true
   * console.log(Duration.is(1000)) // false
   * ```
   */
  static is(u: unknown): u is Duration {
    return hasProperty(u, DurationTypeId);
  }

  /**
   * Decodes a `Duration.Input` into a fluent `Duration`, throwing on invalid
   * input.
   *
   * Accepts everything upstream accepts (millisecond numbers, nanosecond
   * bigints, duration strings, high-resolution tuples, duration objects, core
   * Durations) as well as fluent Durations. An input that is already a fluent
   * `Duration` is returned as-is, preserving identity.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.fromInputUnsafe("5 seconds")
   * console.log(duration.toMillis) // 5000
   *
   * // A fluent Duration input is returned as-is
   * console.log(Duration.fromInputUnsafe(duration) === duration) // true
   * ```
   */
  static fromInputUnsafe(input: Duration.Input): Duration {
    // Preserve upstream's identity guarantee: an input that is already a
    // Duration is returned as-is.
    return Duration.is(input) ? input : new Duration(_Duration.fromInputUnsafe(unwrapInput(input)));
  }

  /**
   * Decodes a `Duration.Input` into a fluent `Duration` safely, returning a
   * fluent `Option` that is `None` if decoding fails.
   *
   * Unlike upstream, the result is our fluent `Option`, so you can keep
   * chaining.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const seconds = Duration.fromInput("5 seconds").map((d) => d.toSeconds)
   * console.log(seconds.getOrUndefined) // 5
   *
   * console.log(Duration.fromInput("invalid" as any).isNone()) // true
   * ```
   */
  static fromInput(input: Duration.Input): Option<Duration> {
    return Duration.is(input)
      ? Option.some(input)
      : Option.wrap(_Duration.fromInput(unwrapInput(input))).map(Duration.wrap);
  }

  /**
   * Creates a Duration from nanoseconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.nanos(BigInt(500_000_000))
   * console.log(duration.toMillis) // 500
   * ```
   */
  static nanos(nanos: bigint): Duration {
    return new Duration(_Duration.nanos(nanos));
  }

  /**
   * Creates a Duration from microseconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.micros(BigInt(500_000))
   * console.log(duration.toMillis) // 500
   * ```
   */
  static micros(micros: bigint): Duration {
    return new Duration(_Duration.micros(micros));
  }

  /**
   * Creates a Duration from milliseconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.millis(1000)
   * console.log(duration.toMillis) // 1000
   * ```
   */
  static millis(millis: number): Duration {
    return new Duration(_Duration.millis(millis));
  }

  /**
   * Creates a Duration from seconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.seconds(30)
   * console.log(duration.toMillis) // 30000
   * ```
   */
  static seconds(seconds: number): Duration {
    return new Duration(_Duration.seconds(seconds));
  }

  /**
   * Creates a Duration from minutes.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.minutes(5)
   * console.log(duration.toMillis) // 300000
   * ```
   */
  static minutes(minutes: number): Duration {
    return new Duration(_Duration.minutes(minutes));
  }

  /**
   * Creates a Duration from hours.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.hours(2)
   * console.log(duration.toMillis) // 7200000
   * ```
   */
  static hours(hours: number): Duration {
    return new Duration(_Duration.hours(hours));
  }

  /**
   * Creates a Duration from days.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.days(1)
   * console.log(duration.toMillis) // 86400000
   * ```
   */
  static days(days: number): Duration {
    return new Duration(_Duration.days(days));
  }

  /**
   * Creates a Duration from weeks.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.weeks(1)
   * console.log(duration.toMillis) // 604800000
   * ```
   */
  static weeks(weeks: number): Duration {
    return new Duration(_Duration.weeks(weeks));
  }

  /**
   * A fluent Duration representing zero time.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.zero.toMillis) // 0
   * console.log(Duration.zero.isZero) // true
   * ```
   */
  static readonly zero: Duration = new Duration(_Duration.zero);

  /**
   * A fluent Duration representing infinite time.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.infinity.toMillis) // Infinity
   * console.log(Duration.infinity.isFinite) // false
   * ```
   */
  static readonly infinity: Duration = new Duration(_Duration.infinity);

  /**
   * A fluent Duration representing negative infinite time.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.negativeInfinity.toMillis) // -Infinity
   * console.log(Duration.negativeInfinity.isNegative) // true
   * ```
   */
  static readonly negativeInfinity: Duration = new Duration(_Duration.negativeInfinity);

  /**
   * An `Order` instance for comparing fluent `Duration` values.
   *
   * `negativeInfinity` < any finite value < `infinity`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const durations = [Duration.seconds(3), Duration.seconds(1), Duration.seconds(2)]
   * const sorted = durations.sort(Duration.Order)
   * console.log(sorted.map((d) => d.toSeconds)) // [1, 2, 3]
   * ```
   */
  static readonly Order: order.Order<Duration> = order.make((self, that) =>
    _Duration.Order(self._duration, that._duration)
  );

  /**
   * An `Equivalence` instance for comparing fluent `Duration` values.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const isEqual = Duration.Equivalence(Duration.seconds(5), Duration.millis(5000))
   * console.log(isEqual) // true
   * ```
   */
  static readonly Equivalence: Equivalence.Equivalence<Duration> = (self, that) =>
    _Duration.Equivalence(self._duration, that._duration);

  /**
   * A `Reducer` for summing fluent `Duration` values.
   *
   * Uses `sum` and starts from `Duration.zero`, so `combineAll([])` returns
   * `Duration.zero`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const total = Duration.ReducerSum.combineAll([
   *   Duration.seconds(2),
   *   Duration.seconds(3)
   * ])
   * console.log(total.toSeconds) // 5
   * ```
   */
  static readonly ReducerSum: Reducer.Reducer<Duration> = Reducer.make(
    (self: Duration, that: Duration) => self.sum(that),
    Duration.zero
  );

  /**
   * A `Combiner` that keeps the longer of two fluent `Duration` values.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const longer = Duration.CombinerMax.combine(Duration.seconds(5), Duration.seconds(3))
   * console.log(longer.toSeconds) // 5
   * ```
   */
  static readonly CombinerMax: Combiner.Combiner<Duration> = Combiner.max(Duration.Order);

  /**
   * A `Combiner` that keeps the shorter of two fluent `Duration` values.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const shorter = Duration.CombinerMin.combine(Duration.seconds(5), Duration.seconds(3))
   * console.log(shorter.toSeconds) // 3
   * ```
   */
  static readonly CombinerMin: Combiner.Combiner<Duration> = Combiner.min(Duration.Order);

  private readonly _duration: _Duration.Duration;

  private constructor(duration: _Duration.Duration) {
    super();
    this._duration = duration;
  }

  /**
   * The underlying core effect `Duration`.
   *
   * Use this to hand the value back to data-first effect APIs. This escape
   * hatch has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   * import { Duration as CoreDuration } from "effect"
   *
   * const duration = Duration.seconds(5)
   * console.log(CoreDuration.toMillis(duration.duration)) // 5000
   * ```
   */
  get duration(): _Duration.Duration {
    return this._duration;
  }

  // --- Equal & Hash ---

  /**
   * Implements the `Equal` protocol: two fluent Durations are equal when their
   * underlying core Durations are equal.
   */
  [Equal.symbol](that: unknown): boolean {
    return Duration.is(that) && Equal.equals(this._duration, that.duration);
  }

  /**
   * Implements the `Hash` protocol by delegating to the underlying core
   * Duration.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._duration);
  }

  /**
   * Returns the JSON representation of the underlying core Duration.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).toJSON())
   * // { _id: "Duration", _tag: "Millis", millis: 5000 }
   * ```
   */
  toJSON(): unknown {
    return (this._duration as any).toJSON();
  }

  /**
   * Returns the string representation of the underlying core Duration.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).toString()) // "5000 millis"
   * ```
   */
  override toString(): string {
    return String(this._duration);
  }

  // --- Guards ---

  /**
   * Whether this Duration is finite (not infinite).
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).isFinite) // true
   * console.log(Duration.infinity.isFinite) // false
   * ```
   */
  get isFinite(): boolean {
    return _Duration.isFinite(this._duration);
  }

  /**
   * Whether this Duration is zero.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.zero.isZero) // true
   * console.log(Duration.seconds(1).isZero) // false
   * ```
   */
  get isZero(): boolean {
    return _Duration.isZero(this._duration);
  }

  /**
   * Whether this Duration is negative (strictly less than zero).
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(-5).isNegative) // true
   * console.log(Duration.zero.isNegative) // false
   * ```
   */
  get isNegative(): boolean {
    return _Duration.isNegative(this._duration);
  }

  /**
   * Whether this Duration is positive (strictly greater than zero).
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).isPositive) // true
   * console.log(Duration.zero.isPositive) // false
   * ```
   */
  get isPositive(): boolean {
    return _Duration.isPositive(this._duration);
  }

  // --- Math ---

  /**
   * The absolute value of this Duration.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(-5).abs.toMillis) // 5000
   * console.log(Duration.negativeInfinity.abs.toMillis) // Infinity
   * ```
   */
  get abs(): Duration {
    return new Duration(_Duration.abs(this._duration));
  }

  /**
   * The negation of this Duration.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).negate.toMillis) // -5000
   * console.log(Duration.infinity.negate.toMillis) // -Infinity
   * ```
   */
  get negate(): Duration {
    return new Duration(_Duration.negate(this._duration));
  }

  /**
   * Divides this Duration by a finite, non-zero number safely, returning a
   * fluent `Option` that is `None` for zero, negative zero, or non-finite
   * divisors.
   *
   * For nanosecond-backed durations, also returns `None` when the divisor
   * cannot be converted to a `bigint`, such as a fractional divisor.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const half = Duration.seconds(10).divide(2)
   * console.log(half.map((d) => d.toSeconds).getOrUndefined) // 5
   *
   * console.log(Duration.seconds(10).divide(0).isNone()) // true
   * ```
   */
  divide(by: number): Option<Duration> {
    return Option.wrap(_Duration.divide(this._duration, by)).map(Duration.wrap);
  }

  /**
   * Divides this Duration by a number using fallback rules instead of
   * returning an `Option`.
   *
   * Non-finite divisors return `Duration.zero`, while division by zero can
   * produce signed infinity for non-zero finite durations.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(10).divideUnsafe(2).toSeconds) // 5
   * console.log(Duration.seconds(10).divideUnsafe(0).toMillis) // Infinity
   * ```
   */
  divideUnsafe(by: number): Duration {
    return new Duration(_Duration.divideUnsafe(this._duration, by));
  }

  /**
   * Multiplies this Duration by a number.
   *
   * For nanosecond-backed durations, the multiplier must be convertible to a
   * `bigint`; fractional or non-finite multipliers can throw.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const doubled = Duration.seconds(5).times(2)
   * console.log(doubled.toSeconds) // 10
   * ```
   */
  times(times: number): Duration {
    return new Duration(_Duration.times(this._duration, times));
  }

  /**
   * Adds another Duration to this one.
   *
   * Infinity addition follows signed-infinity arithmetic: opposite infinities
   * sum to zero, and any infinity plus a finite value keeps its sign.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const total = Duration.seconds(5).sum(Duration.seconds(3))
   * console.log(total.toSeconds) // 8
   * ```
   */
  sum(that: Duration): Duration {
    return new Duration(_Duration.sum(this._duration, that._duration));
  }

  /**
   * Subtracts another Duration from this one. The result can be negative.
   *
   * Infinity subtraction follows signed-infinity arithmetic; subtracting the
   * same infinity from itself returns zero.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const result = Duration.seconds(10).subtract(Duration.seconds(3))
   * console.log(result.toSeconds) // 7
   * ```
   */
  subtract(that: Duration): Duration {
    return new Duration(_Duration.subtract(this._duration, that._duration));
  }

  // --- Conversions ---

  /**
   * This Duration expressed in milliseconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).toMillis) // 5000
   * console.log(Duration.minutes(2).toMillis) // 120000
   * ```
   */
  get toMillis(): number {
    return _Duration.toMillis(this._duration);
  }

  /**
   * This Duration expressed in seconds.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.millis(5000).toSeconds) // 5
   * console.log(Duration.minutes(2).toSeconds) // 120
   * ```
   */
  get toSeconds(): number {
    return _Duration.toSeconds(this._duration);
  }

  /**
   * This Duration expressed in minutes.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(120).toMinutes) // 2
   * console.log(Duration.hours(1).toMinutes) // 60
   * ```
   */
  get toMinutes(): number {
    return _Duration.toMinutes(this._duration);
  }

  /**
   * This Duration expressed in hours.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.minutes(120).toHours) // 2
   * console.log(Duration.days(1).toHours) // 24
   * ```
   */
  get toHours(): number {
    return _Duration.toHours(this._duration);
  }

  /**
   * This Duration expressed in days.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.hours(48).toDays) // 2
   * console.log(Duration.weeks(1).toDays) // 7
   * ```
   */
  get toDays(): number {
    return _Duration.toDays(this._duration);
  }

  /**
   * This Duration expressed in weeks.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.days(14).toWeeks) // 2
   * console.log(Duration.days(7).toWeeks) // 1
   * ```
   */
  get toWeeks(): number {
    return _Duration.toWeeks(this._duration);
  }

  /**
   * This Duration in nanoseconds as a fluent `Option<bigint>`, which is `None`
   * when the Duration is infinite.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(1).toNanos.getOrUndefined) // 1000000000n
   * console.log(Duration.infinity.toNanos.getOrUndefined) // undefined
   * ```
   */
  get toNanos(): Option<bigint> {
    return Option.wrap(_Duration.toNanos(this._duration));
  }

  /**
   * This Duration in nanoseconds as a `bigint`, throwing if the Duration is
   * infinite.
   *
   * Millisecond-backed fractional durations are rounded to the nearest
   * nanosecond, with ties away from zero.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(2).toNanosUnsafe) // 2000000000n
   *
   * // Duration.infinity.toNanosUnsafe
   * // throws Error: "Cannot convert infinite duration to nanos"
   * ```
   */
  get toNanosUnsafe(): bigint {
    return _Duration.toNanosUnsafe(this._duration);
  }

  /**
   * This Duration in high-resolution time format `[seconds, nanoseconds]`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.millis(1500).toHrTime) // [1, 500000000]
   * ```
   */
  get toHrTime(): [seconds: number, nanos: number] {
    return _Duration.toHrTime(this._duration);
  }

  /**
   * This Duration decomposed into normalized signed components.
   *
   * Finite durations return `{ days, hours, minutes, seconds, millis, nanos }`.
   * Infinite durations return every component as `Infinity` or `-Infinity`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const duration = Duration.hours(25).sum(Duration.minutes(90))
   * console.log(duration.parts)
   * // { days: 1, hours: 2, minutes: 30, seconds: 0, millis: 0, nanos: 0 }
   * ```
   */
  get parts(): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    millis: number;
    nanos: number;
  } {
    return _Duration.parts(this._duration);
  }

  /**
   * This Duration as a human readable string.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.millis(1001).format) // "1s 1ms"
   *
   * const duration = Duration.minutes(5).sum(Duration.seconds(19)).sum(Duration.millis(500))
   * console.log(duration.format) // "5m 19s 500ms"
   * ```
   */
  get format(): string {
    return _Duration.format(this._duration);
  }

  // --- Pattern matching ---

  /**
   * Pattern matches on the representation of this Duration.
   *
   * Provide handlers for millisecond-backed values, nanosecond-backed values,
   * and positive infinity. Use `onNegativeInfinity` to handle negative
   * infinity separately; otherwise negative infinity is handled by
   * `onInfinity`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const result = Duration.seconds(5).match({
   *   onMillis: (millis) => `${millis} milliseconds`,
   *   onNanos: (nanos) => `${nanos} nanoseconds`,
   *   onInfinity: () => "infinite"
   * })
   * console.log(result) // "5000 milliseconds"
   * ```
   */
  match<A, B, C, D = C>(options: {
    readonly onMillis: (millis: number) => A;
    readonly onNanos: (nanos: bigint) => B;
    readonly onInfinity: () => C;
    readonly onNegativeInfinity?: () => D;
  }): A | B | C | D {
    return _Duration.match(this._duration, options);
  }

  /**
   * Pattern matches on this Duration and another one together, providing
   * handlers that receive both values.
   *
   * If either Duration is infinite, `onInfinity` is called with both fluent
   * Durations.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const sum = Duration.seconds(3).matchPair(Duration.seconds(2), {
   *   onMillis: (self, that) => self + that,
   *   onNanos: (self, that) => Number(self + that),
   *   onInfinity: () => Infinity
   * })
   * console.log(sum) // 5000
   * ```
   */
  matchPair<A, B, C>(
    that: Duration,
    options: {
      readonly onMillis: (self: number, that: number) => A;
      readonly onNanos: (self: bigint, that: bigint) => B;
      readonly onInfinity: (self: Duration, that: Duration) => C;
    }
  ): A | B | C {
    return _Duration.matchPair(this._duration, that._duration, {
      onMillis: options.onMillis,
      onNanos: options.onNanos,
      onInfinity: () => options.onInfinity(this, that)
    });
  }

  // --- Comparisons ---

  /**
   * Returns `true` if this Duration is between `minimum` and `maximum`, both
   * bounds inclusive.
   *
   * The bounds are not normalized: if `minimum` is greater than `maximum`, the
   * result is always `false`.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const isInRange = Duration.seconds(3).between({
   *   minimum: Duration.seconds(2),
   *   maximum: Duration.seconds(5)
   * })
   * console.log(isInRange) // true
   * ```
   */
  between(options: { minimum: Duration; maximum: Duration }): boolean {
    return _Duration.between(this._duration, {
      minimum: options.minimum._duration,
      maximum: options.maximum._duration
    });
  }

  /**
   * Returns the smaller of this Duration and another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const shorter = Duration.seconds(5).min(Duration.seconds(3))
   * console.log(shorter.toSeconds) // 3
   * ```
   */
  min(that: Duration): Duration {
    return new Duration(_Duration.min(this._duration, that._duration));
  }

  /**
   * Returns the larger of this Duration and another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const longer = Duration.seconds(5).max(Duration.seconds(3))
   * console.log(longer.toSeconds) // 5
   * ```
   */
  max(that: Duration): Duration {
    return new Duration(_Duration.max(this._duration, that._duration));
  }

  /**
   * Returns this Duration constrained between a minimum and maximum value.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * const clamped = Duration.seconds(10).clamp({
   *   minimum: Duration.seconds(2),
   *   maximum: Duration.seconds(5)
   * })
   * console.log(clamped.toSeconds) // 5
   * ```
   */
  clamp(options: { minimum: Duration; maximum: Duration }): Duration {
    return new Duration(
      _Duration.clamp(this._duration, {
        minimum: options.minimum._duration,
        maximum: options.maximum._duration
      })
    );
  }

  /**
   * Checks whether this Duration is less than another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(3).isLessThan(Duration.seconds(5))) // true
   * ```
   */
  isLessThan(that: Duration): boolean {
    return _Duration.isLessThan(this._duration, that._duration);
  }

  /**
   * Checks whether this Duration is less than or equal to another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).isLessThanOrEqualTo(Duration.seconds(5))) // true
   * ```
   */
  isLessThanOrEqualTo(that: Duration): boolean {
    return _Duration.isLessThanOrEqualTo(this._duration, that._duration);
  }

  /**
   * Checks whether this Duration is greater than another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).isGreaterThan(Duration.seconds(3))) // true
   * ```
   */
  isGreaterThan(that: Duration): boolean {
    return _Duration.isGreaterThan(this._duration, that._duration);
  }

  /**
   * Checks whether this Duration is greater than or equal to another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).isGreaterThanOrEqualTo(Duration.seconds(5))) // true
   * ```
   */
  isGreaterThanOrEqualTo(that: Duration): boolean {
    return _Duration.isGreaterThanOrEqualTo(this._duration, that._duration);
  }

  /**
   * Checks whether this Duration is equal to another one.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   *
   * console.log(Duration.seconds(5).equals(Duration.millis(5000))) // true
   * ```
   */
  equals(that: Duration): boolean {
    return _Duration.equals(this._duration, that._duration);
  }

  /**
   * Applies a function to the underlying core Duration and wraps the result
   * back into a fluent Duration.
   *
   * This is an escape hatch for using core `Duration` combinators that are not
   * exposed on the fluent class; it has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { Duration } from "effect-fluent"
   * import { Duration as CoreDuration } from "effect"
   *
   * const doubled = Duration.seconds(5).with((core) => CoreDuration.times(core, 2))
   * console.log(doubled.toSeconds) // 10
   * ```
   */
  with(f: (duration: _Duration.Duration) => _Duration.Duration): Duration {
    return new Duration(f(this._duration));
  }
}

type Self = Duration;

export namespace Duration {
  /**
   * Valid input types that can be converted to a fluent `Duration`.
   *
   * Accepts everything the core `Duration.Input` accepts — millisecond
   * numbers, nanosecond bigints, high-resolution `[seconds, nanos]` tuples,
   * duration strings like `"5 seconds"`, `"Infinity"`, `"-Infinity"`,
   * duration objects, and core Durations — as well as fluent `Duration`
   * instances.
   *
   * @see {@link Duration.fromInput} for safe conversion to a fluent `Option`
   * @see {@link Duration.fromInputUnsafe} for throwing conversion
   */
  export type Input = _Duration.Input | Self;
}
