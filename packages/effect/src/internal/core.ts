import { Array as Arr, Equal, Hash, Scheduler, Scope } from 'effect';
import type { NonEmptyReadonlyArray } from 'effect/Array';
import * as _Cause from 'effect/Cause';
import type * as Context from 'effect/Context';
import type * as Cron from 'effect/Cron';
import type * as DateTime from 'effect/DateTime';
import type * as _Duration from 'effect/Duration';
import * as _Effect from 'effect/Effect';
import * as _Exit from 'effect/Exit';
import * as _Fiber from 'effect/Fiber';
import { dual, identity, type LazyArg } from 'effect/Function';
import { NodeInspectSymbol } from 'effect/Inspectable';
import type { Severity } from 'effect/LogLevel';
import { Class as PipeableClass } from 'effect/Pipeable';
import { hasProperty, isFunction, isIterable } from 'effect/Predicate';
import type { Predicate, Refinement } from 'effect/Predicate';
import type * as Pull from 'effect/Pull';
import * as _Result from 'effect/Result';
import * as _Schedule from 'effect/Schedule';
import type {
  Concurrency,
  ExcludeReason,
  ExcludeTag,
  ExtractReason,
  ExtractTag,
  NarrowReason,
  OmitReason,
  ReasonOf,
  ReasonTags,
  Tags,
  UnionToIntersection,
  unassigned
} from 'effect/Types';
import { Duration } from '../Duration.js';
import { Inspectable } from '../Inspectable.js';
import { Option } from '../Option.js';
import { Result } from '../Result.js';

// This module co-locates the mutually-recursive fluent classes (Cause, Exit,
// Schedule, Effect) so the public modules can be cycle-free re-export facades,
// mirroring upstream effect's internal/core structure. Cross-references between
// these classes are same-module and safe in every load order.

// -----------------------------------------------------------------------------
// Cause
// -----------------------------------------------------------------------------

/**
 * Unique identifier used to brand fluent `Cause` instances.
 */
export const CauseTypeId: unique symbol = Symbol.for('~effect-fluent/Cause') as CauseTypeId;
/**
 * The type of the `CauseTypeId` brand symbol.
 */
export type CauseTypeId = typeof CauseTypeId;

/**
 * A fluent wrapper around effect's `Cause`, the complete story of why and how
 * an effect failed.
 *
 * A `Cause` holds a list of `Reason` values: typed failures (`Fail`), unexpected
 * defects (`Die`), and fiber interruptions (`Interrupt`). Reasons are core leaf
 * data and are exposed unwrapped.
 *
 * @example
 * ```ts
 * import { Cause } from "effect-fluent"
 *
 * const cause = Cause.fail("boom").combine(Cause.die(new Error("defect")))
 *
 * console.log(cause.hasFails) // true
 * console.log(cause.hasDies) // true
 * console.log(cause.findErrorOption) // Option.some("boom")
 * ```
 */
export class Cause<out E> extends Inspectable {
  readonly [CauseTypeId]: CauseTypeId = CauseTypeId;

  /**
   * Wraps a core `effect` `Cause` in the fluent API. The inverse is the
   * `cause` getter.
   */
  static wrap<E>(cause: _Cause.Cause<E>): Cause<E> {
    return new Cause(cause);
  }

  /**
   * Checks whether a value is a fluent `Cause`.
   *
   * Corresponds to upstream `isCause`, but refines to the fluent wrapper
   * rather than the core `effect` Cause.
   */
  static is(u: unknown): u is Cause<unknown> {
    return hasProperty(u, CauseTypeId);
  }

  /**
   * An empty `Cause` with no reasons.
   */
  static readonly empty: Cause<never> = new Cause(_Cause.empty);

  /**
   * Creates a `Cause` containing a single typed failure.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * const cause = Cause.fail("boom")
   * console.log(cause.hasFails) // true
   * ```
   */
  static fail<E>(error: E): Cause<E> {
    return new Cause(_Cause.fail(error));
  }

  /**
   * Creates a `Cause` containing a single unexpected defect.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * const cause = Cause.die(new Error("defect"))
   * console.log(cause.hasDies) // true
   * ```
   */
  static die(defect: unknown): Cause<never> {
    return new Cause(_Cause.die(defect));
  }

  /**
   * Creates a `Cause` containing a single interruption, optionally carrying
   * the interrupting fiber's ID.
   */
  static interrupt(fiberId?: number | undefined): Cause<never> {
    return new Cause(_Cause.interrupt(fiberId));
  }

  /**
   * Creates a `Cause` from an array of core `Reason` values.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * const cause = Cause.fromReasons([
   *   Cause.makeFailReason("boom"),
   *   Cause.makeDieReason(new Error("defect"))
   * ])
   * console.log(cause.reasons.length) // 2
   * ```
   */
  static fromReasons<E>(reasons: ReadonlyArray<_Cause.Reason<E>>): Cause<E> {
    return new Cause(_Cause.fromReasons(reasons));
  }

  /**
   * Creates a core `Fail` reason carrying a typed error.
   */
  static makeFailReason<E>(error: E): _Cause.Fail<E> {
    return _Cause.makeFailReason(error);
  }

  /**
   * Creates a core `Die` reason carrying an unexpected defect.
   */
  static makeDieReason(defect: unknown): _Cause.Die {
    return _Cause.makeDieReason(defect);
  }

  /**
   * Creates a core `Interrupt` reason, optionally carrying the interrupting
   * fiber's ID.
   */
  static makeInterruptReason(fiberId?: number | undefined): _Cause.Interrupt {
    return _Cause.makeInterruptReason(fiberId);
  }

  /**
   * Checks whether a value is a core `Reason`.
   */
  static isReason(u: unknown): u is _Cause.Reason<unknown> {
    return _Cause.isReason(u);
  }

  /**
   * Narrows a core `Reason` to `Fail`.
   */
  static isFailReason<E>(reason: _Cause.Reason<E>): reason is _Cause.Fail<E> {
    return _Cause.isFailReason(reason);
  }

  /**
   * Narrows a core `Reason` to `Die`.
   */
  static isDieReason<E>(reason: _Cause.Reason<E>): reason is _Cause.Die {
    return _Cause.isDieReason(reason);
  }

  /**
   * Narrows a core `Reason` to `Interrupt`.
   */
  static isInterruptReason<E>(reason: _Cause.Reason<E>): reason is _Cause.Interrupt {
    return _Cause.isInterruptReason(reason);
  }

  /**
   * Returns the annotations attached to a core `Reason`.
   */
  static reasonAnnotations<E>(reason: _Cause.Reason<E>): Context.Context<never> {
    return _Cause.reasonAnnotations(reason);
  }

  // --- Error classes & guards (re-exported core values) ---

  /** The core `NoSuchElementError` class. */
  static readonly NoSuchElementError = _Cause.NoSuchElementError;
  /** Checks whether a value is a `NoSuchElementError`. */
  static readonly isNoSuchElementError = _Cause.isNoSuchElementError;
  /** The core `TimeoutError` class. */
  static readonly TimeoutError = _Cause.TimeoutError;
  /** Checks whether a value is a `TimeoutError`. */
  static readonly isTimeoutError = _Cause.isTimeoutError;
  /** The core `IllegalArgumentError` class. */
  static readonly IllegalArgumentError = _Cause.IllegalArgumentError;
  /** Checks whether a value is an `IllegalArgumentError`. */
  static readonly isIllegalArgumentError = _Cause.isIllegalArgumentError;
  /** The core `ExceededCapacityError` class. */
  static readonly ExceededCapacityError = _Cause.ExceededCapacityError;
  /** Checks whether a value is an `ExceededCapacityError`. */
  static readonly isExceededCapacityError = _Cause.isExceededCapacityError;
  /** The core `AsyncFiberError` class. */
  static readonly AsyncFiberError = _Cause.AsyncFiberError;
  /** Checks whether a value is an `AsyncFiberError`. */
  static readonly isAsyncFiberError = _Cause.isAsyncFiberError;
  /** The core `UnknownError` class. */
  static readonly UnknownError = _Cause.UnknownError;
  /** Checks whether a value is an `UnknownError`. */
  static readonly isUnknownError = _Cause.isUnknownError;

  // --- Done (loop-control signal) ---

  /**
   * Creates a core `Done` signal carrying an optional value, used to break out
   * of loop combinators.
   */
  static readonly Done = _Cause.Done;
  /** Checks whether a value is a `Done` signal. */
  static readonly isDone = _Cause.isDone;

  /**
   * An `Effect` that fails with a `Done` signal carrying the given value.
   */
  static done<A = void>(value?: A): Effect<never, _Cause.Done<A>> {
    return Effect.wrap(_Cause.done(value));
  }

  private readonly _cause: _Cause.Cause<E>;

  private constructor(cause: _Cause.Cause<E>) {
    super();
    this._cause = cause;
  }

  /**
   * The underlying core `effect` `Cause`. The inverse is `Cause.wrap`.
   */
  get cause(): _Cause.Cause<E> {
    return this._cause;
  }

  /**
   * The core `Reason` values this `Cause` is made of.
   */
  get reasons(): ReadonlyArray<_Cause.Reason<E>> {
    return this._cause.reasons;
  }

  // --- Equal & Hash ---

  /**
   * Structural equality with other fluent Causes, delegated to the underlying
   * core Cause.
   */
  [Equal.symbol](that: unknown): boolean {
    return Cause.is(that) && Equal.equals(this._cause, that.cause);
  }

  /**
   * Structural hash consistent with `Equal.symbol`.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._cause);
  }

  /**
   * A plain-object representation of the `Cause` for inspection.
   */
  toJSON(): unknown {
    return (this._cause as any).toJSON?.() ?? { _id: 'Cause', reasons: this.reasons };
  }

  override toString(): string {
    return String(this._cause);
  }

  // --- Transformations ---

  /**
   * Transforms the typed errors inside the `Cause`, leaving defects and
   * interruptions untouched.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * const cause = Cause.fail("boom").map((e) => e.toUpperCase())
   * console.log(cause.findErrorOption) // Option.some("BOOM")
   * ```
   */
  map<E2>(f: (error: NoInfer<E>) => E2): Cause<E2> {
    return new Cause(_Cause.map(this._cause, f));
  }

  /**
   * Combines two `Cause`s into one containing the reasons of both.
   */
  combine<E2>(that: Cause<E2>): Cause<E | E2> {
    return new Cause(_Cause.combine(this._cause, that.cause));
  }

  /**
   * Squashes the `Cause` down to a single throwable value: the first typed
   * error, or the first defect, or an interruption error.
   */
  get squash(): unknown {
    return _Cause.squash(this._cause);
  }

  /**
   * Attaches annotations to every reason in the `Cause`.
   */
  annotate(annotations: Context.Context<never>, options?: { readonly overwrite?: boolean | undefined }): Cause<E> {
    return new Cause(_Cause.annotate(this._cause, annotations, options));
  }

  /**
   * The merged annotations of all reasons in the `Cause`.
   */
  get annotations(): Context.Context<never> {
    return _Cause.annotations(this._cause);
  }

  // --- Inspection ---

  /**
   * Whether the `Cause` contains any typed failures.
   */
  get hasFails(): boolean {
    return _Cause.hasFails(this._cause);
  }

  /**
   * Whether the `Cause` contains any unexpected defects.
   */
  get hasDies(): boolean {
    return _Cause.hasDies(this._cause);
  }

  /**
   * Whether the `Cause` contains any interruptions.
   */
  get hasInterrupts(): boolean {
    return _Cause.hasInterrupts(this._cause);
  }

  /**
   * Whether the `Cause` consists exclusively of interruptions (and is
   * non-empty).
   */
  get hasInterruptsOnly(): boolean {
    return _Cause.hasInterruptsOnly(this._cause);
  }

  /**
   * Finds the first `Fail` reason, or fails with the remaining `Cause`.
   */
  get findFail(): Result<_Cause.Fail<E>, Cause<never>> {
    return Result.wrap(_Cause.findFail(this._cause)).mapError(Cause.wrap);
  }

  /**
   * Finds the first typed error, or fails with the remaining `Cause`.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * console.log(Cause.fail("boom").findError.getOrNull) // "boom"
   * ```
   */
  get findError(): Result<E, Cause<never>> {
    return Result.wrap(_Cause.findError(this._cause)).mapError(Cause.wrap);
  }

  /**
   * The first typed error as a fluent `Option`.
   */
  get findErrorOption(): Option<E> {
    return Option.wrap(_Cause.findErrorOption(this._cause));
  }

  /**
   * Finds the first `Die` reason, or fails with the original `Cause`.
   */
  get findDie(): Result<_Cause.Die, Cause<E>> {
    return Result.wrap(_Cause.findDie(this._cause)).mapError(Cause.wrap);
  }

  /**
   * Finds the first defect value, or fails with the original `Cause`.
   */
  get findDefect(): Result<unknown, Cause<E>> {
    return Result.wrap(_Cause.findDefect(this._cause)).mapError(Cause.wrap);
  }

  /**
   * Finds the first `Interrupt` reason, or fails with the original `Cause`.
   */
  get findInterrupt(): Result<_Cause.Interrupt, Cause<E>> {
    return Result.wrap(_Cause.findInterrupt(this._cause)).mapError(Cause.wrap);
  }

  /**
   * The set of fiber IDs that interrupted this `Cause`.
   */
  get interruptors(): ReadonlySet<number> {
    return _Cause.interruptors(this._cause);
  }

  /**
   * The interruptor fiber IDs if any interrupts are present, or fails with the
   * original `Cause`.
   */
  get filterInterruptors(): Result<Set<number>, Cause<E>> {
    return Result.wrap(_Cause.filterInterruptors(this._cause)).mapError(Cause.wrap);
  }

  // --- Rendering ---

  /**
   * Renders the `Cause` as `Error` instances suitable for reporting.
   */
  prettyErrors(options?: { readonly includeCauseInStack?: boolean | undefined }): Array<Error> {
    return _Cause.prettyErrors(this._cause, options);
  }

  /**
   * Renders the `Cause` as a human-readable string.
   *
   * @example
   * ```ts
   * import { Cause } from "effect-fluent"
   *
   * console.log(Cause.fail("boom").pretty) // "Error: boom"
   * ```
   */
  get pretty(): string {
    return _Cause.pretty(this._cause);
  }

  /**
   * Applies a core `Cause` transformation and re-wraps the fluent `Cause`.
   */
  with<E2>(f: (cause: _Cause.Cause<E>) => _Cause.Cause<E2>): Cause<E2> {
    return new Cause(f(this._cause));
  }
}

export namespace Cause {
  /** Extracts the error type from a fluent `Cause`. */
  export type Error<T> = T extends Cause<infer E> ? E : never;
  /** A core reason a `Cause` failed: `Fail`, `Die`, or `Interrupt`. */
  export type Reason<E> = _Cause.Reason<E>;
  /** A typed, expected error produced by `Effect.fail`. */
  export type Fail<E> = _Cause.Fail<E>;
  /** An unexpected defect produced by `Effect.die` or thrown exceptions. */
  export type Die = _Cause.Die;
  /** A fiber interruption signal. */
  export type Interrupt = _Cause.Interrupt;
  /** Error raised when an expected element does not exist. */
  export type NoSuchElementError = _Cause.NoSuchElementError;
  /** Error raised when an operation times out. */
  export type TimeoutError = _Cause.TimeoutError;
  /** Error raised when an argument is invalid. */
  export type IllegalArgumentError = _Cause.IllegalArgumentError;
  /** Error raised when a capacity limit is exceeded. */
  export type ExceededCapacityError = _Cause.ExceededCapacityError;
  /** Error raised when synchronously running an async fiber. */
  export type AsyncFiberError = _Cause.AsyncFiberError;
  /** Error wrapping an unknown thrown value. */
  export type UnknownError = _Cause.UnknownError;
  /** Loop-control signal carrying an optional value. */
  export type Done<A = void> = _Cause.Done<A>;
}

