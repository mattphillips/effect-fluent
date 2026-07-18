import type { NonEmptyReadonlyArray } from 'effect/Array';
import type * as Cron from 'effect/Cron';
import type * as DateTime from 'effect/DateTime';
import type * as _Duration from 'effect/Duration';
import { hasProperty } from 'effect/Predicate';
import type * as Pull from 'effect/Pull';
import * as _Schedule from 'effect/Schedule';
import type { UnionToIntersection } from 'effect/Types';
import { Duration } from './Duration.js';
import { Effect } from './Effect.js';
import { Inspectable } from './Inspectable.js';
import { Result } from './Result.js';

/**
 * Unique identifier used to brand fluent `Schedule` instances.
 */
export const ScheduleTypeId: unique symbol = Symbol.for('~effect-fluent/Schedule') as ScheduleTypeId;
/**
 * The type of the `ScheduleTypeId` brand symbol.
 */
export type ScheduleTypeId = typeof ScheduleTypeId;

const unwrapDurationInput = (input: Duration.Input): _Duration.Input => (Duration.is(input) ? input.duration : input);

const wrapDurationOutput = <Input, Error, Env>(
  core: _Schedule.Schedule<_Duration.Duration, Input, Error, Env>
): Schedule<Duration, Input, Error, Env> => {
  return Schedule.wrap(_Schedule.map(core, ({ output }) => Duration.wrap(output)));
};

/**
 * A fluent wrapper around effect's `Schedule`, describing a recurring policy:
 * when to run again, how long to delay, and what value to emit on each step.
 *
 * Schedules are built from constructors like `exponential`, `spaced`, or
 * `recurs` and refined by chaining combinators. Callbacks receive the core
 * `Metadata` record (attempt count, elapsed time, delay, last input/output)
 * and return fluent `Effect`s.
 *
 * @example
 * ```ts
 * import { Schedule } from "effect-fluent"
 *
 * // Retry policy: exponential backoff with jitter, at most 5 attempts
 * // within 30 seconds
 * const policy = Schedule.exponential("100 millis")
 *   .jittered
 *   .upTo({ times: 5, duration: "30 seconds" })
 * ```
 */
export class Schedule<Output, Input = unknown, Error = never, Env = never> extends Inspectable {
  readonly [ScheduleTypeId]: ScheduleTypeId = ScheduleTypeId;

  /**
   * Wraps a core `effect` `Schedule` in the fluent API. The inverse is the
   * `schedule` getter.
   */
  static wrap<Output, Input, Error, Env>(schedule: _Schedule.Schedule<Output, Input, Error, Env>): Schedule<Output, Input, Error, Env> {
    return new Schedule(schedule);
  }

  /**
   * Checks whether a value is a fluent `Schedule`.
   *
   * Corresponds to upstream `isSchedule`, but refines to the fluent wrapper
   * rather than the core `effect` Schedule.
   */
  static is(u: unknown): u is Schedule<unknown, never, unknown, unknown> {
    return hasProperty(u, ScheduleTypeId);
  }

  /**
   * The core Context reference holding the metadata of the currently running
   * schedule step.
   */
  static readonly CurrentMetadata = _Schedule.CurrentMetadata;

  /**
   * Creates a `Schedule` from a low-level step function produced by a fluent
   * `Effect`.
   */
  static fromStep<Input, Output, EnvX, Error, ErrorX, Env>(
    step: Effect<
      (now: number, input: Input) => Pull.Pull<[Output, _Duration.Duration], ErrorX, Output, EnvX>,
      Error,
      Env
    >
  ): Schedule<Output, Input, Error | Pull.ExcludeDone<ErrorX>, Env | EnvX> {
    return new Schedule(_Schedule.fromStep(step.effect));
  }

  /**
   * Creates a `Schedule` from a low-level step function that receives input
   * metadata, produced by a fluent `Effect`.
   */
  static fromStepWithMetadata<Input, Output, EnvX, ErrorX, Error, Env>(
    step: Effect<
      (options: _Schedule.InputMetadata<Input>) => Pull.Pull<[Output, _Duration.Duration], ErrorX, Output, EnvX>,
      Error,
      Env
    >
  ): Schedule<Output, Input, Error | Pull.ExcludeDone<ErrorX>, Env | EnvX> {
    return new Schedule(_Schedule.fromStepWithMetadata(step.effect));
  }

