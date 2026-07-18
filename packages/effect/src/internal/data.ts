import { Equal, Equivalence, Hash } from 'effect';
import type { Filter } from 'effect/Filter';
import { dual, identity, type LazyArg } from 'effect/Function';
import type { TypeLambda } from 'effect/HKT';
import * as _Option from 'effect/Option';
import type { Order } from 'effect/Order';
import * as order from 'effect/Order';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty, isFunction } from 'effect/Predicate';
import * as _Result from 'effect/Result';
import type { NoInfer, NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import { Inspectable } from '../Inspectable.js';

// This module co-locates the mutually-recursive fluent classes (Option, Result)
// so the public modules can be cycle-free re-export facades, mirroring upstream
// effect's internal/core structure. Cross-references between these classes are
// same-module and safe in every load order.

// -----------------------------------------------------------------------------
// Option
// -----------------------------------------------------------------------------

/**
 * Unique symbol used to identify fluent `Option` instances at runtime.
 *
 * Present on every `Some` and `None`; `Option.is` checks for it.
 */
export const OptionTypeId: unique symbol = Symbol.for('~effect-fluent/Option') as OptionTypeId;

/**
 * The type of {@link OptionTypeId}.
 */
export type OptionTypeId = typeof OptionTypeId;

/**
 * Type lambda for the fluent `Option`, enabling higher-kinded abstractions
 * such as `Option.gen`.
 */
export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this['Target']>;
}

/**
 * Iterator type backing the generator interop, allowing `Option` values to be
 * unwrapped with `yield*` inside `Option.gen`.
 */
export interface OptionIterator<T extends Option<any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<T, T extends Option<infer A> ? A : never>;
}

/**
 * Base class for the fluent `Option` wrapper, providing all instance methods
 * shared by `Some` and `None`.
 */
abstract class OptionBase<out A> extends Inspectable {
  private readonly _option: _Option.Option<A>;

  /**
   * Discriminant identifying this Option as either `'Some'` or `'None'`.
   */
  abstract readonly _tag: 'Some' | 'None';

  /**
   * Internal op-code mirroring `_tag`; used by the effect runtime.
   */
  abstract readonly _op: 'Some' | 'None';
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId;

  constructor(option: _Option.Option<A>) {
    super();
    this._option = option;
  }

  /**
   * The underlying core `effect/Option` value backing this fluent wrapper.
   *
   * Use this to interoperate with APIs that expect the core `Option` type.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import * as CoreOption from "effect/Option"
   *
   * const core = Option.some(1).option
   * console.log(CoreOption.isSome(core)) // true
   * ```
   *
   * @see {@link with} to apply a core combinator and re-wrap the result
   */
  get option(): _Option.Option<A> {
    return this._option;
  }

  // --- Equal & Hash ---

  /**
   * Implements structural equality: two `Option`s are equal when both are
   * `None`, or both are `Some` of equal values.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import { Equal } from "effect"
   *
   * console.log(Equal.equals(Option.some(1), Option.some(1))) // true
   * console.log(Equal.equals(Option.some(1), Option.none())) // false
   * ```
   */
  [Equal.symbol](that: unknown): boolean {
    return optionIs(that) && Equal.equals(this._option, that.option);
  }

  /**
   * Implements hashing consistent with structural equality, so equal `Option`s
   * produce equal hashes.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import { Hash } from "effect"
   *
   * console.log(Hash.hash(Option.some(1)) === Hash.hash(Option.some(1))) // true
   * ```
   */
  [Hash.symbol](): number {
    return Hash.hash(this._option);
  }

  // --- Type guards ---

  /**
   * Checks whether this `Option` contains a value, narrowing the type to
   * `Some<A>` so `.value` can be accessed.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const opt = Option.some(1)
   * if (opt.isSome()) {
   *   console.log(opt.value) // 1
   * }
   * ```
   *
   * @see {@link isNone} for the opposite check
   */
  isSome(): this is OptionSome<A> {
    return this._tag === 'Some';
  }

  /**
   * Checks whether this `Option` is absent, narrowing the type to `None<A>`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.none().isNone()) // true
   * console.log(Option.some(1).isNone()) // false
   * ```
   *
   * @see {@link isSome} for the opposite check
   */
  isNone(): this is OptionNone<A> {
    return this._tag === 'None';
  }

  // --- Generator interop ---

  /**
   * Enables `yield*` on an `Option` inside `Option.gen`, unwrapping the
   * `Some` value or short-circuiting the generator on `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const result = Option.gen(function* () {
   *   const a = yield* Option.some(1)
   *   const b = yield* Option.some(2)
   *   return a + b
   * })
   * console.log(result.getOrNull) // 3
   * ```
   *
   * @see {@link Option.gen} for the generator runner
   */
  [Symbol.iterator](): OptionIterator<Option<A>> {
    return new Gen.SingleShotGen(this) as any;
  }

  // --- Instance methods: Pattern matching ---

  /**
   * Pattern-matches on this `Option`, handling both the `None` and `Some`
   * cases in one expression and returning a plain value.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const message = Option.some(1).match({
   *   onNone: () => "Option is empty",
   *   onSome: (value) => `Option has a value: ${value}`
   * })
   * console.log(message) // "Option has a value: 1"
   * ```
   *
   * @see {@link getOrElse} for unwrapping with a default
   */
  match<B, C = B>(options: { readonly onNone: LazyArg<B>; readonly onSome: (a: A) => C }): B | C {
    return _Option.match(this._option, options);
  }

  // --- Instance methods: Mapping ---

  /**
   * Transforms the value inside a `Some` using the provided function, leaving
   * `None` unchanged.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(2).map((n) => n * 2))
   * // Output: { _id: 'Option', _tag: 'Some', value: 4 }
   *
   * console.log(Option.none<number>().map((n) => n * 2))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link flatMap} when the function returns an `Option`
   */
  map<B>(f: (a: A) => B): Option<B> {
    return optionWrap(_Option.map(this._option, f));
  }

