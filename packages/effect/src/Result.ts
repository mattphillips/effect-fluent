import { Equal, Equivalence, Hash } from 'effect';
import type { LazyArg } from 'effect/Function';
import { dual, identity } from 'effect/Function';
import type { TypeLambda } from 'effect/HKT';
import * as _Option from 'effect/Option';
import * as _Result from 'effect/Result';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty, isFunction } from 'effect/Predicate';
import type { NoInfer, NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

/**
 * The unique type identifier used to recognise fluent `Result` values at runtime.
 *
 * @see {@link Result.is} to check a value against this identifier
 */
export const ResultTypeId: unique symbol = Symbol.for('~effect-fluent/Result') as ResultTypeId;
export type ResultTypeId = typeof ResultTypeId;

/**
 * Type lambda for `Result`, enabling higher-kinded utilities such as the
 * generator implementation behind `Result.gen`.
 */
export interface ResultTypeLambda extends TypeLambda {
  readonly type: Result<this['Target'], this['Out1']>;
}

/**
 * The iterator produced when a `Result` is used with `yield*` inside
 * `Result.gen`, yielding the `Result` and resuming with its success value.
 */
export interface ResultIterator<T extends Result<any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<T, T extends Result<infer A, any> ? A : never>;
}

abstract class ResultBase<out A, out E> extends Inspectable {
  private readonly _result: _Result.Result<A, E>;
  abstract readonly _tag: 'Success' | 'Failure';
  abstract readonly _op: 'Success' | 'Failure';
  readonly [ResultTypeId]: ResultTypeId = ResultTypeId;

  constructor(result: _Result.Result<A, E>) {
    super();
    this._result = result;
  }

  /**
   * The underlying core `effect` `Result` this fluent wrapper is built around.
   *
   * Use this when you need to hand the value to APIs from `effect` that expect
   * a plain `Result`.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   * import * as CoreResult from "effect/Result"
   *
   * const core = Result.succeed(1).result
   * console.log(CoreResult.isSuccess(core)) // true
   * ```
   *
   * @see {@link Result.wrap} for the reverse conversion
   */
  get result(): _Result.Result<A, E> {
    return this._result;
  }

  // --- Equal & Hash ---

  /**
   * Implements the `Equal` protocol: two `Result` values are equal when their
   * underlying results are equal.
   */
  [Equal.symbol](that: unknown): boolean {
    return is(that) && Equal.equals(this._result, that.result);
  }

  /**
   * Implements the `Hash` protocol by hashing the underlying result.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._result);
  }

  // --- Type guards ---

  /**
   * Checks whether this `Result` is a `Success`, narrowing the type so that
   * `.success` becomes accessible.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(42)
   * if (result.isSuccess()) {
   *   console.log(result.success) // 42
   * }
   * ```
   *
   * @see {@link isFailure} for the opposite check
   */
  isSuccess(): this is Success<A, E> {
    return this._tag === 'Success';
  }

  /**
   * Checks whether this `Result` is a `Failure`, narrowing the type so that
   * `.failure` becomes accessible.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.fail("oops")
   * if (result.isFailure()) {
   *   console.log(result.failure) // "oops"
   * }
   * ```
   *
   * @see {@link isSuccess} for the opposite check
   */
  isFailure(): this is Failure<A, E> {
    return this._tag === 'Failure';
  }

  // --- Generator interop ---

  /**
   * Enables `yield*` on a `Result` inside `Result.gen`, unwrapping the success
   * value or short-circuiting the generator on failure.
   *
   * @see {@link Result.gen}
   */
  [Symbol.iterator](): ResultIterator<Result<A, E>> {
    return new Gen.SingleShotGen(this) as any;
  }

  // --- Instance methods: Pattern matching ---

  /**
   * Folds this `Result` into a single value by applying `onSuccess` to a
   * success or `onFailure` to a failure.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const message = Result.succeed(42).match({
   *   onSuccess: (n) => `Got ${n}`,
   *   onFailure: (e) => `Err: ${e}`
   * })
   * console.log(message) // "Got 42"
   * ```
   *
   * @see {@link merge} to extract `A | E` without mapping
   * @see {@link getOrElse} to unwrap only the success with a fallback
   */
  match<B, C = B>(options: { readonly onFailure: (error: E) => B; readonly onSuccess: (a: A) => C }): B | C {
    return _Result.match(this._result, options);
  }