// -----------------------------------------------------------------------------
// Exit
// -----------------------------------------------------------------------------

/**
 * Unique identifier used to brand fluent `Exit` instances.
 */
export const ExitTypeId: unique symbol = Symbol.for('~effect-fluent/Exit') as ExitTypeId;
/**
 * The type of the `ExitTypeId` brand symbol.
 */
export type ExitTypeId = typeof ExitTypeId;

/**
 * The result of running an `Effect`: either a `Success` carrying a value or a
 * `Failure` carrying a fluent `Cause`.
 *
 * Fluent Exits implement the core `Effect` interface so they can be yielded
 * directly inside `Effect.gen` (resuming with the value or failing with the
 * cause). For any other core usage, unbox explicitly with the `exit` getter.
 *
 * @example
 * ```ts
 * import { Effect, Exit } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const exit = yield* Effect.fail("boom").exit
 *   if (exit.isFailure()) {
 *     console.log(exit.cause.findErrorOption) // Option.some("boom")
 *   }
 * })
 * ```
 */
abstract class ExitBase<out A, out E> extends Inspectable implements _Effect.Effect<A, E> {
  private readonly _exit: _Exit.Exit<A, E>;
  abstract readonly _tag: 'Success' | 'Failure';
  readonly [ExitTypeId]: ExitTypeId = ExitTypeId;

  constructor(exit: _Exit.Exit<A, E>) {
    super();
    this._exit = exit;
  }

  // Brand for compatibility with `_Effect.Effect<A, E>` so fluent Exits are
  // yieldable wherever core effects are expected. Evaluation always happens on
  // the underlying `_exit` via `[Symbol.iterator]()` delegation below.
  get [_Effect.TypeId](): _Effect.Variance<A, E, never> {
    return (this._exit as any)[_Effect.TypeId];
  }

  /**
   * The underlying core `effect` `Exit`. The inverse is `Exit.wrap`.
   */
  get exit(): _Exit.Exit<A, E> {
    return this._exit;
  }

  // --- Equal & Hash ---

  /**
   * Structural equality with other fluent Exits, delegated to the underlying
   * core Exit.
   */
  [Equal.symbol](that: unknown): boolean {
    return exitIs(that) && Equal.equals(this._exit, that.exit);
  }

  /**
   * Structural hash consistent with `Equal.symbol`.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._exit);
  }

  // --- Generator interop ---

  /**
   * Makes fluent Exits yieldable with `yield*` inside `Effect.gen`.
   */
  [Symbol.iterator](): _Effect.EffectIterator<Exit<A, E>> {
    return this._exit[Symbol.iterator]() as any;
  }

  /**
   * A plain-object representation of the `Exit` for inspection.
   */
  toJSON(): unknown {
    return (this._exit as any).toJSON?.() ?? { _id: 'Exit', _tag: this._tag };
  }

  override toString(): string {
    return String(this._exit);
  }

  // --- Type guards ---

  /**
   * Narrows to `Success`.
   */
  isSuccess(): this is ExitSuccess<A, E> {
    return _Exit.isSuccess(this._exit);
  }