  /**
   * Replaces the value inside a `Some` with a constant, leaving `None`
   * unchanged.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(42).as("new value"))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'new value' }
   *
   * console.log(Option.none().as("new value"))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link asVoid} to replace the value with `undefined`
   */
  as<B>(value: B): Option<B> {
    return optionWrap(_Option.as(this._option, value));
  }

  /**
   * This `Option` with its value replaced by `void` (`undefined`), preserving
   * whether it was `Some` or `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(42).asVoid)
   * // Output: { _id: 'Option', _tag: 'Some', value: undefined }
   *
   * console.log(Option.none().asVoid)
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link as} to replace the value with a specific constant
   */
  get asVoid(): Option<void> {
    return optionWrap(_Option.asVoid(this._option));
  }

  // --- Instance methods: Sequencing ---

  /**
   * Applies a function that returns an `Option` to the value of a `Some`,
   * flattening the result. Returns `None` if this `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const address = Option.some({ street: Option.some("123 Main St") })
   *
   * console.log(address.flatMap((a) => a.street))
   * // Output: { _id: 'Option', _tag: 'Some', value: '123 Main St' }
   * ```
   *
   * @see {@link map} when the function returns a plain value
   * @see {@link andThen} for a more flexible variant
   */
  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return optionWrap(_Option.flatMap(this._option, (a) => f(a).option));
  }

  /**
   * Chains a next step onto this `Option`. The next step can be a plain value,
   * an `Option`, or a function returning either; plain values are wrapped in
   * `Some` and `None` short-circuits.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(5).andThen((x) => Option.some(x * 2)))
   * // Output: { _id: 'Option', _tag: 'Some', value: 10 }
   *
   * console.log(Option.some(5).andThen("hello"))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'hello' }
   * ```
   *
   * @see {@link flatMap} for the standard monadic bind
   */
  andThen<B>(f: (a: A) => Option<B>): Option<B>;
  andThen<B>(f: Option<B>): Option<B>;
  andThen<B>(f: (a: A) => B): Option<B>;
  andThen<B>(f: NotFunction<B>): Option<B>;
  andThen(f: any): Option<any> {
    return this.flatMap((a) => {
      const b = isFunction(f) ? f(a) : f;
      if (b != null && typeof b === 'object' && OptionTypeId in b) {
        return b as Option<any>;
      }
      return new OptionSome(b);
    });
  }

  /**
   * Runs an `Option`-returning function on the value of a `Some` without
   * transforming it: returns the original `Option` if the function returns
   * `Some`, or `None` if it returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const getInteger = (n: number) =>
   *   Number.isInteger(n) ? Option.some(n) : Option.none()
   *
   * console.log(Option.some(1).tap(getInteger))
   * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
   *
   * console.log(Option.some(1.14).tap(getInteger))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link filter} for predicate-based filtering
   */
  tap<X>(f: (a: A) => Option<X>): Option<A> {
    return optionWrap(_Option.tap(this._option, (a) => f(a).option));
  }

  /**
   * Applies a function that may return `null` or `undefined` to the value of a
   * `Some`, converting a nullish result into `None`. Useful for chaining
   * optional property access.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * interface Employee {
   *   company?: { name?: string }
   * }
   * const emp: Employee = { company: { name: "Acme" } }
   *
   * console.log(Option.some(emp).flatMapNullishOr((e) => e.company?.name))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'Acme' }
   * ```
   *
   * @see {@link flatMap} when the function already returns an `Option`
   */
  flatMapNullishOr<B>(f: (a: A) => B): Option<NonNullable<B>> {
    return optionWrap(_Option.flatMapNullishOr(this._option, f));
  }

  // --- Instance methods: Getters ---

  /**
   * Extracts the value from a `Some`, or lazily evaluates the fallback thunk
   * on `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).getOrElse(() => 0)) // 1
   * console.log(Option.none().getOrElse(() => 0)) // 0
   * ```
   *
   * @see {@link getOrNull} to fall back to `null`
   * @see {@link getOrThrow} to throw on `None`
   */
  getOrElse<B>(onNone: LazyArg<B>): A | B {
    return _Option.getOrElse(this._option, onNone);
  }

  /**
   * The value inside a `Some`, or `null` for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).getOrNull) // 1
   * console.log(Option.none().getOrNull) // null
   * ```
   *
   * @see {@link getOrUndefined} to fall back to `undefined` instead
   */
  get getOrNull(): A | null {
    return _Option.getOrNull(this._option);
  }

  /**
   * The value inside a `Some`, or `undefined` for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).getOrUndefined) // 1
   * console.log(Option.none().getOrUndefined) // undefined
   * ```
   *
   * @see {@link getOrNull} to fall back to `null` instead
   */
  get getOrUndefined(): A | undefined {
    return _Option.getOrUndefined(this._option);
  }

  /**
   * The value inside a `Some`; throws a default `Error` for `None`. Use for
   * fail-fast unwrapping when absence is unexpected.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).getOrThrow) // 1
   *
   * Option.none().getOrThrow
   * // throws Error: getOrThrow called on a None
   * ```
   *
   * @see {@link getOrThrowWith} to throw a custom error
   */
  get getOrThrow(): A {
    return _Option.getOrThrow(this._option);
  }

  /**
   * Extracts the value from a `Some`, or throws the error produced by `onNone`
   * for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).getOrThrowWith(() => new Error("missing"))) // 1
   *
   * Option.none().getOrThrowWith(() => new Error("missing"))
   * // throws Error: missing
   * ```
   *
   * @see {@link getOrElse} for a non-throwing alternative
   */
  getOrThrowWith(onNone: () => unknown): A {
    return _Option.getOrThrowWith(this._option, onNone);
  }

  // --- Instance methods: Fallbacks ---

  /**
   * Returns this `Option` if it is `Some`; otherwise lazily evaluates and
   * returns the fallback `Option`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.none().orElse(() => Option.some("b")))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'b' }
   *
   * console.log(Option.some("a").orElse(() => Option.some("b")))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'a' }
   * ```
   *
   * @see {@link orElseSome} to fall back to a plain value
   */
  orElse<B>(that: LazyArg<Option<B>>): Option<A | B> {
    return optionWrap(_Option.orElse(this._option, () => that().option));
  }

  /**
   * Returns this `Option` if it is `Some`; otherwise wraps the lazily
   * evaluated fallback value in a `Some`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.none().orElseSome(() => "b"))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'b' }
   *
   * console.log(Option.some("a").orElseSome(() => "b"))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'a' }
   * ```
   *
   * @see {@link orElse} when the fallback is itself an `Option`
   */
  orElseSome<B>(value: LazyArg<B>): Option<A | B> {
    return optionWrap(_Option.orElseSome(this._option, value));
  }

  // --- Instance methods: Zipping ---

  /**
   * Combines this `Option` with another using the provided function. Returns
   * `None` if either is `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const person = Option.some("John").zipWith(Option.some(25), (name, age) => ({ name, age }))
   * console.log(person)
   * // Output: { _id: 'Option', _tag: 'Some', value: { name: 'John', age: 25 } }
   * ```
   *
   * @see {@link product} to combine into a tuple instead
   */
  zipWith<B, C>(that: Option<B>, f: (a: A, b: B) => C): Option<C> {
    return optionWrap(_Option.zipWith(this._option, that.option, f));
  }

  /**
   * Sequences this `Option` with another, keeping the value from the second if
   * both are `Some`; otherwise returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).zipRight(Option.some("hello")))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'hello' }
   *
   * console.log(Option.none().zipRight(Option.some("hello")))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link zipLeft} to keep the first value instead
   */
  zipRight<B>(that: Option<B>): Option<B> {
    return optionWrap(_Option.zipRight(this._option, that.option));
  }

  /**
   * Sequences this `Option` with another, keeping the value from the first if
   * both are `Some`; otherwise returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some("hello").zipLeft(Option.some(1)))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'hello' }
   *
   * console.log(Option.some("hello").zipLeft(Option.none()))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link zipRight} to keep the second value instead
   */
  zipLeft<B>(that: Option<B>): Option<A> {
    return optionWrap(_Option.zipLeft(this._option, that.option));
  }

  /**
   * Combines this `Option` with another into a `Some` containing a tuple of
   * both values, or `None` if either is `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some("hello").product(Option.some(42)))
   * // Output: { _id: 'Option', _tag: 'Some', value: [ 'hello', 42 ] }
   *
   * console.log(Option.none().product(Option.some(42)))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link zipWith} to combine with a function instead of a tuple
   */
  product<B>(that: Option<B>): Option<[A, B]> {
    return optionWrap(_Option.product(this._option, that.option));
  }

  /**
   * Combines this `Option` with an iterable of `Option`s into a non-empty
   * tuple if all are `Some`; returns `None` if any is `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).productMany([Option.some(2), Option.some(3)]))
   * // Output: { _id: 'Option', _tag: 'Some', value: [ 1, 2, 3 ] }
   *
   * console.log(Option.some(1).productMany([Option.some(2), Option.none()]))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link Option.all} for tuples, structs, and iterables
   */
  productMany(others: Iterable<Option<A>>): Option<[A, ...Array<A>]> {
    return optionWrap(
      _Option.productMany(
        this._option,
        (function* (iter: Iterable<Option<A>>) {
          for (const o of iter) yield o.option;
        })(others)
      )
    );
  }

  // --- Instance methods: Filtering ---

  /**
   * Filters this `Option` with a predicate: keeps the value when the predicate
   * holds, otherwise returns `None`. Supports refinements for type narrowing.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some("hello").filter((s) => s !== ""))
   * // Output: { _id: 'Option', _tag: 'Some', value: 'hello' }
   *
   * console.log(Option.some("").filter((s) => s !== ""))
   * // Output: { _id: 'Option', _tag: 'None' }
   * ```
   *
   * @see {@link exists} to test without filtering
   */
  filter<B extends A>(refinement: Refinement<A, B>): Option<B>;
  filter(predicate: Predicate<A>): Option<A>;
  filter(predicate: Predicate<A>): Option<A> {
    return optionWrap(_Option.filter(this._option, predicate));
  }

  /**
   * Transforms and filters this `Option` with a `Filter` callback: a
   * `Result.succeed` keeps and transforms the value, while `Result.fail`
   * discards it.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import { Result } from "effect"
   *
   * console.log(
   *   Option.some(2).filterMap((n) => (n % 2 === 0 ? Result.succeed(`Even: ${n}`) : Result.failVoid))
   * )
   * // Output: { _id: 'Option', _tag: 'Some', value: 'Even: 2' }
   * ```
   *
   * @see {@link filter} for predicate-based filtering
   */
  filterMap<B, X>(f: Filter<A, B, X>): Option<B> {
    return optionWrap(_Option.filterMap(this._option, f));
  }

  /**
   * Splits this `Option` into two `Option`s using a `Result`-returning
   * function: failures go left, successes go right.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import { Result } from "effect"
   *
   * const [left, right] = Option.some("42").partitionMap((s) =>
   *   isNaN(Number(s)) ? Result.fail("not a number") : Result.succeed(Number(s))
   * )
   * console.log(left) // { _id: 'Option', _tag: 'None' }
   * console.log(right) // { _id: 'Option', _tag: 'Some', value: 42 }
   * ```
   *
   * @see {@link filterMap} to transform and filter into a single `Option`
   */
  partitionMap<B, C>(f: (a: A) => _Result.Result<C, B>): [left: Option<B>, right: Option<C>] {
    const [left, right] = _Option.partitionMap(this._option, f);
    return [optionWrap(left), optionWrap(right)];
  }

  // --- Instance methods: Conversions/checks ---

  /**
   * This `Option` as an `Array`: a single-element array for `Some`, or an
   * empty array for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(1).toArray) // [ 1 ]
   * console.log(Option.none().toArray) // []
   * ```
   *
   * @see {@link Option.fromIterable} for the inverse direction
   */
  get toArray(): Array<A> {
    return _Option.toArray(this._option);
  }

  /**
   * Checks whether the value in a `Some` satisfies the predicate. Returns
   * `false` for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const isEven = (n: number) => n % 2 === 0
   *
   * console.log(Option.some(2).exists(isEven)) // true
   * console.log(Option.some(1).exists(isEven)) // false
   * console.log(Option.none<number>().exists(isEven)) // false
   * ```
   *
   * @see {@link contains} to test for a specific value
   */
  exists(predicate: Predicate<A>): boolean {
    return _Option.exists(this._option, predicate);
  }

  /**
   * Checks whether this `Option` contains a value equal to the given one,
   * using structural equality. Returns `false` for `None`.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(2).contains(2)) // true
   * console.log(Option.some(1).contains(2)) // false
   * console.log(Option.none().contains(2)) // false
   * ```
   *
   * @see {@link exists} to test with a predicate
   */
  contains(value: A): boolean {
    return _Option.contains(this._option, value);
  }

  // --- Instance methods: Do notation ---

  /**
   * Gives a name to the value of this `Option`, creating a single-key record
   * inside `Some`. Starting point for a do notation pipeline.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * console.log(Option.some(2).bindTo("x"))
   * // Output: { _id: 'Option', _tag: 'Some', value: { x: 2 } }
   * ```
   *
   * @see {@link Option.bind} to add further `Option` values
   * @see {@link Option.Do} for starting with an empty record
   */
  bindTo<N extends string>(name: N): Option<{ [K in N]: A }> {
    return optionWrap(_Option.bindTo(this._option, name));
  }

  /**
   * Escape hatch: applies a function to the underlying core `effect/Option`
   * and wraps the result back into the fluent wrapper. Useful for core
   * combinators not exposed on the fluent API.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   * import * as CoreOption from "effect/Option"
   *
   * const result = Option.some(1).with((o) => CoreOption.map(o, (n) => n + 1))
   * console.log(result.getOrNull) // 2
   * ```
   *
   * @see {@link option} to access the underlying core `Option` directly
   */
  with<B>(f: (option: _Option.Option<A>) => _Option.Option<B>): Option<B> {
    return optionWrap(f(this._option));
  }
}