  // --- Instance methods: Mapping ---

  /**
   * Transforms the success value with `f`, leaving a failure unchanged.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(3).map((n) => n * 2)
   * console.log(result.getOrElse(() => 0)) // 6
   * ```
   *
   * @see {@link mapError} to transform only the error value
   * @see {@link flatMap} when `f` returns a `Result`
   */
  map<B>(f: (a: A) => B): Result<B, E> {
    return wrap(_Result.map(this._result, f));
  }

  /**
   * Transforms the failure value with `f`, leaving a success unchanged.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.fail("not found").mapError((e) => `Error: ${e}`)
   * console.log(result.merge) // "Error: not found"
   * ```
   *
   * @see {@link map} to transform only the success value
   * @see {@link mapBoth} to transform both channels
   */
  mapError<E2>(f: (e: E) => E2): Result<A, E2> {
    return wrap(_Result.mapError(this._result, f));
  }

  /**
   * Transforms both channels at once: `onSuccess` for a success, `onFailure`
   * for a failure. The result stays a `Result`.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(1).mapBoth({
   *   onSuccess: (n) => n + 1,
   *   onFailure: (e) => `Error: ${e}`
   * })
   * console.log(result.getOrElse(() => 0)) // 2
   * ```
   *
   * @see {@link match} to fold into a single value instead
   */
  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Result<A2, E2> {
    return wrap(_Result.mapBoth(this._result, options));
  }

  // --- Instance methods: Sequencing ---

  /**
   * Chains a computation that itself returns a `Result`. A failure
   * short-circuits and is returned unchanged; error types are merged into a
   * union.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(5).flatMap((n) =>
   *   n > 0 ? Result.succeed(n * 2) : Result.fail("not positive")
   * )
   * console.log(result.getOrElse(() => 0)) // 10
   * ```
   *
   * @see {@link andThen} for a more flexible variant that also accepts plain values
   * @see {@link map} when `f` does not return a `Result`
   */
  flatMap<B, E2>(f: (a: A) => Result<B, E2>): Result<B, E | E2> {
    return wrap(_Result.flatMap(this._result, (a) => f(a).result));
  }

  /**
   * Sequences a computation after this one, accepting a function returning a
   * `Result`, a plain mapping function, a constant `Result`, or a constant
   * value.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const a = Result.succeed(1).andThen((n) => Result.succeed(n + 1))
   * const b = Result.succeed(1).andThen((n) => n + 1)
   * const c = Result.succeed(1).andThen("done")
   *
   * console.log(a.merge, b.merge, c.merge) // 2 2 "done"
   * ```
   *
   * @see {@link flatMap} for the stricter variant (function returning Result only)
   */
  andThen<B, E2>(f: (a: A) => Result<B, E2>): Result<B, E | E2>;
  andThen<B, E2>(f: Result<B, E2>): Result<B, E | E2>;
  andThen<B>(f: (a: A) => B): Result<B, E>;
  andThen<B>(f: NotFunction<B>): Result<B, E>;
  andThen(f: any): Result<any, any> {
    return this.flatMap((a) => {
      const b = isFunction(f) ? f(a) : f;
      if (b != null && typeof b === 'object' && ResultTypeId in b) {
        return b as Result<any, any>;
      }
      return new Success(b);
    });
  }

  /**
   * Runs a side effect on the success value without changing the `Result`.
   * The callback is not invoked on failure. Useful for logging or debugging.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(42).tap((n) => console.log("Got:", n))
   * // Output: "Got: 42"
   * console.log(result.isSuccess()) // true
   * ```
   */
  tap(f: (a: A) => void): Result<A, E> {
    return wrap(_Result.tap(this._result, f));
  }

  // --- Instance methods: Getters ---

  /**
   * Extracts the success value, or computes a fallback from the failure value.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(1).getOrElse(() => 0)) // 1
   * console.log(Result.fail("err").getOrElse(() => 0)) // 0
   * ```
   *
   * @see {@link getOrNull} / {@link getOrUndefined} for simpler fallbacks
   * @see {@link orElse} to recover with another Result instead of unwrapping
   */
  getOrElse<B>(onFailure: (e: E) => B): A | B {
    return _Result.getOrElse(this._result, onFailure);
  }

