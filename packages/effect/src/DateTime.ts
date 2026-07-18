import { Equal, Hash } from 'effect';
import type { IllegalArgumentError } from 'effect/Cause';
import * as _DateTime from 'effect/DateTime';
import type * as Equivalence from 'effect/Equivalence';
import { dual } from 'effect/Function';
import type * as Layer from 'effect/Layer';
import * as order from 'effect/Order';
import { hasProperty } from 'effect/Predicate';
import { Duration } from './Duration.js';
import { Effect } from './Effect.js';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

/**
 * The unique type identifier used to recognise fluent `DateTime` values at
 * runtime.
 *
 * @see {@link DateTime.is} to check a value against this identifier
 */
export const DateTimeTypeId: unique symbol = Symbol.for('~effect-fluent/DateTime') as DateTimeTypeId;

/**
 * The type of {@link DateTimeTypeId}.
 */
export type DateTimeTypeId = typeof DateTimeTypeId;

abstract class DateTimeBase extends Inspectable {
  private readonly _dateTime: _DateTime.DateTime;
  /**
   * Discriminant identifying the variant: `"Utc"` for {@link DateTime.Utc} or
   * `"Zoned"` for {@link DateTime.Zoned}.
   */
  abstract readonly _tag: 'Utc' | 'Zoned';
  readonly [DateTimeTypeId]: DateTimeTypeId = DateTimeTypeId;

  constructor(dateTime: _DateTime.DateTime) {
    super();
    this._dateTime = dateTime;
  }

  /**
   * The underlying core `effect` `DateTime` this fluent wrapper is built
   * around.
   *
   * Use this to hand the value to APIs from `effect` that expect a plain
   * `DateTime`. This escape hatch has no upstream counterpart.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   * import { DateTime as CoreDateTime } from "effect"
   *
   * const core = DateTime.makeUnsafe("2024-01-01").dateTime
   * console.log(CoreDateTime.formatIso(core)) // "2024-01-01T00:00:00.000Z"
   * ```
   *
   * @see {@link DateTime.wrap} for the reverse conversion
   */
  get dateTime(): _DateTime.DateTime {
    return this._dateTime;
  }

  // Wraps a core result of a variant-preserving core combinator back into the
  // fluent API, keeping the `this` variant (Utc stays Utc, Zoned stays Zoned).
  private _wrapSame(dateTime: _DateTime.DateTime): this {
    return dateTimeWrap(dateTime) as unknown as this;
  }

  // --- Equal & Hash ---

  /**
   * Implements the `Equal` protocol: two fluent DateTimes are equal when their
   * underlying core DateTimes are equal (same variant, same instant, and — for
   * zoned values — the same time zone).
   */
  [Equal.symbol](that: unknown): boolean {
    return dateTimeIs(that) && Equal.equals(this._dateTime, that.dateTime);
  }

  /**
   * Implements the `Hash` protocol by delegating to the underlying core
   * DateTime.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._dateTime);
  }

  /**
   * Returns the JSON representation of the underlying core DateTime, which is
   * the UTC ISO string.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * console.log(DateTime.makeUnsafe("2024-01-01T12:00:00Z").toJSON())
   * // "2024-01-01T12:00:00.000Z"
   * ```
   */
  toJSON(): unknown {
    return this._dateTime.toJSON();
  }

  /**
   * Returns the string representation of the underlying core DateTime.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * console.log(DateTime.makeUnsafe("2024-01-01T12:00:00Z").toString())
   * // "DateTime.Utc(2024-01-01T12:00:00.000Z)"
   * ```
   */
  override toString(): string {
    return String(this._dateTime);
  }

  // --- Type guards ---

  /**
   * Checks whether this `DateTime` is a UTC value (no time zone information),
   * narrowing the type to {@link DateTime.Utc}.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const dt = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   * console.log(dt.isUtc()) // true
   * ```
   *
   * @see {@link isZoned} for the opposite check
   * @see {@link match} for handling both variants
   */
  isUtc(): this is DateTimeUtc {
    return this._tag === 'Utc';
  }

  /**
   * Checks whether this `DateTime` is a zoned value (has time zone
   * information), narrowing the type to {@link DateTime.Zoned} so that
   * zone-specific members such as `zone` and `formatIsoZoned` become
   * accessible.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const dt: DateTime = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * })
   * if (dt.isZoned()) {
   *   console.log(dt.formatIsoZoned) // "2024-01-01T12:00:00.000+00:00[Europe/London]"
   * }
   * ```
   *
   * @see {@link isUtc} for the opposite check
   * @see {@link match} for handling both variants
   */
  isZoned(): this is DateTimeZoned {
    return this._tag === 'Zoned';
  }

  // --- Pattern matching ---

  /**
   * Pattern matches on this `DateTime`, handling the `Utc` and `Zoned`
   * variants differently. The handlers receive the narrowed fluent value.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const result = DateTime.makeUnsafe("2024-01-01T12:00:00Z").match({
   *   onUtc: (utc) => `UTC: ${utc.formatIso}`,
   *   onZoned: (zoned) => `Zoned: ${zoned.formatIsoZoned}`
   * })
   * console.log(result) // "UTC: 2024-01-01T12:00:00.000Z"
   * ```
   */
  match<A, B>(options: {
    readonly onUtc: (utc: DateTime.Utc) => A;
    readonly onZoned: (zoned: DateTime.Zoned) => B;
  }): A | B {
    return this.isUtc() ? options.onUtc(this) : options.onZoned(this as unknown as DateTimeZoned);
  }

  // --- Time zones ---

  /**
   * This `DateTime` converted to a UTC `DateTime`, keeping the same instant
   * and dropping any time zone information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * })
   * console.log(zoned.toUtc.formatIso) // "2024-01-01T12:00:00.000Z"
   * ```
   */
  get toUtc(): DateTime.Utc {
    return dateTimeWrapUtc(_DateTime.toUtc(this._dateTime));
  }

