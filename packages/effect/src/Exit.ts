import { Equal, Hash } from 'effect';
import * as _Effect from 'effect/Effect';
import * as _Exit from 'effect/Exit';
import { hasProperty } from 'effect/Predicate';
import { Cause } from './Cause.js';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';
import { Result } from './Result.js';

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
 * Fluent Exits implement the core `Effect` interface, so they can be yielded
 * directly inside `Effect.gen` (resuming with the value or failing with the
 * cause).
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

  [Equal.symbol](that: unknown): boolean {
    return is(that) && Equal.equals(this._exit, that.exit);
  }

  [Hash.symbol](): number {
    return Hash.hash(this._exit);
  }

  // --- Generator interop ---

  [Symbol.iterator](): _Effect.EffectIterator<Exit<A, E>> {
    return this._exit[Symbol.iterator]() as any;
  }

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
  isSuccess(): this is Success<A, E> {
    return _Exit.isSuccess(this._exit);
  }

  /**
   * Narrows to `Failure`.
   */
  isFailure(): this is Failure<A, E> {
    return _Exit.isFailure(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains typed failures.
   */
  hasFails(): this is Failure<A, E> {
    return _Exit.hasFails(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains defects.
   */
  hasDies(): this is Failure<A, E> {
    return _Exit.hasDies(this._exit);
  }

  /**
   * Narrows to `Failure` when the cause contains interruptions.
   */
  hasInterrupts(): this is Failure<A, E> {
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
    return wrap(_Exit.map(this._exit, f));
  }

  /**
   * Transforms the typed error.
   */
  mapError<E2>(f: (e: E) => E2): Exit<A, E2> {
    return wrap(_Exit.mapError(this._exit, f));
  }

  /**
   * Transforms both the success value and the typed error.
   */
  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Exit<A2, E2> {
    return wrap(_Exit.mapBoth(this._exit, options));
  }

  /**
   * Discards the success value.
   */
  get asVoid(): Exit<void, E> {
    return wrap(_Exit.asVoid(this._exit));
  }

  // --- Filters ---

  /**
   * Succeeds with the `Success` exit, or fails with the `Failure` exit.
   */
  get filterSuccess(): Result<Exit.Success<A>, Exit.Failure<never, E>> {
    return Result.wrap(_Exit.filterSuccess(this._exit)).mapBoth({
      onSuccess: (success) => wrap(success) as Exit.Success<A>,
      onFailure: (failure) => wrap(failure) as Exit.Failure<never, E>
    });
  }

  /**
   * Succeeds with the success value, or fails with the `Failure` exit.
   */
  get filterValue(): Result<A, Exit.Failure<never, E>> {
    return Result.wrap(_Exit.filterValue(this._exit)).mapError((failure) => wrap(failure) as Exit.Failure<never, E>);
  }

  /**
   * Succeeds with the `Failure` exit, or fails with the `Success` exit.
   */
  get filterFailure(): Result<Exit.Failure<never, E>, Exit.Success<A>> {
    return Result.wrap(_Exit.filterFailure(this._exit)).mapBoth({
      onSuccess: (failure) => wrap(failure) as Exit.Failure<never, E>,
      onFailure: (success) => wrap(success) as Exit.Success<A>
    });
  }

  /**
   * Succeeds with the fluent `Cause`, or fails with the `Success` exit.
   */
  get filterCause(): Result<Cause<E>, Exit.Success<A>> {
    return Result.wrap(_Exit.filterCause(this._exit)).mapBoth({
      onSuccess: Cause.wrap,
      onFailure: (success) => wrap(success) as Exit.Success<A>
    });
  }

  /**
   * Succeeds with the first typed error, or fails with the original `Exit`.
   */
  get findError(): Result<E, Exit<A, E>> {
    return Result.wrap(_Exit.findError(this._exit)).mapError(wrap);
  }

  /**
   * Succeeds with the first defect, or fails with the original `Exit`.
   */
  get findDefect(): Result<unknown, Exit<A, E>> {
    return Result.wrap(_Exit.findDefect(this._exit)).mapError(wrap);
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
    return wrap(f(this._exit));
  }
}

// --- Success and Failure classes ---

class Success<out A, out E = never> extends ExitBase<A, E> {
  readonly _tag = 'Success' as const;
  /** The success value. */
  readonly value: A;

  constructor(exit: _Exit.Success<A, E>) {
    super(exit);
    this.value = exit.value;
  }
}

class Failure<out A, out E> extends ExitBase<A, E> {
  readonly _tag = 'Failure' as const;
  /** The fluent `Cause` describing why the effect failed. */
  readonly cause: Cause<E>;

  constructor(exit: _Exit.Failure<A, E>) {
    super(exit);
    this.cause = Cause.wrap(exit.cause);
  }
}

// --- Public type alias ---

export type Exit<A, E = never> = Success<A, E> | Failure<A, E>;

type _Success<A, E> = Success<A, E>;
type _Failure<A, E> = Failure<A, E>;

export namespace Exit {
  export type Success<A, E = never> = _Success<A, E>;
  export type Failure<A, E> = _Failure<A, E>;
}

// --- Static functions ---

const wrap = <A, E>(exit: _Exit.Exit<A, E>): Exit<A, E> => {
  return _Exit.isSuccess(exit) ? new Success(exit) : new Failure(exit);
};

const is = (u: unknown): u is Exit<unknown, unknown> => hasProperty(u, ExitTypeId);

/**
 * Creates an `Exit` that succeeded with the given value.
 */
const succeed = <A>(value: A): Exit<A> => wrap(_Exit.succeed(value));

/**
 * Creates an `Exit` that failed with the given typed error.
 */
const fail = <E>(error: E): Exit<never, E> => wrap(_Exit.fail(error));

/**
 * Creates an `Exit` that failed with the given fluent `Cause`.
 */
const failCause = <E>(cause: Cause<E>): Exit<never, E> => wrap(_Exit.failCause(cause.cause));

/**
 * Creates an `Exit` that died with the given defect.
 */
const die = (defect: unknown): Exit<never> => wrap(_Exit.die(defect));

/**
 * Creates an `Exit` that was interrupted, optionally by the given fiber.
 */
const interrupt = (fiberId?: number | undefined): Exit<never> => wrap(_Exit.interrupt(fiberId));

const void_: Exit<void> = wrap(_Exit.void);

/**
 * Discards the values of an iterable of `Exit`s, failing with the first
 * failure if any.
 */
const asVoidAll = <I extends Iterable<Exit<any, any>>>(
  exits: I
): Exit<void, I extends Iterable<Exit<infer _A, infer _E>> ? _E : never> => {
  return wrap(_Exit.asVoidAll(Array.from(exits, (exit) => exit.exit))) as any;
};

export const Exit = {
  succeed,
  fail,
  failCause,
  die,
  interrupt,
  void: void_,
  wrap,
  is,
  asVoidAll
} as const;