  /**
   * The success value, or `null` on failure.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(1).getOrNull) // 1
   * console.log(Result.fail("err").getOrNull) // null
   * ```
   *
   * @see {@link getOrUndefined} to return `undefined` instead
   */
  get getOrNull(): A | null {
    return _Result.getOrNull(this._result);
  }

  /**
   * The success value, or `undefined` on failure.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(1).getOrUndefined) // 1
   * console.log(Result.fail("err").getOrUndefined) // undefined
   * ```
   *
   * @see {@link getOrNull} to return `null` instead
   */
  get getOrUndefined(): A | undefined {
    return _Result.getOrUndefined(this._result);
  }

  /**
   * The success value; throws the raw failure value if this is a `Failure`.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(1).getOrThrow) // 1
   *
   * // This would throw the string "error":
   * // Result.fail("error").getOrThrow
   * ```
   *
   * @see {@link getOrThrowWith} for custom error mapping
   * @see {@link getOrElse} for a non-throwing alternative
   */
  get getOrThrow(): A {
    return _Result.getOrThrow(this._result);
  }

  /**
   * Extracts the success value, or throws the value produced by `onFailure`
   * applied to the failure.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(1).getOrThrowWith(() => new Error("fail"))) // 1
   *
   * // This would throw: new Error("Unexpected: oops")
   * // Result.fail("oops").getOrThrowWith((e) => new Error(`Unexpected: ${e}`))
   * ```
   *
   * @see {@link getOrThrow} to throw the raw failure value
   */
  getOrThrowWith(onFailure: (e: E) => unknown): A {
    return _Result.getOrThrowWith(this._result, onFailure);
  }

  /**
   * The inner value regardless of channel: the success value for a `Success`,
   * the failure value for a `Failure`. Useful when both channels share a
   * compatible type.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(42).merge) // 42
   * console.log(Result.fail("error").merge) // "error"
   * ```
   *
   * @see {@link match} to map each branch to a common type
   */
  get merge(): A | E {
    return _Result.merge(this._result);
  }

  // --- Instance methods: Error handling ---

  /**
   * Recovers from a failure by producing another `Result` from the error.
   * A success is returned unchanged.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.fail("primary failed").orElse(() => Result.succeed(99))
   * console.log(result.getOrElse(() => 0)) // 99
   * ```
   *
   * @see {@link getOrElse} to unwrap with a fallback value (not a Result)
   * @see {@link mapError} to transform the error without recovering
   */
  orElse<A2, E2>(that: (err: E) => Result<A2, E2>): Result<A | A2, E2> {
    return wrap(_Result.orElse(this._result, (e) => that(e).result));
  }

  /**
   * This `Result` with its channels swapped: a `Success<A>` becomes a
   * `Failure` holding `A`, and a `Failure<E>` becomes a `Success` holding `E`.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed(42).flip.isFailure()) // true
   * console.log(Result.fail("error").flip.getOrElse(() => "none")) // "error"
   * ```
   *
   * @see {@link mapError} to transform the error without swapping
   */
  get flip(): Result<E, A> {
    return wrap(_Result.flip(this._result));
  }

  /**
   * Fails with the error produced by `orFailWith` when the success value does
   * not satisfy the predicate. A refinement additionally narrows the success
   * type. An existing failure is returned unchanged.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(0).filterOrFail(
   *   (n) => n > 0,
   *   (n) => `${n} is not positive`
   * )
   * console.log(result.merge) // "0 is not positive"
   * ```
   *
   * @see {@link Result.liftPredicate} to create a `Result` from a raw value with a predicate
   */
  filterOrFail<B extends A, E2>(refinement: Refinement<A, B>, orFailWith: (a: A) => E2): Result<B, E | E2>;
  filterOrFail<E2>(predicate: Predicate<A>, orFailWith: (a: A) => E2): Result<A, E | E2>;
  filterOrFail(predicate: Predicate<A>, orFailWith: (a: A) => unknown): Result<A, any> {
    return wrap(_Result.filterOrFail(this._result, predicate, orFailWith));
  }

