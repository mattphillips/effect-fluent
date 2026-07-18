import { Equal, Hash } from 'effect';
import * as _HashMap from 'effect/HashMap';
import { hasProperty } from 'effect/Predicate';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';
import { Result } from './Result.js';

/**
 * Unique identifier used to brand fluent `HashMap` instances.
 */
export const HashMapTypeId: unique symbol = Symbol.for('~effect-fluent/HashMap') as HashMapTypeId;
/**
 * The type of the `HashMapTypeId` brand symbol.
 */
export type HashMapTypeId = typeof HashMapTypeId;

/**
 * An immutable key-value data structure with efficient lookup, insertion, and
 * deletion, exposed as a fluent API.
 *
 * Keys are hashed and compared with Effect's structural equality rules.
 * Operations return new maps, sharing structure with the original, while
 * temporary mutation helpers (`beginMutation`, `endMutation`, `mutate`) support
 * efficient batch updates.
 *
 * @example
 * ```ts
 * import { HashMap } from "effect-fluent"
 *
 * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
 *
 * console.log(map.get("a")) // Option.some(1)
 * console.log(map.has("b")) // true
 *
 * const updated = map.set("d", 4).remove("a")
 * console.log(updated.size) // 3
 *
 * // The original map is unchanged
 * console.log(map.size) // 3
 * ```
 */
export class HashMap<out K, out V> extends Inspectable implements Iterable<[K, V]> {
  readonly [HashMapTypeId]: HashMapTypeId = HashMapTypeId;

  /**
   * Creates a new empty `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.empty<string, number>()
   * console.log(map.isEmpty) // true
   * console.log(map.size) // 0
   * ```
   */
  static empty<K = never, V = never>(): HashMap<K, V> {
    return new HashMap(_HashMap.empty());
  }

  /**
   * Constructs a new `HashMap` from an array of key/value pairs.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * console.log(map.size) // 3
   * console.log(map.get("b")) // Option.some(2)
   * ```
   */
  static make<Entries extends ReadonlyArray<readonly [any, any]>>(
    ...entries: Entries
  ): HashMap<
    Entries[number] extends readonly [infer K, any] ? K : never,
    Entries[number] extends readonly [any, infer V] ? V : never
  > {
    return new HashMap(_HashMap.make(...entries));
  }

  /**
   * Creates a new `HashMap` from an iterable collection of key/value pairs.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const entries: Array<[string, number]> = [["a", 1], ["b", 2], ["c", 3]]
   * const map = HashMap.fromIterable(entries)
   * console.log(map.size) // 3
   * console.log(map.get("a")) // Option.some(1)
   * ```
   */
  static fromIterable<K, V>(entries: Iterable<readonly [K, V]>): HashMap<K, V> {
    return new HashMap(_HashMap.fromIterable(entries));
  }

  /**
   * Wraps an underlying `effect` `HashMap` in the fluent API.
   *
   * Use this to bring a core map produced by `effect` combinators into the
   * fluent world. The inverse is the `hashMap` getter.
   *
   * @example
   * ```ts
   * import { HashMap as CoreHashMap } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const core = CoreHashMap.make(["a", 1])
   * const map = HashMap.wrap(core)
   * console.log(map.get("a")) // Option.some(1)
   * ```
   */
  static wrap<K, V>(map: _HashMap.HashMap<K, V>): HashMap<K, V> {
    return new HashMap(map);
  }

  /**
   * Checks whether a value is a fluent `HashMap`.
   *
   * Corresponds to upstream `isHashMap`, but refines to the fluent wrapper
   * rather than the core `effect` HashMap.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * console.log(HashMap.is(HashMap.make(["a", 1]))) // true
   * console.log(HashMap.is({ a: 1 })) // false
   * console.log(HashMap.is(null)) // false
   * ```
   */
  static is(u: unknown): u is HashMap<unknown, unknown> {
    return hasProperty(u, HashMapTypeId);
  }

  /**
   * Filters out `None` values from a `HashMap` of `Option`s, unwrapping the
   * `Some` values.
   *
   * This is a static because it constrains the map's value type to `Option`.
   *
   * @example
   * ```ts
   * import { HashMap, Option } from "effect-fluent"
   *
   * const map = HashMap.make(
   *   ["a", Option.some(1)],
   *   ["b", Option.none<number>()],
   *   ["c", Option.some(3)]
   * )
   * const compacted = HashMap.compact(map)
   *
   * console.log(compacted.size) // 2
   * console.log(compacted.get("a")) // Option.some(1)
   * console.log(compacted.has("b")) // false
   * ```
   */
  static compact<K, A>(self: HashMap<K, Option<A>>): HashMap<K, A> {
    return new HashMap(_HashMap.compact(_HashMap.map(self._map, (o) => o.option)));
  }