// --- Some and None classes ---

/**
 * An `Option` holding a value. Access the value via the `value` property after
 * narrowing with `isSome()`.
 */
class OptionSome<out A> extends OptionBase<A> {
  readonly _tag = 'Some' as const;
  readonly _op = 'Some' as const;

  /**
   * The value held by this `Some`.
   */
  readonly value: A;

  constructor(value: A) {
    super(_Option.some(value));
    this.value = value;
  }

  /**
   * Returns a plain-object representation used for logging and inspection.
   */
  toJSON(): unknown {
    return { _id: 'Option', _tag: 'Some', value: this.value };
  }
}

/**
 * An `Option` representing the absence of a value.
 */
class OptionNone<out A = never> extends OptionBase<A> {
  readonly _tag = 'None' as const;
  readonly _op = 'None' as const;

  constructor() {
    super(_Option.none<A>());
  }

  /**
   * Returns a plain-object representation used for logging and inspection.
   */
  toJSON(): unknown {
    return { _id: 'Option', _tag: 'None' };
  }
}

// --- Public type alias ---

/**
 * Represents an optional value: every `Option` is either `Some` (holds a
 * value) or `None` (absent). This fluent wrapper lifts `effect`'s `Option`
 * combinators onto a chainable, class-based API.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const result = Option.some(5)
 *   .map((n) => n * 2)
 *   .filter((n) => n > 5)
 *   .getOrElse(() => 0)
 *
 * console.log(result) // 10
 * ```
 */