  // --- Instance methods: Conversions to fluent Option ---

  /**
   * The success value as a fluent `Option`, discarding failure information:
   * `Some` of the value on success, `None` on failure.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.succeed("ok").getSuccess.getOrElse(() => "none")) // "ok"
   * console.log(Result.fail("err").getSuccess.isNone()) // true
   * ```
   *
   * @see {@link getFailure} to extract the error instead
   * @see {@link Result.fromOption} for the reverse conversion
   */
  get getSuccess(): Option<A> {
    return this.isSuccess() ? Option.some(this.success) : Option.none();
  }

  /**
   * The failure value as a fluent `Option`, discarding the success:
   * `Some` of the error on failure, `None` on success.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * console.log(Result.fail("err").getFailure.getOrElse(() => "none")) // "err"
   * console.log(Result.succeed("ok").getFailure.isNone()) // true
   * ```
   *
   * @see {@link getSuccess} to extract the success instead
   */
  get getFailure(): Option<E> {
    return this.isFailure() ? Option.some(this.failure) : Option.none();
  }

  // --- Instance methods: Do notation ---

  /**
   * Wraps the success value in an object under the given field name, typically
   * to start a do-notation chain from an existing `Result`.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   *
   * const result = Result.succeed(42).bindTo("answer")
   * console.log(result.getOrElse(() => null)) // { answer: 42 }
   * ```
   *
   * @see {@link Result.Do} to start from an empty object
   * @see {@link Result.bind} to add more fields
   */
  bindTo<N extends string>(name: N): Result<{ [K in N]: A }, E> {
    return wrap(_Result.bindTo(this._result, name));
  }

  /**
   * Escape hatch: applies a function operating on the underlying core `Result`
   * and re-wraps its output in the fluent API. Use this to reach combinators
   * from `effect` that have no fluent counterpart.
   *
   * @example
   * ```ts
   * import { Result } from "effect-fluent"
   * import * as CoreResult from "effect/Result"
   *
   * const result = Result.succeed(3).with((r) => CoreResult.map(r, (n) => n * 2))
   * console.log(result.getOrElse(() => 0)) // 6
   * ```
   *
   * @see {@link result} to access the underlying core `Result` directly
   */
  with<B, E2>(f: (result: _Result.Result<A, E>) => _Result.Result<B, E2>): Result<B, E | E2> {
    return wrap(f(this._result));
  }
}

// --- Success and Failure classes ---

/**
 * The `Success` variant of {@link Result}, holding a value of type `A`.
 */
class Success<out A, out E> extends ResultBase<A, E> {
  readonly _tag = 'Success' as const;
  readonly _op = 'Success' as const;
  /**
   * The success value. Only accessible after narrowing with
   * {@link ResultBase.isSuccess | isSuccess}.
   */
  readonly success: A;

  constructor(value: A) {
    super(_Result.succeed(value));
    this.success = value;
  }

  toJSON(): unknown {
    return { _id: 'Result', _tag: 'Success', value: this.success };
  }
}

/**
 * The `Failure` variant of {@link Result}, holding an error of type `E`.
 */
class Failure<out A, out E> extends ResultBase<A, E> {
  readonly _tag = 'Failure' as const;
  readonly _op = 'Failure' as const;
  /**
   * The failure value. Only accessible after narrowing with
   * {@link ResultBase.isFailure | isFailure}.
   */
  readonly failure: E;

  constructor(error: E) {
    super(_Result.fail(error));
    this.failure = error;
  }

  toJSON(): unknown {
    return { _id: 'Result', _tag: 'Failure', failure: this.failure };
  }
}

// --- Public type alias ---

/**
 * A fluent `Result` represents a computation that either succeeded with a
 * value of type `A` or failed with an error of type `E`. Combinators are
 * available as chainable methods and getters.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const value = Result.succeed(1)
 *   .map((n) => n + 1)
 *   .flatMap((n) => (n > 0 ? Result.succeed(n * 10) : Result.fail("negative")))
 *   .getOrElse(() => 0)
 *
 * console.log(value) // 20
 * ```
 */