  /**
   * Sets the time zone of this `DateTime` from a core `TimeZone`, returning a
   * `DateTime.Zoned`.
   *
   * Time zones are core leaf data: create them with the `zoneMake*` statics.
   * By default the instant is kept and the zone attached; when
   * `adjustForTimeZone` is `true` the value is re-interpreted as wall-clock
   * time in the target zone, with `disambiguation` resolving daylight-saving
   * gaps and repeated times.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zone = DateTime.zoneMakeNamedUnsafe("Europe/London")
   * const zoned = DateTime.makeUnsafe("2024-01-01T12:00:00Z").setZone(zone)
   * console.log(zoned.formatIsoZoned) // "2024-01-01T12:00:00.000+00:00[Europe/London]"
   * ```
   *
   * @see {@link setZoneNamed} to set a zone from an IANA identifier
   * @see {@link setZoneOffset} to set a fixed-offset zone
   */
  setZone(
    zone: _DateTime.TimeZone,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined;
      readonly disambiguation?: DateTime.Disambiguation | undefined;
    }
  ): DateTime.Zoned {
    return dateTimeWrapZoned(_DateTime.setZone(this._dateTime, zone, options));
  }

  /**
   * Adds a fixed-offset time zone to this `DateTime`, returning a
   * `DateTime.Zoned`. The offset is in milliseconds from UTC.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   *   .setZoneOffset(3 * 60 * 60 * 1000)
   * console.log(zoned.formatIsoOffset) // "2024-01-01T15:00:00.000+03:00"
   * ```
   *
   * @see {@link setZone} to attach an existing core time zone
   */
  setZoneOffset(
    offset: number,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined;
      readonly disambiguation?: DateTime.Disambiguation | undefined;
    }
  ): DateTime.Zoned {
    return dateTimeWrapZoned(_DateTime.setZoneOffset(this._dateTime, offset, options));
  }

  /**
   * Sets the time zone of this `DateTime` safely from an IANA time zone
   * identifier, returning a fluent `Option` that is `None` when the zone is
   * invalid.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const dt = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   *
   * console.log(dt.setZoneNamed("Europe/London").isSome()) // true
   * console.log(dt.setZoneNamed("Invalid/Zone").isNone()) // true
   * ```
   *
   * @see {@link setZoneNamedUnsafe} for the throwing variant
   */
  setZoneNamed(
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined;
      readonly disambiguation?: DateTime.Disambiguation | undefined;
    }
  ): Option<DateTime.Zoned> {
    return Option.wrap(_DateTime.setZoneNamed(this._dateTime, zoneId, options)).map(dateTimeWrapZoned);
  }

  /**
   * Sets the time zone of this `DateTime` from an IANA time zone identifier,
   * throwing an `IllegalArgumentError` when the zone is invalid.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   *   .setZoneNamedUnsafe("Europe/London")
   * console.log(zoned.formatIsoZoned) // "2024-01-01T12:00:00.000+00:00[Europe/London]"
   * ```
   *
   * @see {@link setZoneNamed} for the safe variant returning an `Option`
   */
  setZoneNamedUnsafe(
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined;
      readonly disambiguation?: DateTime.Disambiguation | undefined;
    }
  ): DateTime.Zoned {
    return dateTimeWrapZoned(_DateTime.setZoneNamedUnsafe(this._dateTime, zoneId, options));
  }

  /**
   * A fluent `Effect` that sets the time zone of this `DateTime` to the
   * current time zone supplied by the `CurrentTimeZone` service.
   *
   * @example
   * ```ts
   * import { DateTime, Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const now = yield* DateTime.now
   *   const zoned = yield* now.setZoneCurrent
   *   console.log(zoned.formatIsoZoned)
   * })
   *
   * DateTime.withCurrentZoneNamed(program, "Europe/London")
   * ```
   *
   * @see {@link DateTime.withCurrentZone} and friends to provide the service
   */
  get setZoneCurrent(): Effect<DateTime.Zoned, never, _DateTime.CurrentTimeZone> {
    return Effect.wrap(_DateTime.setZoneCurrent(this._dateTime)).map(dateTimeWrapZoned);
  }

  // --- Comparisons ---

  /**
   * Computes the difference between this `DateTime` and another one as a
   * fluent `Duration`.
   *
   * If `other` is after this value the result is positive; if it is before,
   * the result is negative.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const a = DateTime.makeUnsafe("2024-01-01T00:00:00Z")
   * const b = DateTime.makeUnsafe("2024-01-01T00:01:00Z")
   *
   * console.log(a.distance(b).toMillis) // 60000
   * console.log(b.distance(a).toMillis) // -60000
   * ```
   */
  distance(other: DateTime): Duration {
    return Duration.wrap(_DateTime.distance(this._dateTime, other.dateTime));
  }

  /**
   * Returns the earlier of this `DateTime` and another one. The original
   * instance is returned, preserving identity and variant.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-01-01")
   * const date2 = DateTime.makeUnsafe("2024-02-01")
   *
   * console.log(date1.min(date2) === date1) // true
   * ```
   */
  min<That extends DateTime>(that: That): this | That {
    return _DateTime.min(this._dateTime, that.dateTime) === this._dateTime ? this : that;
  }

  /**
   * Returns the later of this `DateTime` and another one. The original
   * instance is returned, preserving identity and variant.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-01-01")
   * const date2 = DateTime.makeUnsafe("2024-02-01")
   *
   * console.log(date1.max(date2) === date2) // true
   * ```
   */
  max<That extends DateTime>(that: That): this | That {
    return _DateTime.max(this._dateTime, that.dateTime) === this._dateTime ? this : that;
  }

  /**
   * Returns this `DateTime` constrained between a minimum and maximum value.
   *
   * If this value is before the minimum, the minimum is returned; if it is
   * after the maximum, the maximum is returned; otherwise this instance is
   * returned unchanged.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const min = DateTime.makeUnsafe("2024-01-01")
   * const max = DateTime.makeUnsafe("2024-12-31")
   *
   * const clamped = DateTime.makeUnsafe("2025-06-15").clamp({ minimum: min, maximum: max })
   * console.log(clamped === max) // true
   * ```
   */
  clamp<Min extends DateTime, Max extends DateTime>(options: {
    readonly minimum: Min;
    readonly maximum: Max;
  }): this | Min | Max {
    const result = _DateTime.clamp(this._dateTime, {
      minimum: options.minimum.dateTime,
      maximum: options.maximum.dateTime
    });
    return result === this._dateTime ? this : result === options.minimum.dateTime ? options.minimum : options.maximum;
  }

  /**
   * Checks whether this `DateTime` is after another one.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-02-01")
   * const date2 = DateTime.makeUnsafe("2024-01-01")
   *
   * console.log(date1.isGreaterThan(date2)) // true
   * console.log(date2.isGreaterThan(date1)) // false
   * ```
   */
  isGreaterThan(that: DateTime): boolean {
    return _DateTime.isGreaterThan(this._dateTime, that.dateTime);
  }

  /**
   * Checks whether this `DateTime` is after or equal to another one.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-01-01")
   * const date2 = DateTime.makeUnsafe("2024-01-01")
   *
   * console.log(date1.isGreaterThanOrEqualTo(date2)) // true
   * ```
   */
  isGreaterThanOrEqualTo(that: DateTime): boolean {
    return _DateTime.isGreaterThanOrEqualTo(this._dateTime, that.dateTime);
  }

  /**
   * Checks whether this `DateTime` is before another one.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-01-01")
   * const date2 = DateTime.makeUnsafe("2024-02-01")
   *
   * console.log(date1.isLessThan(date2)) // true
   * ```
   */
  isLessThan(that: DateTime): boolean {
    return _DateTime.isLessThan(this._dateTime, that.dateTime);
  }

  /**
   * Checks whether this `DateTime` is before or equal to another one.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date1 = DateTime.makeUnsafe("2024-01-01")
   * const date2 = DateTime.makeUnsafe("2024-01-01")
   *
   * console.log(date1.isLessThanOrEqualTo(date2)) // true
   * ```
   */
  isLessThanOrEqualTo(that: DateTime): boolean {
    return _DateTime.isLessThanOrEqualTo(this._dateTime, that.dateTime);
  }

  /**
   * Checks whether this `DateTime` is between two other `DateTime` values,
   * both bounds inclusive.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const isInRange = DateTime.makeUnsafe("2024-06-15").between({
   *   minimum: DateTime.makeUnsafe("2024-01-01"),
   *   maximum: DateTime.makeUnsafe("2024-12-31")
   * })
   * console.log(isInRange) // true
   * ```
   */
  between(options: { minimum: DateTime; maximum: DateTime }): boolean {
    return _DateTime.between(this._dateTime, {
      minimum: options.minimum.dateTime,
      maximum: options.maximum.dateTime
    });
  }

  /**
   * A fluent `Effect` that checks whether this `DateTime` is in the future
   * compared to the current time from the `Clock` service.
   *
   * @example
   * ```ts
   * import { DateTime, Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const future = (yield* DateTime.now).add({ hours: 1 })
   *   console.log(yield* future.isFuture) // true
   * })
   * ```
   *
   * @see {@link isFutureUnsafe} for the synchronous variant
   */
  get isFuture(): Effect<boolean> {
    return Effect.wrap(_DateTime.isFuture(this._dateTime));
  }

  /**
   * Checks synchronously whether this `DateTime` is in the future compared to
   * `Date.now()`, bypassing the `Clock` service.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const future = DateTime.nowUnsafe().add({ hours: 1 })
   * console.log(future.isFutureUnsafe) // true
   * ```
   *
   * @see {@link isFuture} for the `Clock`-based effectful variant
   */
  get isFutureUnsafe(): boolean {
    return _DateTime.isFutureUnsafe(this._dateTime);
  }

  /**
   * A fluent `Effect` that checks whether this `DateTime` is in the past
   * compared to the current time from the `Clock` service.
   *
   * @example
   * ```ts
   * import { DateTime, Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const past = (yield* DateTime.now).subtract({ hours: 1 })
   *   console.log(yield* past.isPast) // true
   * })
   * ```
   *
   * @see {@link isPastUnsafe} for the synchronous variant
   */
  get isPast(): Effect<boolean> {
    return Effect.wrap(_DateTime.isPast(this._dateTime));
  }

  /**
   * Checks synchronously whether this `DateTime` is in the past compared to
   * `Date.now()`, bypassing the `Clock` service.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const past = DateTime.nowUnsafe().subtract({ hours: 1 })
   * console.log(past.isPastUnsafe) // true
   * ```
   *
   * @see {@link isPast} for the `Clock`-based effectful variant
   */
  get isPastUnsafe(): boolean {
    return _DateTime.isPastUnsafe(this._dateTime);
  }

  // --- Conversions ---

  /**
   * The UTC `Date` of this `DateTime`, ignoring any time zone information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * })
   * console.log(zoned.toDateUtc.toISOString()) // "2024-01-01T12:00:00.000Z"
   * ```
   *
   * @see {@link toDate} for the time-zone-adjusted variant
   */
  get toDateUtc(): Date {
    return _DateTime.toDateUtc(this._dateTime);
  }

  /**
   * This `DateTime` as a `Date`, applying the time zone first for zoned
   * values. For UTC values this is equivalent to {@link toDateUtc}.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: DateTime.zoneMakeOffset(3 * 60 * 60 * 1000)
   * })
   * console.log(zoned.toDate.toISOString()) // "2024-01-01T15:00:00.000Z"
   * ```
   */
  get toDate(): Date {
    return _DateTime.toDate(this._dateTime);
  }

  /**
   * The milliseconds since the Unix epoch of this `DateTime`. This is the UTC
   * timestamp regardless of any time zone information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * console.log(DateTime.makeUnsafe("2024-01-01T00:00:00Z").toEpochMillis)
   * // 1704067200000
   * ```
   */
  get toEpochMillis(): number {
    return _DateTime.toEpochMillis(this._dateTime);
  }

  /**
   * This `DateTime` with the time removed, first adjusting for the time zone.
   * Returns a `DateTime.Utc` only containing the date.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const date = DateTime.makeZonedUnsafe("2024-01-01T05:00:00Z", {
   *   timeZone: "Pacific/Auckland",
   *   adjustForTimeZone: true
   * }).removeTime
   * console.log(date.formatIso) // "2024-01-01T00:00:00.000Z"
   * ```
   */
  get removeTime(): DateTime.Utc {
    return dateTimeWrapUtc(_DateTime.removeTime(this._dateTime));
  }

  // --- Parts ---

  /**
   * The time-zone-adjusted calendar and time parts of this `DateTime`,
   * including the weekday. The parts are adjusted for the zone when this value
   * is zoned.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const parts = DateTime.makeUnsafe("2024-01-01T12:30:45.123Z").toParts
   * console.log(parts.year) // 2024
   * console.log(parts.weekDay) // 1 (Monday)
   * ```
   *
   * @see {@link toPartsUtc} for the UTC parts
   */
  get toParts(): DateTime.PartsWithWeekday {
    return _DateTime.toParts(this._dateTime);
  }

  /**
   * The UTC calendar and time parts of this `DateTime`, including the weekday
   * and ignoring any time zone information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const parts = DateTime.makeZonedUnsafe("2024-01-01T12:30:45.123Z", {
   *   timeZone: "Europe/London"
   * }).toPartsUtc
   * console.log(parts.hour) // 12
   * ```
   *
   * @see {@link toParts} for the time-zone-adjusted parts
   */
  get toPartsUtc(): DateTime.PartsWithWeekday {
    return _DateTime.toPartsUtc(this._dateTime);
  }

  /**
   * Gets one time-zone-adjusted part of this `DateTime` as a number.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const year = DateTime.makeZonedUnsafe({ year: 2024 }, {
   *   timeZone: "Europe/London"
   * }).getPart("year")
   * console.log(year) // 2024
   * ```
   *
   * @see {@link getPartUtc} for the UTC variant
   */
  getPart(part: keyof DateTime.PartsWithWeekday): number {
    return _DateTime.getPart(this._dateTime, part);
  }

  /**
   * Gets one UTC part of this `DateTime` as a number, ignoring any time zone
   * information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const year = DateTime.makeUnsafe({ year: 2024 }).getPartUtc("year")
   * console.log(year) // 2024
   * ```
   *
   * @see {@link getPart} for the time-zone-adjusted variant
   */
  getPartUtc(part: keyof DateTime.PartsWithWeekday): number {
    return _DateTime.getPartUtc(this._dateTime, part);
  }

  /**
   * Sets time-zone-adjusted parts on this `DateTime`, returning a new value of
   * the same variant. The parts are interpreted in the value's zone when this
   * value is zoned.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const updated = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   *   .setParts({ year: 2025, month: 6, day: 15 })
   * console.log(updated.formatIso) // "2025-06-15T12:00:00.000Z"
   * ```
   *
   * @see {@link setPartsUtc} for the UTC variant
   */
  setParts(parts: Partial<DateTime.PartsWithWeekday>): this {
    return this._wrapSame(_DateTime.setParts(this._dateTime, parts));
  }

  /**
   * Sets UTC parts on this `DateTime`, returning a new value of the same
   * variant. The parts are always interpreted as UTC, ignoring any time zone
   * information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const updated = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
   *   .setPartsUtc({ year: 2025, hour: 18 })
   * console.log(updated.formatIso) // "2025-01-01T18:00:00.000Z"
   * ```
   *
   * @see {@link setParts} for the time-zone-adjusted variant
   */
  setPartsUtc(parts: Partial<DateTime.PartsWithWeekday>): this {
    return this._wrapSame(_DateTime.setPartsUtc(this._dateTime, parts));
  }

  // --- Mapping ---

  /**
   * Modifies this `DateTime` with a mutable local `Date` copy, returning a new
   * value of the same variant.
   *
   * The `Date` first has the time zone applied if possible, and the mutated
   * result is converted back within the same time zone. Supports
   * `disambiguation` when the new wall-clock time is ambiguous.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const modified = DateTime.makeUnsafe("2024-01-01T12:00:00Z").mutate((date) => {
   *   date.setHours(15)
   *   date.setMinutes(30)
   * })
   * console.log(modified.formatIso) // "2024-01-01T15:30:00.000Z"
   * ```
   *
   * @see {@link mutateUtc} for the UTC variant
   */
  mutate(
    f: (date: Date) => void,
    options?: {
      readonly disambiguation?: DateTime.Disambiguation | undefined;
    }
  ): this {
    return this._wrapSame(_DateTime.mutate(this._dateTime, f, options));
  }

  /**
   * Modifies this `DateTime` with a mutable UTC `Date` copy, returning a new
   * value of the same variant.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const modified = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * }).mutateUtc((date) => {
   *   date.setUTCHours(18)
   * })
   * console.log(modified.formatIso) // "2024-01-01T18:00:00.000Z"
   * ```
   *
   * @see {@link mutate} for the time-zone-adjusted variant
   */
  mutateUtc(f: (date: Date) => void): this {
    return this._wrapSame(_DateTime.mutateUtc(this._dateTime, f));
  }

  /**
   * Transforms this `DateTime` by applying a function to the number of
   * milliseconds since the Unix epoch, returning a new value of the same
   * variant.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const shifted = DateTime.makeUnsafe(0).mapEpochMillis((millis) => millis + 10)
   * console.log(shifted.toEpochMillis) // 10
   * ```
   */
  mapEpochMillis(f: (millis: number) => number): this {
    return this._wrapSame(_DateTime.mapEpochMillis(this._dateTime, f));
  }

  /**
   * Applies a function to a `Date` representing this `DateTime` and returns
   * the result. The callback receives the time-zone-adjusted wall-clock date
   * for zoned values.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const millis = DateTime.makeZonedUnsafe(0, { timeZone: "Europe/London" })
   *   .withDate((date) => date.getTime())
   * console.log(millis) // 0
   * ```
   *
   * @see {@link withDateUtc} when the callback should receive the UTC instant
   */
  withDate<A>(f: (date: Date) => A): A {
    return _DateTime.withDate(this._dateTime, f);
  }

  /**
   * Applies a function to a `Date` representing this `DateTime`'s UTC instant
   * and returns the result, ignoring any time zone information.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const millis = DateTime.makeUnsafe(0).withDateUtc((date) => date.getTime())
   * console.log(millis) // 0
   * ```
   *
   * @see {@link withDate} when the callback should receive the wall-clock date
   */
  withDateUtc<A>(f: (date: Date) => A): A {
    return _DateTime.withDateUtc(this._dateTime, f);
  }

  // --- Math ---

  /**
   * Adds the given `Duration` to this `DateTime`, returning a new value of the
   * same variant.
   *
   * Accepts any fluent `Duration.Input`, including fluent `Duration`
   * instances, duration strings, and millisecond numbers. This is elapsed-time
   * arithmetic; use {@link add} for calendar-aware arithmetic.
   *
   * @example
   * ```ts
   * import { DateTime, Duration } from "effect-fluent"
   *
   * const dt = DateTime.makeUnsafe("2024-01-01T00:00:00Z")
   *
   * console.log(dt.addDuration("5 minutes").formatIso) // "2024-01-01T00:05:00.000Z"
   * console.log(dt.addDuration(Duration.minutes(5)).formatIso) // "2024-01-01T00:05:00.000Z"
   * ```
   *
   * @see {@link subtractDuration} for the opposite operation
   */
  addDuration(duration: Duration.Input): this {
    return this._wrapSame(_DateTime.addDuration(this._dateTime, Duration.is(duration) ? duration.duration : duration));
  }

  /**
   * Subtracts the given `Duration` from this `DateTime`, returning a new value
   * of the same variant.
   *
   * Accepts any fluent `Duration.Input`, including fluent `Duration`
   * instances, duration strings, and millisecond numbers.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const dt = DateTime.makeUnsafe("2024-01-01T00:05:00Z")
   * console.log(dt.subtractDuration("5 minutes").formatIso) // "2024-01-01T00:00:00.000Z"
   * ```
   *
   * @see {@link addDuration} for the opposite operation
   */
  subtractDuration(duration: Duration.Input): this {
    return this._wrapSame(
      _DateTime.subtractDuration(this._dateTime, Duration.is(duration) ? duration.duration : duration)
    );
  }

  /**
   * Adds the given amounts of date and time parts to this `DateTime`,
   * returning a new value of the same variant. The time zone is taken into
   * account when adding days, weeks, months, and years.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const later = DateTime.makeUnsafe("2024-01-01T00:00:00Z").add({ minutes: 5 })
   * console.log(later.formatIso) // "2024-01-01T00:05:00.000Z"
   * ```
   *
   * @see {@link subtract} for the opposite operation
   * @see {@link addDuration} for elapsed-time arithmetic
   */
  add(parts: Partial<DateTime.PartsForMath>): this {
    return this._wrapSame(_DateTime.add(this._dateTime, parts));
  }

  /**
   * Subtracts the given amounts of date and time parts from this `DateTime`,
   * returning a new value of the same variant.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const earlier = DateTime.makeUnsafe("2024-01-01T00:05:00Z").subtract({ minutes: 5 })
   * console.log(earlier.formatIso) // "2024-01-01T00:00:00.000Z"
   * ```
   *
   * @see {@link add} for the opposite operation
   */
  subtract(parts: Partial<DateTime.PartsForMath>): this {
    return this._wrapSame(_DateTime.subtract(this._dateTime, parts));
  }

  /**
   * Converts this `DateTime` to the start of the given part, returning a new
   * value of the same variant.
   *
   * If the part is `"week"`, the `weekStartsOn` option specifies the day the
   * week starts on. The default is 0 (Sunday).
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const start = DateTime.makeUnsafe("2024-01-01T12:00:00Z").startOf("day")
   * console.log(start.formatIso) // "2024-01-01T00:00:00.000Z"
   * ```
   *
   * @see {@link endOf} and {@link nearest} for the other rounding modes
   */
  startOf(
    part: DateTime.UnitSingular,
    options?: { readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined }
  ): this {
    return this._wrapSame(_DateTime.startOf(this._dateTime, part, options));
  }

  /**
   * Converts this `DateTime` to the end of the given part, returning a new
   * value of the same variant.
   *
   * If the part is `"week"`, the `weekStartsOn` option specifies the day the
   * week starts on. The default is 0 (Sunday).
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const end = DateTime.makeUnsafe("2024-01-01T12:00:00Z").endOf("day")
   * console.log(end.formatIso) // "2024-01-01T23:59:59.999Z"
   * ```
   *
   * @see {@link startOf} and {@link nearest} for the other rounding modes
   */
  endOf(
    part: DateTime.UnitSingular,
    options?: { readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined }
  ): this {
    return this._wrapSame(_DateTime.endOf(this._dateTime, part, options));
  }

  /**
   * Rounds this `DateTime` to the nearest given part, returning a new value of
   * the same variant.
   *
   * If the part is `"week"`, the `weekStartsOn` option specifies the day the
   * week starts on. The default is 0 (Sunday).
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const rounded = DateTime.makeUnsafe("2024-01-01T12:01:00Z").nearest("day")
   * console.log(rounded.formatIso) // "2024-01-02T00:00:00.000Z"
   * ```
   *
   * @see {@link startOf} and {@link endOf} for directional rounding
   */
  nearest(
    part: DateTime.UnitSingular,
    options?: { readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined }
  ): this {
    return this._wrapSame(_DateTime.nearest(this._dateTime, part, options));
  }

  // --- Formatting ---

  /**
   * Formats this `DateTime` as a string with `Intl.DateTimeFormat`.
   *
   * Unless a `timeZone` option is supplied, UTC values are formatted in UTC
   * and zoned values are formatted in their zone.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const formatted = DateTime.makeZonedUnsafe("2024-06-15T14:30:00Z", {
   *   timeZone: "Europe/London"
   * }).format({ dateStyle: "full", timeStyle: "short", locale: "en-US" })
   *
   * console.log(formatted) // "Saturday, June 15, 2024 at 3:30 PM"
   * ```
   *
   * @see {@link formatUtc} and {@link formatLocal} to force a time zone
   */
  format(
    options?:
      | (Intl.DateTimeFormatOptions & {
          readonly locale?: string | undefined;
        })
      | undefined
  ): string {
    return _DateTime.format(this._dateTime, options);
  }

  /**
   * Formats this `DateTime` as a string with `Intl.DateTimeFormat` using the
   * system's local time zone and locale.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const local = DateTime.makeUnsafe("2024-06-15T14:30:00Z").formatLocal({
   *   year: "numeric",
   *   month: "long",
   *   day: "numeric"
   * })
   * console.log(local) // Output depends on the system locale and time zone
   * ```
   */
  formatLocal(
    options?:
      | (Intl.DateTimeFormatOptions & {
          readonly locale?: string | undefined;
        })
      | undefined
  ): string {
    return _DateTime.formatLocal(this._dateTime, options);
  }

  /**
   * Formats this `DateTime` as a string with `Intl.DateTimeFormat`, forcing
   * the time zone to UTC.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const formatted = DateTime.makeZonedUnsafe("2024-06-15T14:30:00Z", {
   *   timeZone: "Europe/London"
   * }).formatUtc({ dateStyle: "short", timeStyle: "short", locale: "en-US" })
   *
   * console.log(formatted) // "6/15/24, 2:30 PM"
   * ```
   */
  formatUtc(
    options?:
      | (Intl.DateTimeFormatOptions & {
          readonly locale?: string | undefined;
        })
      | undefined
  ): string {
    return _DateTime.formatUtc(this._dateTime, options);
  }

  /**
   * Formats this `DateTime` as a string using a pre-built
   * `Intl.DateTimeFormat`, which controls the locale, time zone, and
   * formatting options.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const formatter = new Intl.DateTimeFormat("de-DE", {
   *   dateStyle: "long",
   *   timeZone: "Europe/Berlin"
   * })
   *
   * const formatted = DateTime.makeUnsafe("2024-06-15T14:30:00Z").formatIntl(formatter)
   * console.log(formatted) // "15. Juni 2024"
   * ```
   */
  formatIntl(format: Intl.DateTimeFormat): string {
    return _DateTime.formatIntl(this._dateTime, format);
  }

  /**
   * This `DateTime` formatted as a UTC ISO 8601 string, ignoring any time
   * zone.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * console.log(DateTime.makeUnsafe("2024-01-01T12:30:45.123Z").formatIso)
   * // "2024-01-01T12:30:45.123Z"
   * ```
   */
  get formatIso(): string {
    return _DateTime.formatIso(this._dateTime);
  }

  /**
   * This `DateTime` formatted as a time-zone-adjusted ISO date string
   * (`YYYY-MM-DD`).
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T23:30:00Z", {
   *   timeZone: "Pacific/Auckland"
   * })
   * console.log(zoned.formatIsoDate) // "2024-01-02" (next day in Auckland)
   * ```
   *
   * @see {@link formatIsoDateUtc} for the UTC variant
   */
  get formatIsoDate(): string {
    return _DateTime.formatIsoDate(this._dateTime);
  }

  /**
   * This `DateTime` formatted as a UTC ISO date string (`YYYY-MM-DD`),
   * ignoring any time zone.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T23:30:00Z", {
   *   timeZone: "Pacific/Auckland"
   * })
   * console.log(zoned.formatIsoDateUtc) // "2024-01-01"
   * ```
   *
   * @see {@link formatIsoDate} for the time-zone-adjusted variant
   */
  get formatIsoDateUtc(): string {
    return _DateTime.formatIsoDateUtc(this._dateTime);
  }

  /**
   * This `DateTime` formatted as an ISO string with an offset. UTC values
   * format the same as {@link formatIso}; zoned values include the time zone
   * offset.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: DateTime.zoneMakeOffset(3 * 60 * 60 * 1000)
   * })
   * console.log(zoned.formatIsoOffset) // "2024-01-01T15:00:00.000+03:00"
   * ```
   */
  get formatIsoOffset(): string {
    return _DateTime.formatIsoOffset(this._dateTime);
  }

  // --- Escape hatch ---

  /**
   * Escape hatch: applies a function operating on the underlying core
   * `DateTime` and re-wraps its output in the fluent API. Use this to reach
   * core combinators that have no fluent counterpart. The fluent variant of
   * the result follows the variant returned by `f`.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   * import { DateTime as CoreDateTime } from "effect"
   *
   * const next = DateTime.makeUnsafe("2024-01-01")
   *   .with((core) => CoreDateTime.add(core, { days: 1 }))
   * console.log(next.formatIso) // "2024-01-02T00:00:00.000Z"
   * ```
   *
   * @see {@link dateTime} to access the underlying core `DateTime` directly
   */
  with(f: (dateTime: _DateTime.DateTime) => _DateTime.Utc): DateTime.Utc;
  with(f: (dateTime: _DateTime.DateTime) => _DateTime.Zoned): DateTime.Zoned;
  with(f: (dateTime: _DateTime.DateTime) => _DateTime.DateTime): DateTime;
  with(f: (dateTime: _DateTime.DateTime) => _DateTime.DateTime): DateTime {
    return dateTimeWrap(f(this._dateTime));
  }
}

