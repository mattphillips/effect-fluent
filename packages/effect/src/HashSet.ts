import { Equal, Hash } from 'effect';
import * as _HashSet from 'effect/HashSet';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty } from 'effect/Predicate';
import { Inspectable } from './Inspectable.js';

/**
 * Unique identifier for fluent `HashSet` instances.
 */
export const HashSetTypeId: unique symbol = Symbol.for('~effect-fluent/HashSet') as HashSetTypeId;

/**
 * Type-level identifier for fluent `HashSet` instances.
 */
export type HashSetTypeId = typeof HashSetTypeId;

/**
 * An immutable set data structure that stores unique values.
 *
 * A `HashSet<V>` contains at most one value for each equality class according
 * to Effect's `Equal` and `Hash` rules. All mutating operations return new
 * sets, leaving the original unchanged. This class is a fluent wrapper around
 * effect's `HashSet`, exposing combinators as chainable methods.
 *
 * @example
 * ```ts
 * import { HashSet } from "effect-fluent"
 *
 * const set = HashSet.make("apple", "banana", "cherry")
 *
 * // Check membership
 * console.log(set.has("apple")) // true
 * console.log(set.has("grape")) // false
 *
 * // Chain operations (each returns a new HashSet)
 * const updated = set.add("grape").remove("banana")
 * console.log(updated.size) // 3
 * console.log(set.size) // 3 (original unchanged)
 * ```
 */
export class HashSet<out V> extends Inspectable implements Iterable<V> {
  readonly [HashSetTypeId]: HashSetTypeId = HashSetTypeId;

  /**
   * Creates an empty HashSet.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.empty<string>()
   * console.log(set.size) // 0
   * console.log(set.isEmpty) // true
   *
   * const withValues = set.add("hello").add("world")
   * console.log(withValues.size) // 2
   * ```
   */
  static empty<V = never>(): HashSet<V> {
    return new HashSet(_HashSet.empty());
  }

  /**
   * Creates a HashSet from a variable number of values. Duplicate values are
   * ignored.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const fruits = HashSet.make("apple", "banana", "cherry")
   * console.log(fruits.size) // 3
   *
   * const numbers = HashSet.make(1, 2, 3, 2, 1) // Duplicates ignored
   * console.log(numbers.size) // 3
   * ```
   */
  static make<Values extends ReadonlyArray<any>>(...values: Values): HashSet<Values[number]> {
    return new HashSet(_HashSet.make(...values));
  }

  /**
   * Creates a HashSet from an iterable collection of values. Duplicate values
   * are ignored.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const fromArray = HashSet.fromIterable(["a", "b", "c", "b", "a"])
   * console.log(fromArray.size) // 3
   *
   * const fromSet = HashSet.fromIterable(new Set([1, 2, 3]))
   * console.log(fromSet.size) // 3
   * ```
   */
  static fromIterable<V>(values: Iterable<V>): HashSet<V> {
    return new HashSet(_HashSet.fromIterable(values));
  }

  /**
   * Wraps a core `effect/HashSet` in the fluent HashSet class.
   *
   * Use this to bring a set produced by core effect APIs into the fluent API.
   * The underlying set can be recovered via the `hashSet` getter.
   *
   * @example
   * ```ts
   * import * as CoreHashSet from "effect/HashSet"
   * import { HashSet } from "effect-fluent"
   *
   * const core = CoreHashSet.make(1, 2, 3)
   * const fluent = HashSet.wrap(core)
   * console.log(fluent.add(4).size) // 4
   * ```
   */
  static wrap<V>(set: _HashSet.HashSet<V>): HashSet<V> {
    return new HashSet(set);
  }

  /**
   * Checks whether a value is a fluent HashSet.
   *
   * Note that this returns `false` for core `effect/HashSet` values; it only
   * recognizes instances of the fluent class.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * console.log(HashSet.is(HashSet.make(1, 2, 3))) // true
   * console.log(HashSet.is([1, 2, 3])) // false
   * console.log(HashSet.is(null)) // false
   * ```
   */
  static is(u: unknown): u is HashSet<unknown> {
    return hasProperty(u, HashSetTypeId);
  }

  private readonly _set: _HashSet.HashSet<V>;

  private constructor(set: _HashSet.HashSet<V>) {
    super();
    this._set = set;
  }

  /**
   * The underlying core `effect/HashSet`.
   *
   * Use this to hand the set to core effect APIs that expect a plain
   * `HashSet`. Re-wrap results with `HashSet.wrap`, or use `with` to do both
   * in one step.
   *
   * @example
   * ```ts
   * import * as CoreHashSet from "effect/HashSet"
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make(1, 2, 3)
   * console.log(CoreHashSet.size(set.hashSet)) // 3
   * ```
   */
  get hashSet(): _HashSet.HashSet<V> {
    return this._set;
  }

