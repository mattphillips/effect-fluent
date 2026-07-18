import { Equal, Hash } from 'effect';
import * as Combiner from 'effect/Combiner';
import * as _Duration from 'effect/Duration';
import type * as Equivalence from 'effect/Equivalence';
import * as order from 'effect/Order';
import { hasProperty } from 'effect/Predicate';
import * as Reducer from 'effect/Reducer';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

export const DurationTypeId: unique symbol = Symbol.for('~effect-fluent/Duration') as DurationTypeId;
export type DurationTypeId = typeof DurationTypeId;

const unwrapInput = (input: Duration.Input): _Duration.Input =>
  hasProperty(input, DurationTypeId) ? (input as Duration).duration : (input as _Duration.Input);

export class Duration extends Inspectable {
  readonly [DurationTypeId]: DurationTypeId = DurationTypeId;

  static wrap(duration: _Duration.Duration): Duration {
    return new Duration(duration);
  }

  static is(u: unknown): u is Duration {
    return hasProperty(u, DurationTypeId);
  }

  static fromInputUnsafe(input: Duration.Input): Duration {
    // Preserve upstream's identity guarantee: an input that is already a
    // Duration is returned as-is.
    return Duration.is(input) ? input : new Duration(_Duration.fromInputUnsafe(unwrapInput(input)));
  }

  static fromInput(input: Duration.Input): Option<Duration> {
    return Duration.is(input)
      ? Option.some(input)
      : Option.wrap(_Duration.fromInput(unwrapInput(input))).map(Duration.wrap);
  }

  static nanos(nanos: bigint): Duration {
    return new Duration(_Duration.nanos(nanos));
  }

  static micros(micros: bigint): Duration {
    return new Duration(_Duration.micros(micros));
  }

  static millis(millis: number): Duration {
    return new Duration(_Duration.millis(millis));
  }

  static seconds(seconds: number): Duration {
    return new Duration(_Duration.seconds(seconds));
  }

  static minutes(minutes: number): Duration {
    return new Duration(_Duration.minutes(minutes));
  }

  static hours(hours: number): Duration {
    return new Duration(_Duration.hours(hours));
  }

  static days(days: number): Duration {
    return new Duration(_Duration.days(days));
  }

  static weeks(weeks: number): Duration {
    return new Duration(_Duration.weeks(weeks));
  }

  static readonly zero: Duration = new Duration(_Duration.zero);
  static readonly infinity: Duration = new Duration(_Duration.infinity);
  static readonly negativeInfinity: Duration = new Duration(_Duration.negativeInfinity);

  static readonly Order: order.Order<Duration> = order.make((self, that) =>
    _Duration.Order(self._duration, that._duration)
  );

  static readonly Equivalence: Equivalence.Equivalence<Duration> = (self, that) =>
    _Duration.Equivalence(self._duration, that._duration);

  static readonly ReducerSum: Reducer.Reducer<Duration> = Reducer.make(
    (self: Duration, that: Duration) => self.sum(that),
    Duration.zero
  );

  static readonly CombinerMax: Combiner.Combiner<Duration> = Combiner.max(Duration.Order);

  static readonly CombinerMin: Combiner.Combiner<Duration> = Combiner.min(Duration.Order);

  private readonly _duration: _Duration.Duration;

  private constructor(duration: _Duration.Duration) {
    super();
    this._duration = duration;
  }

  get duration(): _Duration.Duration {
    return this._duration;
  }

  // --- Equal & Hash ---

  [Equal.symbol](that: unknown): boolean {
    return Duration.is(that) && Equal.equals(this._duration, that.duration);
  }

  [Hash.symbol](): number {
    return Hash.hash(this._duration);
  }

  toJSON(): unknown {
    return (this._duration as any).toJSON();
  }

  override toString(): string {
    return String(this._duration);
  }

  // --- Guards ---