export type Option<A> = OptionSome<A> | OptionNone<A>;

/**
 * Namespace providing the `Some` and `None` member types of `Option`.
 */
export namespace Option {
  /**
   * The `Option` subtype holding a value; exposes the `value` property.
   */
  export type Some<A> = OptionSome<A>;

  /**
   * The `Option` subtype representing absence.
   */
  export type None<A = never> = OptionNone<A>;
}

// --- Static functions (merged onto Option via declaration merging) ---

/**
 * Creates an `Option` that holds the given value. Does not filter `null` or
 * `undefined`; use `Option.fromNullishOr` for that.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.some(1))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 * ```
 *
 * @see {@link none} for the opposite operation
 */
const optionSome = <A>(value: A): Option<A> => new OptionSome(value);

/**
 * Creates an `Option` representing the absence of a value.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.none())
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link some} for the opposite operation
 */
const optionNone = <A = never>(): Option<A> => new OptionNone<A>();

/**
 * Wraps a core `effect/Option` value into the fluent `Option` wrapper.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import * as CoreOption from "effect/Option"
 *
 * const fluent = Option.wrap(CoreOption.some(1))
 * console.log(fluent.map((n) => n + 1).getOrNull) // 2
 * ```
 *
 * @see {@link is} to check for fluent `Option` instances
 */
const optionWrap = <A>(o: _Option.Option<A>): Option<A> => {
  return _Option.isSome(o) ? new OptionSome(o.value) : new OptionNone<A>();
};

/**
 * Determines whether the given value is a fluent `Option` (either `Some` or
 * `None`), acting as a type guard. Corresponds to upstream `isOption`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.is(Option.some(1))) // true
 * console.log(Option.is(Option.none())) // true
 * console.log(Option.is({})) // false
 * ```
 */
const optionIs = (u: unknown): u is Option<unknown> => hasProperty(u, OptionTypeId);

