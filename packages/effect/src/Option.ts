import { Equal, Equivalence, Hash, Result } from 'effect';
import type { Filter } from 'effect/Filter';
import { dual, type LazyArg } from 'effect/Function';
import type { TypeLambda } from 'effect/HKT';
import * as _Option from 'effect/Option';
import type { Order } from 'effect/Order';
import * as order from 'effect/Order';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty, isFunction } from 'effect/Predicate';
import type { NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import { Inspectable } from './Inspectable.js';

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
    return is(that) && Equal.equals(this._option, that.option);
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
  isSome(): this is Some<A> {
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
  isNone(): this is None<A> {
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
    return wrap(_Option.map(this._option, f));
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
    return wrap(_Option.as(this._option, value));
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
    return wrap(_Option.asVoid(this._option));
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
    return wrap(_Option.flatMap(this._option, (a) => f(a).option));
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
      return new Some(b);
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
    return wrap(_Option.tap(this._option, (a) => f(a).option));
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
    return wrap(_Option.flatMapNullishOr(this._option, f));
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
    return wrap(_Option.orElse(this._option, () => that().option));
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
    return wrap(_Option.orElseSome(this._option, value));
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
    return wrap(_Option.zipWith(this._option, that.option, f));
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
    return wrap(_Option.zipRight(this._option, that.option));
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
    return wrap(_Option.zipLeft(this._option, that.option));
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
    return wrap(_Option.product(this._option, that.option));
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
    return wrap(
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
    return wrap(_Option.filter(this._option, predicate));
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
    return wrap(_Option.filterMap(this._option, f));
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
  partitionMap<B, C>(f: (a: A) => Result.Result<C, B>): [left: Option<B>, right: Option<C>] {
    const [left, right] = _Option.partitionMap(this._option, f);
    return [wrap(left), wrap(right)];
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
    return wrap(_Option.bindTo(this._option, name));
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
    return wrap(f(this._option));
  }
}

// --- Some and None classes ---

/**
 * An `Option` holding a value. Access the value via the `value` property after
 * narrowing with `isSome()`.
 */
class Some<out A> extends OptionBase<A> {
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
class None<out A = never> extends OptionBase<A> {
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

type _Some<A> = Some<A>;
type _None<A> = None<A>;

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
export type Option<A> = Some<A> | None<A>;

/**
 * Namespace providing the `Some` and `None` member types of `Option`.
 */
export namespace Option {
  /**
   * The `Option` subtype holding a value; exposes the `value` property.
   */
  export type Some<A> = _Some<A>;

  /**
   * The `Option` subtype representing absence.
   */
  export type None<A = never> = _None<A>;
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
const some = <A>(value: A): Option<A> => new Some(value);

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
const none = <A = never>(): Option<A> => new None<A>();

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
const wrap = <A>(o: _Option.Option<A>): Option<A> => {
  return _Option.isSome(o) ? new Some(o.value) : new None<A>();
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
const is = (u: unknown): u is Option<unknown> => hasProperty(u, OptionTypeId);

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
const fromNullishOr = <A>(value: A): Option<NonNullable<A>> => wrap(_Option.fromNullishOr(value));

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
const fromUndefinedOr = <A>(value: A): Option<Exclude<A, undefined>> =>
  wrap(_Option.fromUndefinedOr(value)) as Option<Exclude<A, undefined>>;

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
const fromNullOr = <A>(value: A): Option<Exclude<A, null>> =>
  wrap(_Option.fromNullOr(value)) as Option<Exclude<A, null>>;

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
const fromIterable = <A>(collection: Iterable<A>): Option<A> => wrap(_Option.fromIterable(collection));

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
const getSuccess = <A, E>(self: Result.Result<A, E>): Option<A> =>
  Result.isSuccess(self) ? new Some(self.success) : new None<A>();

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
const getFailure = <A, E>(self: Result.Result<A, E>): Option<E> =>
  Result.isFailure(self) ? new Some(self.failure) : new None<E>();

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
const firstSomeOf = <A>(collection: Iterable<Option<A>>): Option<A> => {
  for (const o of collection) {
    if (o.isSome()) return o;
  }
  return new None<A>();
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
const flatten = <A>(self: Option<Option<A>>): Option<A> => self.flatMap((inner) => inner);

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
const all: {
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
    return new Some(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const o = (input as Record<string, Option<any>>)[key];
    if (o.isNone()) return o;
    out[key] = o.value;
  }
  return new Some(out);
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
const gen: Gen.Gen<OptionTypeLambda> = (...args) => {
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
  return some(state.value);
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
const Do: Option<{}> = new Some({});

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
const bind: {
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
    return wrap(_Option.bind(self.option, name, (a: A) => f(a).option));
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
const let_: {
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
    return wrap(_Option.let(self.option, name, (a: A) => f(a))) as any;
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
const liftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>;
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>;
  <A, B extends A>(self: A, refinement: Refinement<A, B>): Option<B>;
  <B extends A, A = B>(self: B, predicate: Predicate<A>): Option<B>;
} = dual(2, <B extends A, A = B>(b: B, predicate: Predicate<A>): Option<B> => {
  return wrap(_Option.liftPredicate(b, predicate));
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
const liftThrowable = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): ((...a: A) => Option<B>) => {
  return (...a) => wrap(_Option.liftThrowable(f)(...a));
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
const liftNullishOr = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B
): ((...a: A) => Option<NonNullable<B>>) => {
  return (...a) => fromNullishOr(f(...a));
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
const composeK = <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>): ((a: A) => Option<C>) => {
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
const toRefinement = <A, B extends A>(f: (a: A) => Option<B>): ((a: A) => a is B) => {
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
const makeEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Option<A>> => {
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
const makeOrder = <A>(O: Order<A>): Order<Option<A>> => {
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
const containsWith = <A>(isEquivalent: (self: A, that: A) => boolean): ((self: Option<A>, a: A) => boolean) => {
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
const reduceCompact: {
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
const lift2 = <A, B, C>(
  f: (a: A, b: B) => C
): {
  (that: Option<B>): (self: Option<A>) => Option<C>;
  (self: Option<A>, that: Option<B>): Option<C>;
} => {
  return dual(2, (self: Option<A>, that: Option<B>): Option<C> => {
    return wrap(_Option.lift2(f)(self.option, that.option));
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
  some,
  none,
  wrap,
  is,
  fromNullishOr,
  fromUndefinedOr,
  fromNullOr,
  fromIterable,
  getSuccess,
  getFailure,
  firstSomeOf,
  flatten,
  all,
  gen,
  Do,
  bind,
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
  let: let_,
  liftPredicate,
  liftThrowable,
  liftNullishOr,
  composeK,
  toRefinement,
  makeEquivalence,
  makeOrder,
  lift2,
  containsWith,
  reduceCompact
} as const;