export type Result<A, E = never> = Success<A, E> | Failure<A, E>;

type _Success<A, E> = Success<A, E>;
type _Failure<A, E> = Failure<A, E>;

export namespace Result {
  /**
   * The `Success` variant of {@link Result}, exposing the `success` value.
   */
  export type Success<A, E = never> = _Success<A, E>;
  /**
   * The `Failure` variant of {@link Result}, exposing the `failure` value.
   */
  export type Failure<A, E> = _Failure<A, E>;
}

// --- Static functions ---

/**
 * Creates a `Result` holding a `Success` value. The error type `E` defaults
 * to `never`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.succeed(42)
 * console.log(result.isSuccess()) // true
 * ```
 *
 * @see {@link fail} to create a Failure
 */
const succeed = <A>(value: A): Result<A> => new Success(value);

/**
 * Creates a `Result` holding a `Failure` value. The success type `A` defaults
 * to `never`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.fail("Something went wrong")
 * console.log(result.isFailure()) // true
 * ```
 *
 * @see {@link succeed} to create a Success
 */
const fail = <E>(error: E): Result<never, E> => new Failure(error);

/**
 * A pre-built successful `Result` carrying `undefined`. Use when you need a
 * successful result that signals completion without carrying data.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result: Result<void> = Result.void
 * console.log(result.isSuccess()) // true
 * ```
 *
 * @see {@link succeed} to create a Success with a specific value
 */
const void_: Result<void> = succeed(undefined as void);

/**
 * A pre-built failed `Result` whose failure value is `undefined`. Use when a
 * failure acts only as a control signal without error data.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.failVoid
 * console.log(result.isFailure()) // true
 * ```
 *
 * @see {@link fail} to create a Failure with a specific value
 */
const failVoid: Result<never, void> = fail(undefined as void);

/**
 * Wraps a core `effect` `Result` in the fluent API. This is the entry point
 * for values produced by plain `effect` combinators.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 * import * as CoreResult from "effect/Result"
 *
 * const result = Result.wrap(CoreResult.succeed(42))
 * console.log(result.map((n) => n + 1).getOrElse(() => 0)) // 43
 * ```
 *
 * @see the `result` getter for the reverse conversion
 */
const wrap = <A, E>(r: _Result.Result<A, E>): Result<A, E> => {
  return _Result.isSuccess(r) ? new Success(r.success) : new Failure(r.failure);
};

/**
 * Checks whether a value is a fluent `Result` (either `Success` or `Failure`),
 * acting as a TypeScript type guard.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * console.log(Result.is(Result.succeed(1))) // true
 * console.log(Result.is({ value: 1 })) // false
 * ```
 */
const is = (u: unknown): u is Result<unknown, unknown> => hasProperty(u, ResultTypeId);

/**
 * Runs a function that may throw, capturing the outcome as a `Result`. With a
 * single function argument the error type is `unknown`; with `{ try, catch }`
 * options the `catch` function maps the thrown value to `E`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const ok = Result.try(() => JSON.parse('{"name": "Alice"}'))
 * console.log(ok.isSuccess()) // true
 *
 * const err = Result.try({
 *   try: () => JSON.parse("not json"),
 *   catch: (e) => `Parse failed: ${e}`
 * })
 * console.log(err.isFailure()) // true
 * ```
 *
 * @see {@link succeed} / {@link fail} for direct construction
 */
const try_: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Result<A, E>;
  <A>(evaluate: LazyArg<A>): Result<A, unknown>;
} = <A, E>(
  evaluate: LazyArg<A> | { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }
): Result<A, E> | Result<A, unknown> => {
  if (isFunction(evaluate)) {
    return wrap(_Result.try(evaluate));
  } else {
    return wrap(_Result.try(evaluate));
  }
};

/**
 * Creates a `Result` from a nullable value: non-nullish values become a
 * `Success`, while `null` or `undefined` becomes a `Failure` using the
 * provided function.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * console.log(Result.fromNullishOr(1, () => "fallback").getOrElse(() => 0)) // 1
 * console.log(Result.fromNullishOr(null, () => "fallback").merge) // "fallback"
 * ```
 *
 * @see {@link fromOption} to convert from an Option
 */