// --- Utc and Zoned classes ---

/**
 * The `Utc` variant of {@link DateTime}: an absolute instant with no
 * associated time zone.
 */
class DateTimeUtc extends DateTimeBase {
  readonly _tag = 'Utc' as const;

  constructor(dateTime: _DateTime.Utc) {
    super(dateTime);
  }

  /**
   * The underlying core `effect` `DateTime.Utc`, narrowed to the `Utc`
   * variant.
   *
   * @see {@link DateTime.wrap} for the reverse conversion
   */
  override get dateTime(): _DateTime.Utc {
    return super.dateTime as _DateTime.Utc;
  }
}

/**
 * The `Zoned` variant of {@link DateTime}: an absolute instant with an
 * associated core `TimeZone` used for wall-clock parts and formatting.
 */
class DateTimeZoned extends DateTimeBase {
  readonly _tag = 'Zoned' as const;

  constructor(dateTime: _DateTime.Zoned) {
    super(dateTime);
  }

  /**
   * The underlying core `effect` `DateTime.Zoned`, narrowed to the `Zoned`
   * variant.
   *
   * @see {@link DateTime.wrap} for the reverse conversion
   */
  override get dateTime(): _DateTime.Zoned {
    return super.dateTime as _DateTime.Zoned;
  }

  /**
   * The core `TimeZone` associated with this `DateTime.Zoned`.
   *
   * Time zones are core leaf data (like `Cause` reasons) and are exposed
   * unwrapped: pass them to the zone statics such as
   * {@link DateTime.zoneToString} or attach them with `setZone`.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * })
   * console.log(DateTime.zoneToString(zoned.zone)) // "Europe/London"
   * ```
   */
  get zone(): _DateTime.TimeZone {
    return this.dateTime.zone;
  }

