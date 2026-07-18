import { Equal, Hash, HashSet as _HashSet } from 'effect';
import { describe, expect, it } from '@effect-fluent/vitest';
import { HashSet } from '../src/HashSet.js';

describe('HashSet', () => {
  describe('constructors', () => {
    it('empty creates an empty set', () => {
      const set = HashSet.empty<string>();
      expect(set.size).toBe(0);
      expect(set.isEmpty).toBe(true);
    });

    it('make creates a set from distinct values', () => {
      const set = HashSet.make('a', 'b', 'c');
      expect(set.size).toBe(3);
      expect(set.has('a')).toBe(true);
      expect(set.has('b')).toBe(true);
      expect(set.has('c')).toBe(true);
      expect(set.has('d')).toBe(false);
    });

    it('make removes duplicate values', () => {
      const set = HashSet.make('a', 'b', 'a', 'c', 'b');
      expect(set.size).toBe(3);
      expect(set.has('a')).toBe(true);
      expect(set.has('b')).toBe(true);
      expect(set.has('c')).toBe(true);
    });

    it('fromIterable removes duplicate values from an iterable', () => {
      const set = HashSet.fromIterable(['a', 'b', 'c', 'b', 'a']);
      expect(set.size).toBe(3);
      expect(set.has('a')).toBe(true);
      expect(set.has('b')).toBe(true);
      expect(set.has('c')).toBe(true);
    });

    it('fromIterable accepts another fluent HashSet', () => {
      const original = HashSet.make('a', 'b');
      const copy = HashSet.fromIterable(original);
      expect(copy.size).toBe(2);
      expect(Equal.equals(original, copy)).toBe(true);
    });
  });

  describe('basic operations', () => {
    it('add returns a new set without mutating the original', () => {
      const original = HashSet.make('a', 'b');
      const updated = original.add('c');

      // Original unchanged
      expect(original.size).toBe(2);
      expect(original.has('c')).toBe(false);

      // Updated has new element
      expect(updated.size).toBe(3);
      expect(updated.has('c')).toBe(true);
      expect(updated.has('a')).toBe(true);
      expect(updated.has('b')).toBe(true);
    });

    it('add returns the same set when the value already exists', () => {
      const original = HashSet.make('a', 'b');
      const same = original.add('a');

      expect(same.size).toBe(2);
      expect(same).toBe(original); // Should return same reference
    });

    it('remove returns a new set without mutating the original', () => {
      const original = HashSet.make('a', 'b', 'c');
      const updated = original.remove('b');

      // Original unchanged
      expect(original.size).toBe(3);
      expect(original.has('b')).toBe(true);

      // Updated has element removed
      expect(updated.size).toBe(2);
      expect(updated.has('b')).toBe(false);
      expect(updated.has('a')).toBe(true);
      expect(updated.has('c')).toBe(true);
    });

    it('remove returns the same set when the value is absent', () => {
      const original = HashSet.make('a', 'b');
      const same = original.remove('c');

      expect(same.size).toBe(2);
      expect(same).toBe(original); // Should return same reference
    });

    it('has checks membership for present and absent values', () => {
      const set = HashSet.make('a', 'b', 'c');

      expect(set.has('a')).toBe(true);
      expect(set.has('b')).toBe(true);
      expect(set.has('c')).toBe(true);
      expect(set.has('d')).toBe(false);
    });

    it('size and isEmpty reflect set cardinality', () => {
      const empty = HashSet.empty<string>();
      expect(empty.size).toBe(0);
      expect(empty.isEmpty).toBe(true);

      const single = HashSet.make('a');
      expect(single.size).toBe(1);
      expect(single.isEmpty).toBe(false);

      const multiple = HashSet.make('a', 'b', 'c');
      expect(multiple.size).toBe(3);
      expect(multiple.isEmpty).toBe(false);
    });
  });

  describe('set operations', () => {
    it('union keeps values from both sets', () => {
      const set1 = HashSet.make('a', 'b');
      const set2 = HashSet.make('b', 'c');
      const result = set1.union(set2);

      expect(result.size).toBe(3);
      expect(result.has('a')).toBe(true);
      expect(result.has('b')).toBe(true);
      expect(result.has('c')).toBe(true);
    });

    it('intersection keeps only values present in both sets', () => {
      const set1 = HashSet.make('a', 'b', 'c');
      const set2 = HashSet.make('b', 'c', 'd');
      const result = set1.intersection(set2);

      expect(result.size).toBe(2);
      expect(result.has('b')).toBe(true);
      expect(result.has('c')).toBe(true);
      expect(result.has('a')).toBe(false);
      expect(result.has('d')).toBe(false);
    });

    it('difference removes values found in the second set', () => {
      const set1 = HashSet.make('a', 'b', 'c');
      const set2 = HashSet.make('b', 'd');
      const result = set1.difference(set2);

      expect(result.size).toBe(2);
      expect(result.has('a')).toBe(true);
      expect(result.has('c')).toBe(true);
      expect(result.has('b')).toBe(false);
    });

    it('isSubset checks whether all values exist in another set', () => {
      const small = HashSet.make('a', 'b');
      const large = HashSet.make('a', 'b', 'c', 'd');
      const other = HashSet.make('x', 'y');

      expect(small.isSubset(large)).toBe(true);
      expect(large.isSubset(small)).toBe(false);
      expect(small.isSubset(other)).toBe(false);
      expect(small.isSubset(small)).toBe(true);
    });

    it('set operations against the empty set', () => {
      const set = HashSet.make('a', 'b');
      const empty = HashSet.empty<string>();

      expect(set.union(empty).size).toBe(2);
      expect(empty.union(set).size).toBe(2);
      expect(set.intersection(empty).size).toBe(0);
      expect(set.difference(empty).size).toBe(2);
      expect(empty.difference(set).size).toBe(0);
      expect(empty.isSubset(set)).toBe(true); // vacuously true
      expect(set.isSubset(empty)).toBe(false);
    });
  });

  describe('functional operations', () => {
    it('map transforms every value', () => {
      const numbers = HashSet.make(1, 2, 3);
      const doubled = numbers.map((n) => n * 2);

      expect(doubled.size).toBe(3);
      expect(doubled.has(2)).toBe(true);
      expect(doubled.has(4)).toBe(true);
      expect(doubled.has(6)).toBe(true);
    });

    it('map removes duplicate transformed values', () => {
      const strings = HashSet.make('apple', 'banana', 'cherry');
      const lengths = strings.map((s) => s.length);

      expect(lengths.size).toBe(2); // 5 and 6 (apple=5, banana=6, cherry=6)
      expect(lengths.has(5)).toBe(true);
      expect(lengths.has(6)).toBe(true);
    });

    it('filter keeps values that satisfy the predicate', () => {
      const numbers = HashSet.make(1, 2, 3, 4, 5, 6);
      const evens = numbers.filter((n) => n % 2 === 0);

      expect(evens.size).toBe(3);
      expect(evens.has(2)).toBe(true);
      expect(evens.has(4)).toBe(true);
      expect(evens.has(6)).toBe(true);
      expect(evens.has(1)).toBe(false);
    });

    it('filter narrows with a refinement', () => {
      const mixed = HashSet.make<Array<string | number>>('a', 1, 'b', 2);
      const strings: HashSet<string> = mixed.filter((v): v is string => typeof v === 'string');

      expect(strings.size).toBe(2);
      expect(strings.has('a')).toBe(true);
      expect(strings.has('b')).toBe(true);
    });

    it('some returns true when any value satisfies the predicate', () => {
      const numbers = HashSet.make(1, 2, 3, 4, 5);

      expect(numbers.some((n) => n > 3)).toBe(true);
      expect(numbers.some((n) => n > 10)).toBe(false);

      const empty = HashSet.empty<number>();
      expect(empty.some((n) => n > 0)).toBe(false);
    });

    it('every returns true when all values satisfy the predicate', () => {
      const evens = HashSet.make(2, 4, 6, 8);

      expect(evens.every((n) => n % 2 === 0)).toBe(true);
      expect(evens.every((n) => n > 5)).toBe(false);

      const empty = HashSet.empty<number>();
      expect(empty.every((n) => n > 0)).toBe(true); // vacuously true
    });

    it('reduce folds every value into an accumulator', () => {
      const numbers = HashSet.make(1, 2, 3, 4, 5);
      const sum = numbers.reduce(0, (acc, n) => acc + n);

      expect(sum).toBe(15);

      const empty = HashSet.empty<number>();
      const zeroSum = empty.reduce(0, (acc, n) => acc + n);
      expect(zeroSum).toBe(0);
    });

    it('map and filter on the empty set stay empty', () => {
      const empty = HashSet.empty<number>();
      expect(empty.map((n) => n * 2).isEmpty).toBe(true);
      expect(empty.filter((n) => n > 0).isEmpty).toBe(true);
    });
  });

  describe('fluent chaining', () => {
    it('chains combinators in a single expression', () => {
      const result = HashSet.make(1, 2, 3, 4, 5, 6)
        .filter((n) => n % 2 === 0)
        .map((n) => n * 10)
        .add(1)
        .remove(20)
        .union(HashSet.make(100));

      expect(Array.from(result).sort((a, b) => a - b)).toEqual([1, 40, 60, 100]);
    });
  });

  describe('iteration', () => {
    it('Symbol.iterator iterates over the set values', () => {
      const set = HashSet.make('a', 'b', 'c');
      const values = Array.from(set).sort();

      expect(values).toEqual(['a', 'b', 'c']);
    });

    it('supports for...of iteration', () => {
      const set = HashSet.make('x', 'y', 'z');
      const collected = [];

      for (const value of set) {
        collected.push(value);
      }

      expect(collected.sort()).toEqual(['x', 'y', 'z']);
    });
  });

  describe('equality and hashing', () => {
    it('structural equality ignores insertion order', () => {
      const set1 = HashSet.make('a', 'b', 'c');
      const set2 = HashSet.make('c', 'b', 'a'); // Different order
      const set3 = HashSet.make('a', 'b', 'd'); // Different content

      expect(Equal.equals(set1, set2)).toBe(true);
      expect(Equal.equals(set1, set3)).toBe(false);
    });

    it('hash is consistent for sets with the same values', () => {
      const set1 = HashSet.make('a', 'b', 'c');
      const set2 = HashSet.make('c', 'b', 'a'); // Same content, different order

      expect(Hash.hash(set1)).toBe(Hash.hash(set2));
    });
  });

  describe('custom Equal objects', () => {
    class Person implements Equal.Equal {
      constructor(
        readonly id: string,
        readonly name: string
      ) {}

      [Equal.symbol](other: unknown): boolean {
        return other instanceof Person && this.id === other.id;
      }

      [Hash.symbol](): number {
        return Hash.string(this.id);
      }
    }

    it('uses Equal and Hash implementations for membership and uniqueness', () => {
      const alice1 = new Person('1', 'Alice');
      const alice2 = new Person('1', 'Alice'); // Same ID
      const bob = new Person('2', 'Bob');

      const people = HashSet.make(alice1, bob);

      expect(people.has(alice2)).toBe(true); // Should find by ID
      expect(people.size).toBe(2);

      const withDuplicate = people.add(alice2);
      expect(withDuplicate.size).toBe(2); // Should not add duplicate
    });
  });

  describe('type guards', () => {
    it('is identifies fluent HashSet values', () => {
      const set = HashSet.make('a', 'b', 'c');
      const array = ['a', 'b', 'c'];
      const object = { a: 1, b: 2 };

      expect(HashSet.is(set)).toBe(true);
      expect(HashSet.is(array)).toBe(false);
      expect(HashSet.is(object)).toBe(false);
      expect(HashSet.is(null)).toBe(false);
      expect(HashSet.is(undefined)).toBe(false);
      expect(HashSet.is(_HashSet.make('a'))).toBe(false); // core sets are not fluent sets
    });
  });

  describe('core interop', () => {
    it('wrap and the hashSet getter round-trip the underlying set', () => {
      const core = _HashSet.make('a', 'b');
      const fluent = HashSet.wrap(core);

      expect(fluent.size).toBe(2);
      expect(fluent.hashSet).toBe(core);
    });

    it('with applies a core transformation and re-wraps', () => {
      const set = HashSet.make(1, 2, 3);
      const result = set.with((core) => _HashSet.map(core, (n) => n + 1));

      expect(HashSet.is(result)).toBe(true);
      expect(Array.from(result).sort((a, b) => a - b)).toEqual([2, 3, 4]);
    });
  });
});