/**
 * Converts a nullable value into an `Option`: `null` or `undefined` become
 * `None`, any other value (including falsy ones) becomes `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.fromNullishOr(undefined))
 * // Output: { _id: 'Option', _tag: 'None' }
 *
 * console.log(Option.fromNullishOr(1))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 * ```
 *
 * @see {@link fromNullOr} to only treat `null` as absent
 * @see {@link fromUndefinedOr} to only treat `undefined` as absent
 */
const optionFromNullishOr = <A>(value: A): Option<NonNullable<A>> => optionWrap(_Option.fromNullishOr(value));

/**
 * Converts a possibly `undefined` value into an `Option`, leaving `null` as a
 * valid `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.fromUndefinedOr(undefined))
 * // Output: { _id: 'Option', _tag: 'None' }
 *
 * console.log(Option.fromUndefinedOr(null))
 * // Output: { _id: 'Option', _tag: 'Some', value: null }
 * ```
 *
 * @see {@link fromNullishOr} to treat both `null` and `undefined` as absent
 */
const optionFromUndefinedOr = <A>(value: A): Option<Exclude<A, undefined>> =>
  optionWrap(_Option.fromUndefinedOr(value)) as Option<Exclude<A, undefined>>;

/**
 * Converts a possibly `null` value into an `Option`, leaving `undefined` as a
 * valid `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.fromNullOr(null))
 * // Output: { _id: 'Option', _tag: 'None' }
 *
 * console.log(Option.fromNullOr(undefined))
 * // Output: { _id: 'Option', _tag: 'Some', value: undefined }
 * ```
 *
 * @see {@link fromNullishOr} to treat both `null` and `undefined` as absent
 */
const optionFromNullOr = <A>(value: A): Option<Exclude<A, null>> =>
  optionWrap(_Option.fromNullOr(value)) as Option<Exclude<A, null>>;

/**
 * Wraps the first element of an `Iterable` in a `Some`, or returns `None` if
 * the iterable is empty. Only the first element is consumed.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.fromIterable([1, 2, 3]))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 *
 * console.log(Option.fromIterable([]))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 */
const optionFromIterable = <A>(collection: Iterable<A>): Option<A> => optionWrap(_Option.fromIterable(collection));

/**
 * Converts a core `Result` into an `Option`, keeping only the success value:
 * `Success` becomes `Some` and `Failure` becomes `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import { Result } from "effect"
 *
 * console.log(Option.getSuccess(Result.succeed("ok")))
 * // Output: { _id: 'Option', _tag: 'Some', value: 'ok' }
 *
 * console.log(Option.getSuccess(Result.fail("err")))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link getFailure} for the opposite operation
 */
const optionGetSuccess = <A, E>(self: _Result.Result<A, E>): Option<A> =>
  _Result.isSuccess(self) ? new OptionSome(self.success) : new OptionNone<A>();

/**
 * Converts a core `Result` into an `Option`, keeping only the failure value:
 * `Failure` becomes `Some` and `Success` becomes `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import { Result } from "effect"
 *
 * console.log(Option.getFailure(Result.fail("err")))
 * // Output: { _id: 'Option', _tag: 'Some', value: 'err' }
 *
 * console.log(Option.getFailure(Result.succeed("ok")))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link getSuccess} for the opposite operation
 */
const optionGetFailure = <A, E>(self: _Result.Result<A, E>): Option<E> =>
  _Result.isFailure(self) ? new OptionSome(self.failure) : new OptionNone<E>();

/**
 * Returns the first `Some` found in an iterable of `Option`s, or `None` if
 * all are `None`. Short-circuits on the first `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.firstSomeOf([Option.none(), Option.some(1), Option.some(2)]))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 * ```
 *
 * @see {@link some} and the instance method `orElse` for a two-option fallback
 */
const optionFirstSomeOf = <A>(collection: Iterable<Option<A>>): Option<A> => {
  for (const o of collection) {
    if (o.isSome()) return o;
  }
  return new OptionNone<A>();
};

/**
 * Flattens a nested `Option<Option<A>>` into `Option<A>`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.flatten(Option.some(Option.some("value"))))
 * // Output: { _id: 'Option', _tag: 'Some', value: 'value' }
 *
 * console.log(Option.flatten(Option.some(Option.none())))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 */
const optionFlatten = <A>(self: Option<Option<A>>): Option<A> => self.flatMap((inner) => inner);

/**
 * Combines a structure of `Option`s (tuple, struct, or iterable) into a single
 * `Option` containing the unwrapped structure. Any `None` in the input makes
 * the entire result `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * console.log(Option.all([Option.some("John"), Option.some(25)]))
 * // Output: { _id: 'Option', _tag: 'Some', value: [ 'John', 25 ] }
 *
 * console.log(Option.all({ name: Option.some("John"), age: Option.none() }))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 */