const fromNullishOr: {
  <A, E>(onNullish: (a: A) => E): (self: A) => Result<NonNullable<A>, E>;
  <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E>;
} = dual(2, <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E> => {
  return wrap(_Result.fromNullishOr(self, onNullish));
});

/**
 * Converts a fluent `Option` into a `Result`: `Some` becomes a `Success` and
 * `None` becomes a `Failure` using the provided `onNone` function.
 *
 * @example
 * ```ts
 * import { Option, Result } from "effect-fluent"
 *
 * const some = Result.fromOption(Option.some(1), () => "missing")
 * console.log(some.getOrElse(() => 0)) // 1
 *
 * const none = Result.fromOption(Option.none(), () => "missing")
 * console.log(none.merge) // "missing"
 * ```
 *
 * @see the `getSuccess` / `getFailure` getters for the reverse conversion
 */
const fromOption: {
  <E>(onNone: () => E): <A>(self: Option<A>) => Result<A, E>;
  <A, E>(self: Option<A>, onNone: () => E): Result<A, E>;
} = dual(2, <A, E>(self: Option<A>, onNone: () => E): Result<A, E> => {
  return wrap(_Result.fromOption(self.option, onNone));
});

/**
 * Turns a predicate check into a `Result`: the value becomes a `Success` when
 * the predicate holds, otherwise `orFailWith` produces the failure. A
 * refinement additionally narrows the success type.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.liftPredicate(
 *   5,
 *   (n: number) => n > 0,
 *   (n) => `${n} is not positive`
 * )
 * console.log(result.getOrElse(() => 0)) // 5
 * ```
 *
 * @see the `filterOrFail` method to validate a value already in a `Result`
 */