  /**
   * Narrows to `Failure`.
   */
  isFailure(): this is ExitFailure<A, E> {
    return _Exit.isFailure(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains typed failures.
   */
  hasFails(): this is ExitFailure<A, E> {
    return _Exit.hasFails(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains defects.
   */
  hasDies(): this is ExitFailure<A, E> {
    return _Exit.hasDies(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains interruptions.
   */
  hasInterrupts(): this is ExitFailure<A, E> {
    return _Exit.hasInterrupts(this._exit);
  }

  // --- Pattern matching ---

  /**
   * Handles both outcomes: `onSuccess` receives the value, `onFailure`
   * receives the fluent `Cause`.
   *
   * @example
   * ```ts
   * import { Exit } from "effect-fluent"
   *
   * const message = Exit.succeed(42).match({
   *   onSuccess: (value) => `succeeded with ${value}`,
   *   onFailure: (cause) => `failed with ${cause.pretty}`
   * })
   * console.log(message) // "succeeded with 42"
   * ```
   */
  match<X1, X2>(options: {
    readonly onSuccess: (a: NoInfer<A>) => X1;
    readonly onFailure: (cause: Cause<NoInfer<E>>) => X2;
  }): X1 | X2 {
    return _Exit.match(this._exit, {
      onSuccess: options.onSuccess,
      onFailure: (cause) => options.onFailure(Cause.wrap(cause))
    });
  }

  // --- Mapping ---

  /**
   * Transforms the success value.
   */
  map<B>(f: (a: A) => B): Exit<B, E> {
    return exitWrap(_Exit.map(this._exit, f));
  }

  /**
   * Transforms the typed error.
   */
  mapError<E2>(f: (e: E) => E2): Exit<A, E2> {
    return exitWrap(_Exit.mapError(this._exit, f));
  }

  /**
   * Transforms both the success value and the typed error.
   */
  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Exit<A2, E2> {
    return exitWrap(_Exit.mapBoth(this._exit, options));
  }

  /**
   * Discards the success value.
   */
  get asVoid(): Exit<void, E> {
    return exitWrap(_Exit.asVoid(this._exit));
  }

  // --- Filters ---

  /**
   * Succeeds with the `Success` exit, or fails with the `Failure` exit.
   */
  get filterSuccess(): Result<Exit.Success<A>, Exit.Failure<never, E>> {
    return Result.wrap(_Exit.filterSuccess(this._exit)).mapBoth({
      onSuccess: (success) => exitWrap(success) as Exit.Success<A>,
      onFailure: (failure) => exitWrap(failure) as Exit.Failure<never, E>
    });
  }

  /**
   * Succeeds with the success value, or fails with the `Failure` exit.
   */
  get filterValue(): Result<A, Exit.Failure<never, E>> {
    return Result.wrap(_Exit.filterValue(this._exit)).mapError((failure) => exitWrap(failure) as Exit.Failure<never, E>);
  }

  /**
   * Succeeds with the `Failure` exit, or fails with the `Success` exit.
   */
  get filterFailure(): Result<Exit.Failure<never, E>, Exit.Success<A>> {
    return Result.wrap(_Exit.filterFailure(this._exit)).mapBoth({
      onSuccess: (failure) => exitWrap(failure) as Exit.Failure<never, E>,
      onFailure: (success) => exitWrap(success) as Exit.Success<A>
    });
  }

  /**
   * Succeeds with the fluent `Cause`, or fails with the `Success` exit.
   */
  get filterCause(): Result<Cause<E>, Exit.Success<A>> {
    return Result.wrap(_Exit.filterCause(this._exit)).mapBoth({
      onSuccess: Cause.wrap,
      onFailure: (success) => exitWrap(success) as Exit.Success<A>
    });
  }

  /**
   * Succeeds with the first typed error, or fails with the original `Exit`.
   */
  get findError(): Result<E, Exit<A, E>> {
    return Result.wrap(_Exit.findError(this._exit)).mapError(exitWrap);
  }

  /**
   * Succeeds with the first defect, or fails with the original `Exit`.
   */
  get findDefect(): Result<unknown, Exit<A, E>> {
    return Result.wrap(_Exit.findDefect(this._exit)).mapError(exitWrap);
  }

  // --- Getters ---

  /**
   * The success value as a fluent `Option`.
   */
  get getSuccess(): Option<A> {
    return Option.wrap(_Exit.getSuccess(this._exit));
  }

  /**
   * The failure's fluent `Cause` as a fluent `Option`.
   */
  get getCause(): Option<Cause<E>> {
    return Option.wrap(_Exit.getCause(this._exit)).map(Cause.wrap);
  }

  /**
   * The first typed error as a fluent `Option`.
   */
  get findErrorOption(): Option<E> {
    return Option.wrap(_Exit.findErrorOption(this._exit));
  }

  /**
   * Applies a core `Exit` transformation and re-wraps the fluent `Exit`.
   */
  with<B, E2>(f: (exit: _Exit.Exit<A, E>) => _Exit.Exit<B, E2>): Exit<B, E2> {
    return exitWrap(f(this._exit));
  }
}

// --- Success and Failure classes ---

class ExitSuccess<out A, out E = never> extends ExitBase<A, E> {
  readonly _tag = 'Success' as const;
  /** The success value. */
  readonly value: A;

  constructor(exit: _Exit.Success<A, E>) {
    super(exit);
    this.value = exit.value;
  }
}

class ExitFailure<out A, out E> extends ExitBase<A, E> {
  readonly _tag = 'Failure' as const;
  /** The fluent `Cause` describing why the effect failed. */
  readonly cause: Cause<E>;

  constructor(exit: _Exit.Failure<A, E>) {
    super(exit);
    this.cause = Cause.wrap(exit.cause);
  }
}

// --- Public type alias ---

/**
 * The outcome of running an `Effect`: a `Success` carrying the value or a
 * `Failure` carrying the fluent `Cause`.
 */
export type Exit<A, E = never> = ExitSuccess<A, E> | ExitFailure<A, E>;

export namespace Exit {
  /** A successful `Exit` carrying the value. */
  export type Success<A, E = never> = ExitSuccess<A, E>;
  /** A failed `Exit` carrying the fluent `Cause`. */
  export type Failure<A, E> = ExitFailure<A, E>;
}

// --- Static functions ---

/**
 * Wraps a core `effect` `Exit` in the fluent API. The inverse is the `exit`
 * getter.
 */
const exitWrap = <A, E>(exit: _Exit.Exit<A, E>): Exit<A, E> => {
  return _Exit.isSuccess(exit) ? new ExitSuccess(exit) : new ExitFailure(exit);
};

/**
 * Checks whether a value is a fluent `Exit`. Corresponds to upstream
 * `isExit`, but refines to the fluent wrapper rather than the core `effect`
 * Exit.
 */
const exitIs = (u: unknown): u is Exit<unknown, unknown> => hasProperty(u, ExitTypeId);

/**
 * Creates an `Exit` that succeeded with the given value.
 */
const exitSucceed = <A>(value: A): Exit<A> => exitWrap(_Exit.succeed(value));

/**
 * Creates an `Exit` that failed with the given typed error.
 */
const exitFail = <E>(error: E): Exit<never, E> => exitWrap(_Exit.fail(error));

/**
 * Creates an `Exit` that failed with the given fluent `Cause`.
 */
const exitFailCause = <E>(cause: Cause<E>): Exit<never, E> => exitWrap(_Exit.failCause(cause.cause));

/**
 * Creates an `Exit` that died with the given defect.
 */
const exitDie = (defect: unknown): Exit<never> => exitWrap(_Exit.die(defect));

/**
 * Creates an `Exit` that was interrupted, optionally by the given fiber.
 */
const exitInterrupt = (fiberId?: number | undefined): Exit<never> => exitWrap(_Exit.interrupt(fiberId));

/**
 * An `Exit` that succeeded with `undefined`.
 */
const exitVoid: Exit<void> = exitWrap(_Exit.void);

/**
 * Discards the values of an iterable of `Exit`s, failing with the first
 * failure if any.
 */
const exitAsVoidAll = <I extends Iterable<Exit<any, any>>>(
  exits: I
): Exit<void, I extends Iterable<Exit<infer _A, infer _E>> ? _E : never> => {
  return exitWrap(_Exit.asVoidAll(Array.from(exits, (exit) => exit.exit))) as any;
};

/**
 * Static constructors and helpers for the fluent `Exit`.
 */
export const Exit = {
  succeed: exitSucceed,
  fail: exitFail,
  failCause: exitFailCause,
  die: exitDie,
  interrupt: exitInterrupt,
  void: exitVoid,
  wrap: exitWrap,
  is: exitIs,
  asVoidAll: exitAsVoidAll
} as const;


// -----------------------------------------------------------------------------
// Fiber
// -----------------------------------------------------------------------------

/**
 * Unique identifier used to brand fluent `Fiber` instances.
 */
export const FiberTypeId: unique symbol = Symbol.for('~effect-fluent/Fiber') as FiberTypeId;
/**
 * The type of the `FiberTypeId` brand symbol.
 */
export type FiberTypeId = typeof FiberTypeId;

/**
 * A fluent wrapper around effect's `Fiber`, a handle to a running computation
 * obtained from the `fork*` family of Effect methods.
 *
 * The Effect-returning operations (`await`, `join`, `interrupt`) yield fluent
 * values; low-level runtime internals (schedulers, context, log levels) remain
 * reachable through the underlying core fiber via the `fiber` getter.
 *
 * @example
 * ```ts
 * import { Effect } from "effect-fluent"
 *
 * const program = Effect.gen(function* () {
 *   const fiber = yield* Effect.succeed(42).forkChild()
 *   const value = yield* fiber.join
 *   console.log(value) // 42
 * })
 * ```
 */
export class Fiber<out A, out E = never> extends Inspectable {
  readonly [FiberTypeId]: FiberTypeId = FiberTypeId;

  /**
   * Wraps a core `effect` `Fiber` in the fluent API. The inverse is the
   * `fiber` getter.
   */
  static wrap<A, E>(fiber: _Fiber.Fiber<A, E>): Fiber<A, E> {
    return new Fiber(fiber);
  }

  /**
   * Checks whether a value is a fluent `Fiber`.
   *
   * Corresponds to upstream `isFiber`, but refines to the fluent wrapper
   * rather than the core `effect` Fiber.
   */
  static is(u: unknown): u is Fiber<any, any> {
    return hasProperty(u, FiberTypeId);
  }

  /**
   * The fiber currently executing, if any, as a fluent `Fiber`.
   */
  static getCurrent(): Fiber<any, any> | undefined {
    const current = _Fiber.getCurrent();
    return current === undefined ? undefined : new Fiber(current);
  }

  /**
   * Awaits all the given fibers, succeeding with their outcomes as fluent
   * `Exit`s once every fiber has completed.
   *
   * @example
   * ```ts
   * import { Effect, Fiber } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const a = yield* Effect.succeed(1).forkChild()
   *   const b = yield* Effect.fail("boom").forkChild()
   *   const exits = yield* Fiber.awaitAll([a, b])
   *   console.log(exits.map((exit) => exit.isSuccess())) // [true, false]
   * })
   * ```
   */
  static awaitAll<F extends Fiber<any, any>>(
    fibers: Iterable<F>
  ): Effect<Array<Exit<Fiber.Success<F>, Fiber.Error<F>>>> {
    return Effect.wrap(_Fiber.awaitAll(Array.from(fibers, (fiber) => fiber._fiber))).map((exits) =>
      exits.map((exit) => Exit.wrap(exit) as Exit<Fiber.Success<F>, Fiber.Error<F>>)
    );
  }

  /**
   * Joins all the given fibers, succeeding with their values or failing with
   * the first failure.
   */
  static joinAll<F extends Fiber<any, any>>(fibers: Iterable<F>): Effect<Array<Fiber.Success<F>>, Fiber.Error<F>> {
    return Effect.wrap(_Fiber.joinAll(Array.from(fibers, (fiber) => fiber._fiber))) as Effect<
      Array<Fiber.Success<F>>,
      Fiber.Error<F>
    >;
  }

  /**
   * Interrupts all the given fibers and awaits their termination.
   */
  static interruptAll(fibers: Iterable<Fiber<any, any>>): Effect<void> {
    return Effect.wrap(_Fiber.interruptAll(Array.from(fibers, (fiber) => fiber._fiber)));
  }

  /**
   * Interrupts all the given fibers as the specified interrupting fiber ID and
   * awaits their termination.
   */
  static interruptAllAs(fibers: Iterable<Fiber<any, any>>, fiberId: number): Effect<void> {
    return Effect.wrap(_Fiber.interruptAllAs(Array.from(fibers, (fiber) => fiber._fiber), fiberId));
  }

  private readonly _fiber: _Fiber.Fiber<A, E>;

  private constructor(fiber: _Fiber.Fiber<A, E>) {
    super();
    this._fiber = fiber;
  }

  /**
   * The underlying core `effect` `Fiber`, exposing the low-level runtime
   * surface (context, schedulers, log levels). The inverse is `Fiber.wrap`.
   */
  get fiber(): _Fiber.Fiber<A, E> {
    return this._fiber;
  }

  /**
   * The fiber's numeric ID.
   */
  get id(): number {
    return this._fiber.id;
  }

  /**
   * A plain-object representation of the `Fiber` for inspection.
   */
  toJSON(): unknown {
    return { _id: 'Fiber', id: this._fiber.id };
  }

  /**
   * Awaits the fiber's completion, succeeding with its outcome as a fluent
   * `Exit`. Never fails; interruption of the awaited fiber is captured in the
   * Exit.
   */
  get await(): Effect<Exit<A, E>> {
    return Effect.wrap(_Fiber.await(this._fiber)).map(Exit.wrap);
  }

  /**
   * Awaits the fiber's completion and succeeds with its value, propagating
   * the fiber's failure cause if it failed.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const fiber = yield* Effect.succeed(42).forkChild()
   *   console.log(yield* fiber.join) // 42
   * })
   * ```
   */
  get join(): Effect<A, E> {
    return Effect.wrap(_Fiber.join(this._fiber));
  }

  /**
   * Interrupts the fiber and awaits its termination.
   */
  get interrupt(): Effect<void> {
    return Effect.wrap(_Fiber.interrupt(this._fiber));
  }

  /**
   * Interrupts the fiber as the specified interrupting fiber ID and awaits
   * its termination.
   */
  interruptAs(fiberId: number | undefined, annotations?: Context.Context<never> | undefined): Effect<void> {
    return Effect.wrap(_Fiber.interruptAs(this._fiber, fiberId, annotations));
  }

  /**
   * Interrupts the fiber without waiting for it to terminate.
   */
  interruptUnsafe(fiberId?: number | undefined, annotations?: Context.Context<never> | undefined): void {
    this._fiber.interruptUnsafe(fiberId, annotations);
  }

  /**
   * The fiber's outcome as a fluent `Exit` if it has completed, or
   * `undefined` while it is still running.
   */
  get pollUnsafe(): Exit<A, E> | undefined {
    const exit = this._fiber.pollUnsafe();
    return exit === undefined ? undefined : Exit.wrap(exit);
  }

  /**
   * Registers a callback invoked with the fiber's fluent `Exit` when it
   * completes. Returns a function that unregisters the callback.
   */
  addObserver(callback: (exit: Exit<A, E>) => void): () => void {
    return this._fiber.addObserver((exit) => callback(Exit.wrap(exit)));
  }

  /**
   * Binds the fiber's lifetime to the given scope: closing the scope
   * interrupts the fiber. Returns the same fluent `Fiber`.
   */
  runIn(scope: Scope.Scope): Fiber<A, E> {
    const next = _Fiber.runIn(this._fiber, scope);
    return next === this._fiber ? this : new Fiber(next);
  }

  /**
   * Applies a core `Fiber` transformation and re-wraps the fluent `Fiber`.
   */
  with<A2, E2>(f: (fiber: _Fiber.Fiber<A, E>) => _Fiber.Fiber<A2, E2>): Fiber<A2, E2> {
    return new Fiber(f(this._fiber));
  }
}

export namespace Fiber {
  /** Extracts the success type of a fluent `Fiber`. */
  export type Success<F> = F extends Fiber<infer A, any> ? A : never;
  /** Extracts the error type of a fluent `Fiber`. */
  export type Error<F> = F extends Fiber<any, infer E> ? E : never;
}

// -----------------------------------------------------------------------------
// Schedule
// -----------------------------------------------------------------------------

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
  static is(u: unknown): u is Schedule<any, any, any, any> {
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

// -----------------------------------------------------------------------------
// Effect
// -----------------------------------------------------------------------------

/**
 * Unique identifier used to brand fluent `Effect` instances.
 */
export const EffectTypeId: unique symbol = Symbol.for('~effect-fluent/Effect') as EffectTypeId;
/**
 * The type of {@link EffectTypeId}.
 */
export type EffectTypeId = typeof EffectTypeId;

/**
 * A fluent, class-based wrapper around Effect's `Effect` data type.
 *
 * An `Effect<A, E, R>` is an immutable, lazy description of a workflow that may
 * succeed with a value of type `A`, fail with an error of type `E`, and require
 * services of type `R`. Combinators are exposed as chainable methods and
 * getters instead of standalone functions.
 *
 * Fluent Effects implement the core `Effect` interface so they can be yielded
 * with `yield*` inside both core and fluent `Effect.gen`, and they execute
 * directly through the fluent `run*` methods ({@link Effect.runSync | runSync},
 * {@link Effect.runPromise | runPromise}, {@link Effect.runFork | runFork},
 * and friends). For passing to core combinators, unbox explicitly first: use
 * the {@link Effect.effect | effect} getter to get the underlying core Effect,
 * {@link Effect.wrap | wrap} to lift a core Effect into the fluent class, and
 * {@link Effect.with | with} to apply a core transformation while staying
 * fluent.
 *
 * @example
 * ```ts
 * import { Effect } from "effect-fluent"
 *
 * const program = Effect.succeed(1)
 *   .map((n) => n + 1)
 *   .flatMap((n) => Effect.succeed(n * 10))
 *   .tap((n) => Effect.sync(() => console.log(n))) // logs 20
 *
 * const doubled = Effect.gen(function* () {
 *   const n = yield* program
 *   return n * 2 // 40
 * })
 * ```
 */
export class Effect<A, E = never, R = never> extends PipeableClass implements _Effect.Effect<A, E, R> {
  /**
   * Brand identifying fluent `Effect` instances; used by {@link Effect.is | is}.
   */
  readonly [EffectTypeId]: EffectTypeId = EffectTypeId;

  // Brand for compatibility with `_Effect.Effect<A, E, R>` so fluent values are
  // assignable wherever core effects are expected (notably `yield*` inside
  // `_Effect.gen`). The actual fiber-level evaluation always happens on the
  // inner `_effect` via `[Symbol.iterator]()` delegation below.
  get [_Effect.TypeId](): _Effect.Variance<A, E, R> {
    return (this._effect as any)[_Effect.TypeId];
  }

  /**
   * Type guard that checks whether a value is a fluent `Effect`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * console.log(Effect.is(Effect.succeed(1))) // true
   * console.log(Effect.is({ value: 1 })) // false
   * ```
   */
  static is(u: unknown): u is Effect<unknown, unknown, unknown> {
    return hasProperty(u, EffectTypeId);
  }

  /**
   * Wraps a core `Effect` in the fluent class, enabling method chaining.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.wrap(CoreEffect.succeed(1)).map((n) => n + 1)
   * // yields 2
   * ```
   */
  static wrap<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  /**
   * Creates an `Effect` that always succeeds with the given value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(42).map((n) => n + 1)
   * // yields 43
   * ```
   */
  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  /**
   * Creates an `Effect` from a synchronous side-effectful computation. The
   * thunk is evaluated lazily each time the effect runs and must not throw — a
   * thrown value becomes a defect. Use {@link Effect.try | try} when throwing
   * is expected.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const log = (message: string) => Effect.sync(() => console.log(message))
   *
   * const program = log("Hello, World!") // Effect<void>
   * ```
   */
  static sync<A>(thunk: LazyArg<A>): Effect<A> {
    return new Effect(_Effect.sync(thunk));
  }

  /**
   * Creates an `Effect` lazily, delaying construction until it is run. Useful
   * for recursive definitions, deferring expensive construction, and unifying
   * branches that build different effects.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const countdown = (n: number): Effect<number> =>
   *   n <= 0 ? Effect.succeed(0) : Effect.suspend(() => countdown(n - 1)).map((sum) => sum + n)
   *
   * const program = countdown(3) // yields 6
   * ```
   */
  static suspend<A, E, R>(thunk: LazyArg<Effect<A, E, R>>): Effect<A, E, R> {
    return new Effect(_Effect.suspend(() => thunk().effect));
  }

  /**
   * Creates an `Effect` that fails with the given recoverable error. The error
   * propagates through the error channel until it is handled.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const validate = (age: number) =>
   *   age >= 18 ? Effect.succeed(age) : Effect.fail(new Error("Too young"))
   *
   * // validate(17) fails with Error("Too young")
   * ```
   */
  static fail<E>(error: E): Effect<never, E> {
    return new Effect(_Effect.fail(error));
  }

  /**
   * Creates an `Effect` that fails with a lazily evaluated error. The
   * error-producing function is evaluated each time the effect runs.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.failSync(() => new Error(`Failed at ${Date.now()}`))
   * ```
   */
  static failSync<E>(evaluate: LazyArg<E>): Effect<never, E> {
    return new Effect(_Effect.failSync(evaluate));
  }

  /**
   * Creates an `Effect` that fails with the given `Cause`, preserving defects,
   * interruptions, and combined failures.
   *
   * @example
   * ```ts
   * import { Cause, Effect } from "effect-fluent"
   *
   * const program = Effect.failCause(Cause.fail("Something went wrong"))
   * ```
   */
  static failCause<E>(cause: Cause<E>): Effect<never, E> {
    return new Effect(_Effect.failCause(cause.cause));
  }

  /**
   * Creates an `Effect` that fails with a lazily computed `Cause`. The
   * cause-producing function is evaluated each time the effect runs.
   *
   * @example
   * ```ts
   * import { Cause, Effect } from "effect-fluent"
   *
   * const program = Effect.failCauseSync(() => Cause.die(new Error("Boom")))
   * ```
   */
  static failCauseSync<E>(evaluate: LazyArg<Cause<E>>): Effect<never, E> {
    return new Effect(_Effect.failCauseSync(() => evaluate().cause));
  }

  /**
   * Creates an `Effect` that dies with the given defect — a critical,
   * unexpected error that is not represented in the error channel and
   * terminates the fiber.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0 ? Effect.die(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
   *
   * // divide(1, 0) terminates with a defect
   * ```
   */
  static die(defect: unknown): Effect<never> {
    return new Effect(_Effect.die(defect));
  }

  /**
   * Creates an `Effect` that succeeds with `void`. Useful as a no-op or as a
   * neutral completion value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.void() // Effect<void>
   * ```
   */
  static void(): Effect<void> {
    return new Effect(_Effect.void);
  }

  /**
   * Creates an `Effect` from a synchronous computation that may throw. A thrown
   * value is passed to `catch` and surfaces as a typed failure.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const parse = (json: string) =>
   *   Effect.try({
   *     try: () => JSON.parse(json),
   *     catch: (error) => new Error(`Failed to parse JSON: ${error}`)
   *   })
   * ```
   */
  static try<A, E>(options: { try: LazyArg<A>; catch: (error: unknown) => E }): Effect<A, E> {
    return new Effect(_Effect.try(options));
  }

  /**
   * Creates an `Effect` from an asynchronous computation that is guaranteed to
   * succeed. A rejected promise becomes a defect — use
   * {@link Effect.tryPromise | tryPromise} when rejection is expected. The
   * provided `AbortSignal` is aborted if the effect is interrupted.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const delay = (ms: number) =>
   *   Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
   * ```
   */
  static promise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A> {
    return new Effect(_Effect.promise(evaluate));
  }

  /**
   * Creates an `Effect` from an asynchronous computation that may throw or
   * reject. Pass `{ try, catch }` to map failures to a typed error, or pass the
   * thunk directly to map them to `UnknownError`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const fetchTodo = (id: number) =>
   *   Effect.tryPromise({
   *     try: (signal) => fetch(`/todos/${id}`, { signal }),
   *     catch: (error) => new Error(`Request failed: ${error}`)
   *   })
   * ```
   */
  static tryPromise<A, E = Cause.UnknownError>(
    options:
      | { readonly try: (signal: AbortSignal) => PromiseLike<A>; readonly catch: (error: unknown) => E }
      | ((signal: AbortSignal) => PromiseLike<A>)
  ): Effect<A, E> {
    return new Effect(_Effect.tryPromise(options));
  }

  /**
   * Creates an `Effect` from a callback-based asynchronous API. Call `resume`
   * at most once with the effect that completes the fiber; optionally return a
   * cleanup effect to run on interruption.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const delay = (ms: number) =>
   *   Effect.callback<void>((resume) => {
   *     const timer = setTimeout(() => resume(Effect.void()), ms)
   *     return Effect.sync(() => clearTimeout(timer))
   *   })
   * ```
   */
  static callback<A, E = never, R = never>(
    register: (
      this: Scheduler.Scheduler,
      resume: (effect: Effect<A, E, R>) => void,
      signal: AbortSignal
    ) => void | Effect<void, never, R>
  ): Effect<A, E, R> {
    return new Effect(
      _Effect.callback(function (this: Scheduler.Scheduler, resume, signal) {
        const result = register.call(this, (effect) => resume(effect.effect), signal);
        if (result !== undefined) {
          return result.effect;
        }
      })
    );
  }

  /**
   * Converts a fluent `Option` into an `Effect`. A `Some` becomes a success
   * with the contained value and a `None` becomes a failure with
   * `NoSuchElementError`.
   *
   * @example
   * ```ts
   * import { Effect, Option } from "effect-fluent"
   *
   * const found = Effect.fromOption(Option.some(1)) // succeeds with 1
   * const missing = Effect.fromOption(Option.none()) // fails with NoSuchElementError
   * ```
   */
  static fromOption<A>(option: Option<A>): Effect<A, Cause.NoSuchElementError> {
    return new Effect(_Effect.fromOption(option.option));
  }

  /**
   * Converts a fluent `Result` into an `Effect`. A `Success` becomes a success
   * and a `Failure` becomes a typed failure.
   *
   * @example
   * ```ts
   * import { Effect, Result } from "effect-fluent"
   *
   * const ok = Effect.fromResult(Result.succeed(1)) // succeeds with 1
   * const bad = Effect.fromResult(Result.fail("Boom")) // fails with "Boom"
   * ```
   */
  static fromResult<A, E>(result: Result<A, E>): Effect<A, E> {
    return new Effect(_Effect.fromResult(result.result));
  }

  /**
   * Writes effectful code with generator functions, so workflows read like
   * synchronous code while errors and requirements stay in the Effect type.
   * Both fluent and core Effects can be yielded with `yield*`; lift an `Option`
   * or `Result` explicitly via {@link Effect.fromOption | fromOption} /
   * {@link Effect.fromResult | fromResult}.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const a = yield* Effect.succeed(10)
   *   const b = yield* Effect.succeed(2)
   *   return a / b
   * }) // yields 5
   * ```
   */
  static gen<Eff extends Gen.Yieldable<any, any, any>, AEff>(
    f: () => Generator<Eff, AEff, never>
  ): Effect<AEff, Gen.YieldError<Eff>, Gen.YieldServices<Eff>>;
  static gen<Self, Eff extends Gen.Yieldable<any, any, any>, AEff>(
    self: Self,
    f: (this: Self) => Generator<Eff, AEff, never>
  ): Effect<AEff, Gen.YieldError<Eff>, Gen.YieldServices<Eff>>;
  static gen(...args: [any] | [any, any]) {
    const [f, self] = args.length === 1 ? [args[0], undefined] : [args[1], args[0]];
    return new Effect(
      _Effect.gen(function* () {
        const generator = self !== undefined ? f.call(self) : f();
        let result = generator.next();
        while (!result.done) {
          const nextValue = yield* result.value;
          result = generator.next(nextValue);
        }
        return result.value;
      })
    );
  }

  /**
   * Runs an effect with a scope that closes when the effect completes, running
   * finalizers for resources acquired within it on success, failure, or
   * interruption.
   *
   * @example
   * ```ts
   * import type { Scope } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * declare const workflow: Effect<string, never, Scope.Scope>
   *
   * const program = Effect.scoped(workflow) // Effect<string>
   * ```
   */
  static scoped<A, E, R>(self: Effect<A, E, R>): Effect<A, E, Exclude<R, Scope.Scope>> {
    return new Effect(_Effect.scoped(self.effect));
  }

  /**
   * An `Effect` that never produces a value and never terminates on its own —
   * only interruption can end it.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.never // Effect<never> — suspends forever
   * ```
   */
  static get never(): Effect<never> {
    return new Effect(_Effect.never);
  }

  /**
   * An `Effect` that succeeds with `Option.none()`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeedNone // yields Option.none()
   * ```
   */
  static get succeedNone(): Effect<Option<never>> {
    return Effect.succeed(Option.none());
  }

  /**
   * Creates an `Effect` that succeeds with the value wrapped in `Option.some`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeedSome(42) // yields Option.some(42)
   * ```
   */
  static succeedSome<A>(value: A): Effect<Option<A>> {
    return Effect.succeed(Option.some(value));
  }

  /**
   * Creates an `Effect` that suspends the current fiber for the given duration
   * without blocking the JavaScript thread.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.sleep(1000).andThen(Effect.succeed("done"))
   * // yields "done" after one second
   * ```
   */
  static sleep(duration: Duration.Input): Effect<void> {
    return new Effect(_Effect.sleep(Duration.is(duration) ? duration.duration : duration));
  }

  /**
   * An `Effect` that yields control back to the runtime, allowing other fibers
   * to execute before continuing.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.yieldNow.andThen(Effect.succeed("resumed"))
   * ```
   */
  static get yieldNow(): Effect<void> {
    return new Effect(_Effect.yieldNow);
  }

  /**
   * An `Effect` that interrupts the current fiber immediately.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   yield* Effect.succeed("before")
   *   yield* Effect.interrupt
   *   // unreachable
   * })
   * ```
   */
  static get interrupt(): Effect<never> {
    return new Effect(_Effect.interrupt);
  }

  /**
   * An `Effect` that succeeds with the fluent `Fiber` currently executing it.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const fiber = yield* Effect.fiber
   *   console.log(fiber.id)
   * })
   * ```
   */
  static get fiber(): Effect<Fiber<unknown, unknown>> {
    return new Effect(_Effect.fiber).map(Fiber.wrap);
  }

  /**
   * An `Effect` that succeeds with the ID of the fiber currently executing it.
   */
  static get fiberId(): Effect<number> {
    return new Effect(_Effect.fiberId);
  }

  /**
   * Creates an `Effect` from a function receiving the executing fluent
   * `Fiber` — a low-level constructor for fiber-aware effects.
   */
  static withFiber<A, E = never, R = never>(evaluate: (fiber: Fiber<unknown, unknown>) => Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(_Effect.withFiber((fiber) => evaluate(Fiber.wrap(fiber)).effect));
  }

  /**
   * Combines multiple effects into one. Accepts a tuple, iterable, or struct of
   * effects and collects their results in the same shape. Options control
   * `concurrency`, discarding results (`discard`), and collecting failures as
   * `Result`s instead of short-circuiting (`mode: "result"`).
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const tuple = Effect.all([Effect.succeed(42), Effect.succeed("hello")])
   * // yields [42, "hello"]
   *
   * const struct = Effect.all({ a: Effect.succeed(1), b: Effect.succeed(2) })
   * // yields { a: 1, b: 2 }
   * ```
   *
   * @see {@link Effect.forEach | forEach} for iterating over elements with an effectful function.
   */
  static all<
    const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>,
    O extends {
      readonly concurrency?: Concurrency | undefined;
      readonly discard?: boolean | undefined;
      readonly mode?: 'default' | 'result' | undefined;
    }
  >(arg: Arg, options?: O): All.Return<Arg, O> {
    const result = (self: Effect<any, any, any>) => self.result;

    if (isIterable(arg)) {
      return options?.mode === 'result'
        ? (Effect.forEach as any)(arg, result, options)
        : (Effect.forEach as any)(arg, identity, options);
    } else if (options?.discard) {
      return options.mode === 'result'
        ? (Effect.forEach as any)(Object.values(arg), result, options)
        : (Effect.forEach as any)(Object.values(arg), identity, options);
    }

    return Effect.suspend(() => {
      const out: Record<string, unknown> = {};

      return Effect.forEach(
        Object.entries(arg),
        ([key, effect]) => {
          return (options?.mode === 'result' ? result(effect) : effect).map((value) => {
            out[key] = value;
          });
        },
        {
          discard: true,
          concurrency: options?.concurrency
        }
      ).as(out);
    }) as any;
  }

  /**
   * Runs an effectful function for each element of an iterable, collecting the
   * results in order. Iteration short-circuits on the first failure. Use
   * `concurrency` to run elements in parallel and `discard: true` to ignore
   * results.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.forEach([1, 2, 3], (n) => Effect.succeed(n * 2))
   * // yields [2, 4, 6]
   * ```
   *
   * @see {@link Effect.all | all} for combining multiple effects into one.
   */
  static forEach: {
    <B, E, R, S extends Iterable<any>, const Discard extends boolean = false>(
      f: (a: Arr.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
      options?:
        | {
            readonly concurrency?: Concurrency | undefined;
            readonly discard?: Discard | undefined;
          }
        | undefined
    ): (self: S) => Effect<Discard extends false ? Arr.ReadonlyArray.With<S, B> : void, E, R>;
    <B, E, R, S extends Iterable<any>, const Discard extends boolean = false>(
      self: S,
      f: (a: Arr.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
      options?:
        | {
            readonly concurrency?: Concurrency | undefined;
            readonly discard?: Discard | undefined;
          }
        | undefined
    ): Effect<Discard extends false ? Arr.ReadonlyArray.With<S, B> : void, E, R>;
  } = dual(
    (args) => typeof args[1] === 'function',
    <A, B, E, R>(
      iterable: Iterable<A>,
      f: (a: A, index: number) => Effect<B, E, R>,
      options?: {
        readonly concurrency?: Concurrency | undefined;
        readonly discard?: boolean | undefined;
      }
    ): Effect<any, E, R> => {
      return new Effect(_Effect.forEach(iterable, (a, i) => f(a, i).effect, options));
    }
  );

  /**
   * Runs an effectful function for each element and separates failures from
   * successes. The returned tuple is `[excluded, satisfying]` — the effect
   * never fails, since every element is always evaluated.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.partition([0, 1, 2, 3], (n) =>
   *   n % 2 === 0 ? Effect.fail(`${n} is even`) : Effect.succeed(n)
   * )
   * // yields [["0 is even", "2 is even"], [1, 3]]
   * ```
   */
  static partition<A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: { readonly concurrency?: Concurrency }
  ): Effect<[excluded: Array<E>, satisfying: Array<B>], never, R> {
    return new Effect(_Effect.partition(elements, (a, i) => f(a, i).effect, options));
  }

  private readonly _effect: _Effect.Effect<A, E, R>;

  private constructor(effect: _Effect.Effect<A, E, R>) {
    super();
    this._effect = effect;
  }

  /**
   * The underlying core `Effect`. Use this to hand a fluent Effect to APIs
   * that operate on core effects.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1).map((n) => n + 1)
   *
   * console.log(CoreEffect.runSync(program.effect)) // 2
   * ```
   */
  get effect(): _Effect.Effect<A, E, R> {
    return this._effect;
  }

  /**
   * Makes fluent Effects directly yieldable with `yield*` inside both core and
   * fluent `Effect.gen` generators.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const n = yield* Effect.succeed(1) // fluent Effect yielded directly
   *   return n + 1
   * })
   * ```
   */
  [Symbol.iterator](): _Effect.EffectIterator<Effect<A, E, R>> {
    return this._effect[Symbol.iterator]() as any;
  }

  /**
   * Returns a plain-object representation of this Effect for serialization and
   * debugging output.
   */
  toJSON(): unknown {
    return { _id: 'effect-fluent/Effect', effect: (this._effect as any).toJSON?.() };
  }

  /**
   * Customizes Node.js `util.inspect` output for this Effect.
   */
  [NodeInspectSymbol](): unknown {
    return this.toJSON();
  }

  /**
   * Transforms the success value with a pure function, returning a new `Effect`
   * with the transformed value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(2).map((n) => n * 10)
   * // yields 20
   * ```
   */
  map<B>(f: (a: A) => B): Effect<B, E, R> {
    return new Effect(_Effect.map(this._effect, f));
  }

  /**
   * Transforms both channels at once: `onFailure` maps the error and
   * `onSuccess` maps the success value, without changing whether the effect
   * succeeds or fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * declare const parse: Effect<number, string>
   *
   * const program = parse.mapBoth({
   *   onFailure: (message) => new Error(message),
   *   onSuccess: (n) => n * 2
   * })
   * ```
   */
  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Effect<A2, E2, R> {
    return new Effect(_Effect.mapBoth(this._effect, options));
  }

  /**
   * Transforms the typed failure with a pure function, leaving the success
   * value and requirements unchanged.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Oh no!").mapError((message) => new Error(message))
   * // fails with Error("Oh no!")
   * ```
   */
  mapError<E2>(f: (e: E) => E2): Effect<A, E2, R> {
    return new Effect(_Effect.mapError(this._effect, f));
  }

  /**
   * Replaces the success value with a constant, preserving failures and
   * requirements.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).as("new value")
   * // yields "new value"
   * ```
   */
  as<B>(value: B): Effect<B, E, R> {
    return new Effect(_Effect.as(this._effect, value));
  }

  /**
   * This effect with its success value replaced by `void`, preserving failures.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).asVoid // Effect<void>
   * ```
   */
  get asVoid(): Effect<void, E, R> {
    return new Effect(_Effect.asVoid(this._effect));
  }

  /**
   * This effect with its success value wrapped in `Option.some`, preserving
   * failures.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).asSome
   * // yields Option.some(5)
   * ```
   */
  get asSome(): Effect<Option<A>, E, R> {
    return this.map(Option.some);
  }

  /**
   * Chains a computation that depends on the success value, flattening the
   * resulting `Effect` so chains never nest.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
   *
   * const program = Effect.succeed(10).flatMap((n) => divide(n, 2))
   * // yields 5
   * ```
   */
  flatMap<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2> {
    return new Effect(_Effect.flatMap(this._effect, (a) => f(a).effect));
  }

  /**
   * Flattens an `Effect` whose success value is another `Effect` into a single
   * effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const nested = Effect.succeed(Effect.succeed(1))
   * const program = Effect.flatten(nested)
   * // yields 1
   * ```
   */
  static flatten<A, E, R, E2, R2>(self: Effect<Effect<A, E, R>, E2, R2>): Effect<A, E | E2, R | R2> {
    return self.flatMap((inner) => inner);
  }

  /**
   * Runs another effect after this one. Accepts either an `Effect`, which
   * discards this effect's value, or a function receiving the success value
   * and returning the next `Effect`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1)
   *   .andThen((n) => Effect.succeed(n + 1))
   *   .andThen(Effect.succeed("done"))
   * // yields "done"
   * ```
   */
  andThen<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen<B, E2, R2>(f: Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.andThen(this._effect, (a: A) => {
          return f(a).effect;
        })
      );
    }
    return new Effect(_Effect.andThen(this._effect, f.effect));
  }

  /**
   * Runs a side effect with the success value without changing it — useful for
   * logging or metrics. If the side effect fails, the whole chain fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(42).tap((n) => Effect.sync(() => console.log(n)))
   * // logs 42, still yields 42
   * ```
   */
  tap<B, E2, R2>(f: (a: NoInfer<A>) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap<B, E2, R2>(f: Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.tap(this._effect, (a: NoInfer<A>) => {
          return f(a).effect;
        })
      );
    }
    return new Effect(_Effect.tap(this._effect, f.effect));
  }

  /**
   * Runs a side effect with the error when this effect fails, preserving the
   * original failure. If the side effect itself fails, its error is also
   * reflected in the error channel.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").tapError((error) =>
   *   Effect.sync(() => console.error(`Failure: ${error}`))
   * )
   * // logs "Failure: Boom", still fails with "Boom"
   * ```
   */
  tapError<X, E2, R2>(f: (e: E) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapError(this._effect, (e) => f(e).effect));
  }

  /**
   * Runs a side effect when this effect dies with a defect, preserving the
   * original defect. Recoverable failures are not observed.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapDefect((defect) =>
   *   Effect.sync(() => console.error("Defect:", defect))
   * )
   * ```
   */
  tapDefect<B, E2, R2>(f: (defect: unknown) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapDefect(this._effect, (defect) => f(defect).effect));
  }

  /**
   * Runs a side effect when a tagged error's `_tag` matches, preserving the
   * original failure.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class NetworkError extends Data.TaggedError("NetworkError")<{ message: string }> {}
   *
   * const program = Effect.fail(new NetworkError({ message: "timeout" })).tapErrorTag(
   *   "NetworkError",
   *   (error) => Effect.sync(() => console.error(error.message))
   * )
   * ```
   */
  tapErrorTag<K extends Tags<E>, A1, E1, R1>(
    k: K,
    f: (e: ExtractTag<E, K>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1> {
    return new Effect(_Effect.tapErrorTag(this._effect, k, (e: any) => f(e).effect));
  }

  /**
   * Runs a side effect with the full `Cause` when this effect fails, observing
   * typed failures, defects, and interruptions while preserving the original
   * cause.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").tapCause((cause) =>
   *   Effect.sync(() => console.error("Failed with cause:", cause))
   * )
   * ```
   */
  tapCause<X, E2, R2>(f: (cause: Cause<E>) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCause(this._effect, (cause) => f(Cause.wrap(cause)).effect));
  }

  /**
   * Runs a side effect with the `Cause` only when it satisfies the given
   * predicate — useful for conditional logging or monitoring.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapCauseIf(
   *   (cause) => cause.hasDies,
   *   (cause) => Effect.sync(() => console.error("Defect cause:", cause))
   * )
   * ```
   */
  tapCauseIf<B, E2, R2>(
    predicate: (cause: Cause<E>) => boolean,
    f: (cause: Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(
      _Effect.tapCauseIf(
        this._effect,
        (cause) => predicate(Cause.wrap(cause)),
        (cause) => f(Cause.wrap(cause)).effect
      )
    );
  }

  /**
   * Runs a side effect only when the `Cause` passes the given filter. The
   * filter receives the fluent `Cause` and returns a fluent `Result`
   * (succeed to tap, fail with a cause to skip); the side effect receives the
   * value selected by the filter and the original cause, which is always
   * preserved.
   *
   * @example
   * ```ts
   * import { Effect, Result } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapCauseFilter(
   *   (cause) => (cause.hasDies ? Result.succeed(cause) : Result.fail(cause)),
   *   (selected) => Effect.sync(() => console.error("Defect cause:", selected))
   * )
   * ```
   */
  tapCauseFilter<B, E2, R2, EB, X extends Cause<any>>(
    filter: (cause: Cause<E>) => Result<EB, X>,
    f: (a: EB, cause: Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(
      _Effect.tapCauseFilter(
        this._effect,
        (cause) => {
          const result = filter(Cause.wrap(cause));
          return result.isFailure()
            ? _Result.fail(result.failure.cause)
            : // The fail side of a success Result is phantom; retype it from the
              // fluent X to never so it satisfies core tapCauseFilter's
              // core-Cause constraint.
              (result.result as _Result.Result<EB, never>);
        },
        (a, cause) => f(a, Cause.wrap(cause)).effect
      )
    );
  }

  // --- Error handling ---

  /**
   * Handles all recoverable errors in this effect by providing a fallback
   * effect, so the program continues without failing. Unrecoverable defects
   * are not caught.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("boom").catch((error) =>
   *   Effect.succeed(`recovered from ${error}`)
   * )
   * // yields "recovered from boom"
   * ```
   *
   * @see {@link catchCause} for a version that can also recover from defects.
   */
  catch<B, E2, R2>(f: (e: E) => Effect<B, E2, R2>): Effect<A | B, E2, R | R2> {
    return new Effect(_Effect.catch(this._effect, (e) => f(e).effect));
  }

  /**
   * Handles both recoverable and unrecoverable errors by providing a recovery
   * effect that receives the full fluent `Cause` — typed failures, defects,
   * and interruptions alike.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const recovered = Effect.die("Something went wrong").catchCause((cause) =>
   *   cause.hasDies ? Effect.succeed("Recovered from defect") : Effect.succeed("Unknown error")
   * )
   * ```
   */
  catchCause<B, E2, R2>(f: (cause: Cause<E>) => Effect<B, E2, R2>): Effect<A | B, E2, R | R2> {
    return new Effect(_Effect.catchCause(this._effect, (cause) => f(Cause.wrap(cause)).effect));
  }

  /**
   * Recovers only from causes selected by a filter. The filter receives the
   * fluent `Cause` and returns a fluent `Result`: succeed to recover (the
   * handler receives the selected value and the original cause), or fail with
   * a residual cause to re-fail with it.
   *
   * @example
   * ```ts
   * import { Effect, Result } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).catchCauseFilter(
   *   (cause) => (cause.hasDies ? Result.succeed(cause) : Result.fail(cause)),
   *   (selected) => Effect.succeed(`recovered: ${selected.squash}`)
   * )
   * ```
   *
   * @see {@link catchCauseIf} for predicate-based cause selection.
   * @see {@link catchFilter} for filtering typed error values instead of full causes.
   */
  catchCauseFilter<B, E2, R2, EB, X extends Cause<any>>(
    filter: (cause: Cause<E>) => Result<EB, X>,
    f: (failure: EB, cause: Cause<E>) => Effect<B, E2, R2>
  ): Effect<A | B, Cause.Error<X> | E2, R | R2> {
    return new Effect(
      _Effect.catchCauseFilter(
        this._effect,
        (cause): _Result.Result<EB, _Cause.Cause<Cause.Error<X>>> => {
          const result = filter(Cause.wrap(cause));
          return result.isFailure()
            ? _Result.fail(result.failure.cause)
            : // The fail side of a success Result is phantom; retype it from the
              // fluent X to never so it satisfies core catchCauseFilter's
              // core-Cause constraint.
              (result.result as _Result.Result<EB, never>);
        },
        (failure, cause) => f(failure, Cause.wrap(cause)).effect
      )
    );
  }

  /**
   * Recovers from failures whose fluent `Cause` satisfies the given
   * predicate; other causes are re-failed unchanged.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Network Error").catchCauseIf(
   *   (cause) => cause.hasFails,
   *   (cause) => Effect.succeed(`Caught: ${cause.squash}`)
   * )
   * // yields "Caught: Network Error"
   * ```
   */
  catchCauseIf<B, E2, R2>(
    predicate: (cause: Cause<E>) => boolean,
    f: (cause: Cause<E>) => Effect<B, E2, R2>
  ): Effect<A | B, E | E2, R | R2> {
    return new Effect(
      _Effect.catchCauseIf(
        this._effect,
        (cause) => predicate(Cause.wrap(cause)),
        (cause) => f(Cause.wrap(cause)).effect
      )
    );
  }

  /**
   * Recovers from defects — unexpected errors such as thrown exceptions or
   * values passed to `die` — without catching typed failures or
   * interruptions.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).catchDefect((defect) =>
   *   Effect.succeed(`Caught defect: ${defect}`)
   * )
   * ```
   */
  catchDefect<B, E2, R2>(f: (defect: unknown) => Effect<B, E2, R2>): Effect<A | B, E | E2, R | R2> {
    return new Effect(_Effect.catchDefect(this._effect, (defect) => f(defect).effect));
  }

  /**
   * Recovers from typed errors selected by a filter. The filter receives the
   * error and returns a fluent `Result`: succeed to pass the (possibly
   * narrowed or transformed) value to the handler, or fail to skip recovery —
   * the fail-side value goes to `orElse` when provided, otherwise the effect
   * re-fails with its original cause and the fail-side type flows into the
   * error channel.
   *
   * @example
   * ```ts
   * import { Effect, Result } from "effect-fluent"
   *
   * const program = Effect.fail(404).catchFilter(
   *   (status) => (status === 404 ? Result.succeed(status) : Result.fail(status)),
   *   (status) => Effect.succeed(`missing: ${status}`)
   * )
   * // yields "missing: 404"
   * ```
   *
   * @see {@link catchIf} for predicate-based recovery from typed errors.
   * @see {@link catchCauseFilter} for filtering full causes instead of typed errors.
   */
  catchFilter<EB, A2, E2, R2, X, A3 = unassigned, E3 = never, R3 = never>(
    filter: (e: E) => Result<EB, X>,
    f: (e: EB) => Effect<A2, E2, R2>,
    orElse?: ((e: X) => Effect<A3, E3, R3>) | undefined
  ): Effect<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? X : never), R | R2 | R3>;
  catchFilter(
    filter: (e: any) => Result<any, any>,
    f: (e: any) => Effect<any, any, any>,
    orElse?: (e: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(
      (_Effect.catchFilter as any)(
        this._effect,
        (e: any) => filter(e).result,
        (e: any) => f(e).effect,
        orElse === undefined ? undefined : (e: any) => orElse(e).effect
      )
    );
  }

  /**
   * Recovers from errors that match a `Refinement` or `Predicate`.
   * Non-matching errors go to `orElse` when provided, otherwise they re-fail
   * with the original cause. Defects and interruptions are not caught.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * class NotFound {
   *   readonly _tag = "NotFound"
   * }
   * class Timeout {
   *   readonly _tag = "Timeout"
   * }
   *
   * declare const program: Effect<string, NotFound | Timeout>
   *
   * const recovered = program.catchIf(
   *   (error): error is NotFound => error._tag === "NotFound",
   *   () => Effect.succeed("missing")
   * )
   * ```
   */
  catchIf<EB extends E, A2, E2, R2, A3 = unassigned, E3 = never, R3 = never>(
    refinement: Refinement<E, EB>,
    f: (e: EB) => Effect<A2, E2, R2>,
    orElse?: ((e: Exclude<E, EB>) => Effect<A3, E3, R3>) | undefined
  ): Effect<
    A | A2 | Exclude<A3, unassigned>,
    E2 | E3 | (A3 extends unassigned ? Exclude<E, EB> : never),
    R | R2 | R3
  >;
  catchIf<A2, E2, R2, A3 = unassigned, E3 = never, R3 = never>(
    predicate: Predicate<E>,
    f: (e: E) => Effect<A2, E2, R2>,
    orElse?: ((e: E) => Effect<A3, E3, R3>) | undefined
  ): Effect<A | A2 | Exclude<A3, unassigned>, E2 | E3 | (A3 extends unassigned ? E : never), R | R2 | R3>;
  catchIf(
    predicate: Predicate<any>,
    f: (e: any) => Effect<any, any, any>,
    orElse?: (e: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(
      (_Effect.catchIf as any)(
        this._effect,
        predicate,
        (e: any) => f(e).effect,
        orElse === undefined ? undefined : (e: any) => orElse(e).effect
      )
    );
  }

  /**
   * Catches `NoSuchElementError` failures and converts them to
   * `Option.none()`. Success values become `Option.some` and all other errors
   * are preserved.
   *
   * @example
   * ```ts
   * import { Effect, Option } from "effect-fluent"
   *
   * const some = Effect.fromOption(Option.some(1)).catchNoSuchElement
   * // yields Option.some(1)
   *
   * const none = Effect.fromOption(Option.none()).catchNoSuchElement
   * // yields Option.none()
   * ```
   */
  get catchNoSuchElement(): Effect<Option<A>, Exclude<E, Cause.NoSuchElementError>, R> {
    return new Effect(_Effect.catchNoSuchElement(this._effect)).map(Option.wrap);
  }

  /**
   * Catches a specific reason nested within a tagged error, identified by the
   * parent error's `_tag` and the reason's `_tag`. The handler receives the
   * unwrapped reason and the parent error; unmatched reasons go to `orElse`
   * when provided, otherwise the parent error is preserved.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class RateLimitError extends Data.TaggedError("RateLimitError")<{
   *   retryAfter: number
   * }> {}
   *
   * class AiError extends Data.TaggedError("AiError")<{
   *   reason: RateLimitError
   * }> {}
   *
   * const handled = Effect.fail(
   *   new AiError({ reason: new RateLimitError({ retryAfter: 60 }) })
   * ).catchReason("AiError", "RateLimitError", (reason) =>
   *   Effect.succeed(`Retry after ${reason.retryAfter}s`)
   * )
   * ```
   *
   * @see {@link catchReasons} for handling several nested reason tags.
   */
  catchReason<
    K extends Tags<E>,
    RK extends ReasonTags<ExtractTag<E, K>>,
    A2,
    E2,
    R2,
    A3 = unassigned,
    E3 = never,
    R3 = never
  >(
    errorTag: K,
    reasonTag: RK,
    f: (
      reason: ExtractReason<ExtractTag<E, K>, RK>,
      error: NarrowReason<ExtractTag<E, K>, RK>
    ) => Effect<A2, E2, R2>,
    orElse?:
      | ((
          reasons: ExcludeReason<ExtractTag<E, K>, RK>,
          error: OmitReason<ExtractTag<E, K>, RK>
        ) => Effect<A3, E3, R3>)
      | undefined
  ): Effect<
    A | A2 | Exclude<A3, unassigned>,
    ExcludeTag<E, K> | E2 | E3 | (A3 extends unassigned ? ExtractTag<E, K> : never),
    R | R2 | R3
  >;
  catchReason(
    errorTag: string,
    reasonTag: string,
    f: (reason: any, error: any) => Effect<any, any, any>,
    orElse?: (reasons: any, error: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(
      (_Effect.catchReason as any)(
        this._effect,
        errorTag,
        reasonTag,
        (reason: any, error: any) => f(reason, error).effect,
        orElse === undefined ? undefined : (reasons: any, error: any) => orElse(reasons, error).effect
      )
    );
  }

  /**
   * Catches multiple reasons nested within a tagged error using an object of
   * handlers keyed by reason `_tag`. Each handler receives the unwrapped
   * reason and the parent error; unmatched reasons go to `orElse` when
   * provided, otherwise the parent error is preserved.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class RateLimitError extends Data.TaggedError("RateLimitError")<{
   *   retryAfter: number
   * }> {}
   *
   * class QuotaExceededError extends Data.TaggedError("QuotaExceededError")<{
   *   limit: number
   * }> {}
   *
   * class AiError extends Data.TaggedError("AiError")<{
   *   reason: RateLimitError | QuotaExceededError
   * }> {}
   *
   * const handled = Effect.fail(
   *   new AiError({ reason: new RateLimitError({ retryAfter: 60 }) })
   * ).catchReasons("AiError", {
   *   RateLimitError: (reason) => Effect.succeed(`Retry after ${reason.retryAfter}s`),
   *   QuotaExceededError: (reason) => Effect.succeed(`Quota exceeded: ${reason.limit}`)
   * })
   * ```
   */
  catchReasons<
    K extends Tags<E>,
    Cases extends {
      [RK in ReasonTags<ExtractTag<E, K>>]+?: (
        reason: ExtractReason<ExtractTag<E, K>, RK>,
        error: NarrowReason<ExtractTag<E, K>, RK>
      ) => Effect<any, any, any>;
    },
    A2 = unassigned,
    E2 = never,
    R2 = never
  >(
    errorTag: K,
    cases: Cases,
    orElse?:
      | ((
          reason: ExcludeReason<ExtractTag<E, K>, Extract<keyof Cases, string>>,
          error: OmitReason<ExtractTag<E, K>, Extract<keyof Cases, string>>
        ) => Effect<A2, E2, R2>)
      | undefined
  ): Effect<
    | A
    | Exclude<A2, unassigned>
    | {
        [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Effect<infer A1, any, any> ? A1 : never;
      }[keyof Cases],
    | ExcludeTag<E, K>
    | E2
    | (A2 extends unassigned ? ExtractTag<E, K> : never)
    | {
        [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Effect<any, infer E1, any> ? E1 : never;
      }[keyof Cases],
    | R
    | R2
    | {
        [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Effect<any, any, infer R1> ? R1 : never;
      }[keyof Cases]
  >;
  catchReasons(
    errorTag: string,
    cases: Record<string, ((reason: any, error: any) => Effect<any, any, any>) | undefined>,
    orElse?: (reason: any, error: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    const adapted: Record<string, ((reason: any, error: any) => _Effect.Effect<any, any, any>) | undefined> = {};
    for (const key of Object.keys(cases)) {
      const handler = cases[key];
      adapted[key] = handler === undefined ? undefined : (reason, error) => handler(reason, error).effect;
    }
    return new Effect(
      (_Effect.catchReasons as any)(
        this._effect,
        errorTag,
        adapted,
        orElse === undefined ? undefined : (reason: any, error: any) => orElse(reason, error).effect
      )
    );
  }

  /**
   * Catches and handles errors by their `_tag` discriminator field. Accepts a
   * single tag or a non-empty array of tags, plus an optional `orElse` for
   * errors with other tags — without it, unmatched errors are preserved.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class NetworkError extends Data.TaggedError("NetworkError")<{ message: string }> {}
   * class ValidationError extends Data.TaggedError("ValidationError")<{ message: string }> {}
   *
   * declare const task: Effect<string, NetworkError | ValidationError>
   *
   * const recovered = task.catchTag("NetworkError", (error) =>
   *   Effect.succeed(`Recovered from network error: ${error.message}`)
   * )
   * ```
   *
   * @see {@link catchTags} for handling multiple tagged errors in one call.
   * @see {@link catchIf} for recovering from errors that match a predicate.
   */
  catchTag<
    const K extends Tags<E> | NonEmptyReadonlyArray<Tags<E>>,
    A1,
    E1,
    R1,
    A2 = unassigned,
    E2 = never,
    R2 = never
  >(
    k: K,
    f: (e: ExtractTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K>) => Effect<A1, E1, R1>,
    orElse?:
      | ((e: ExcludeTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K>) => Effect<A2, E2, R2>)
      | undefined
  ): Effect<
    A | A1 | Exclude<A2, unassigned>,
    | E1
    | E2
    | (A2 extends unassigned ? ExcludeTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K> : never),
    R | R1 | R2
  >;
  catchTag(
    k: string | NonEmptyReadonlyArray<string>,
    f: (e: any) => Effect<any, any, any>,
    orElse?: (e: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(
      (_Effect.catchTag as any)(
        this._effect,
        k,
        (e: any) => f(e).effect,
        orElse === undefined ? undefined : (e: any) => orElse(e).effect
      )
    );
  }

  /**
   * Handles multiple tagged errors in a single call using an object of
   * handlers keyed by `_tag`, plus an optional `orElse` for unmatched errors —
   * without it, unmatched errors are preserved.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class ValidationError extends Data.TaggedError("ValidationError")<{ message: string }> {}
   * class NetworkError extends Data.TaggedError("NetworkError")<{ statusCode: number }> {}
   *
   * declare const program: Effect<string, ValidationError | NetworkError>
   *
   * const handled = program.catchTags({
   *   ValidationError: (error) => Effect.succeed(`Validation failed: ${error.message}`),
   *   NetworkError: (error) => Effect.succeed(`Network error: ${error.statusCode}`)
   * })
   * ```
   */
  catchTags<
    Cases extends {
      [K in Extract<E, { _tag: string }>['_tag']]+?: (error: Extract<E, { _tag: K }>) => Effect<any, any, any>;
    } & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string }>['_tag']>]: never }),
    A2 = unassigned,
    E2 = never,
    R2 = never
  >(
    cases: Cases,
    orElse?: ((e: Exclude<E, { _tag: keyof Cases }>) => Effect<A2, E2, R2>) | undefined
  ): Effect<
    | A
    | Exclude<A2, unassigned>
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer A1, any, any> ? A1 : never;
      }[keyof Cases],
    | E2
    | (A2 extends unassigned ? Exclude<E, { _tag: keyof Cases }> : never)
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E1, any> ? E1 : never;
      }[keyof Cases],
    | R
    | R2
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer R1> ? R1 : never;
      }[keyof Cases]
  >;
  catchTags(
    cases: Record<string, ((e: any) => Effect<any, any, any>) | undefined>,
    orElse?: (e: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    const adapted: Record<string, ((e: any) => _Effect.Effect<any, any, any>) | undefined> = {};
    for (const key of Object.keys(cases)) {
      const handler = cases[key];
      adapted[key] = handler === undefined ? undefined : (e) => handler(e).effect;
    }
    return new Effect(
      (_Effect.catchTags as any)(
        this._effect,
        adapted,
        orElse === undefined ? undefined : (e: any) => orElse(e).effect
      )
    );
  }

  /**
   * Discards both the success and failure values of this effect. Use the
   * `log` option to emit the full cause when the effect fails, and `message`
   * to prepend a custom log message. Defects and interruptions are not
   * swallowed — use {@link ignoreCause} for that.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Uh oh!").ignore() // Effect<void>
   *
   * const logged = Effect.fail("Uh oh!").ignore({ log: "Warn", message: "Ignoring task failure" })
   * ```
   */
  ignore(options?: {
    readonly log?: boolean | Severity | undefined;
    readonly message?: string | undefined;
  }): Effect<void, never, R> {
    return new Effect(_Effect.ignore(this._effect, options));
  }

  /**
   * Ignores the effect's entire failure cause, including defects and
   * interruptions, so the effect never fails. Use the `log` option to emit
   * the full cause when the effect fails, and `message` to prepend a custom
   * log message.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die("boom").ignoreCause() // Effect<void>
   *
   * const logged = Effect.fail("boom").ignoreCause({ log: true, message: "Ignoring failure cause" })
   * ```
   */
  ignoreCause(options?: {
    readonly log?: boolean | Severity | undefined;
    readonly message?: string | undefined;
  }): Effect<void, never, R> {
    return new Effect(_Effect.ignoreCause(this._effect, options));
  }

  /**
   * Converts typed failures into defects, removing the error type from the
   * effect. Use this when a typed failure represents an unrecoverable bug or
   * invalid state.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
   *
   * const program = divide(1, 0).orDie // Effect<number> — dies instead of failing
   * ```
   */
  get orDie(): Effect<A, never, R> {
    return new Effect(_Effect.orDie(this._effect));
  }

  /**
   * Exposes this effect's full failure cause in the error channel as a fluent
   * `Cause<E>`, so downstream error handling can distinguish typed failures,
   * defects, and interruptions.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const cause = yield* Effect.fail("Something went wrong").sandbox.flip
   *   return `Caught cause: ${cause.squash}`
   * })
   * ```
   *
   * @see {@link unwrapReason} for promoting nested reason errors instead.
   */
  get sandbox(): Effect<A, Cause<E>, R> {
    return new Effect(_Effect.mapError(_Effect.sandbox(this._effect), Cause.wrap));
  }

  /**
   * Promotes the nested reason errors of a tagged error into the error
   * channel, replacing the parent error.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class RateLimitError extends Data.TaggedError("RateLimitError")<{
   *   retryAfter: number
   * }> {}
   *
   * class AiError extends Data.TaggedError("AiError")<{
   *   reason: RateLimitError
   * }> {}
   *
   * declare const program: Effect<string, AiError>
   *
   * // Before: Effect<string, AiError>
   * // After:  Effect<string, RateLimitError>
   * const unwrapped = program.unwrapReason("AiError")
   * ```
   */
  unwrapReason<K extends _Effect.TagsWithReason<E>>(
    errorTag: K
  ): Effect<A, ExcludeTag<E, K> | ReasonOf<ExtractTag<E, K>>, R> {
    return new Effect(_Effect.unwrapReason(this._effect, errorTag));
  }

  /**
   * Runs this effect and reports any errors to the configured
   * `ErrorReporter`s, preserving the original outcome. If `defectsOnly` is
   * `true`, only defects are reported and typed failures are ignored.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const reported = Effect.fail(new Error("boom")).withErrorReporting()
   *
   * const defectsOnly = Effect.die(new Error("boom")).withErrorReporting({ defectsOnly: true })
   * ```
   */
  withErrorReporting(options?: { readonly defectsOnly?: boolean | undefined }): Effect<A, E, R> {
    return new Effect(_Effect.withErrorReporting(this._effect, options));
  }

  // --- Pattern matching ---

  /**
   * Handles both outcomes with pure functions: `onFailure` receives the typed
   * error and `onSuccess` receives the value. The resulting effect never
   * fails with a typed error; defects are not handled.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(42).match({
   *   onFailure: (error) => `failure: ${error}`,
   *   onSuccess: (value) => `success: ${value}`
   * })
   * // yields "success: 42"
   * ```
   *
   * @see {@link matchEffect} if you need to perform side effects in the handlers.
   */
  match<A2, A3>(options: {
    readonly onFailure: (error: E) => A2;
    readonly onSuccess: (value: A) => A3;
  }): Effect<A2 | A3, never, R> {
    return new Effect(_Effect.match(this._effect, options));
  }

  /**
   * Handles both outcomes with effectful handlers: `onFailure` receives the
   * typed error and `onSuccess` receives the value, each returning a new
   * `Effect`. The result succeeds or fails according to the handler that ran.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Uh oh!").matchEffect({
   *   onFailure: (error) => Effect.succeed(`failure: ${error}`),
   *   onSuccess: (value) => Effect.succeed(`success: ${value}`)
   * })
   * // yields "failure: Uh oh!"
   * ```
   *
   * @see {@link match} if you don't need side effects in the handlers.
   * @see {@link matchCauseEffect} if you need to handle the full cause of the failure.
   */
  matchEffect<A2, E2, R2, A3, E3, R3>(options: {
    readonly onFailure: (e: E) => Effect<A2, E2, R2>;
    readonly onSuccess: (a: A) => Effect<A3, E3, R3>;
  }): Effect<A2 | A3, E2 | E3, R | R2 | R3> {
    return new Effect(
      _Effect.matchEffect(this._effect, {
        onFailure: (e) => options.onFailure(e).effect,
        onSuccess: (a) => options.onSuccess(a).effect
      })
    );
  }

  /**
   * Handles both outcomes with pure functions, where `onFailure` receives the
   * full fluent `Cause` — allowing typed failures, defects, and interruptions
   * to be distinguished.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Something went wrong").matchCause({
   *   onFailure: (cause) => `Failed: ${cause.squash}`,
   *   onSuccess: (value) => `Success: ${value}`
   * })
   * // yields "Failed: Something went wrong"
   * ```
   *
   * @see {@link matchCauseEffect} if you need to perform side effects in the handlers.
   * @see {@link match} if you don't need to handle the cause of the failure.
   */
  matchCause<A2, A3>(options: {
    readonly onFailure: (cause: Cause<E>) => A2;
    readonly onSuccess: (a: A) => A3;
  }): Effect<A2 | A3, never, R> {
    return new Effect(
      _Effect.matchCause(this._effect, {
        onFailure: (cause) => options.onFailure(Cause.wrap(cause)),
        onSuccess: options.onSuccess
      })
    );
  }

  /**
   * Handles both outcomes with effectful handlers, where `onFailure` receives
   * the full fluent `Cause` — allowing typed failures, defects, and
   * interruptions to be distinguished while performing side effects.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Task failed").matchCauseEffect({
   *   onFailure: (cause) =>
   *     cause.hasFails
   *       ? Effect.succeed("recovered from error")
   *       : Effect.succeed("recovered from defect"),
   *   onSuccess: (value) => Effect.succeed(`processed ${value}`)
   * })
   * ```
   *
   * @see {@link matchCause} if you don't need side effects in the handlers.
   * @see {@link matchEffect} if you don't need to handle the cause of the failure.
   */
  matchCauseEffect<A2, E2, R2, A3, E3, R3>(options: {
    readonly onFailure: (cause: Cause<E>) => Effect<A2, E2, R2>;
    readonly onSuccess: (a: A) => Effect<A3, E3, R3>;
  }): Effect<A2 | A3, E2 | E3, R | R2 | R3> {
    return new Effect(
      _Effect.matchCauseEffect(this._effect, {
        onFailure: (cause) => options.onFailure(Cause.wrap(cause)).effect,
        onSuccess: (a) => options.onSuccess(a).effect
      })
    );
  }

  // --- Repetition & retrying ---

  /**
   * Repeats this effect according to a fluent `Schedule`, an options object
   * (`while` / `until` / `times` / `schedule`), or a schedule builder. The
   * first execution always runs; the policy governs the repeats. Succeeds with
   * the schedule's final output (or the last value for predicate/times forms).
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * const threeTimes = Effect.sync(() => console.log("tick")).repeat({ times: 3 })
   *
   * const spaced = Effect.sync(() => Date.now()).repeat(
   *   Schedule.spaced("1 second").while(({ attempt }) => attempt < 10)
   * )
   * ```
   */
  repeat<A2, E2, R2, O extends Repeat.Options<A2>>(this: Effect<A2, E2, R2>, options: O): Repeat.Return<R2, E2, A2, O>;
  repeat<A2, E2, R2, Output, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    schedule: Schedule<Output, unknown, Error2, Env2>
  ): Effect<Output, E2 | Error2, R2 | Env2>;
  repeat<A2, E2, R2, Output, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    schedule: Schedule<Output, NoInfer<A2>, Error2, Env2>
  ): Effect<Output, E2 | Error2, R2 | Env2>;
  repeat<A2, E2, R2, Output, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    builder: (
      $: {
        <O2, E3, R3>(_: Schedule<O2, unknown, E3, R3>): Schedule<O2, A2, E3, R3>;
        <O2, E3, R3>(_: Schedule<O2, NoInfer<A2>, E3, R3>): Schedule<O2, A2, E3, R3>;
      }
    ) => Schedule<Output, NoInfer<A2>, Error2, Env2>
  ): Effect<Output, E2 | Error2, R2 | Env2>;
  repeat(arg: any): Effect<any, any, any> {
    return new Effect(_Effect.repeat(this._effect as any, adaptScheduleArg(arg) as any));
  }

  /**
   * Repeats this effect according to the given fluent `Schedule`, recovering
   * from any failure with `orElse`, which receives the error and the
   * schedule's last output as a fluent `Option`.
   *
   * @example
   * ```ts
   * import { Effect, Option, Schedule } from "effect-fluent"
   *
   * const program = Effect.succeed(1).repeatOrElse(
   *   Schedule.recurs(3),
   *   (error, lastOutput) => Effect.succeed(lastOutput.getOrElse(() => 0))
   * )
   * ```
   */
  repeatOrElse<A2, E2, R2, B, ES, RS, E3, R3>(
    this: Effect<A2, E2, R2>,
    schedule: Schedule<B, unknown, ES, RS>,
    orElse: (error: E2 | ES, option: Option<B>) => Effect<B, E3, R3>
  ): Effect<B, E3, R2 | RS | R3>;
  repeatOrElse<A2, E2, R2, B, ES, RS, E3, R3>(
    this: Effect<A2, E2, R2>,
    schedule: Schedule<B, NoInfer<A2>, ES, RS>,
    orElse: (error: E2 | ES, option: Option<B>) => Effect<B, E3, R3>
  ): Effect<B, E3, R2 | RS | R3>;
  repeatOrElse(
    schedule: Schedule<any, any, any, any>,
    orElse: (error: any, option: Option<any>) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(
      _Effect.repeatOrElse(this._effect as any, schedule.schedule, (error, option) =>
        // Upstream's public signature declares Option<B> but its runtime
        // passes Option<Metadata<B, A>>; we honour the documented contract by
        // projecting the metadata to its output. The shape check keeps this
        // working if a future upstream beta aligns the runtime with the
        // public signature and passes Option<B> directly.
        orElse(
          error,
          Option.wrap(option).map((meta: any) =>
            hasProperty(meta, 'attempt') && hasProperty(meta, 'elapsedSincePrevious') ? (meta as any).output : meta
          )
        ).effect
      )
    );
  }

  /**
   * Retries this effect on failure according to a fluent `Schedule`, an
   * options object (`while` / `until` / `times` / `schedule` keyed by the
   * error), or a schedule builder.
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * const resilient = Effect.tryPromise(() => fetch("https://example.com")).retry(
   *   Schedule.exponential("100 millis").jittered.upTo({ times: 5 })
   * )
   *
   * const selective = Effect.fail(new Error("boom")).retry({
   *   times: 3,
   *   while: (error) => error.message === "boom"
   * })
   * ```
   */
  retry<A2, E2, R2, O extends Retry.Options<E2>>(this: Effect<A2, E2, R2>, options: O): Retry.Return<R2, E2, A2, O>;
  retry<A2, E2, R2, B, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    policy: Schedule<B, unknown, Error2, Env2>
  ): Effect<A2, E2 | Error2, R2 | Env2>;
  retry<A2, E2, R2, B, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    policy: Schedule<B, NoInfer<E2>, Error2, Env2>
  ): Effect<A2, E2 | Error2, R2 | Env2>;
  retry<A2, E2, R2, B, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    builder: (
      $: {
        <O2, SE, R3>(_: Schedule<O2, unknown, SE, R3>): Schedule<O2, E2, SE, R3>;
        <O2, SE, R3>(_: Schedule<O2, NoInfer<E2>, SE, R3>): Schedule<O2, E2, SE, R3>;
      }
    ) => Schedule<B, NoInfer<E2>, Error2, Env2>
  ): Effect<A2, E2 | Error2, R2 | Env2>;
  retry(arg: any): Effect<any, any, any> {
    return new Effect(_Effect.retry(this._effect as any, adaptScheduleArg(arg) as any));
  }

  /**
   * Retries this effect on failure according to the given fluent `Schedule`
   * policy; once the policy is exhausted, recovers with `orElse`, which
   * receives the final error and the policy's last output.
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * const withFallback = Effect.fail("boom").retryOrElse(
   *   Schedule.recurs(3),
   *   (error, attempts) => Effect.succeed(`gave up after ${attempts} retries: ${error}`)
   * )
   * ```
   */
  retryOrElse<A2, E2, R2, A1, E1, R1, A3, E3, R3>(
    this: Effect<A2, E2, R2>,
    policy: Schedule<A1, unknown, E1, R1>,
    orElse: (e: NoInfer<E2>, out: A1) => Effect<A3, E3, R3>
  ): Effect<A2 | A3, E1 | E3, R2 | R1 | R3>;
  retryOrElse<A2, E2, R2, A1, E1, R1, A3, E3, R3>(
    this: Effect<A2, E2, R2>,
    policy: Schedule<A1, NoInfer<E2>, E1, R1>,
    orElse: (e: NoInfer<E2>, out: A1) => Effect<A3, E3, R3>
  ): Effect<A2 | A3, E1 | E3, R2 | R1 | R3>;
  retryOrElse(
    policy: Schedule<any, any, any, any>,
    orElse: (e: any, out: any) => Effect<any, any, any>
  ): Effect<any, any, any> {
    return new Effect(_Effect.retryOrElse(this._effect as any, policy.schedule, (e, out) => orElse(e, out).effect));
  }

  /**
   * Runs this effect on the cadence defined by the given fluent `Schedule`,
   * succeeding with the schedule's final output.
   *
   * @example
   * ```ts
   * import { Effect, Schedule } from "effect-fluent"
   *
   * const heartbeat = Effect.sync(() => console.log("ping")).schedule(
   *   Schedule.fixed("30 seconds")
   * )
   * ```
   */
  schedule<Output, Error2, Env2>(schedule: Schedule<Output, unknown, Error2, Env2>): Effect<Output, E, R | Env2> {
    return new Effect(_Effect.schedule(this._effect, schedule.schedule));
  }

  /**
   * Like `schedule`, but seeds the schedule with an initial input before the
   * first run.
   */
  scheduleFrom<A2, E2, R2, Output, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    initial: A2,
    schedule: Schedule<Output, unknown, Error2, Env2>
  ): Effect<Output, E2, R2 | Env2>;
  scheduleFrom<A2, E2, R2, Output, Error2, Env2>(
    this: Effect<A2, E2, R2>,
    initial: A2,
    schedule: Schedule<Output, NoInfer<A2>, Error2, Env2>
  ): Effect<Output, E2, R2 | Env2>;
  scheduleFrom(initial: any, schedule: Schedule<any, any, any, any>): Effect<any, any, any> {
    return new Effect(_Effect.scheduleFrom(this._effect as any, initial, schedule.schedule));
  }