  // Preserve the underlying structure's reference-equality guarantees: when a
  // combinator is a no-op upstream (e.g. adding an existing value), return the
  // same fluent wrapper rather than allocating a new one.
  private _keep<V2>(next: _HashSet.HashSet<V2>): HashSet<V2> {
    return (next as unknown) === (this._set as unknown) ? (this as unknown as HashSet<V2>) : new HashSet(next);
  }

  // --- Equal & Hash ---

  /**
   * Implements Effect's `Equal` protocol. Two HashSets are equal when they
   * contain the same values according to `Equal` semantics.
   *
   * @example
   * ```ts
   * import { Equal } from "effect"
   * import { HashSet } from "effect-fluent"
   *
   * const a = HashSet.make(1, 2, 3)
   * const b = HashSet.make(3, 2, 1)
   * console.log(Equal.equals(a, b)) // true
   * ```
   */
  [Equal.symbol](that: unknown): boolean {
    return HashSet.is(that) && Equal.equals(this._set, that.hashSet);
  }

  /**
   * Implements Effect's `Hash` protocol, delegating to the underlying set so
   * that equal sets produce equal hashes.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._set);
  }

  // --- Iteration ---

  /**
   * Iterates over the values in the set. Iteration order is not guaranteed.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make(1, 2, 3)
   * console.log(Array.from(set).sort()) // [1, 2, 3]
   * ```
   */
  [Symbol.iterator](): Iterator<V> {
    return this._set[Symbol.iterator]();
  }

  /**
   * Returns a plain-object representation of the set, used by `Inspectable`
   * for logging and debugging.
   */
  toJSON(): unknown {
    return { _id: 'HashSet', values: Array.from(this._set) };
  }

  // --- Basic operations ---

  /**
   * Adds a value to the set, returning a new HashSet.
   *
   * Adding a value that is already present is a no-op and returns the same
   * instance (reference equality preserved).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make("a", "b")
   * const withC = set.add("c")
   *
   * console.log(set.size) // 2 (original unchanged)
   * console.log(withC.size) // 3
   *
   * // Adding an existing value returns the same instance
   * console.log(set.add("a") === set) // true
   * ```
   */
  add(value: V): HashSet<V> {
    return this._keep(_HashSet.add(this._set, value));
  }

  /**
   * Checks whether the set contains the specified value, using `Equal`
   * semantics for comparison.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make("apple", "banana", "cherry")
   * console.log(set.has("apple")) // true
   * console.log(set.has("grape")) // false
   * ```
   */
  has(value: V): boolean {
    return _HashSet.has(this._set, value);
  }

  /**
   * Removes a value from the set, returning a new HashSet.
   *
   * Removing a value that is not present is a no-op and returns the same
   * instance (reference equality preserved).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make("a", "b", "c")
   * const withoutB = set.remove("b")
   *
   * console.log(withoutB.has("b")) // false
   * console.log(set.size) // 3 (original unchanged)
   *
   * // Removing a missing value returns the same instance
   * console.log(set.remove("d") === set) // true
   * ```
   */
  remove(value: V): HashSet<V> {
    return this._keep(_HashSet.remove(this._set, value));
  }

  /**
   * Returns the number of values in the set.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * console.log(HashSet.empty<string>().size) // 0
   * console.log(HashSet.make("a", "b").size) // 2
   * console.log(HashSet.fromIterable(["x", "y", "x"]).size) // 2
   * ```
   */
  get size(): number {
    return _HashSet.size(this._set);
  }

  /**
   * Returns `true` if the set contains no values.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * console.log(HashSet.empty<string>().isEmpty) // true
   * console.log(HashSet.make("a").isEmpty) // false
   * ```
   */
  get isEmpty(): boolean {
    return _HashSet.isEmpty(this._set);
  }

  // --- Set operations ---

  /**
   * Creates the union of this set and another, returning a new HashSet
   * containing values present in either.
   *
   * If the union equals this set's underlying values, the same instance is
   * returned (reference equality preserved).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set1 = HashSet.make("a", "b")
   * const set2 = HashSet.make("b", "c")
   * const combined = set1.union(set2)
   *
   * console.log(Array.from(combined).sort()) // ["a", "b", "c"]
   * console.log(combined.size) // 3
   * ```
   */
  union<V1>(that: HashSet<V1>): HashSet<V | V1> {
    return this._keep(_HashSet.union(this._set, that.hashSet));
  }

  /**
   * Creates the intersection of this set and another, returning a new HashSet
   * containing only values present in both.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set1 = HashSet.make("a", "b", "c")
   * const set2 = HashSet.make("b", "c", "d")
   * const common = set1.intersection(set2)
   *
   * console.log(Array.from(common).sort()) // ["b", "c"]
   * ```
   */
  intersection<V1>(that: HashSet<V1>): HashSet<V & V1> {
    return new HashSet(_HashSet.intersection(this._set, that.hashSet));
  }