  /**
   * The time zone offset of this `DateTime.Zoned` in milliseconds from UTC.
   * Positive values are ahead of UTC, negative values are behind UTC.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: "Europe/London"
   * })
   * console.log(zoned.zonedOffset) // 0 (London is UTC+0 in winter)
   * ```
   */
  get zonedOffset(): number {
    return _DateTime.zonedOffset(this.dateTime);
  }

  /**
   * The time zone offset of this `DateTime.Zoned` formatted as an ISO string
   * (`±HH:MM`).
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
   *   timeZone: DateTime.zoneMakeOffset(3 * 60 * 60 * 1000)
   * })
   * console.log(zoned.zonedOffsetIso) // "+03:00"
   * ```
   */
  get zonedOffsetIso(): string {
    return _DateTime.zonedOffsetIso(this.dateTime);
  }

  /**
   * This `DateTime.Zoned` formatted as an ISO string with offset and zone,
   * using the format `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]`.
   *
   * @example
   * ```ts
   * import { DateTime } from "effect-fluent"
   *
   * const zoned = DateTime.makeZonedUnsafe("2024-06-15T14:30:45.123Z", {
   *   timeZone: "Europe/London"
   * })
   * console.log(zoned.formatIsoZoned) // "2024-06-15T15:30:45.123+01:00[Europe/London]"
   * ```
   */
  get formatIsoZoned(): string {
    return _DateTime.formatIsoZoned(this.dateTime);
  }
}