  /**
   * Repeats this effect forever without terminating. Never succeeds; only
   * fails if the effect fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const poll = Effect.sync(() => console.log("polling")).forever()
   * ```
   */
  forever(options?: { readonly disableYield?: boolean | undefined }): Effect<never, E, R> {
    return new Effect(_Effect.forever(this._effect, options));
  }

  /**
   * Retries this effect until it succeeds, swallowing all typed errors.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * let attempts = 0
   * const flaky = Effect.suspend(() =>
   *   ++attempts < 3 ? Effect.fail("not yet") : Effect.succeed(attempts)
   * )
   * const program = flaky.eventually // succeeds with 3
   * ```
   */
  get eventually(): Effect<A, never, R> {
    return new Effect(_Effect.eventually(this._effect));
  }

  // --- Supervision & fibers ---

  /**
   * Forks this effect as a child of the current fiber, succeeding immediately
   * with a fluent `Fiber` handle. The child is interrupted when its parent
   * terminates.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const fiber = yield* Effect.sleep("1 second").as("done").forkChild()
   *   const result = yield* fiber.join
   *   console.log(result) // "done"
   * })
   * ```
   */
  forkChild(options?: {
    readonly startImmediately?: boolean | undefined;
    readonly uninterruptible?: boolean | 'inherit' | undefined;
  }): Effect<Fiber<A, E>, never, R> {
    return new Effect(_Effect.forkChild(this._effect, options)).map(Fiber.wrap);
  }

