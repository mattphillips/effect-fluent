import { Equal, Hash } from 'effect';
import * as _HashMap from 'effect/HashMap';
import { hasProperty } from 'effect/Predicate';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';
import { Result } from './Result.js';

export const HashMapTypeId: unique symbol = Symbol.for('~effect-fluent/HashMap') as HashMapTypeId;
export type HashMapTypeId = typeof HashMapTypeId;

export class HashMap<out K, out V> extends Inspectable implements Iterable<[K, V]> {
  readonly [HashMapTypeId]: HashMapTypeId = HashMapTypeId;

  static empty<K = never, V = never>(): HashMap<K, V> {
    return new HashMap(_HashMap.empty());
  }

  static make<Entries extends ReadonlyArray<readonly [any, any]>>(
    ...entries: Entries
  ): HashMap<
    Entries[number] extends readonly [infer K, any] ? K : never,
    Entries[number] extends readonly [any, infer V] ? V : never
  > {
    return new HashMap(_HashMap.make(...entries));
  }

  static fromIterable<K, V>(entries: Iterable<readonly [K, V]>): HashMap<K, V> {
    return new HashMap(_HashMap.fromIterable(entries));
  }

  static wrap<K, V>(map: _HashMap.HashMap<K, V>): HashMap<K, V> {
    return new HashMap(map);
  }

  static is(u: unknown): u is HashMap<unknown, unknown> {
    return hasProperty(u, HashMapTypeId);
  }

  static compact<K, A>(self: HashMap<K, Option<A>>): HashMap<K, A> {
    return new HashMap(_HashMap.compact(_HashMap.map(self._map, (o) => o.option)));
  }

  private readonly _map: _HashMap.HashMap<K, V>;

  private constructor(map: _HashMap.HashMap<K, V>) {
    super();
    this._map = map;
  }

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

  [Equal.symbol](that: unknown): boolean {
    return HashMap.is(that) && Equal.equals(this._map, that.hashMap);
  }

  [Hash.symbol](): number {
    return Hash.hash(this._map);
  }

  // --- Iteration ---

  [Symbol.iterator](): Iterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  toJSON(): unknown {
    return { _id: 'HashMap', values: Array.from(this._map) };
  }

  // --- Basic operations ---

  get(key: K): Option<V> {
    return Option.wrap(_HashMap.get(this._map, key));
  }

  getHash(key: K, hash: number): Option<V> {
    return Option.wrap(_HashMap.getHash(this._map, key, hash));
  }

  getUnsafe(key: K): V {
    return _HashMap.getUnsafe(this._map, key);
  }

  has(key: K): boolean {
    return _HashMap.has(this._map, key);
  }

  hasHash(key: K, hash: number): boolean {
    return _HashMap.hasHash(this._map, key, hash);
  }

  hasBy(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.hasBy(this._map, predicate);
  }

  set<K1, V1>(key: K1, value: V1): HashMap<K | K1, V | V1> {
    const next = _HashMap.set<K | K1, V | V1>(this._map, key, value);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  remove(key: K): HashMap<K, V> {
    return this._keep(_HashMap.remove(this._map, key));
  }

  removeMany(keys: Iterable<K>): HashMap<K, V> {
    return this._keep(_HashMap.removeMany(this._map, keys));
  }

  setMany<K1, V1>(entries: Iterable<readonly [K1, V1]>): HashMap<K | K1, V | V1> {
    const next = _HashMap.setMany<K | K1, V | V1>(this._map, entries);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  get size(): number {
    return _HashMap.size(this._map);
  }

  get isEmpty(): boolean {
    return _HashMap.isEmpty(this._map);
  }

  // --- Iterators and getters ---

  get keys(): IterableIterator<K> {
    return _HashMap.keys(this._map);
  }

  get values(): IterableIterator<V> {
    return _HashMap.values(this._map);
  }

  get toValues(): Array<V> {
    return _HashMap.toValues(this._map);
  }

  get entries(): IterableIterator<[K, V]> {
    return _HashMap.entries(this._map);
  }

  get toEntries(): Array<[K, V]> {
    return _HashMap.toEntries(this._map);
  }

  // --- Mutation helpers ---

  get beginMutation(): HashMap<K, V> {
    return new HashMap(_HashMap.beginMutation(this._map));
  }

  get endMutation(): HashMap<K, V> {
    return this._keep(_HashMap.endMutation(this._map));
  }

  mutate(f: (mutable: HashMap<K, V>) => void): HashMap<K, V> {
    return this._keep(_HashMap.mutate(this._map, (mutable) => f(new HashMap(mutable))));
  }

  // --- Modification operations ---

  modifyAt(key: K, f: (option: Option<V>) => Option<V>): HashMap<K, V> {
    return this._keep(_HashMap.modifyAt(this._map, key, (o) => f(Option.wrap(o)).option));
  }

  modifyHash(key: K, hash: number, f: (option: Option<V>) => Option<V>): HashMap<K, V> {
    return this._keep(_HashMap.modifyHash(this._map, key, hash, (o) => f(Option.wrap(o)).option));
  }

  modify(key: K, f: (value: V) => V): HashMap<K, V> {
    return this._keep(_HashMap.modify(this._map, key, f));
  }

  union<K1, V1>(that: HashMap<K1, V1>): HashMap<K | K1, V | V1> {
    const next = _HashMap.union(this._map, that.hashMap);
    return next === (this._map as _HashMap.HashMap<K | K1, V | V1>) ? this : new HashMap(next);
  }

  // --- Mapping operations ---

  map<A>(f: (value: V, key: K) => A): HashMap<K, A> {
    return new HashMap(_HashMap.map(this._map, f));
  }

  flatMap<B>(f: (value: V, key: K) => HashMap<K, B>): HashMap<K, B> {
    return new HashMap(_HashMap.flatMap(this._map, (value, key) => f(value, key).hashMap));
  }

  forEach(f: (value: V, key: K) => void): void {
    _HashMap.forEach(this._map, f);
  }

  reduce<Z>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z {
    return _HashMap.reduce(this._map, zero, f);
  }

  // --- Filtering operations ---

  filter(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): HashMap<K, V> {
    return this._keep(_HashMap.filter(this._map, predicate));
  }

  filterMap<B, X>(f: (value: V, key: K) => Result<B, X>): HashMap<K, B> {
    return new HashMap(_HashMap.filterMap(this._map, (value, key) => f(value, key).result));
  }

  // --- Search operations ---

  findFirst(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): Option<[K, V]> {
    return Option.wrap(_HashMap.findFirst(this._map, predicate));
  }

  some(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.some(this._map, predicate);
  }

  every(predicate: (value: NoInfer<V>, key: NoInfer<K>) => boolean): boolean {
    return _HashMap.every(this._map, predicate);
  }

  with<K1, V1>(f: (map: _HashMap.HashMap<K, V>) => _HashMap.HashMap<K1, V1>): HashMap<K1, V1> {
    return new HashMap(f(this._map));
  }
}