// --- Public type alias ---

/**
 * A fluent wrapper around effect's `DateTime`, representing a point in time
 * that can optionally carry a time zone.
 *
 * A `DateTime` is either {@link DateTime.Utc} — an absolute instant — or
 * {@link DateTime.Zoned} — an instant plus a core `TimeZone` used for
 * wall-clock parts, formatting, and zone-aware transformations. Combinators
 * are available as chainable methods and getters.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const iso = DateTime.makeUnsafe("2024-01-01T00:00:00Z")
 *   .add({ days: 1 })
 *   .startOf("day")
 *   .formatIso
 *
 * console.log(iso) // "2024-01-02T00:00:00.000Z"
 * ```
 */
export type DateTime = DateTimeUtc | DateTimeZoned;

type Self = DateTime;

export namespace DateTime {
  /**
   * The `Utc` variant of {@link DateTime}: an absolute instant with no
   * associated time zone.
   */
  export type Utc = DateTimeUtc;
  /**
   * The `Zoned` variant of {@link DateTime}: an absolute instant with an
   * associated core `TimeZone`, exposing `zone`, `zonedOffset`,
   * `zonedOffsetIso`, and `formatIsoZoned`.
   */
  export type Zoned = DateTimeZoned;
  /**
   * Valid input types that can be converted to a fluent `DateTime`.
   *
   * Accepts everything the core `DateTime.Input` accepts — core DateTimes,
   * partial date parts, epoch-millisecond objects, epoch milliseconds,
   * JavaScript `Date` instances, and parseable date strings — as well as
   * fluent `DateTime` instances.
   *
   * @see {@link DateTime.make} for safe conversion to a fluent `Option`
   * @see {@link DateTime.makeUnsafe} for throwing conversion
   */
  export type Input = _DateTime.DateTime.Input | Self;
  /**
   * Type-level helper used by constructors to preserve a zoned input: when the
   * input is a core or fluent `Zoned`, the result is `DateTime.Zoned`,
   * otherwise it is `DateTime.Utc`.
   */
  export type PreserveZone<A extends Input> = A extends _DateTime.Zoned | DateTimeZoned ? DateTimeZoned : DateTimeUtc;
  /**
   * The core `TimeZone` type used by `DateTime.Zoned`: either a fixed offset
   * from UTC or a named IANA time zone. Time zones are core leaf data and are
   * not wrapped by the fluent API.
   */
  export type TimeZone = _DateTime.TimeZone;
  /**
   * The fixed-offset variant of the core `TimeZone`, measured in milliseconds
   * from UTC.
   */
  export type TimeZoneOffset = _DateTime.TimeZone.Offset;
  /**
   * The named IANA variant of the core `TimeZone`, such as `"Europe/London"`.
   */
  export type TimeZoneNamed = _DateTime.TimeZone.Named;
  /**
   * Strategy for resolving ambiguous or nonexistent wall-clock times during
   * daylight-saving transitions: `"compatible"` (default), `"earlier"`,
   * `"later"`, or `"reject"`.
   */
  export type Disambiguation = _DateTime.Disambiguation;
  /**
   * Date and time unit name accepted by rounding and arithmetic APIs, in
   * singular or plural form.
   */
  export type Unit = _DateTime.DateTime.Unit;
  /**
   * Singular date and time unit names used by `startOf`, `endOf`, and
   * `nearest`.
   */
  export type UnitSingular = _DateTime.DateTime.UnitSingular;
  /**
   * Plural date and time unit names used for amount-based arithmetic.
   */
  export type UnitPlural = _DateTime.DateTime.UnitPlural;
  /**
   * Calendar and time components of a `DateTime`, without weekday
   * information. `month` is one-based.
   */
  export type Parts = _DateTime.DateTime.Parts;
  /**
   * Calendar and time components of a `DateTime`, including the weekday.
   * `month` is one-based and `weekDay` follows `Date#getUTCDay` numbering.
   */
  export type PartsWithWeekday = _DateTime.DateTime.PartsWithWeekday;
  /**
   * Plural amount fields accepted by `add` and `subtract`.
   */
  export type PartsForMath = _DateTime.DateTime.PartsForMath;
  /**
   * Object input representing an absolute instant as milliseconds since the
   * Unix epoch.
   */
  export type Instant = _DateTime.DateTime.Instant;
  /**
   * Object input representing an absolute instant plus a time zone
   * identifier, used by the zoned constructors.
   */
  export type InstantWithZone = _DateTime.DateTime.InstantWithZone;
  /**
   * The core context service that supplies the ambient `TimeZone` for
   * current-zone APIs such as `nowInCurrentZone` and `setZoneCurrent`.
   */
  export type CurrentTimeZone = _DateTime.CurrentTimeZone;
}

// --- Static functions ---

const dateTimeWrapUtc = (dateTime: _DateTime.Utc): DateTimeUtc => new DateTimeUtc(dateTime);