  /**
   * Forks this effect as a detached (daemon) fiber with no parent,
   * succeeding immediately with a fluent `Fiber` handle. The fiber runs until
   * it completes or is explicitly interrupted.
   */
  forkDetach(options?: {
    readonly startImmediately?: boolean | undefined;
    readonly uninterruptible?: boolean | 'inherit' | undefined;
  }): Effect<Fiber<A, E>, never, R> {
    return new Effect(_Effect.forkDetach(this._effect, options)).map(Fiber.wrap);
  }

  /**
   * Forks this effect into the given `Scope`: closing the scope interrupts
   * the fiber. Succeeds immediately with a fluent `Fiber` handle.
   */
  forkIn(
    scope: Scope.Scope,
    options?: {
      readonly startImmediately?: boolean | undefined;
      readonly uninterruptible?: boolean | 'inherit' | undefined;
    }
  ): Effect<Fiber<A, E>, never, R> {
    return new Effect(_Effect.forkIn(this._effect, scope, options)).map(Fiber.wrap);
  }

  /**
   * Forks this effect into the enclosing `Scope` from the environment:
   * closing that scope interrupts the fiber. Succeeds immediately with a
   * fluent `Fiber` handle.
   */
  forkScoped(options?: {
    readonly startImmediately?: boolean | undefined;
    readonly uninterruptible?: boolean | 'inherit' | undefined;
  }): Effect<Fiber<A, E>, never, R | Scope.Scope> {
    return new Effect(_Effect.forkScoped(this._effect, options)).map(Fiber.wrap);
  }