  /**
   * A `Schedule` that recurs forever without delay, outputting the number of
   * completed attempts.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // 0, 1, 2, 3, ... with no delay between steps
   * const unbounded = Schedule.forever
   * const bounded = Schedule.forever.while(({ attempt }) => attempt <= 10)
   * ```
   */
  static readonly forever: Schedule<number> = new Schedule(_Schedule.forever);

  /**
   * A `Schedule` that always recurs without delay, outputting its input
   * unchanged.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Echoes each input value back as the output
   * const echo = Schedule.identity<string>()
   * ```
   */
  static identity<A>(): Schedule<A, A> {
    return new Schedule(_Schedule.identity());
  }

  /**
   * A `Schedule` that recurs the given number of times without delay,
   * outputting the attempt count.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * const threeTimes = Schedule.recurs(3)
   * ```
   */
  static recurs(times: number): Schedule<number> {
    return new Schedule(_Schedule.recurs(times));
  }

  /**
   * A `Schedule` that recurs forever with the given fixed delay between
   * steps, outputting the number of completed attempts.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Runs again 5 seconds after each completion: 0, 1, 2, ...
   * const everyFive = Schedule.spaced("5 seconds")
   * ```
   */
  static spaced(duration: Duration.Input): Schedule<number> {
    return new Schedule(_Schedule.spaced(unwrapDurationInput(duration)));
  }

  /**
   * A `Schedule` that recurs on a fixed interval measured from the start of
   * each step (catching up if execution took longer than the interval),
   * outputting the number of completed attempts.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Fires at t=1s, 2s, 3s, ... regardless of how long each run takes
   * const everySecond = Schedule.fixed("1 second")
   * ```
   */
  static fixed(interval: Duration.Input): Schedule<number> {
    return new Schedule(_Schedule.fixed(unwrapDurationInput(interval)));
  }

  /**
   * A `Schedule` that recurs at the boundaries of fixed windows of the given
   * size, outputting the number of completed attempts.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // If a run finishes mid-window, wait for the next window boundary
   * const aligned = Schedule.windowed("10 seconds")
   * ```
   */
  static windowed(interval: Duration.Input): Schedule<number> {
    return new Schedule(_Schedule.windowed(unwrapDurationInput(interval)));
  }

  /**
   * A `Schedule` that recurs forever with exponentially growing delays,
   * outputting the current delay as a fluent `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // 100ms, 200ms, 400ms, 800ms, ...
   * const backoff = Schedule.exponential("100 millis")
   * ```
   */
  static exponential(base: Duration.Input, factor?: number): Schedule<Duration> {
    return wrapDurationOutput(_Schedule.exponential(unwrapDurationInput(base), factor));
  }

  /**
   * A `Schedule` that recurs forever with Fibonacci-sequence delays derived
   * from the given base, outputting the current delay as a fluent `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // 1s, 2s, 3s, 5s, 8s, ... — gentler growth than exponential
   * const backoff = Schedule.fibonacci("1 second")
   * ```
   */
  static fibonacci(one: Duration.Input): Schedule<Duration> {
    return wrapDurationOutput(_Schedule.fibonacci(unwrapDurationInput(one)));
  }

  /**
   * A `Schedule` that recurs exactly once after the given delay, outputting
   * the delay as a fluent `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // A single retry after one second
   * const once = Schedule.duration("1 second")
   * ```
   */
  static duration(duration: Duration.Input): Schedule<Duration> {
    return wrapDurationOutput(_Schedule.duration(unwrapDurationInput(duration)));
  }

  /**
   * A `Schedule` that recurs without delay for as long as the total elapsed
   * time stays within the given duration, outputting the elapsed time as a
   * fluent `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Keep retrying immediately, but give up after 30 seconds
   * const timeboxed = Schedule.during("30 seconds")
   * ```
   */
  static during(duration: Duration.Input): Schedule<Duration> {
    return wrapDurationOutput(_Schedule.during(unwrapDurationInput(duration)));
  }