const dateTimeWrapZoned = (dateTime: _DateTime.Zoned): DateTimeZoned => new DateTimeZoned(dateTime);

/**
 * Wraps a core `effect` `DateTime` in the fluent API, preserving the variant:
 * a core `Utc` becomes a fluent `DateTime.Utc` and a core `Zoned` becomes a
 * fluent `DateTime.Zoned`.
 *
 * This is the bridge from effect's data-first API into the fluent API and has
 * no upstream counterpart.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 * import { DateTime as CoreDateTime } from "effect"
 *
 * const dateTime = DateTime.wrap(CoreDateTime.makeUnsafe("2024-01-01"))
 * console.log(dateTime.formatIso) // "2024-01-01T00:00:00.000Z"
 * ```
 *
 * @see the `dateTime` getter for the reverse conversion
 */
const dateTimeWrap: {
  (dateTime: _DateTime.Utc): DateTime.Utc;
  (dateTime: _DateTime.Zoned): DateTime.Zoned;
  (dateTime: _DateTime.DateTime): DateTime;
} = (dateTime: _DateTime.DateTime): any =>
  _DateTime.isZoned(dateTime) ? dateTimeWrapZoned(dateTime) : dateTimeWrapUtc(dateTime as _DateTime.Utc);

/**
 * Checks whether a value is a fluent `DateTime` (either `Utc` or `Zoned`),
 * acting as a TypeScript type guard.
 *
 * Corresponds to upstream `isDateTime`, but recognizes instances of the
 * fluent classes rather than core DateTimes.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.is(DateTime.makeUnsafe("2024-01-01"))) // true
 * console.log(DateTime.is(new Date())) // false
 * ```
 */
const dateTimeIs = (u: unknown): u is DateTime => hasProperty(u, DateTimeTypeId);

const dateTimeUnwrapInput = (input: DateTime.Input): _DateTime.DateTime.Input =>
  dateTimeIs(input) ? input.dateTime : input;

/**
 * Creates a fluent `DateTime` safely from supported input values, returning a
 * fluent `Option` that is `None` when construction would fail.
 *
 * Accepts fluent DateTimes, core DateTimes, JavaScript `Date`s, epoch
 * milliseconds, part objects, and parseable strings. An input that is already
 * a fluent `DateTime` is returned as-is inside `Some`, preserving identity.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.make("2024-01-01").isSome()) // true
 * console.log(DateTime.make({ year: 2024 }).isSome()) // true
 * console.log(DateTime.make("not a date").isNone()) // true
 * ```
 *
 * @see {@link dateTimeMakeUnsafe | makeUnsafe} for the throwing variant
 */
const dateTimeMake = <A extends DateTime.Input>(input: A): Option<DateTime.PreserveZone<A>> => {
  if (dateTimeIs(input)) {
    return Option.some(input as DateTime.PreserveZone<A>);
  }
  return Option.wrap(_DateTime.make(input as _DateTime.DateTime.Input)).map(dateTimeWrap) as Option<
    DateTime.PreserveZone<A>
  >;
};

/**
 * Creates a fluent `DateTime` from supported input values, throwing an
 * `IllegalArgumentError` when the input is invalid.
 *
 * Accepts fluent DateTimes, core DateTimes, JavaScript `Date`s, epoch
 * milliseconds, part objects, and parseable strings. An input that is already
 * a fluent `DateTime` is returned as-is, preserving identity.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.makeUnsafe("2024-01-01").formatIso) // "2024-01-01T00:00:00.000Z"
 * console.log(DateTime.makeUnsafe({ year: 2024 }).formatIso) // "2024-01-01T00:00:00.000Z"
 *
 * // A fluent DateTime input is returned as-is
 * const dt = DateTime.makeUnsafe(0)
 * console.log(DateTime.makeUnsafe(dt) === dt) // true
 * ```
 *
 * @see {@link dateTimeMake | make} for the safe variant returning an `Option`
 */
const dateTimeMakeUnsafe = <A extends DateTime.Input>(input: A): DateTime.PreserveZone<A> => {
  if (dateTimeIs(input)) {
    return input as DateTime.PreserveZone<A>;
  }
  return dateTimeWrap(_DateTime.makeUnsafe(input as _DateTime.DateTime.Input)) as DateTime.PreserveZone<A>;
};

/**
 * Creates a fluent `DateTime.Zoned` safely from an input and a time zone,
 * returning a fluent `Option` that is `None` when the input, time zone, or
 * disambiguation cannot be resolved.
 *
 * By default, the input is interpreted as a UTC instant and the time zone is
 * attached without changing that instant. When `adjustForTimeZone` is `true`,
 * the input is interpreted as wall-clock time in the target zone and
 * `disambiguation` controls daylight-saving gaps and repeated times. A fluent
 * `Zoned` input with no `timeZone` option is returned as-is inside `Some`,
 * preserving identity.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const result = DateTime.makeZoned("2024-06-15T14:30:00Z", {
 *   timeZone: "Europe/London"
 * })
 * console.log(result.map((zoned) => zoned.formatIsoZoned).getOrUndefined)
 * // "2024-06-15T15:30:00.000+01:00[Europe/London]"
 *
 * console.log(DateTime.makeZoned("2024-01-01", { timeZone: "Invalid/Zone" }).isNone()) // true
 * ```
 *
 * @see {@link dateTimeMakeZonedUnsafe | makeZonedUnsafe} for the throwing variant
 */
const dateTimeMakeZoned = (
  input: DateTime.Input,
  options?: {
    readonly timeZone?: number | string | _DateTime.TimeZone | undefined;
    readonly adjustForTimeZone?: boolean | undefined;
    readonly disambiguation?: DateTime.Disambiguation | undefined;
  }
): Option<DateTime.Zoned> => {
  if (options?.timeZone === undefined && dateTimeIs(input) && input.isZoned()) {
    return Option.some(input);
  }
  return Option.wrap(_DateTime.makeZoned(dateTimeUnwrapInput(input), options)).map(dateTimeWrapZoned);
};

/**
 * Creates a fluent `DateTime.Zoned` from an input and a time zone, throwing
 * when the input is invalid, the time zone cannot be resolved, or a rejected
 * ambiguous time is encountered.
 *
 * The `timeZone` option accepts an offset in milliseconds, an IANA time zone
 * identifier, or a core `TimeZone`. A fluent `Zoned` input with no `timeZone`
 * option is returned as-is, preserving identity.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const zoned = DateTime.makeZonedUnsafe("2024-06-15T14:30:00Z", {
 *   timeZone: "Europe/London"
 * })
 * console.log(zoned.formatIsoZoned) // "2024-06-15T15:30:00.000+01:00[Europe/London]"
 * ```
 *
 * @see {@link dateTimeMakeZoned | makeZoned} for the safe variant returning an `Option`
 */
const dateTimeMakeZonedUnsafe = (
  input: DateTime.Input,
  options?: {
    readonly timeZone?: number | string | _DateTime.TimeZone | undefined;
    readonly adjustForTimeZone?: boolean | undefined;
    readonly disambiguation?: DateTime.Disambiguation | undefined;
  }
): DateTime.Zoned => {
  if (options?.timeZone === undefined && dateTimeIs(input) && input.isZoned()) {
    return input;
  }
  return dateTimeWrapZoned(_DateTime.makeZonedUnsafe(dateTimeUnwrapInput(input), options));
};

/**
 * Parses an ISO zoned date-time string into a fluent `DateTime.Zoned` safely,
 * returning a fluent `Option` that is `None` when the input cannot be parsed.
 *
 * Accepts named-zone strings such as
 * `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]` and offset-only strings such as
 * `YYYY-MM-DDTHH:mm:ss.sss+HH:MM`.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const zoned = DateTime.makeZonedFromString("2024-01-01T12:00:00+02:00[Europe/Berlin]")
 * console.log(zoned.isSome()) // true
 *
 * console.log(DateTime.makeZonedFromString("invalid").isNone()) // true
 * ```
 */
const dateTimeMakeZonedFromString = (input: string): Option<DateTime.Zoned> =>
  Option.wrap(_DateTime.makeZonedFromString(input)).map(dateTimeWrapZoned);

/**
 * Creates a fluent `DateTime.Utc` from a JavaScript `Date`, throwing an
 * `IllegalArgumentError` when the `Date` is invalid.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const dateTime = DateTime.fromDateUnsafe(new Date("2024-01-01T12:00:00Z"))
 * console.log(dateTime.formatIso) // "2024-01-01T12:00:00.000Z"
 * ```
 */
const dateTimeFromDateUnsafe = (date: Date): DateTime.Utc => dateTimeWrapUtc(_DateTime.fromDateUnsafe(date));