  /**
   * This effect, additionally waiting for all of its child fibers to
   * terminate before completing.
   */
  get awaitAllChildren(): Effect<A, E, R> {
    return new Effect(_Effect.awaitAllChildren(this._effect));
  }

  /**
   * This effect with its success and failure channels swapped: an
   * `Effect<A, E, R>` becomes an `Effect<E, A, R>`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").flip
   * // succeeds with "Boom"
   * ```
   */
  get flip(): Effect<E, A, R> {
    return new Effect(_Effect.flip(this._effect));
  }

  /**
   * This effect with its entire outcome — success, typed failure, defect, or
   * interruption — captured as a fluent `Exit` value. The resulting effect
   * never fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const exit = yield* Effect.succeed(1).exit
   *   console.log(exit._tag) // "Success"
   * })
   * ```
   */
  get exit(): Effect<Exit<A, E>, never, R> {
    return new Effect(_Effect.exit(this._effect)).map(Exit.wrap);
  }

  /**
   * This effect with success and typed failure captured as a fluent `Result`.
   * The resulting effect never fails with a typed error — defects and
   * interruptions still fail the effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const result = yield* Effect.fail("Boom").result
   *   console.log(result.isFailure()) // true
   * })
   * ```
   */
  get result(): Effect<Result<A, E>, never, R> {
    return new Effect(_Effect.result(this._effect)).map(Result.wrap);
  }