const optionAll: {
  <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(
    input: I
  ): [I] extends [ReadonlyArray<Option<any>>]
    ? Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>
    : [I] extends [Iterable<Option<infer A>>]
      ? Option<Array<A>>
      : Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>;
} = <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(input: I): any => {
  if (Symbol.iterator in input) {
    const out: Array<any> = [];
    for (const o of input as Iterable<Option<any>>) {
      if (o.isNone()) return o;
      out.push(o.value);
    }
    return new OptionSome(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const o = (input as Record<string, Option<any>>)[key];
    if (o.isNone()) return o;
    out[key] = o.value;
  }
  return new OptionSome(out);
};

/**
 * Provides generator-based syntax for `Option`, similar to `async`/`await` but
 * for optional values. Each `yield*` unwraps a `Some` value or short-circuits
 * the whole computation to `None`; the return value is wrapped in `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const maybeName = Option.some("John")
 * const maybeAge = Option.some(25)
 *
 * const person = Option.gen(function* () {
 *   const name = (yield* maybeName).toUpperCase()
 *   const age = yield* maybeAge
 *   return { name, age }
 * })
 *
 * console.log(person)
 * // Output: { _id: 'Option', _tag: 'Some', value: { name: 'JOHN', age: 25 } }
 * ```
 *
 * @see {@link Do} and {@link bind} for the do notation alternative
 */
const optionGen: Gen.Gen<OptionTypeLambda> = (...args) => {
  const f = args.length === 1 ? args[0] : args[1].bind(args[0]);
  const iterator = f();
  let state: IteratorResult<any> = iterator.next();
  while (!state.done) {
    const current = state.value;
    if (current.isNone()) {
      return current;
    }
    state = iterator.next(current.value as never);
  }
  return optionSome(state.value);
};

/**
 * An `Option` containing an empty record `{}`, used as the starting point for
 * do notation chains.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const result = Option.Do.pipe(
 *   Option.bind("x", () => Option.some(2)),
 *   Option.bind("y", () => Option.some(3)),
 *   Option.let("sum", ({ x, y }) => x + y)
 * )
 * console.log(result.getOrNull) // { x: 2, y: 3, sum: 5 }
 * ```
 *
 * @see {@link bind} to add `Option` values
 */
const optionDo: Option<{}> = new OptionSome({});

/**
 * Adds an `Option` value to the do notation record under a given name. If the
 * `Option` is `None`, the whole pipeline short-circuits to `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const result = Option.Do.pipe(
 *   Option.bind("x", () => Option.some(2)),
 *   Option.bind("y", () => Option.some(3))
 * )
 * console.log(result.getOrNull) // { x: 2, y: 3 }
 * ```
 *
 * @see {@link Do} for starting the chain
 */
const optionBind: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
} = dual(
  3,
  <N extends string, A extends object, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }> => {
    return optionWrap(_Option.bind(self.option, name, (a: A) => f(a).option));
  }
);

/**
 * Adds a computed plain (non-`Option`) value to the do notation record.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const result = Option.Do.pipe(
 *   Option.bind("x", () => Option.some(2)),
 *   Option.let("double", ({ x }) => x * 2)
 * )
 * console.log(result.getOrNull) // { x: 2, double: 4 }
 * ```
 *
 * @see {@link bind} to add `Option` values
 */
const optionLet: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
} = dual(
  3,
  <N extends string, A extends object, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }> => {
    return optionWrap(_Option.let(self.option, name, (a: A) => f(a))) as any;
  }
);

/**
 * Lifts a `Predicate` or `Refinement` into the `Option` context: returns
 * `Some(value)` when the predicate holds, `None` otherwise.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const parsePositive = Option.liftPredicate((n: number) => n > 0)
 *
 * console.log(parsePositive(1))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 *
 * console.log(parsePositive(-1))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link toRefinement} for the inverse direction
 */
const optionLiftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>;
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>;
  <A, B extends A>(self: A, refinement: Refinement<A, B>): Option<B>;
  <B extends A, A = B>(self: B, predicate: Predicate<A>): Option<B>;
} = dual(2, <B extends A, A = B>(b: B, predicate: Predicate<A>): Option<B> => {
  return optionWrap(_Option.liftPredicate(b, predicate));
});

/**
 * Lifts a function that may throw into one that returns an `Option`: a normal
 * return becomes `Some` and a thrown exception becomes `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const parse = Option.liftThrowable(JSON.parse)
 *
 * console.log(parse("1"))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 *
 * console.log(parse(""))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link liftNullishOr} for nullable-returning functions
 */
const optionLiftThrowable = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): ((...a: A) => Option<B>) => {
  return (...a) => optionWrap(_Option.liftThrowable(f)(...a));
};

/**
 * Lifts a function that may return `null` or `undefined` into one that returns
 * an `Option`, converting nullish results into `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const parse = (s: string): number | undefined => {
 *   const n = parseFloat(s)
 *   return isNaN(n) ? undefined : n
 * }
 *
 * const parseOption = Option.liftNullishOr(parse)
 *
 * console.log(parseOption("1"))
 * // Output: { _id: 'Option', _tag: 'Some', value: 1 }
 *
 * console.log(parseOption("not a number"))
 * // Output: { _id: 'Option', _tag: 'None' }
 * ```
 *
 * @see {@link liftThrowable} for functions that throw instead
 */
const optionLiftNullishOr = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B
): ((...a: A) => Option<NonNullable<B>>) => {
  return (...a) => optionFromNullishOr(f(...a));
};

/**
 * Composes two `Option`-returning functions into a single function that chains
 * them together, short-circuiting to `None` if either returns `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const parse = (s: string): Option<number> =>
 *   isNaN(Number(s)) ? Option.none() : Option.some(Number(s))
 *
 * const double = (n: number): Option<number> =>
 *   n > 0 ? Option.some(n * 2) : Option.none()
 *
 * const parseAndDouble = Option.composeK(parse, double)
 *
 * console.log(parseAndDouble("42").getOrNull) // 84
 * console.log(parseAndDouble("oops").getOrNull) // null
 * ```
 */
const optionComposeK = <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>): ((a: A) => Option<C>) => {
  return (a: A) => afb(a).flatMap(bfc);
};

/**
 * Converts an `Option`-returning function into a type guard (refinement) that
 * returns `true` when the function returns `Some`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const parseString = (data: string | number): Option<string> =>
 *   typeof data === "string" ? Option.some(data) : Option.none()
 *
 * const isString = Option.toRefinement(parseString)
 *
 * console.log(isString("a")) // true
 * console.log(isString(1)) // false
 * ```
 *
 * @see {@link liftPredicate} for the reverse direction
 */
const optionToRefinement = <A, B extends A>(f: (a: A) => Option<B>): ((a: A) => a is B) => {
  return (a: A): a is B => f(a).isSome();
};