  get isFinite(): boolean {
    return _Duration.isFinite(this._duration);
  }

  get isZero(): boolean {
    return _Duration.isZero(this._duration);
  }

  get isNegative(): boolean {
    return _Duration.isNegative(this._duration);
  }

  get isPositive(): boolean {
    return _Duration.isPositive(this._duration);
  }

  // --- Math ---

  get abs(): Duration {
    return new Duration(_Duration.abs(this._duration));
  }

  get negate(): Duration {
    return new Duration(_Duration.negate(this._duration));
  }

  divide(by: number): Option<Duration> {
    return Option.wrap(_Duration.divide(this._duration, by)).map(Duration.wrap);
  }

  divideUnsafe(by: number): Duration {
    return new Duration(_Duration.divideUnsafe(this._duration, by));
  }

  times(times: number): Duration {
    return new Duration(_Duration.times(this._duration, times));
  }

  sum(that: Duration): Duration {
    return new Duration(_Duration.sum(this._duration, that._duration));
  }

  subtract(that: Duration): Duration {
    return new Duration(_Duration.subtract(this._duration, that._duration));
  }

  // --- Conversions ---

  get toMillis(): number {
    return _Duration.toMillis(this._duration);
  }

  get toSeconds(): number {
    return _Duration.toSeconds(this._duration);
  }

  get toMinutes(): number {
    return _Duration.toMinutes(this._duration);
  }

  get toHours(): number {
    return _Duration.toHours(this._duration);
  }

  get toDays(): number {
    return _Duration.toDays(this._duration);
  }

  get toWeeks(): number {
    return _Duration.toWeeks(this._duration);
  }

  get toNanos(): Option<bigint> {
    return Option.wrap(_Duration.toNanos(this._duration));
  }

  get toNanosUnsafe(): bigint {
    return _Duration.toNanosUnsafe(this._duration);
  }

  get toHrTime(): [seconds: number, nanos: number] {
    return _Duration.toHrTime(this._duration);
  }

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

  get format(): string {
    return _Duration.format(this._duration);
  }

  // --- Pattern matching ---

  match<A, B, C, D = C>(options: {
    readonly onMillis: (millis: number) => A;
    readonly onNanos: (nanos: bigint) => B;
    readonly onInfinity: () => C;
    readonly onNegativeInfinity?: () => D;
  }): A | B | C | D {
    return _Duration.match(this._duration, options);
  }

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

  between(options: { minimum: Duration; maximum: Duration }): boolean {
    return _Duration.between(this._duration, {
      minimum: options.minimum._duration,
      maximum: options.maximum._duration
    });
  }

  min(that: Duration): Duration {
    return new Duration(_Duration.min(this._duration, that._duration));
  }

  max(that: Duration): Duration {
    return new Duration(_Duration.max(this._duration, that._duration));
  }

  clamp(options: { minimum: Duration; maximum: Duration }): Duration {
    return new Duration(
      _Duration.clamp(this._duration, {
        minimum: options.minimum._duration,
        maximum: options.maximum._duration
      })
    );
  }

  isLessThan(that: Duration): boolean {
    return _Duration.isLessThan(this._duration, that._duration);
  }

  isLessThanOrEqualTo(that: Duration): boolean {
    return _Duration.isLessThanOrEqualTo(this._duration, that._duration);
  }

  isGreaterThan(that: Duration): boolean {
    return _Duration.isGreaterThan(this._duration, that._duration);
  }

  isGreaterThanOrEqualTo(that: Duration): boolean {
    return _Duration.isGreaterThanOrEqualTo(this._duration, that._duration);
  }

  equals(that: Duration): boolean {
    return _Duration.equals(this._duration, that._duration);
  }

  with(f: (duration: _Duration.Duration) => _Duration.Duration): Duration {
    return new Duration(f(this._duration));
  }
}

type Self = Duration;

export namespace Duration {
  export type Input = _Duration.Input | Self;
}