  /**
   * This effect with success captured as `Option.some` and typed failure as
   * `Option.none`, as a fluent `Option`. The failure value is discarded — use
   * {@link Effect.result | result} when it matters. Defects still fail the
   * effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const option = yield* Effect.succeed(1).option
   *   console.log(option.isSome()) // true
   * })
   * ```
   */
  get option(): Effect<Option<A>, never, R> {
    return new Effect(_Effect.option(this._effect)).map(Option.wrap);
  }

  // --- Running ---
  //
  // Running is execution, not description, so every member below is a method —
  // never a getter — even when it takes no arguments. The `this` parameter
  // constrains the receiver to `R = never` (or to the services covered by the
  // provided `Context` for the `*With` variants), rejecting effects with
  // unsatisfied requirements at compile time.

  /**
   * Executes this effect synchronously and returns its success value.
   *
   * Use when the effect is guaranteed to complete synchronously. If the effect
   * fails, dies, or is interrupted, `runSync` throws the squashed cause: the
   * first typed error as-is, the first defect as-is, or an `Error` for
   * interruptions. If the effect performs asynchronous work it dies with an
   * `AsyncFiberError`, which is thrown. Use
   * {@link Effect.runSyncExit | runSyncExit} when you want the failure
   * captured as an `Exit` instead.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runSyncWith | runSyncWith} to supply services first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * console.log(Effect.succeed(1).map((n) => n + 1).runSync()) // 2
   *
   * try {
   *   Effect.fail("my error").runSync()
   * } catch (e) {
   *   console.error(e) // "my error"
   * }
   * ```
   */
  runSync<A2, E2>(this: Effect<A2, E2, never>): A2 {
    return _Effect.runSync(this._effect);
  }

  /**
   * Executes this effect synchronously and captures the outcome safely as a
   * fluent `Exit`, which represents success or failure (including defects and
   * interruptions).
   *
   * If the effect performs asynchronous work, the returned `Exit` is a
   * `Failure` with a `Die` cause carrying an `AsyncFiberError`, indicating
   * that the effect cannot be resolved synchronously.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runSyncExitWith | runSyncExitWith} to supply services first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const exit = Effect.fail("my error").runSyncExit()
   * if (exit.isFailure()) {
   *   console.log(exit.cause.findErrorOption) // Option.some("my error")
   * }
   * ```
   */
  runSyncExit<A2, E2>(this: Effect<A2, E2, never>): Exit<A2, E2> {
    return Exit.wrap(_Effect.runSyncExit(this._effect));
  }

  /**
   * Executes this effect synchronously with the provided services and returns
   * its success value.
   *
   * Use when you already have a core `Context` covering this effect's
   * requirements, the effect is known to complete synchronously, and failures
   * should throw (with the same semantics as
   * {@link Effect.runSync | runSync}).
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Math = Context.Service<{ add: (a: number, b: number) => number }>("Math")
   *
   * const context = Context.make(Math, { add: (a, b) => a + b })
   *
   * const program = Effect.gen(function* () {
   *   const math = yield* Math
   *   return math.add(2, 3)
   * })
   *
   * console.log(program.runSyncWith(context)) // 5
   * ```
   */
  runSyncWith<A2, E2, R2>(this: Effect<A2, E2, R2>, context: Context.Context<R2>): A2 {
    return _Effect.runSyncWith(context)(this._effect);
  }

  /**
   * Executes this effect synchronously with the provided services, capturing
   * the outcome safely as a fluent `Exit` instead of throwing on failure.
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Logger = Context.Service<{ log: (msg: string) => void }>("Logger")
   *
   * const context = Context.make(Logger, { log: (msg) => console.log(msg) })
   *
   * const program = Effect.gen(function* () {
   *   const logger = yield* Logger
   *   logger.log("Computing result...")
   *   return 42
   * })
   *
   * const exit = program.runSyncExitWith(context)
   * console.log(exit.isSuccess() && exit.value) // 42
   * ```
   */
  runSyncExitWith<A2, E2, R2>(this: Effect<A2, E2, R2>, context: Context.Context<R2>): Exit<A2, E2> {
    return Exit.wrap(_Effect.runSyncExitWith(context)(this._effect));
  }

  /**
   * Executes this effect and returns the result as a `Promise`.
   *
   * Use when you need to execute an effect and work with the result using
   * `Promise` syntax, typically for compatibility with other promise-based
   * code. If the effect succeeds, the promise resolves with the value; if it
   * fails, the promise rejects with the squashed cause — the first typed
   * error as-is, the first defect as-is, or an `Error` for interruptions.
   * Pass an `AbortSignal` via `options.signal` to interrupt the running
   * fiber from the outside.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runPromiseWith | runPromiseWith} to supply services first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * Effect.succeed(1).runPromise().then(console.log) // 1
   *
   * Effect.fail("my error").runPromise().catch(console.error) // "my error"
   * ```
   */
  runPromise<A2, E2>(this: Effect<A2, E2, never>, options?: _Effect.RunOptions | undefined): Promise<A2> {
    return _Effect.runPromise(this._effect, options);
  }

  /**
   * Executes this effect and returns a `Promise` that always resolves with a
   * fluent `Exit` describing the outcome — success or failure, including
   * defects and interruptions — instead of rejecting.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runPromiseExitWith | runPromiseExitWith} to supply services
   * first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * Effect.fail("my error").runPromiseExit().then((exit) => {
   *   if (exit.isFailure()) {
   *     console.log(exit.cause.findErrorOption) // Option.some("my error")
   *   }
   * })
   * ```
   */
  runPromiseExit<A2, E2>(this: Effect<A2, E2, never>, options?: _Effect.RunOptions | undefined): Promise<Exit<A2, E2>> {
    return _Effect.runPromiseExit(this._effect, options).then(Exit.wrap);
  }

  /**
   * Executes this effect as a `Promise` with the provided services.
   *
   * Use when you already have a core `Context` covering this effect's
   * requirements and need Promise interop that rejects on failure (with the
   * same rejection semantics as {@link Effect.runPromise | runPromise}).
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Config = Context.Service<{ apiUrl: string }>("Config")
   *
   * const context = Context.make(Config, { apiUrl: "https://api.example.com" })
   *
   * const program = Effect.gen(function* () {
   *   const config = yield* Config
   *   return `Connecting to ${config.apiUrl}`
   * })
   *
   * program.runPromiseWith(context).then(console.log)
   * ```
   */
  runPromiseWith<A2, E2, R2>(
    this: Effect<A2, E2, R2>,
    context: Context.Context<R2>,
    options?: _Effect.RunOptions | undefined
  ): Promise<A2> {
    return _Effect.runPromiseWith(context)(this._effect, options);
  }

  /**
   * Executes this effect with the provided services, returning a `Promise`
   * that always resolves with a fluent `Exit` preserving success and failure.
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Database = Context.Service<{ query: (sql: string) => string }>("Database")
   *
   * const context = Context.make(Database, { query: (sql) => `Result for: ${sql}` })
   *
   * const program = Effect.gen(function* () {
   *   const db = yield* Database
   *   return db.query("SELECT * FROM users")
   * })
   *
   * program.runPromiseExitWith(context).then((exit) => {
   *   if (exit.isSuccess()) {
   *     console.log("Success:", exit.value)
   *   }
   * })
   * ```
   */
  runPromiseExitWith<A2, E2, R2>(
    this: Effect<A2, E2, R2>,
    context: Context.Context<R2>,
    options?: _Effect.RunOptions | undefined
  ): Promise<Exit<A2, E2>> {
    return _Effect.runPromiseExitWith(context)(this._effect, options).then(Exit.wrap);
  }