/**
 * Creates an `Equivalence` for `Option<A>` from an `Equivalence` for `A`: two
 * `None`s are equal and two `Some`s compare their values with the supplied
 * rule.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import { Equivalence } from "effect"
 *
 * const eq = Option.makeEquivalence(Equivalence.strictEqual<number>())
 *
 * console.log(eq(Option.some(1), Option.some(1))) // true
 * console.log(eq(Option.some(1), Option.some(2))) // false
 * console.log(eq(Option.none(), Option.none())) // true
 * ```
 */
const optionMakeEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Option<A>> => {
  return Equivalence.make((x, y) => {
    if (x.isSome()) {
      return y.isSome() ? isEquivalent(x.value, y.value) : false;
    }
    return y.isNone();
  });
};

/**
 * Creates an `Order` for `Option<A>` from an `Order` for `A`: `None` is
 * ordered before any `Some`, and two `Some`s compare their values with the
 * supplied ordering.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import { Number as N } from "effect"
 *
 * const ord = Option.makeOrder(N.Order)
 *
 * console.log(ord(Option.none(), Option.some(1))) // -1
 * console.log(ord(Option.some(1), Option.none())) // 1
 * console.log(ord(Option.some(1), Option.some(2))) // -1
 * ```
 */
const optionMakeOrder = <A>(O: Order<A>): Order<Option<A>> => {
  return order.make((self, that) => {
    if (self.isSome()) {
      return that.isSome() ? O(self.value, that.value) : 1;
    }
    return that.isSome() ? -1 : 0;
  });
};

/**
 * Creates a containment check for `Option`s from a custom `Equivalence`:
 * returns `true` when the `Option` is `Some` of an equivalent value.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 * import { Equivalence } from "effect"
 *
 * const contains = Option.containsWith(Equivalence.strictEqual<number>())
 *
 * console.log(contains(Option.some(2), 2)) // true
 * console.log(contains(Option.some(1), 2)) // false
 * console.log(contains(Option.none(), 2)) // false
 * ```
 *
 * @see the instance method `contains` for a version using default equality
 */
const optionContainsWith = <A>(isEquivalent: (self: A, that: A) => boolean): ((self: Option<A>, a: A) => boolean) => {
  return (self, a) => (self.isSome() ? isEquivalent(self.value, a) : false);
};

/**
 * Reduces an iterable of `Option`s to a single value, applying the reducer
 * only to `Some` values and skipping `None` entries.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const items = [Option.some(1), Option.none<number>(), Option.some(2)]
 *
 * console.log(Option.reduceCompact(items, 0, (b, a) => b + a)) // 3
 * ```
 */
const optionReduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<Option<A>>) => B;
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B;
} = dual(3, <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B => {
  const nativeCollection = Array.from(self).map((opt) => opt.option);
  return _Option.reduceCompact(nativeCollection, b, f);
});

/**
 * Lifts a binary function to operate on two `Option` values: applies the
 * function when both are `Some`, otherwise returns `None`.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const addOptions = Option.lift2((a: number, b: number) => a + b)
 *
 * console.log(addOptions(Option.some(2), Option.some(3)).getOrNull) // 5
 * console.log(addOptions(Option.some(2), Option.none()).getOrNull) // null
 * ```
 *
 * @see the instance method `zipWith` for a non-lifted variant
 */
const optionLift2 = <A, B, C>(
  f: (a: A, b: B) => C
): {
  (that: Option<B>): (self: Option<A>) => Option<C>;
  (self: Option<A>, that: Option<B>): Option<C>;
} => {
  return dual(2, (self: Option<A>, that: Option<B>): Option<C> => {
    return optionWrap(_Option.lift2(f)(self.option, that.option));
  });
};

/**
 * Companion object for the fluent `Option`, providing constructors, guards,
 * and static combinators.
 *
 * @example
 * ```ts
 * import { Option } from "effect-fluent"
 *
 * const result = Option.fromNullishOr(process.env.HOME)
 *   .map((home) => `${home}/.config`)
 *   .getOrElse(() => "/etc/config")
 *
 * console.log(typeof result) // "string"
 * ```
 */
export const Option = {
  some: optionSome,
  none: optionNone,
  wrap: optionWrap,
  is: optionIs,
  fromNullishOr: optionFromNullishOr,
  fromUndefinedOr: optionFromUndefinedOr,
  fromNullOr: optionFromNullOr,
  fromIterable: optionFromIterable,
  getSuccess: optionGetSuccess,
  getFailure: optionGetFailure,
  firstSomeOf: optionFirstSomeOf,
  flatten: optionFlatten,
  all: optionAll,
  gen: optionGen,
  Do: optionDo,
  bind: optionBind,
  /**
   * Adds a computed plain (non-`Option`) value to the do notation record.
   *
   * @example
   * ```ts
   * import { Option } from "effect-fluent"
   *
   * const result = Option.Do.pipe(
   *   Option.bind("x", () => Option.some(2)),
   *   Option.let("double", ({ x }) => x * 2)
   * )
   * console.log(result.getOrNull) // { x: 2, double: 4 }
   * ```
   *
   * @see {@link bind} to add `Option` values
   */
  let: optionLet,
  liftPredicate: optionLiftPredicate,
  liftThrowable: optionLiftThrowable,
  liftNullishOr: optionLiftNullishOr,
  composeK: optionComposeK,
  toRefinement: optionToRefinement,
  makeEquivalence: optionMakeEquivalence,
  makeOrder: optionMakeOrder,
  lift2: optionLift2,
  containsWith: optionContainsWith,
  reduceCompact: optionReduceCompact
} as const;

