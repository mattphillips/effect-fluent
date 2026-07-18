import { Equal, Hash } from 'effect';
import * as _HashSet from 'effect/HashSet';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty } from 'effect/Predicate';
import { Inspectable } from './Inspectable.js';

export const HashSetTypeId: unique symbol = Symbol.for('~effect-fluent/HashSet') as HashSetTypeId;
export type HashSetTypeId = typeof HashSetTypeId;

export class HashSet<out V> extends Inspectable implements Iterable<V> {
  readonly [HashSetTypeId]: HashSetTypeId = HashSetTypeId;

  static empty<V = never>(): HashSet<V> {
    return new HashSet(_HashSet.empty());
  }

  static make<Values extends ReadonlyArray<any>>(...values: Values): HashSet<Values[number]> {
    return new HashSet(_HashSet.make(...values));
  }

  static fromIterable<V>(values: Iterable<V>): HashSet<V> {
    return new HashSet(_HashSet.fromIterable(values));
  }

  static wrap<V>(set: _HashSet.HashSet<V>): HashSet<V> {
    return new HashSet(set);
  }

  static is(u: unknown): u is HashSet<unknown> {
    return hasProperty(u, HashSetTypeId);
  }

  private readonly _set: _HashSet.HashSet<V>;

  private constructor(set: _HashSet.HashSet<V>) {
    super();
    this._set = set;
  }

  get hashSet(): _HashSet.HashSet<V> {
    return this._set;
  }

  // Preserve the underlying structure's reference-equality guarantees: when a
  // combinator is a no-op upstream (e.g. adding an existing value), return the
  // same fluent wrapper rather than allocating a new one.
  private _keep(next: _HashSet.HashSet<V>): HashSet<V> {
    return next === this._set ? this : new HashSet(next);
  }

  // --- Equal & Hash ---

  [Equal.symbol](that: unknown): boolean {
    return HashSet.is(that) && Equal.equals(this._set, that.hashSet);
  }

  [Hash.symbol](): number {
    return Hash.hash(this._set);
  }

  // --- Iteration ---

  [Symbol.iterator](): Iterator<V> {
    return this._set[Symbol.iterator]();
  }

  toJSON(): unknown {
    return { _id: 'HashSet', values: Array.from(this._set) };
  }

  // --- Basic operations ---

  add(value: V): HashSet<V> {
    return this._keep(_HashSet.add(this._set, value));
  }

  has(value: V): boolean {
    return _HashSet.has(this._set, value);
  }

  remove(value: V): HashSet<V> {
    return this._keep(_HashSet.remove(this._set, value));
  }

  get size(): number {
    return _HashSet.size(this._set);
  }

  get isEmpty(): boolean {
    return _HashSet.isEmpty(this._set);
  }

  // --- Set operations ---

  union<V1>(that: HashSet<V1>): HashSet<V | V1> {
    const next = _HashSet.union(this._set, that.hashSet);
    return next === (this._set as _HashSet.HashSet<V | V1>) ? this : new HashSet(next);
  }

  intersection<V1>(that: HashSet<V1>): HashSet<V & V1> {
    return new HashSet(_HashSet.intersection(this._set, that.hashSet));
  }

  difference<V1>(that: HashSet<V1>): HashSet<V> {
    return this._keep(_HashSet.difference(this._set, that.hashSet));
  }

  isSubset<V1>(that: HashSet<V1>): boolean {
    return _HashSet.isSubset(this._set, that.hashSet);
  }

  // --- Functional operations ---

  map<U>(f: (value: V) => U): HashSet<U> {
    return new HashSet(_HashSet.map(this._set, f));
  }

  filter<U extends V>(refinement: Refinement<V, U>): HashSet<U>;
  filter(predicate: Predicate<V>): HashSet<V>;
  filter(predicate: Predicate<V>): HashSet<V> {
    return this._keep(_HashSet.filter(this._set, predicate));
  }

  some(predicate: Predicate<V>): boolean {
    return _HashSet.some(this._set, predicate);
  }

  every(predicate: Predicate<V>): boolean {
    return _HashSet.every(this._set, predicate);
  }

  reduce<U>(zero: U, f: (accumulator: U, value: V) => U): U {
    return _HashSet.reduce(this._set, zero, f);
  }

  with<U>(f: (set: _HashSet.HashSet<V>) => _HashSet.HashSet<U>): HashSet<U> {
    return new HashSet(f(this._set));
  }
}