  private readonly _map: _HashMap.HashMap<K, V>;

  private constructor(map: _HashMap.HashMap<K, V>) {
    super();
    this._map = map;
  }

  /**
   * The underlying core `effect` `HashMap`.
   *
   * Use this to hand the map to `effect` APIs that expect the core type. The
   * inverse is `HashMap.wrap`.
   *
   * @example
   * ```ts
   * import { HashMap as CoreHashMap } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1])
   * console.log(CoreHashMap.size(map.hashMap)) // 1
   * ```
   */
  get hashMap(): _HashMap.HashMap<K, V> {
    return this._map;
  }

  // Preserve the underlying structure's reference-equality guarantees: when a
  // combinator is a no-op upstream (e.g. removing an absent key) or mutates in
  // place during mutation mode, return the same fluent wrapper rather than
  // allocating a new one.
  private _keep(next: _HashMap.HashMap<K, V>): HashMap<K, V> {
    return next === this._map ? this : new HashMap(next);
  }

  // --- Equal & Hash ---

  /**
   * Structural equality: two `HashMap`s are equal when they contain the same
   * entries, enabling use with `Equal.equals` and as `HashMap`/`HashSet` keys.
   *
   * @example
   * ```ts
   * import { Equal } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const map1 = HashMap.make(["a", 1], ["b", 2])
   * const map2 = HashMap.make(["b", 2], ["a", 1])
   * console.log(Equal.equals(map1, map2)) // true
   * ```
   */
  [Equal.symbol](that: unknown): boolean {
    return HashMap.is(that) && Equal.equals(this._map, that.hashMap);
  }

  /**
   * Computes a structural hash of the map's entries, consistent with its
   * structural equality.
   */
  [Hash.symbol](): number {
    return Hash.hash(this._map);
  }

  // --- Iteration ---

  /**
   * Iterates over the `[key, value]` entries of the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   * for (const [key, value] of map) {
   *   console.log(key, value) // "a" 1, "b" 2 (in unspecified order)
   * }
   * ```
   */
  [Symbol.iterator](): Iterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  /**
   * Returns a plain-object representation of the `HashMap` for inspection.
   */
  toJSON(): unknown {
    return { _id: 'HashMap', values: Array.from(this._map) };
  }

  // --- Basic operations ---

  /**
   * Safely looks up the value for the specified key, returning a fluent
   * `Option`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   *
   * console.log(map.get("a")) // Option.some(1)
   * console.log(map.get("c")) // Option.none()
   * ```
   */
  get(key: K): Option<V> {
    return Option.wrap(_HashMap.get(this._map, key));
  }

  /**
   * Safely looks up the value for the specified key using a precomputed hash,
   * returning a fluent `Option`. Avoids recomputing the hash in hot paths.
   *
   * @example
   * ```ts
   * import { Hash } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   * const hash = Hash.string("a")
   *
   * console.log(map.getHash("a", hash)) // Option.some(1)
   * ```
   */
  getHash(key: K, hash: number): Option<V> {
    return Option.wrap(_HashMap.getHash(this._map, key, hash));
  }

  /**
   * Unsafely looks up the value for the specified key, throwing if the key is
   * not found. Use `get` for safe access that returns an `Option`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1])
   *
   * console.log(map.getUnsafe("a")) // 1
   * // map.getUnsafe("b") would throw: key not found
   * ```
   */
  getUnsafe(key: K): V {
    return _HashMap.getUnsafe(this._map, key);
  }

  /**
   * Checks whether the specified key has an entry in the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   *
   * console.log(map.has("a")) // true
   * console.log(map.has("c")) // false
   * ```
   */
  has(key: K): boolean {
    return _HashMap.has(this._map, key);
  }

  /**
   * Checks whether the specified key has an entry in the `HashMap` using a
   * precomputed hash. A matching hash does not override key equality.
   *
   * @example
   * ```ts
   * import { Hash } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["Admin", 1])
   * const hash = Hash.string("Admin")
   *
   * console.log(map.hasHash("Admin", hash)) // true
   * console.log(map.hasHash("admin", hash)) // false
   * ```
   */
  hasHash(key: K, hash: number): boolean {
    return _HashMap.hasHash(this._map, key, hash);
  }

  /**
   * Checks whether an entry matching the given predicate exists in the
   * `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make([1, "a"])
   *
   * console.log(map.hasBy((value, key) => value === "a" && key === 1)) // true
   * console.log(map.hasBy((value) => value === "b")) // false
   * ```
   */
  hasBy(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.hasBy(this._map, predicate);
  }