  /**
   * A `Schedule` that recurs at instants matching a cron expression,
   * outputting the delay until the next match as a fluent `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Every day at 4:00am
   * const daily = Schedule.cron("0 4 * * *")
   * ```
   */
  static cron(expression: Cron.Cron): Schedule<Duration, unknown, Cron.CronParseError>;
  static cron(expression: string, tz?: string | DateTime.TimeZone): Schedule<Duration, unknown, Cron.CronParseError>;
  static cron(expression: any, tz?: string | DateTime.TimeZone): Schedule<Duration, unknown, Cron.CronParseError> {
    return wrapDurationOutput(_Schedule.cron(expression, tz));
  }

  /**
   * Combines schedules, recurring only for as long as every component
   * schedule recurs, using the longest delay. Outputs the delay as a fluent
   * `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Exponential growth, but never faster than one attempt per 5 seconds
   * const throttled = Schedule.max([
   *   Schedule.exponential("100 millis"),
   *   Schedule.spaced("5 seconds")
   * ])
   * ```
   */
  static max<const Schedules extends NonEmptyReadonlyArray<Schedule<any, any, any, any>>>(
    schedules: Schedules
  ): Schedule<
    Duration,
    UnionToIntersection<Schedule.Input<Schedules[number]>>,
    Schedule.Error<Schedules[number]>,
    Schedule.Env<Schedules[number]>
  > {
    return wrapDurationOutput(
      _Schedule.max(schedules.map((schedule) => schedule.schedule) as any) as _Schedule.Schedule<
        _Duration.Duration,
        any,
        any,
        any
      >
    ) as any;
  }

  /**
   * Combines schedules, recurring for as long as any component schedule
   * recurs, using the shortest delay. Outputs the delay as a fluent
   * `Duration`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Exponential growth capped at one minute between attempts
   * const capped = Schedule.min([
   *   Schedule.exponential("1 second"),
   *   Schedule.spaced("1 minute")
   * ])
   * ```
   */
  static min<const Schedules extends NonEmptyReadonlyArray<Schedule<any, any, any, any>>>(
    schedules: Schedules
  ): Schedule<
    Duration,
    UnionToIntersection<Schedule.Input<Schedules[number]>>,
    Schedule.Error<Schedules[number]>,
    Schedule.Env<Schedules[number]>
  > {
    return wrapDurationOutput(
      _Schedule.min(schedules.map((schedule) => schedule.schedule) as any) as _Schedule.Schedule<
        _Duration.Duration,
        any,
        any,
        any
      >
    ) as any;
  }

  private readonly _schedule: _Schedule.Schedule<Output, Input, Error, Env>;

  private constructor(schedule: _Schedule.Schedule<Output, Input, Error, Env>) {
    super();
    this._schedule = schedule;
  }

  /**
   * The underlying core `effect` `Schedule`. The inverse is `Schedule.wrap`.
   */
  get schedule(): _Schedule.Schedule<Output, Input, Error, Env> {
    return this._schedule;
  }

  toJSON(): unknown {
    return { _id: 'Schedule' };
  }

  // --- Delay combinators ---

  /**
   * Adds a delay on top of the schedule's own delay, computed from the step
   * metadata by an effectful function.
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * // Recur 5 times, waiting an extra 100ms per attempt on top of the
   * // schedule's own (zero) delay
   * const backoff = Schedule.recurs(5).addDelay(({ attempt }) =>
   *   Effect.succeed(attempt * 100)
   * )
   * ```
   */
  addDelay<Error2 = never, Env2 = never>(
    f: (metadata: Schedule.Metadata<Output, Input>) => Effect<Duration.Input, Error2, Env2>
  ): Schedule<Output, Input, Error | Error2, Env | Env2> {
    return new Schedule(_Schedule.addDelay(this._schedule, (metadata) => f(metadata).map(unwrapDurationInput).effect));
  }

  /**
   * Replaces the schedule's delay with one computed from the step metadata by
   * an effectful function.
   *
   * @example
   * ```ts
   * import { Duration, Effect, Schedule } from "effect-fluent"
   *
   * // Exponential backoff capped at 5 seconds
   * const capped = Schedule.exponential("100 millis").modifyDelay(({ duration }) =>
   *   Effect.succeed(Duration.wrap(duration).min(Duration.seconds(5)))
   * )
   * ```
   */
  modifyDelay<Error2 = never, Env2 = never>(
    f: (metadata: Schedule.Metadata<Output, Input>) => Effect<Duration.Input, Error2, Env2>
  ): Schedule<Output, Input, Error | Error2, Env | Env2> {
    return new Schedule(
      _Schedule.modifyDelay(this._schedule, (metadata) => f(metadata).map(unwrapDurationInput).effect)
    );
  }

