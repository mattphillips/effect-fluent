import { Equal, Hash } from 'effect';
import * as _Cause from 'effect/Cause';
import type * as Context from 'effect/Context';
import { hasProperty } from 'effect/Predicate';
import { Effect } from './Effect.js';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';
import { Result } from './Result.js';

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

  [Equal.symbol](that: unknown): boolean {
    return Cause.is(that) && Equal.equals(this._cause, that.cause);
  }

  [Hash.symbol](): number {
    return Hash.hash(this._cause);
  }

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