  /**
   * Sets the specified key to the specified value, returning a new `HashMap`.
   * The original map is unchanged.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map1 = HashMap.make(["a", 1])
   * const map2 = map1.set("b", 2)
   *
   * console.log(map2.size) // 2
   * console.log(map2.get("b")) // Option.some(2)
   *
   * // Original map is unchanged
   * console.log(map1.size) // 1
   * ```
   */
  set<K1, V1>(key: K1, value: V1): HashMap<K | K1, V | V1> {
    const next = _HashMap.set<K | K1, V | V1>(this._map, key, value);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  /**
   * Removes the entry for the specified key. Removing an absent key is a no-op
   * and returns the same instance.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * const removed = map.remove("b")
   *
   * console.log(removed.size) // 2
   * console.log(removed.has("b")) // false
   * console.log(map.remove("z") === map) // true
   * ```
   */
  remove(key: K): HashMap<K, V> {
    return this._keep(_HashMap.remove(this._map, key));
  }

  /**
   * Removes all entries which have the specified keys. If no keys are present,
   * this is a no-op and returns the same instance.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3], ["d", 4])
   * const removed = map.removeMany(["b", "d"])
   *
   * console.log(removed.size) // 2
   * console.log(removed.has("a")) // true
   * console.log(removed.has("c")) // true
   * ```
   */
  removeMany(keys: Iterable<K>): HashMap<K, V> {
    return this._keep(_HashMap.removeMany(this._map, keys));
  }

  /**
   * Sets multiple key-value pairs in the `HashMap`, returning a new map.
   * Existing keys are overwritten.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2]).setMany([
   *   ["c", 3],
   *   ["a", 10] // "a" is overwritten
   * ])
   *
   * console.log(map.size) // 3
   * console.log(map.get("a")) // Option.some(10)
   * ```
   */
  setMany<K1, V1>(entries: Iterable<readonly [K1, V1]>): HashMap<K | K1, V | V1> {
    const next = _HashMap.setMany<K | K1, V | V1>(this._map, entries);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  /**
   * The number of entries within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * console.log(map.size) // 3
   * ```
   */
  get size(): number {
    return _HashMap.size(this._map);
  }

  /**
   * Whether the `HashMap` contains no entries.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * console.log(HashMap.empty().isEmpty) // true
   * console.log(HashMap.make(["a", 1]).isEmpty) // false
   * ```
   */
  get isEmpty(): boolean {
    return _HashMap.isEmpty(this._map);
  }

  // --- Iterators and getters ---

  /**
   * An `IterableIterator` of the keys within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * console.log(Array.from(map.keys).sort()) // ["a", "b", "c"]
   * ```
   */
  get keys(): IterableIterator<K> {
    return _HashMap.keys(this._map);
  }

  /**
   * An `IterableIterator` of the values within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * console.log(Array.from(map.values).sort()) // [1, 2, 3]
   * ```
   */
  get values(): IterableIterator<V> {
    return _HashMap.values(this._map);
  }

  /**
   * An `Array` of the values within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * const sum = map.toValues.reduce((acc, n) => acc + n, 0)
   * console.log(sum) // 6
   * ```
   */
  get toValues(): Array<V> {
    return _HashMap.toValues(this._map);
  }

  /**
   * An `IterableIterator` of the `[key, value]` entries within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   * console.log(Array.from(map.entries).sort()) // [["a", 1], ["b", 2]]
   * ```
   */
  get entries(): IterableIterator<[K, V]> {
    return _HashMap.entries(this._map);
  }

  /**
   * An `Array` of the `[key, value]` entries within the `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["b", 2], ["a", 1])
   * console.log(map.toEntries.sort()) // [["a", 1], ["b", 2]]
   * ```
   */
  get toEntries(): Array<[K, V]> {
    return _HashMap.toEntries(this._map);
  }

  // --- Mutation helpers ---

  /**
   * Returns a transient copy of the `HashMap` in mutation mode for efficient
   * batched updates. While in mutation mode, `set` and `remove` mutate the map
   * in place and return the same wrapper instance. Call `endMutation` to
   * finish and use the result as an immutable `HashMap`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1])
   * const mutable = map.beginMutation
   *
   * // In mutation mode these update in place, returning the same wrapper
   * mutable.set("b", 2).set("c", 3).remove("a")
   *
   * const result = mutable.endMutation
   * console.log(result.size) // 2
   * ```
   *
   * @see mutate for a scoped alternative
   */
  get beginMutation(): HashMap<K, V> {
    return new HashMap(_HashMap.beginMutation(this._map));
  }

  /**
   * Marks the `HashMap` as immutable again, completing a mutation cycle
   * started with `beginMutation`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const mutable = HashMap.make(["x", 10], ["y", 20]).beginMutation
   * mutable.set("z", 30).remove("x")
   *
   * const final = mutable.endMutation
   * console.log(final.size) // 2
   * console.log(final.get("z")) // Option.some(30)
   * ```
   */
  get endMutation(): HashMap<K, V> {
    return this._keep(_HashMap.endMutation(this._map));
  }

  /**
   * Runs a batch of updates against a transient mutable copy of the `HashMap`
   * and returns the finalized immutable result. Inside the callback the map is
   * in mutation mode, so `set` and `remove` mutate in place and return the
   * same wrapper.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1]).mutate((mutable) => {
   *   mutable.set("b", 2)
   *   mutable.set("c", 3)
   * })
   *
   * console.log(map.size) // 3
   * ```
   */
  mutate(f: (mutable: HashMap<K, V>) => void): HashMap<K, V> {
    return this._keep(_HashMap.mutate(this._map, (mutable) => f(new HashMap(mutable))));
  }

  // --- Modification operations ---

  /**
   * Sets or removes the specified key using an update function over fluent
   * `Option`s. The function receives `Option.some(value)` when the key exists
   * or `Option.none()` when it does not; returning `Option.some(newValue)`
   * stores the value, and returning `Option.none()` removes the key or leaves
   * it absent.
   *
   * @example
   * ```ts
   * import { HashMap, Option } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   *
   * // Increment existing value or set to 1 if not present
   * const updated = map.modifyAt("a", (option) =>
   *   option.isSome() ? Option.some(option.value + 1) : Option.some(1)
   * )
   * console.log(updated.get("a")) // Option.some(2)
   * ```
   */
  modifyAt(key: K, f: (option: Option<V>) => Option<V>): HashMap<K, V> {
    return this._keep(_HashMap.modifyAt(this._map, key, (o) => f(Option.wrap(o)).option));
  }

  /**
   * Sets or removes the specified key using a precomputed hash and an update
   * function over fluent `Option`s. Behaves like `modifyAt`, but avoids
   * recomputing the hash in hot paths.
   *
   * @example
   * ```ts
   * import { Hash } from "effect"
   * import { HashMap, Option } from "effect-fluent"
   *
   * const counters = HashMap.make(["downloads", 100])
   * const hash = Hash.string("downloads")
   *
   * const updated = counters.modifyHash("downloads", hash, (option) =>
   *   option.isSome() ? Option.some(option.value + 1) : Option.some(1)
   * )
   * console.log(updated.get("downloads")) // Option.some(101)
   * ```
   */
  modifyHash(key: K, hash: number, f: (option: Option<V>) => Option<V>): HashMap<K, V> {
    return this._keep(_HashMap.modifyHash(this._map, key, hash, (o) => f(Option.wrap(o)).option));
  }

  /**
   * Updates the value of the specified key if it exists. If the key is absent,
   * this is a no-op and returns the same instance.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2]).modify("a", (value) => value * 3)
   *
   * console.log(map.get("a")) // Option.some(3)
   * console.log(map.get("b")) // Option.some(2)
   * ```
   */
  modify(key: K, f: (value: V) => V): HashMap<K, V> {
    return this._keep(_HashMap.modify(this._map, key, f));
  }

  /**
   * Combines two `HashMap`s into one. When both maps contain an equal key, the
   * value from `that` wins. If `that` contributes no changes, this is a no-op
   * and returns the same instance.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map1 = HashMap.make(["a", 1], ["b", 2])
   * const map2 = HashMap.make(["b", 20], ["c", 3])
   * const merged = map1.union(map2)
   *
   * console.log(merged.size) // 3
   * console.log(merged.get("b")) // Option.some(20) - map2 wins
   * ```
   */
  union<K1, V1>(that: HashMap<K1, V1>): HashMap<K | K1, V | V1> {
    const next = _HashMap.union(this._map, that.hashMap);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  // --- Mapping operations ---

  /**
   * Maps over the entries of the `HashMap` using the specified function,
   * producing a new map with the same keys and transformed values.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2]).map((value, key) => `${key}:${value * 2}`)
   *
   * console.log(map.get("a")) // Option.some("a:2")
   * console.log(map.get("b")) // Option.some("b:4")
   * ```
   */
  map<A>(f: (value: V, key: K) => A): HashMap<K, A> {
    return new HashMap(_HashMap.map(this._map, f));
  }

  /**
   * Maps each entry to a `HashMap` and flattens the results into a single map.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2]).flatMap((value, key) =>
   *   HashMap.make([key + "1", value], [key + "2", value * 2])
   * )
   *
   * console.log(map.size) // 4
   * console.log(map.get("b2")) // Option.some(4)
   * ```
   */
  flatMap<B>(f: (value: V, key: K) => HashMap<K, B>): HashMap<K, B> {
    return new HashMap(_HashMap.flatMap(this._map, (value, key) => f(value, key).hashMap));
  }

  /**
   * Applies the specified function to each entry of the `HashMap` for its side
   * effects.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2])
   * const collected: Array<[string, number]> = []
   *
   * map.forEach((value, key) => {
   *   collected.push([key, value])
   * })
   *
   * console.log(collected.sort()) // [["a", 1], ["b", 2]]
   * ```
   */
  forEach(f: (value: V, key: K) => void): void {
    _HashMap.forEach(this._map, f);
  }

  /**
   * Reduces the entries of the `HashMap` to a single value, starting from
   * `zero`.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * const sum = map.reduce(0, (acc, value) => acc + value)
   *
   * console.log(sum) // 6
   * ```
   */
  reduce<Z>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z {
    return _HashMap.reduce(this._map, zero, f);
  }

  // --- Filtering operations ---

  /**
   * Keeps only the entries that satisfy the specified predicate. If every
   * entry is kept, this is a no-op and returns the same instance.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3], ["d", 4])
   * const even = map.filter((value) => value % 2 === 0)
   *
   * console.log(even.size) // 2
   * console.log(even.has("b")) // true
   * console.log(even.has("a")) // false
   * ```
   */
  filter(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): HashMap<K, V> {
    return this._keep(_HashMap.filter(this._map, predicate));
  }

  /**
   * Maps over the entries with a function returning a fluent `Result` and
   * keeps only the successful results. Return `Result.succeed(value)` to keep
   * a transformed entry and `Result.failVoid` to drop it.
   *
   * @example
   * ```ts
   * import { HashMap, Result } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3], ["d", 4])
   * const doubled = map.filterMap((value) =>
   *   value % 2 === 0 ? Result.succeed(value * 2) : Result.failVoid
   * )
   *
   * console.log(doubled.size) // 2
   * console.log(doubled.get("b")) // Option.some(4)
   * console.log(doubled.get("d")) // Option.some(8)
   * ```
   */
  filterMap<B, X>(f: (value: V, key: K) => Result<B, X>): HashMap<K, B> {
    return new HashMap(_HashMap.filterMap(this._map, (value, key) => f(value, key).result));
  }

  // --- Search operations ---

  /**
   * Returns the first `[key, value]` entry that satisfies the specified
   * predicate as a fluent `Option`, or `Option.none()` if no entry matches.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   * const result = map.findFirst((value, key) => key === "b" && value > 1)
   *
   * console.log(result) // Option.some(["b", 2])
   * ```
   */
  findFirst(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): Option<[K, V]> {
    return Option.wrap(_HashMap.findFirst(this._map, predicate));
  }

  /**
   * Checks whether any entry in the `HashMap` satisfies the specified
   * predicate.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   *
   * console.log(map.some((value) => value > 2)) // true
   * console.log(map.some((value) => value > 5)) // false
   * ```
   */
  some(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.some(this._map, predicate);
  }

  /**
   * Checks whether all entries in the `HashMap` satisfy the specified
   * predicate.
   *
   * @example
   * ```ts
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2], ["c", 3])
   *
   * console.log(map.every((value) => value > 0)) // true
   * console.log(map.every((value) => value > 1)) // false
   * ```
   */
  every(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.every(this._map, predicate);
  }

  /**
   * Escape hatch: applies a function to the underlying core `effect` `HashMap`
   * and wraps the result back into the fluent API. Useful for core combinators
   * that have no fluent counterpart.
   *
   * @example
   * ```ts
   * import { HashMap as CoreHashMap } from "effect"
   * import { HashMap } from "effect-fluent"
   *
   * const map = HashMap.make(["a", 1], ["b", 2]).with((core) =>
   *   CoreHashMap.map(core, (value) => value * 10)
   * )
   *
   * console.log(map.get("b")) // Option.some(20)
   * ```
   */
  with<K1, V1>(f: (map: _HashMap.HashMap<K, V>) => _HashMap.HashMap<K1, V1>): HashMap<K1, V1> {
    return new HashMap(f(this._map));
  }
}