  /**
   * This schedule with delays randomly adjusted between 80% and 120% of their
   * original size, preventing thundering-herd retries.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // 100ms±20%, 200ms±20%, 400ms±20%, ...
   * const backoff = Schedule.exponential("100 millis").jittered
   * ```
   */
  get jittered(): Schedule<Output, Input, Error, Env> {
    return new Schedule(_Schedule.jittered(this._schedule));
  }

  // --- Composition ---

  /**
   * Runs this schedule to completion, then switches to the other schedule.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Retry aggressively 3 times, then fall back to once a minute
   * const policy = Schedule.recurs(3).andThen(Schedule.spaced("1 minute"))
   * ```
   */
  andThen<Output2, Input2, Error2, Env2>(
    other: Schedule<Output2, Input2, Error2, Env2>
  ): Schedule<Output | Output2, Input & Input2, Error | Error2, Env | Env2> {
    return new Schedule(_Schedule.andThen(this._schedule, other._schedule));
  }

  /**
   * Runs this schedule to completion, then switches to the other schedule,
   * outputting a fluent `Result` that tracks which schedule produced the
   * output (`failure` for this schedule, `success` for the other).
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * const policy = Schedule.recurs(3).andThenResult(Schedule.spaced("1 minute"))
   * // Output is Result.fail(attempt) during the first phase and
   * // Result.succeed(attempt) once the spaced phase takes over, so consumers
   * // can tell which phase the schedule is in:
   * const phased = policy.map(({ output }) =>
   *   output.match({
   *     onFailure: (n) => `warming up (${n})`,
   *     onSuccess: (n) => `steady state (${n})`
   *   })
   * )
   * ```
   */
  andThenResult<Output2, Input2, Error2, Env2>(
    other: Schedule<Output2, Input2, Error2, Env2>
  ): Schedule<Result<Output2, Output>, Input & Input2, Error | Error2, Env | Env2> {
    return new Schedule(
      _Schedule.map(_Schedule.andThenResult(this._schedule, other._schedule), ({ output }) => Result.wrap(output))
    );
  }

  // --- Output & side effects ---

  /**
   * Transforms the schedule's output using the step metadata. The function
   * may return a plain value or a fluent `Effect`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Output a label instead of the attempt count
   * const labelled = Schedule.spaced("1 second").map(
   *   ({ attempt, elapsed }) => `attempt #${attempt} after ${elapsed}ms`
   * )
   * ```
   */
  map<Output2, Error2 = never, Env2 = never>(
    f: (metadata: Schedule.Metadata<Output, Input>) => Output2 | Effect<Output2, Error2, Env2>
  ): Schedule<Output2, Input, Error | Error2, Env | Env2> {
    return new Schedule(
      _Schedule.map(this._schedule, (metadata) => {
        const result = f(metadata);
        return Effect.is(result) ? (result.effect as any) : result;
      })
    );
  }

  /**
   * Runs a side effect on every step of the schedule without changing its
   * output.
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * const observed = Schedule.exponential("100 millis").tap(({ attempt, duration }) =>
   *   Effect.sync(() => console.log(`attempt ${attempt}, next delay ${duration}`))
   * )
   * ```
   */
  tap<X, Error2, Env2>(
    f: (metadata: Schedule.Metadata<Output, Input>) => Effect<X, Error2, Env2>
  ): Schedule<Output, Input, Error | Error2, Env | Env2> {
    return new Schedule(_Schedule.tap(this._schedule, (metadata) => f(metadata).effect));
  }

  /**
   * This schedule outputting its input unchanged instead of its own output.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // Same pacing as spaced, but outputs whatever value was fed in
   * // (e.g. the last success value when used with repeat)
   * const echo = Schedule.spaced("1 second").setInputType<string>().passthrough
   * ```
   */
  get passthrough(): Schedule<Input, Input, Error, Env> {
    return new Schedule(_Schedule.passthrough(this._schedule));
  }