  /**
   * Runs this effect in the background, returning a fluent `Fiber` that can
   * be observed or interrupted.
   *
   * Use when you need to start an effect in the background and keep a handle
   * to it. Pass an `AbortSignal` via `options.signal` to interrupt the fiber
   * from the outside.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runForkWith | runForkWith} to supply services first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const fiber = Effect.sync(() => console.log("running...")).forever().runFork()
   *
   * setTimeout(() => {
   *   fiber.interrupt.runFork()
   * }, 500)
   * ```
   */
  runFork<A2, E2>(this: Effect<A2, E2, never>, options?: _Effect.RunOptions | undefined): Fiber<A2, E2> {
    return Fiber.wrap(_Effect.runFork(this._effect, options));
  }

  /**
   * Runs this effect in the background with the provided services, returning
   * a fluent `Fiber`.
   *
   * Use when this effect still requires services, you already have a core
   * `Context`, and you want a background fiber.
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Logger = Context.Service<{ log: (message: string) => void }>("Logger")
   *
   * const services = Context.make(Logger, { log: (message) => console.log(message) })
   *
   * const program = Effect.gen(function* () {
   *   const logger = yield* Logger
   *   logger.log("Hello from service!")
   *   return "done"
   * })
   *
   * const fiber = program.runForkWith(services)
   * ```
   */
  runForkWith<A2, E2, R2>(
    this: Effect<A2, E2, R2>,
    context: Context.Context<R2>,
    options?: _Effect.RunOptions | undefined
  ): Fiber<A2, E2> {
    return Fiber.wrap(_Effect.runForkWith(context)(this._effect, options));
  }

  /**
   * Runs this effect asynchronously, registering `onExit` as a fiber observer
   * and returning an interruptor.
   *
   * The `onExit` callback receives the outcome as a fluent `Exit`. The
   * returned interruptor calls the fiber's `interruptUnsafe`, optionally with
   * an interruptor fiber ID.
   *
   * Only effects with no remaining requirements (`R = never`) can be run; use
   * {@link Effect.runCallbackWith | runCallbackWith} to supply services first.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const interrupt = Effect.succeed("done").runCallback({
   *   onExit: (exit) => {
   *     console.log(exit.isSuccess() && exit.value) // "done"
   *   }
   * })
   *
   * // interrupt() to cancel the fiber if needed
   * ```
   */
  runCallback<A2, E2>(
    this: Effect<A2, E2, never>,
    options?: (_Effect.RunOptions & { readonly onExit: (exit: Exit<A2, E2>) => void }) | undefined
  ): (interruptor?: number | undefined) => void {
    return _Effect.runCallback(
      this._effect,
      options === undefined ? undefined : { ...options, onExit: (exit) => options.onExit(Exit.wrap(exit)) }
    );
  }

  /**
   * Runs this effect with the provided services, registering `onExit` as a
   * fiber observer and returning an interruptor.
   *
   * Use when embedding an effect into callback-style code with explicit
   * services and a synchronous interruptor. The `onExit` callback receives
   * the outcome as a fluent `Exit`; the returned interruptor calls the
   * fiber's `interruptUnsafe`, optionally with an interruptor fiber ID.
   *
   * @example
   * ```ts
   * import { Context } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const Logger = Context.Service<{ log: (message: string) => void }>("Logger")
   *
   * const services = Context.make(Logger, { log: (message) => console.log(message) })
   *
   * const program = Effect.gen(function* () {
   *   const logger = yield* Logger
   *   logger.log("Started")
   *   return "done"
   * })
   *
   * const interrupt = program.runCallbackWith(services, {
   *   onExit: (exit) => {
   *     if (exit.isFailure()) {
   *       // handle failure or interruption
   *     }
   *   }
   * })
   *
   * // Use the interruptor if you need to cancel the fiber later.
   * interrupt()
   * ```
   */
  runCallbackWith<A2, E2, R2>(
    this: Effect<A2, E2, R2>,
    context: Context.Context<R2>,
    options?: (_Effect.RunOptions & { readonly onExit: (exit: Exit<A2, E2>) => void }) | undefined
  ): (interruptor?: number | undefined) => void {
    return _Effect.runCallbackWith(context)(
      this._effect,
      options === undefined ? undefined : { ...options, onExit: (exit) => options.onExit(Exit.wrap(exit)) }
    );
  }

  /**
   * Escape hatch: applies a transformation to the underlying core `Effect` and
   * re-wraps the result as a fluent Effect. Use this for core combinators that
   * are not yet exposed on the fluent API.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1).with((core) => CoreEffect.delay(core, 1000))
   * // still a fluent Effect<number>, delayed by one second
   * ```
   */
  with<B, E2, R2>(f: (effect: _Effect.Effect<A, E, R>) => _Effect.Effect<B, E2, R2>): Effect<B, E2, R2> {
    return new Effect(f(this._effect));
  }
}

/**
 * A fluent `Effect` with any success, error, and requirement types.
 */
export type EffectAny = Effect<any, any, any>;

/**
 * Type-level utilities used to compute the return type of {@link Effect.all | Effect.all}.
 */
export namespace All {
  /**
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   * import type { All } from "effect-fluent"
   *
   * // EffectAny represents an Effect with any type parameters
   * const effects: Array<All.EffectAny> = [
   *   Effect.succeed(42),
   *   Effect.succeed("hello"),
   *   Effect.fail(new Error("Oops"))
   * ]
   * ```
   */
  export type EffectAny = Effect<any, any, any>;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnIterable computes the return type for Effect.all with iterables
   * type EffectArray = Array<Effect<number, string, never>>
   * type Computed = All.ReturnIterable<EffectArray, false>
   * // Computed: Effect<Array<number>, string, never>
   * ```
   */
  export type ReturnIterable<T extends Iterable<EffectAny>, Discard extends boolean, Mode extends boolean = false> = [
    T
  ] extends [Iterable<Effect<infer A, infer E, infer R>>]
    ? Effect<
        Discard extends true ? void : Array<Mode extends true ? Result<A, E> : A>,
        Mode extends true ? never : E,
        R
      >
    : never;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnTuple computes the return type for Effect.all with tuples
   * type EffectTuple = [
   *   Effect<string, Error, never>,
   *   Effect<number, Error, never>
   * ]
   * type Computed = All.ReturnTuple<EffectTuple, false>
   * // Computed: Effect<[string, number], Error, never>
   * ```
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean, Mode extends boolean = false> =
    Effect<
      Discard extends true
        ? void
        : T[number] extends never
          ? []
          : {
              -readonly [K in keyof T]: T[K] extends Effect<infer _A, infer _E, infer _R>
                ? Mode extends true
                  ? Result<_A, _E>
                  : _A
                : never;
            },
      Mode extends true
        ? never
        : T[number] extends never
          ? never
          : T[number] extends Effect<infer _A, infer _E, infer _R>
            ? _E
            : never,
      T[number] extends never ? never : T[number] extends Effect<infer _A, infer _E, infer _R> ? _R : never
    > extends infer X
      ? X
      : never;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnObject computes the return type for Effect.all with objects
   * type EffectRecord = {
   *   a: Effect<string, Error, never>
   *   b: Effect<number, Error, never>
   * }
   * type Computed = All.ReturnObject<EffectRecord, false>
   * // Computed: Effect<{ a: string, b: number }, Error, never>
   * ```
   */
  export type ReturnObject<T, Discard extends boolean, Mode extends boolean = false> = [T] extends [
    Record<string, EffectAny>
  ]
    ? Effect<
        Discard extends true
          ? void
          : {
              -readonly [K in keyof T]: [T[K]] extends [Effect<infer _A, infer _E, infer _R>]
                ? Mode extends true
                  ? Result<_A, _E>
                  : _A
                : never;
            },
        Mode extends true
          ? never
          : keyof T extends never
            ? never
            : T[keyof T] extends Effect<infer _A, infer _E, infer _R>
              ? _E
              : never,
        keyof T extends never ? never : T[keyof T] extends Effect<infer _A, infer _E, infer _R> ? _R : never
      >
    : never;

  /**
   * @example
   * ```ts
   * import type { All } from "effect-fluent"
   *
   * // IsDiscard checks if options have discard flag set to true
   * type DiscardOptions = { discard: true }
   * type NoDiscardOptions = { discard: false }
   * type WithDiscard = All.IsDiscard<DiscardOptions> // true
   * type WithoutDiscard = All.IsDiscard<NoDiscardOptions> // false
   * ```
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true;

  /**
   * Checks if options have `mode` set to `"result"`.
   */
  export type IsResult<A> = [Extract<A, { readonly mode: 'result' }>] extends [never] ? false : true;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // Return determines the result type based on input and options
   * type EffectArray = Array<Effect<number, string, never>>
   * type Options = { discard: false }
   * type Computed = All.Return<EffectArray, Options>
   * // Computed: Effect<Array<number>, string, never>
   * ```
   */
  export type Return<
    Arg extends Iterable<EffectAny> | Record<string, EffectAny>,
    O extends {
      readonly concurrency?: Concurrency | undefined;
      readonly discard?: boolean | undefined;
      readonly mode?: 'default' | 'result' | undefined;
    }
  > = [Arg] extends [ReadonlyArray<EffectAny>]
    ? ReturnTuple<Arg, IsDiscard<O>, IsResult<O>>
    : [Arg] extends [Iterable<EffectAny>]
      ? ReturnIterable<Arg, IsDiscard<O>, IsResult<O>>
      : [Arg] extends [Record<string, EffectAny>]
        ? ReturnObject<Arg, IsDiscard<O>, IsResult<O>>
        : never;
}

/**
 * Type-level utilities used by {@link Effect.gen | Effect.gen} to infer yielded
 * errors and services.
 */
export namespace Gen {
  // Only Effects (core or fluent — fluent implements `_Effect.Effect`) are
  // yieldable inside `Effect.gen`. To yield an Option or Result, lift them
  // explicitly via `Effect.fromOption` / `Effect.fromResult`. This matches
  // core's behaviour after the `Yieldable` removal.
  /**
   * A value that can be yielded inside `Effect.gen`: any core or fluent Effect.
   */
  export type Yieldable<A, E, R> = _Effect.Effect<A, E, R>;

  /**
   * Extracts the union of error types from yielded effects.
   */
  export type YieldError<Eff> = [Eff] extends [never]
    ? never
    : Eff extends _Effect.Effect<any, infer E, any>
      ? E
      : never;

  /**
   * Extracts the union of service requirements from yielded effects.
   */
  export type YieldServices<Eff> = [Eff] extends [never]
    ? never
    : Eff extends _Effect.Effect<any, any, infer R>
      ? R
      : never;
}

export namespace Repeat {
  /**
   * Options for `Effect#repeat`: continue `while`/`until` a predicate holds
   * (optionally effectful), for a number of `times`, and/or per a fluent
   * `schedule`.
   */
  export interface Options<A> {
    while?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined;
    until?: ((_: A) => boolean | Effect<boolean, any, any>) | undefined;
    times?: number | undefined;
    schedule?: Schedule<any, A, any, any> | Schedule<any, unknown, any, any> | undefined;
  }

  /**
   * Computes the fluent `Effect` returned by `Effect#repeat` for a given
   * options object.
   */
  export type Return<R, E, A, O extends Options<A>> = Effect<
    O extends { until: Refinement<A, infer B> } ? B : O extends { while: Refinement<A, infer B> } ? Exclude<A, B> : A,
    | E
    | (O extends { schedule: Schedule<infer _Out, infer _I, infer E2, infer _R> } ? E2 : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer E2, infer _R> } ? E2 : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer E2, infer _R> } ? E2 : never),
    | R
    | (O extends { schedule: Schedule<infer _O, infer _I, infer _E, infer R2> } ? R2 : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer _E, infer R2> } ? R2 : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer _E, infer R2> } ? R2 : never)
  > extends infer Z
    ? Z
    : never;
}

export namespace Retry {
  /**
   * Options for `Effect#retry`: keep retrying `while`/`until` a predicate on
   * the error holds (optionally effectful), for a number of `times`, and/or
   * per a fluent `schedule` fed with the errors.
   */
  export interface Options<E> {
    while?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined;
    until?: ((error: E) => boolean | Effect<boolean, any, any>) | undefined;
    times?: number | undefined;
    schedule?: Schedule<any, E, any, any> | Schedule<any, unknown, any, any> | undefined;
  }

  /**
   * Computes the fluent `Effect` returned by `Effect#retry` for a given
   * options object.
   */
  export type Return<R, E, A, O extends Options<E>> = Effect<
    A,
    | (O extends { schedule: Schedule<infer _O, infer _I, infer _E1, infer _R> }
        ? E
        : O extends { times: number }
          ? E
          : O extends { until: Refinement<E, infer E2> }
            ? E2
            : O extends { while: Refinement<E, infer E2> }
              ? Exclude<E, E2>
              : E)
    | (O extends { schedule: Schedule<infer _O, infer _I, infer E2, infer _R> } ? E2 : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer E2, infer _R> } ? E2 : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer E2, infer _R> } ? E2 : never),
    | R
    | (O extends { schedule: Schedule<infer _O, infer _I, infer _E1, infer R2> } ? R2 : never)
    | (O extends { while: (...args: Array<any>) => Effect<infer _A, infer _E, infer R2> } ? R2 : never)
    | (O extends { until: (...args: Array<any>) => Effect<infer _A, infer _E, infer R2> } ? R2 : never)
  > extends infer Z
    ? Z
    : never;
}

// -----------------------------------------------------------------------------
// Internal adapters
// -----------------------------------------------------------------------------

// Adapts a fluent while/until predicate (which may return a fluent Effect) to
// the core boolean | core-Effect shape. Generics are honest here, but callers
// pass through the untyped implementation signatures of the overloaded
// repeat/retry methods, so no type information actually flows in.
const adaptPredicate = <I, E2, R2>(
  f: (input: I) => boolean | Effect<boolean, E2, R2>
): ((input: I) => boolean | _Effect.Effect<boolean, E2, R2>) => {
  return (input) => {
    const result = f(input);
    return Effect.is(result) ? result.effect : result;
  };
};

// The argument shapes accepted by the fluent `repeat`/`retry`: a fluent
// Schedule, a builder of fluent Schedules ($ is a type-pinning identity at
// runtime), or an options object. Type parameters are `any` because the
// overloaded method implementations erase them.
type ScheduleArg =
  | Schedule<any, any, any, any>
  | (($: typeof identity) => Schedule<any, any, any, any>)
  | Repeat.Options<any>
  | Retry.Options<any>;

// Adapts a `ScheduleArg` to what the core `repeat`/`retry` expects: a core
// Schedule or a core options object.
const adaptScheduleArg = (arg: ScheduleArg): _Schedule.Schedule<any, any, any, any> | _Effect.Repeat.Options<any> => {
  if (Schedule.is(arg)) {
    return arg.schedule;
  }
  if (isFunction(arg)) {
    return arg(identity).schedule;
  }
  const options: _Effect.Repeat.Options<any> = {};
  if (arg.while !== undefined) options.while = adaptPredicate(arg.while);
  if (arg.until !== undefined) options.until = adaptPredicate(arg.until);
  if (arg.times !== undefined) options.times = arg.times;
  if (arg.schedule !== undefined) options.schedule = arg.schedule.schedule;
  return options;
};