  /**
   * Creates the difference of this set and another, returning a new HashSet
   * containing the values of this set that are not in `that`.
   *
   * If nothing is removed, the same instance is returned (reference equality
   * preserved).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const set1 = HashSet.make("a", "b", "c")
   * const set2 = HashSet.make("b", "d")
   * const diff = set1.difference(set2)
   *
   * console.log(Array.from(diff).sort()) // ["a", "c"]
   * ```
   */
  difference<V1>(that: HashSet<V1>): HashSet<V> {
    return this._keep(_HashSet.difference(this._set, that.hashSet));
  }

  /**
   * Checks whether every value of this set is contained in `that`.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const small = HashSet.make("a", "b")
   * const large = HashSet.make("a", "b", "c", "d")
   *
   * console.log(small.isSubset(large)) // true
   * console.log(large.isSubset(small)) // false
   * console.log(small.isSubset(small)) // true
   * ```
   */
  isSubset<V1>(that: HashSet<V1>): boolean {
    return _HashSet.isSubset(this._set, that.hashSet);
  }

  // --- Functional operations ---

  /**
   * Maps each value in the set using the provided function, returning a new
   * HashSet. The result may be smaller if the function produces duplicates.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const doubled = HashSet.make(1, 2, 3).map((n) => n * 2)
   * console.log(Array.from(doubled).sort()) // [2, 4, 6]
   *
   * // Mapping can reduce size if the function produces duplicates
   * const lengths = HashSet.make("apple", "banana", "cherry").map((s) => s.length)
   * console.log(Array.from(lengths).sort()) // [5, 6]
   * ```
   */
  map<U>(f: (value: V) => U): HashSet<U> {
    return new HashSet(_HashSet.map(this._set, f));
  }

  /**
   * Filters the set, keeping only values that satisfy the predicate. When
   * given a refinement, the resulting set's value type is narrowed.
   *
   * If every value satisfies the predicate, the same instance is returned
   * (reference equality preserved).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const evens = HashSet.make(1, 2, 3, 4, 5, 6).filter((n) => n % 2 === 0)
   * console.log(Array.from(evens).sort()) // [2, 4, 6]
   * ```
   */
  filter<U extends V>(refinement: Refinement<V, U>): HashSet<U>;
  filter(predicate: Predicate<V>): HashSet<V>;
  filter(predicate: Predicate<V>): HashSet<V> {
    return this._keep(_HashSet.filter(this._set, predicate));
  }

  /**
   * Checks whether at least one value in the set satisfies the predicate.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const numbers = HashSet.make(1, 2, 3, 4, 5)
   * console.log(numbers.some((n) => n > 3)) // true
   * console.log(numbers.some((n) => n > 10)) // false
   * ```
   */
  some(predicate: Predicate<V>): boolean {
    return _HashSet.some(this._set, predicate);
  }

  /**
   * Checks whether all values in the set satisfy the predicate. Returns `true`
   * for an empty set (vacuously true).
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const numbers = HashSet.make(2, 4, 6, 8)
   * console.log(numbers.every((n) => n % 2 === 0)) // true
   * console.log(numbers.every((n) => n > 5)) // false
   * ```
   */
  every(predicate: Predicate<V>): boolean {
    return _HashSet.every(this._set, predicate);
  }

  /**
   * Reduces the set to a single value by iterating through the values and
   * applying an accumulator function. Iteration order is not guaranteed.
   *
   * @example
   * ```ts
   * import { HashSet } from "effect-fluent"
   *
   * const sum = HashSet.make(1, 2, 3, 4, 5).reduce(0, (acc, n) => acc + n)
   * console.log(sum) // 15
   * ```
   */
  reduce<U>(zero: U, f: (accumulator: U, value: V) => U): U {
    return _HashSet.reduce(this._set, zero, f);
  }

  /**
   * Escape hatch: applies a transformation to the underlying core
   * `effect/HashSet` and re-wraps the result in the fluent class.
   *
   * Use this to reach core combinators that are not exposed on the fluent
   * API while staying in a fluent chain.
   *
   * @example
   * ```ts
   * import * as CoreHashSet from "effect/HashSet"
   * import { HashSet } from "effect-fluent"
   *
   * const set = HashSet.make(1, 2, 3)
   *   .with((core) => CoreHashSet.map(core, (n) => n * 10))
   *
   * console.log(Array.from(set).sort()) // [10, 20, 30]
   * ```
   */
  with<U>(f: (set: _HashSet.HashSet<V>) => _HashSet.HashSet<U>): HashSet<U> {
    return new HashSet(f(this._set));
  }
}