// -----------------------------------------------------------------------------
// Result
// -----------------------------------------------------------------------------

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
    return resultIs(that) && Equal.equals(this._result, that.result);
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
  isSuccess(): this is ResultSuccess<A, E> {
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
  isFailure(): this is ResultFailure<A, E> {
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
    return resultWrap(_Result.map(this._result, f));
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
    return resultWrap(_Result.mapError(this._result, f));
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
    return resultWrap(_Result.mapBoth(this._result, options));
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
    return resultWrap(_Result.flatMap(this._result, (a) => f(a).result));
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
      return new ResultSuccess(b);
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
    return resultWrap(_Result.tap(this._result, f));
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
    return resultWrap(_Result.orElse(this._result, (e) => that(e).result));
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
    return resultWrap(_Result.flip(this._result));
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
    return resultWrap(_Result.filterOrFail(this._result, predicate, orFailWith));
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
    return resultWrap(_Result.bindTo(this._result, name));
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
    return resultWrap(f(this._result));
  }
}

// --- Success and Failure classes ---

/**
 * The `Success` variant of {@link Result}, holding a value of type `A`.
 */
class ResultSuccess<out A, out E> extends ResultBase<A, E> {
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
class ResultFailure<out A, out E> extends ResultBase<A, E> {
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
export type Result<A, E = never> = ResultSuccess<A, E> | ResultFailure<A, E>;

export namespace Result {
  /**
   * The `Success` variant of {@link Result}, exposing the `success` value.
   */
  export type Success<A, E = never> = ResultSuccess<A, E>;
  /**
   * The `Failure` variant of {@link Result}, exposing the `failure` value.
   */
  export type Failure<A, E> = ResultFailure<A, E>;
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
const resultSucceed = <A>(value: A): Result<A> => new ResultSuccess(value);

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
const resultFail = <E>(error: E): Result<never, E> => new ResultFailure(error);

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
const resultVoid: Result<void> = resultSucceed(undefined as void);

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
const resultFailVoid: Result<never, void> = resultFail(undefined as void);

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
const resultWrap = <A, E>(r: _Result.Result<A, E>): Result<A, E> => {
  return _Result.isSuccess(r) ? new ResultSuccess(r.success) : new ResultFailure(r.failure);
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
const resultIs = (u: unknown): u is Result<unknown, unknown> => hasProperty(u, ResultTypeId);

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
const resultTry: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Result<A, E>;
  <A>(evaluate: LazyArg<A>): Result<A, unknown>;
} = <A, E>(
  evaluate: LazyArg<A> | { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }
): Result<A, E> | Result<A, unknown> => {
  if (isFunction(evaluate)) {
    return resultWrap(_Result.try(evaluate));
  } else {
    return resultWrap(_Result.try(evaluate));
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
const resultFromNullishOr: {
  <A, E>(onNullish: (a: A) => E): (self: A) => Result<NonNullable<A>, E>;
  <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E>;
} = dual(2, <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E> => {
  return resultWrap(_Result.fromNullishOr(self, onNullish));
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
const resultFromOption: {
  <E>(onNone: () => E): <A>(self: Option<A>) => Result<A, E>;
  <A, E>(self: Option<A>, onNone: () => E): Result<A, E>;
} = dual(2, <A, E>(self: Option<A>, onNone: () => E): Result<A, E> => {
  return resultWrap(_Result.fromOption(self.option, onNone));
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
const resultLiftPredicate: {
  <A, B extends A, E>(refinement: Refinement<A, B>, orFailWith: (a: A) => E): (a: A) => Result<B, E>;
  <B extends A, E, A = B>(predicate: Predicate<A>, orFailWith: (a: A) => E): (b: B) => Result<B, E>;
  <A, E, B extends A>(self: A, refinement: Refinement<A, B>, orFailWith: (a: A) => E): Result<B, E>;
  <B extends A, E, A = B>(self: B, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<B, E>;
} = dual(3, <A, E>(a: A, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<A, E> => {
  return resultWrap(_Result.liftPredicate(a, predicate, orFailWith));
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
const resultAll: {
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
    return new ResultSuccess(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const r = (input as Record<string, Result<any, any>>)[key];
    if (r.isFailure()) return r;
    out[key] = r.success;
  }
  return new ResultSuccess(out);
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
const resultGen: Gen.Gen<ResultTypeLambda> = (...args) => {
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
  return resultSucceed(state.value);
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
const resultDo: Result<{}> = new ResultSuccess({});

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
const resultBind: {
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
    return resultWrap(_Result.bind(self.result, name, (a: A) => f(a).result));
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
const resultLet: {
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
    return resultWrap(_Result.let(self.result, name, (r: R) => f(r)));
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
const resultFlatten = <A, E, E2>(self: Result<Result<A, E>, E2>): Result<A, E | E2> => self.flatMap(identity);

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
const resultMakeEquivalence = <A, E>(
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
const resultSucceedNone: Result<Option<never>> = resultSucceed(Option.none());

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
const resultSucceedSome = <A, E = never>(a: A): Result<Option<A>, E> => new ResultSuccess(Option.some(a));

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
const resultTransposeOption = <A = never, E = never>(self: Option<Result<A, E>>): Result<Option<A>, E> => {
  return resultWrap(_Result.transposeOption(self.map((r) => r.result).option)).map(Option.wrap);
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
const resultTransposeMapOption: {
  <A, B, E = never>(f: (self: A) => Result<B, E>): (self: Option<A>) => Result<Option<B>, E>;
  <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E>;
} = dual(2, <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E> => {
  return resultWrap(_Result.transposeMapOption(self.option, (a) => f(a).result)).map(Option.wrap);
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
  succeed: resultSucceed,
  fail: resultFail,
  void: resultVoid,
  failVoid: resultFailVoid,
  try: resultTry,
  wrap: resultWrap,
  is: resultIs,
  fromNullishOr: resultFromNullishOr,
  fromOption: resultFromOption,
  liftPredicate: resultLiftPredicate,
  all: resultAll,
  gen: resultGen,
  Do: resultDo,
  bind: resultBind,
  let: resultLet,
  flatten: resultFlatten,
  makeEquivalence: resultMakeEquivalence,
  succeedNone: resultSucceedNone,
  succeedSome: resultSucceedSome,
  transposeOption: resultTransposeOption,
  transposeMapOption: resultTransposeMapOption
} as const;