  // --- Termination ---

  /**
   * Continues the schedule only while the predicate holds for the step
   * metadata. The predicate may return a boolean or a fluent `Effect`.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * const bounded = Schedule.forever.while(({ attempt }) => attempt <= 5)
   * ```
   */
  while<Error2 = never, Env2 = never>(
    predicate: (metadata: Schedule.Metadata<Output, Input>) => boolean | Effect<boolean, Error2, Env2>
  ): Schedule<Output, Input, Error | Error2, Env | Env2> {
    return new Schedule(
      _Schedule.while(this._schedule, (metadata) => {
        const result = predicate(metadata);
        return Effect.is(result) ? (result.effect as any) : result;
      })
    );
  }

  /**
   * Stops the schedule once the given total duration has elapsed and/or the
   * given number of attempts has been reached.
   *
   * @example
   * ```ts
   * import { Schedule } from "effect-fluent"
   *
   * // At most 5 retries, and never longer than 30 seconds in total
   * const bounded = Schedule.exponential("100 millis").upTo({
   *   times: 5,
   *   duration: "30 seconds"
   * })
   * ```
   */
  upTo(options: { readonly duration?: Duration.Input | undefined; readonly times?: number | undefined }): Schedule<
    Output,
    Input,
    Error,
    Env
  > {
    return new Schedule(
      _Schedule.upTo(this._schedule, {
        duration: options.duration !== undefined ? unwrapDurationInput(options.duration) : undefined,
        times: options.times
      })
    );
  }

  // --- Type-level ---

  /**
   * Restricts the schedule's input type. Purely a type-level operation.
   */
  setInputType<T extends Input>(): Schedule<Output, T, Error, Env> {
    return this as any;
  }

  // --- Low-level stepping ---

  /**
   * The schedule's low-level step function as a fluent `Effect`.
   */
  get toStep(): Effect<
    (now: number, input: Input) => Pull.Pull<[Output, _Duration.Duration], Error, Output, Env>,
    never,
    Env
  > {
    return Effect.wrap(_Schedule.toStep(this._schedule));
  }

  /**
   * The schedule's low-level step function, driven by input metadata, as a
   * fluent `Effect`.
   */
  get toStepWithMetadata(): Effect<
    (input: Input) => Pull.Pull<Schedule.Metadata<Output, Input>, Error, Output, Env>,
    never,
    Env
  > {
    return Effect.wrap(_Schedule.toStepWithMetadata(this._schedule));
  }

  /**
   * The schedule's step function with sleeping built in, as a fluent
   * `Effect`.
   */
  get toStepWithSleep(): Effect<(input: Input) => Pull.Pull<Output, Error, Output, Env>, never, Env> {
    return Effect.wrap(_Schedule.toStepWithSleep(this._schedule));
  }

  /**
   * Applies a core `Schedule` transformation and re-wraps the fluent
   * `Schedule`.
   */
  with<Output2, Input2, Error2, Env2>(
    f: (schedule: _Schedule.Schedule<Output, Input, Error, Env>) => _Schedule.Schedule<Output2, Input2, Error2, Env2>
  ): Schedule<Output2, Input2, Error2, Env2> {
    return new Schedule(f(this._schedule));
  }
}

export namespace Schedule {
  /** Metadata provided to schedule callbacks: timing, attempt, input/output. */
  export type Metadata<Output = unknown, Input = unknown> = _Schedule.Metadata<Output, Input>;
  /** Metadata about schedule input before the first output exists. */
  export type InputMetadata<Input = unknown> = _Schedule.InputMetadata<Input>;
  /** Extracts the input type of a fluent `Schedule`. */
  export type Input<S> = S extends Schedule<any, infer I, any, any> ? I : never;
  /** Extracts the output type of a fluent `Schedule`. */
  export type Output<S> = S extends Schedule<infer O, any, any, any> ? O : never;
  /** Extracts the error type of a fluent `Schedule`. */
  export type Error<S> = S extends Schedule<any, any, infer E, any> ? E : never;
  /** Extracts the environment type of a fluent `Schedule`. */
  export type Env<S> = S extends Schedule<any, any, any, infer R> ? R : never;
}