/**
 * A fluent `Effect` that gets the current time using the `Clock` service as a
 * fluent `DateTime.Utc`.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   console.log(now.formatIso)
 * })
 * ```
 *
 * @see {@link dateTimeNowUnsafe | nowUnsafe} for the synchronous variant
 */
const dateTimeNow: Effect<DateTime.Utc> = Effect.wrap(_DateTime.now).map(dateTimeWrapUtc);

/**
 * A fluent `Effect` that gets the current time from the `Clock` service as a
 * JavaScript `Date`.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const now = yield* DateTime.nowAsDate
 *   console.log(now instanceof Date) // true
 * })
 * ```
 */
const dateTimeNowAsDate: Effect<Date> = Effect.wrap(_DateTime.nowAsDate);

/**
 * Gets the current time synchronously using `Date.now()` as a fluent
 * `DateTime.Utc`, bypassing the `Clock` service.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const now = DateTime.nowUnsafe()
 * console.log(now.isUtc()) // true
 * ```
 *
 * @see {@link dateTimeNow | now} for the `Clock`-based effectful variant
 */
const dateTimeNowUnsafe = (): DateTime.Utc => dateTimeWrapUtc(_DateTime.nowUnsafe());

/**
 * A fluent `Effect` that gets the current time as a fluent `DateTime.Zoned`,
 * using the `CurrentTimeZone` service.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const now = yield* DateTime.nowInCurrentZone
 *   console.log(now.formatIsoZoned)
 * })
 *
 * DateTime.withCurrentZoneNamed(program, "Europe/London")
 * ```
 *
 * @see {@link dateTimeWithCurrentZone | withCurrentZone} and friends to provide the service
 */
const dateTimeNowInCurrentZone: Effect<DateTime.Zoned, never, _DateTime.CurrentTimeZone> = Effect.wrap(
  _DateTime.nowInCurrentZone
).map(dateTimeWrapZoned);

/**
 * Checks whether a value is a core `TimeZone` (either fixed-offset or named).
 *
 * Time zones are core leaf data and are not wrapped by the fluent API.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.isTimeZone(DateTime.zoneMakeOffset(0))) // true
 * console.log(DateTime.isTimeZone("Europe/London")) // false
 * ```
 */
const dateTimeIsTimeZone: (u: unknown) => u is _DateTime.TimeZone = _DateTime.isTimeZone;

/**
 * Checks whether a value is an offset-based core `TimeZone`.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.isTimeZoneOffset(DateTime.zoneMakeOffset(0))) // true
 * console.log(DateTime.isTimeZoneOffset(DateTime.zoneMakeNamedUnsafe("Europe/London"))) // false
 * ```
 */
const dateTimeIsTimeZoneOffset: (u: unknown) => u is _DateTime.TimeZone.Offset = _DateTime.isTimeZoneOffset;

/**
 * Checks whether a value is a named core `TimeZone` (IANA time zone).
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.isTimeZoneNamed(DateTime.zoneMakeNamedUnsafe("Europe/London"))) // true
 * console.log(DateTime.isTimeZoneNamed(DateTime.zoneMakeOffset(0))) // false
 * ```
 */
const dateTimeIsTimeZoneNamed: (u: unknown) => u is _DateTime.TimeZone.Named = _DateTime.isTimeZoneNamed;

/**
 * An `Equivalence` instance for comparing fluent `DateTime` values. Two
 * values are equivalent when they represent the same point in time,
 * regardless of their time zone.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const utc = DateTime.makeUnsafe("2024-01-01T12:00:00Z")
 * const zoned = DateTime.makeZonedUnsafe("2024-01-01T12:00:00Z", {
 *   timeZone: "Europe/London"
 * })
 *
 * console.log(DateTime.Equivalence(utc, zoned)) // true
 * ```
 */
const dateTimeEquivalence: Equivalence.Equivalence<DateTime> = (self, that) =>
  _DateTime.Equivalence(self.dateTime, that.dateTime);

/**
 * An `Order` instance for comparing and sorting fluent `DateTime` values by
 * their epoch milliseconds, so earlier times come before later times
 * regardless of time zone.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const dates = [
 *   DateTime.makeUnsafe("2024-03-01"),
 *   DateTime.makeUnsafe("2024-01-01"),
 *   DateTime.makeUnsafe("2024-02-01")
 * ]
 * const sorted = dates.sort(DateTime.Order)
 * console.log(sorted.map((d) => d.formatIsoDate)) // ["2024-01-01", "2024-02-01", "2024-03-01"]
 * ```
 */
const dateTimeOrder: order.Order<DateTime> = order.make((self, that) => _DateTime.Order(self.dateTime, that.dateTime));

/**
 * Creates a fixed-offset core `TimeZone`. The offset is specified in
 * milliseconds from UTC: positive values are ahead of UTC, negative values
 * are behind.
 *
 * Time zones are core leaf data and are not wrapped by the fluent API.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const zone = DateTime.zoneMakeOffset(3 * 60 * 60 * 1000)
 * console.log(DateTime.zoneToString(zone)) // "+03:00"
 * ```
 */
const dateTimeZoneMakeOffset = (offset: number): _DateTime.TimeZone.Offset => _DateTime.zoneMakeOffset(offset);

/**
 * Creates a named core `TimeZone` safely from an IANA time zone identifier,
 * returning a fluent `Option` that is `None` when the zone is invalid.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.zoneMakeNamed("Europe/London").isSome()) // true
 * console.log(DateTime.zoneMakeNamed("Invalid/Zone").isNone()) // true
 * ```
 *
 * @see {@link dateTimeZoneMakeNamedUnsafe | zoneMakeNamedUnsafe} for the throwing variant
 */
const dateTimeZoneMakeNamed = (zoneId: string): Option<_DateTime.TimeZone.Named> =>
  Option.wrap(_DateTime.zoneMakeNamed(zoneId));

/**
 * Creates a named core `TimeZone` from an IANA time zone identifier, throwing
 * an `IllegalArgumentError` when the zone is invalid.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const zone = DateTime.zoneMakeNamedUnsafe("Europe/London")
 * console.log(DateTime.zoneToString(zone)) // "Europe/London"
 * ```
 *
 * @see {@link dateTimeZoneMakeNamed | zoneMakeNamed} for the safe variant returning an `Option`
 */
const dateTimeZoneMakeNamedUnsafe = (zoneId: string): _DateTime.TimeZone.Named =>
  _DateTime.zoneMakeNamedUnsafe(zoneId);

/**
 * Creates a named core `TimeZone` effectfully from an IANA time zone
 * identifier, failing the fluent `Effect` with an `IllegalArgumentError` when
 * the zone is invalid.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const zone = yield* DateTime.zoneMakeNamedEffect("Europe/London")
 *   const now = yield* DateTime.now
 *   return now.setZone(zone)
 * })
 * ```
 */
const dateTimeZoneMakeNamedEffect = (zoneId: string): Effect<_DateTime.TimeZone.Named, IllegalArgumentError> =>
  Effect.wrap(_DateTime.zoneMakeNamedEffect(zoneId));

/**
 * Creates a named core `TimeZone` from the system's configured local time
 * zone.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const localZone = DateTime.zoneMakeLocal()
 * console.log(DateTime.zoneToString(localZone)) // Output depends on the system time zone
 * ```
 */
const dateTimeZoneMakeLocal = (): _DateTime.TimeZone.Named => _DateTime.zoneMakeLocal();

/**
 * Parses a core `TimeZone` from a string safely, returning a fluent `Option`
 * that is `None` when parsing fails. Supports both IANA time zone identifiers
 * and offset formats like `"+03:00"`.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.zoneFromString("Europe/London").isSome()) // true
 * console.log(DateTime.zoneFromString("+03:00").isSome()) // true
 * console.log(DateTime.zoneFromString("invalid").isNone()) // true
 * ```
 */
const dateTimeZoneFromString = (zone: string): Option<_DateTime.TimeZone> =>
  Option.wrap(_DateTime.zoneFromString(zone));

/**
 * Formats a core `TimeZone` as a string: the offset in `±HH:MM` form for
 * fixed-offset zones, or the IANA identifier for named zones.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * console.log(DateTime.zoneToString(DateTime.zoneMakeOffset(3 * 60 * 60 * 1000))) // "+03:00"
 * console.log(DateTime.zoneToString(DateTime.zoneMakeNamedUnsafe("Europe/London"))) // "Europe/London"
 * ```
 */
const dateTimeZoneToString = (zone: _DateTime.TimeZone): string => _DateTime.zoneToString(zone);

/**
 * Provides the `CurrentTimeZone` service to a fluent `Effect` using a core
 * `TimeZone`.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const zone = DateTime.zoneMakeNamedUnsafe("Europe/London")
 *
 * const program = DateTime.withCurrentZone(
 *   DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned),
 *   zone
 * )
 * ```
 */