const liftPredicate: {
  <A, B extends A, E>(refinement: Refinement<A, B>, orFailWith: (a: A) => E): (a: A) => Result<B, E>;
  <B extends A, E, A = B>(predicate: Predicate<A>, orFailWith: (a: A) => E): (b: B) => Result<B, E>;
  <A, E, B extends A>(self: A, refinement: Refinement<A, B>, orFailWith: (a: A) => E): Result<B, E>;
  <B extends A, E, A = B>(self: B, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<B, E>;
} = dual(3, <A, E>(a: A, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<A, E> => {
  return wrap(_Result.liftPredicate(a, predicate, orFailWith));
});

/**
 * Combines multiple `Result` values into one: a tuple or iterable of Results
 * becomes a Result of an array, and a struct of Results becomes a Result of a
 * struct. Short-circuits on the first `Failure` encountered.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const tuple = Result.all([Result.succeed(1), Result.succeed("two")])
 * console.log(tuple.getOrElse(() => null)) // [1, "two"]
 *
 * const struct = Result.all({ x: Result.succeed(1), y: Result.fail("err") })
 * console.log(struct.merge) // "err"
 * ```
 *
 * @see {@link gen} for generator-based composition of multiple Results
 */
const all: {
  <const I extends Iterable<Result<any, any>> | Record<string, Result<any, any>>>(
    input: I
  ): [I] extends [ReadonlyArray<Result<any, any>>]
    ? Result<
        { -readonly [K in keyof I]: [I[K]] extends [Result<infer A, any>] ? A : never },
        I[number] extends never ? never : [I[number]] extends [Result<any, infer E>] ? E : never
      >
    : [I] extends [Iterable<Result<infer A, infer E>>]
      ? Result<Array<A>, E>
      : Result<
          { -readonly [K in keyof I]: [I[K]] extends [Result<infer A, any>] ? A : never },
          I[keyof I] extends never ? never : [I[keyof I]] extends [Result<any, infer E>] ? E : never
        >;
} = <const I extends Iterable<Result<any, any>> | Record<string, Result<any, any>>>(input: I): any => {
  if (Symbol.iterator in input) {
    const out: Array<any> = [];
    for (const r of input as Iterable<Result<any, any>>) {
      if (r.isFailure()) return r;
      out.push(r.success);
    }
    return new Success(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const r = (input as Record<string, Result<any, any>>)[key];
    if (r.isFailure()) return r;
    out[key] = r.success;
  }
  return new Success(out);
};

/**
 * Composes `Result` values with generator syntax. Use `yield*` to unwrap a
 * `Result` inside the generator: if any yielded `Result` is a `Failure`, the
 * generator short-circuits and returns that failure; otherwise the return
 * value is wrapped in a `Success`. Evaluated eagerly and synchronously.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.gen(function* () {
 *   const a = yield* Result.succeed(1)
 *   const b = yield* Result.succeed(2)
 *   return a + b
 * })
 *
 * console.log(result.getOrElse(() => 0)) // 3
 * ```
 *
 * @see {@link all} to collect multiple independent Results
 */
const gen: Gen.Gen<ResultTypeLambda> = (...args) => {
  const f = args.length === 1 ? args[0] : args[1].bind(args[0]);
  const iterator = f();
  let state: IteratorResult<any> = iterator.next();
  while (!state.done) {
    const current = state.value;
    if (current.isFailure()) {
      return current;
    }
    state = iterator.next(current.success as never);
  }
  return succeed(state.value);
};

/**
 * The entry point for do-notation: a `Result<{}>` succeeding with an empty
 * object. Combine with {@link bind} to add `Result`-producing fields and
 * `Result.let` to add pure computed fields.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.bind(Result.Do, "x", () => Result.succeed(2))
 * console.log(result.getOrElse(() => null)) // { x: 2 }
 * ```
 *
 * @see {@link gen} for an alternative generator-based syntax
 */
const Do: Result<{}> = new Success({});

/**
 * Do-notation: adds a field to the object in the success channel by running a
 * `Result`-producing function. Short-circuits on the first `Failure`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.bind(
 *   Result.bind(Result.Do, "x", () => Result.succeed(2)),
 *   "y",
 *   ({ x }) => Result.succeed(x + 3)
 * )
 * console.log(result.getOrElse(() => null)) // { x: 2, y: 5 }
 * ```
 *
 * @see {@link Do} to start the do-notation chain
 * @see the `bindTo` method to wrap an initial Result into a named field
 */
const bind: {
  <N extends string, A extends object, B, L2>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): <L1>(self: Result<A, L1>) => Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>;
  <A extends object, L1, N extends string, B, L2>(
    self: Result<A, L1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>;
} = dual(
  3,
  <N extends string, A extends object, B, L1, L2>(
    self: Result<A, L1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2> => {
    return wrap(_Result.bind(self.result, name, (a: A) => f(a).result));
  }
);

/**
 * Do-notation: adds a pure computed field to the object in the success
 * channel. Use {@link bind} when the computation returns a `Result`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.let(
 *   Result.bind(Result.Do, "x", () => Result.succeed(2)),
 *   "double",
 *   ({ x }) => x * 2
 * )
 * console.log(result.getOrElse(() => null)) // { x: 2, double: 4 }
 * ```
 *
 * @see {@link Do} to start the do-notation chain
 */
const let_: {
  <N extends string, R extends object, B>(
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): <L>(self: Result<R, L>) => Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>;
  <R extends object, L, N extends string, B>(
    self: Result<R, L>,
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>;
} = dual(
  3,
  <N extends string, R extends object, B, L1, L2>(
    self: Result<R, L1>,
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L1 | L2> => {
    return wrap(_Result.let(self.result, name, (r: R) => f(r)));
  }
);

/**
 * Collapses a nested `Result` (a `Result` whose success is itself a `Result`)
 * into a single layer, merging the error types.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const nested = Result.succeed(Result.succeed(42))
 * console.log(Result.flatten(nested).getOrElse(() => 0)) // 42
 * ```
 */
const flatten = <A, E, E2>(self: Result<Result<A, E>, E2>): Result<A, E | E2> => self.flatMap(identity);

/**
 * Creates an `Equivalence` for comparing two `Result` values: successes are
 * compared with the `success` equivalence, failures with the `failure`
 * equivalence, and a `Success` never equals a `Failure`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 * import { Equivalence } from "effect"
 *
 * const eq = Result.makeEquivalence(
 *   Equivalence.strictEqual<number>(),
 *   Equivalence.strictEqual<string>()
 * )
 *
 * console.log(eq(Result.succeed(1), Result.succeed(1))) // true
 * console.log(eq(Result.succeed(1), Result.fail("x"))) // false
 * ```
 */
const makeEquivalence = <A, E>(
  success: Equivalence.Equivalence<A>,
  failure: Equivalence.Equivalence<E>
): Equivalence.Equivalence<Result<A, E>> =>
  Equivalence.make((x, y) => {
    if (x.isFailure()) {
      return y.isFailure() ? failure(x.failure, y.failure) : false;
    }
    return y.isSuccess() ? success(x.success, y.success) : false;
  });

/**
 * A pre-built `Result<Option<never>>` that succeeds with `None`. Useful for
 * the absent branch of optional-success workflows.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * console.log(Result.succeedNone.isSuccess()) // true
 * console.log(Result.succeedNone.getOrThrow.isNone()) // true
 * ```
 *
 * @see {@link succeedSome} for the `Some` counterpart
 */
const succeedNone: Result<Option<never>> = succeed(Option.none());

/**
 * Creates a `Result<Option<A>>` that succeeds with `Some(a)`. Equivalent to
 * `Result.succeed(Option.some(a))`.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const result = Result.succeedSome(42)
 * console.log(result.getOrThrow.getOrElse(() => 0)) // 42
 * ```
 *
 * @see {@link succeedNone} for the `None` counterpart
 */
const succeedSome = <A, E = never>(a: A): Result<Option<A>, E> => new Success(Option.some(a));

/**
 * Transposes a fluent `Option` of a `Result` into a `Result` of a fluent
 * `Option`: `None` becomes `Success(None)`, `Some(Success(a))` becomes
 * `Success(Some(a))`, and `Some(Failure(e))` becomes `Failure(e)`.
 *
 * @example
 * ```ts
 * import { Option, Result } from "effect-fluent"
 *
 * const some = Option.some(Result.succeed(42))
 * console.log(Result.transposeOption(some).getOrThrow.getOrElse(() => 0)) // 42
 *
 * const none = Option.none<Result<number, string>>()
 * console.log(Result.transposeOption(none).getOrThrow.isNone()) // true
 * ```
 *
 * @see {@link transposeMapOption} to map and transpose in one step
 */
const transposeOption = <A = never, E = never>(self: Option<Result<A, E>>): Result<Option<A>, E> => {
  return wrap(_Result.transposeOption(self.map((r) => r.result).option)).map(Option.wrap);
};

/**
 * Maps a fluent `Option` with a `Result`-producing function and transposes the
 * outcome: `None` becomes `Success(None)` without calling `f`, while `Some(a)`
 * becomes `Success(Some(b))` or `Failure(e)` depending on `f(a)`.
 *
 * @example
 * ```ts
 * import { Option, Result } from "effect-fluent"
 *
 * const parse = (s: string) =>
 *   isNaN(Number(s)) ? Result.fail("not a number") : Result.succeed(Number(s))
 *
 * const result = Result.transposeMapOption(Option.some("42"), parse)
 * console.log(result.getOrThrow.getOrElse(() => 0)) // 42
 * ```
 *
 * @see {@link transposeOption} when the Option already contains a Result
 */
const transposeMapOption: {
  <A, B, E = never>(f: (self: A) => Result<B, E>): (self: Option<A>) => Result<Option<B>, E>;
  <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E>;
} = dual(2, <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E> => {
  return wrap(_Result.transposeMapOption(self.option, (a) => f(a).result)).map(Option.wrap);
});

/**
 * Static constructors and utilities for the fluent {@link Result} type.
 *
 * @example
 * ```ts
 * import { Result } from "effect-fluent"
 *
 * const value = Result.succeed(1)
 *   .map((n) => n + 1)
 *   .getOrElse(() => 0)
 *
 * console.log(value) // 2
 * ```
 */
export const Result = {
  succeed,
  fail,
  void: void_,
  failVoid,
  try: try_,
  wrap,
  is,
  fromNullishOr,
  fromOption,
  liftPredicate,
  all,
  gen,
  Do,
  bind,
  let: let_,
  flatten,
  makeEquivalence,
  succeedNone,
  succeedSome,
  transposeOption,
  transposeMapOption
} as const;