const dateTimeWithCurrentZone: {
  (zone: _DateTime.TimeZone): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>>;
  <A, E, R>(self: Effect<A, E, R>, zone: _DateTime.TimeZone): Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>>;
} = dual(
  2,
  <A, E, R>(self: Effect<A, E, R>, zone: _DateTime.TimeZone): Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>> =>
    Effect.wrap(_DateTime.withCurrentZone(self.effect, zone))
);

/**
 * Provides the `CurrentTimeZone` service to a fluent `Effect` using the
 * system's local time zone.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const program = DateTime.withCurrentZoneLocal(
 *   DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned)
 * )
 * ```
 */
const dateTimeWithCurrentZoneLocal = <A, E, R>(
  self: Effect<A, E, R>
): Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>> => Effect.wrap(_DateTime.withCurrentZoneLocal(self.effect));

/**
 * Provides the `CurrentTimeZone` service to a fluent `Effect` using a fixed
 * offset in milliseconds from UTC.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const program = DateTime.withCurrentZoneOffset(
 *   DateTime.nowInCurrentZone.map((now) => now.zonedOffsetIso),
 *   3 * 60 * 60 * 1000
 * )
 * ```
 */
const dateTimeWithCurrentZoneOffset: {
  (offset: number): <A, E, R>(self: Effect<A, E, R>) => Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>>;
  <A, E, R>(self: Effect<A, E, R>, offset: number): Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>>;
} = dual(
  2,
  <A, E, R>(self: Effect<A, E, R>, offset: number): Effect<A, E, Exclude<R, _DateTime.CurrentTimeZone>> =>
    Effect.wrap(_DateTime.withCurrentZoneOffset(self.effect, offset))
);

/**
 * Provides the `CurrentTimeZone` service to a fluent `Effect` using an IANA
 * time zone identifier, failing with an `IllegalArgumentError` when the zone
 * is invalid.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const program = DateTime.withCurrentZoneNamed(
 *   DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned),
 *   "Europe/London"
 * )
 * ```
 */
const dateTimeWithCurrentZoneNamed: {
  (zone: string): <A, E, R>(
    self: Effect<A, E, R>
  ) => Effect<A, E | IllegalArgumentError, Exclude<R, _DateTime.CurrentTimeZone>>;
  <A, E, R>(
    self: Effect<A, E, R>,
    zone: string
  ): Effect<A, E | IllegalArgumentError, Exclude<R, _DateTime.CurrentTimeZone>>;
} = dual(
  2,
  <A, E, R>(
    self: Effect<A, E, R>,
    zone: string
  ): Effect<A, E | IllegalArgumentError, Exclude<R, _DateTime.CurrentTimeZone>> =>
    Effect.wrap(_DateTime.withCurrentZoneNamed(self.effect, zone))
);

/**
 * Creates a core `Layer` providing the `CurrentTimeZone` service from the
 * given core `TimeZone`.
 *
 * Layers are core values — effect-fluent has no fluent `Layer` wrapper —
 * so provide them through core `Effect` APIs.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 * import { Effect as CoreEffect } from "effect"
 *
 * const layer = DateTime.layerCurrentZone(DateTime.zoneMakeNamedUnsafe("Europe/London"))
 *
 * const program = DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned)
 * const provided = Effect.wrap(CoreEffect.provide(program.effect, layer))
 * ```
 */
const dateTimeLayerCurrentZone = (zone: _DateTime.TimeZone): Layer.Layer<_DateTime.CurrentTimeZone> =>
  _DateTime.layerCurrentZone(zone);

/**
 * Creates a core `Layer` providing the `CurrentTimeZone` service from a fixed
 * offset in milliseconds from UTC.
 *
 * Layers are core values — effect-fluent has no fluent `Layer` wrapper —
 * so provide them through core `Effect` APIs.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 * import { Effect as CoreEffect } from "effect"
 *
 * const layer = DateTime.layerCurrentZoneOffset(3 * 60 * 60 * 1000)
 *
 * const program = DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned)
 * const provided = Effect.wrap(CoreEffect.provide(program.effect, layer))
 * ```
 */
const dateTimeLayerCurrentZoneOffset = (offset: number): Layer.Layer<_DateTime.CurrentTimeZone> =>
  _DateTime.layerCurrentZoneOffset(offset);

/**
 * Creates a core `Layer` providing the `CurrentTimeZone` service from an IANA
 * time zone identifier. The layer fails with an `IllegalArgumentError` when
 * the identifier is invalid.
 *
 * Layers are core values — effect-fluent has no fluent `Layer` wrapper —
 * so provide them through core `Effect` APIs.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 * import { Effect as CoreEffect } from "effect"
 *
 * const layer = DateTime.layerCurrentZoneNamed("Europe/London")
 *
 * const program = DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned)
 * const provided = Effect.wrap(CoreEffect.provide(program.effect, layer))
 * ```
 */
const dateTimeLayerCurrentZoneNamed = (
  zoneId: string
): Layer.Layer<_DateTime.CurrentTimeZone, IllegalArgumentError> => _DateTime.layerCurrentZoneNamed(zoneId);

/**
 * A core `Layer` providing the `CurrentTimeZone` service from the system's
 * configured local time zone.
 *
 * Layers are core values — effect-fluent has no fluent `Layer` wrapper —
 * so provide them through core `Effect` APIs.
 *
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect-fluent"
 * import { Effect as CoreEffect } from "effect"
 *
 * const program = DateTime.nowInCurrentZone.map((now) => now.formatIsoZoned)
 * const provided = Effect.wrap(CoreEffect.provide(program.effect, DateTime.layerCurrentZoneLocal))
 * ```
 */
const dateTimeLayerCurrentZoneLocal: Layer.Layer<_DateTime.CurrentTimeZone> = _DateTime.layerCurrentZoneLocal;

/**
 * Static constructors and utilities for the fluent {@link DateTime} type.
 *
 * @example
 * ```ts
 * import { DateTime } from "effect-fluent"
 *
 * const iso = DateTime.makeUnsafe("2024-01-01T00:00:00Z")
 *   .add({ days: 1 })
 *   .formatIso
 *
 * console.log(iso) // "2024-01-02T00:00:00.000Z"
 * ```
 */
export const DateTime = {
  wrap: dateTimeWrap,
  is: dateTimeIs,
  make: dateTimeMake,
  makeUnsafe: dateTimeMakeUnsafe,
  makeZoned: dateTimeMakeZoned,
  makeZonedUnsafe: dateTimeMakeZonedUnsafe,
  makeZonedFromString: dateTimeMakeZonedFromString,
  fromDateUnsafe: dateTimeFromDateUnsafe,
  now: dateTimeNow,
  nowAsDate: dateTimeNowAsDate,
  nowUnsafe: dateTimeNowUnsafe,
  nowInCurrentZone: dateTimeNowInCurrentZone,
  isTimeZone: dateTimeIsTimeZone,
  isTimeZoneOffset: dateTimeIsTimeZoneOffset,
  isTimeZoneNamed: dateTimeIsTimeZoneNamed,
  Equivalence: dateTimeEquivalence,
  Order: dateTimeOrder,
  zoneMakeOffset: dateTimeZoneMakeOffset,
  zoneMakeNamed: dateTimeZoneMakeNamed,
  zoneMakeNamedUnsafe: dateTimeZoneMakeNamedUnsafe,
  zoneMakeNamedEffect: dateTimeZoneMakeNamedEffect,
  zoneMakeLocal: dateTimeZoneMakeLocal,
  zoneFromString: dateTimeZoneFromString,
  zoneToString: dateTimeZoneToString,
  /**
   * The core context service that supplies the ambient `TimeZone` for
   * current-zone APIs such as `nowInCurrentZone` and `setZoneCurrent`.
   * Provide it with the `withCurrentZone*` statics or the `layerCurrentZone*`
   * layers.
   */
  CurrentTimeZone: _DateTime.CurrentTimeZone,
  withCurrentZone: dateTimeWithCurrentZone,
  withCurrentZoneLocal: dateTimeWithCurrentZoneLocal,
  withCurrentZoneOffset: dateTimeWithCurrentZoneOffset,
  withCurrentZoneNamed: dateTimeWithCurrentZoneNamed,
  layerCurrentZone: dateTimeLayerCurrentZone,
  layerCurrentZoneOffset: dateTimeLayerCurrentZoneOffset,
  layerCurrentZoneNamed: dateTimeLayerCurrentZoneNamed,
  layerCurrentZoneLocal: dateTimeLayerCurrentZoneLocal
};
