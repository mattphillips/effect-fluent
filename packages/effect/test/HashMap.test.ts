import { Equal, Hash, HashMap as _HashMap } from 'effect';
import { FastCheck as fc } from 'effect/testing';
import { describe, expect, it } from '@effect-fluent/vitest';
import { HashMap } from '../src/HashMap.js';
import { Option } from '../src/Option.js';
import { Result } from '../src/Result.js';

describe('HashMap', () => {
  describe('constructors', () => {
    it('empty', () => {
      const map = HashMap.empty<string, number>();
      expect(map.isEmpty).toBe(true);
      expect(map.size).toBe(0);
    });

    it('make', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      expect(map.size).toBe(3);
      expect(map.get('a')).toEqual(Option.some(1));
      expect(map.get('b')).toEqual(Option.some(2));
      expect(map.get('c')).toEqual(Option.some(3));
    });

    it('fromIterable', () => {
      const entries = [
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ] as const;
      const map = HashMap.fromIterable(entries);
      expect(map.size).toBe(3);
      expect(map.get('a')).toEqual(Option.some(1));
      expect(map.get('b')).toEqual(Option.some(2));
      expect(map.get('c')).toEqual(Option.some(3));
    });
  });

  describe('basic operations', () => {
    it('get - existing key', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.get('a')).toEqual(Option.some(1));
      expect(map.get('b')).toEqual(Option.some(2));
    });

    it('get - non-existing key', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.get('c')).toEqual(Option.none());
    });

    it('has - existing key', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(true);
    });

    it('has - non-existing key', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.has('c')).toBe(false);
    });

    it('set - new key', () => {
      const map1 = HashMap.make(['a', 1]);
      const map2 = map1.set('b', 2);
      expect(map2.size).toBe(2);
      expect(map2.get('a')).toEqual(Option.some(1));
      expect(map2.get('b')).toEqual(Option.some(2));
      // Original should be unchanged
      expect(map1.size).toBe(1);
      expect(map1.has('b')).toBe(false);
    });

    it('set - existing key', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.set('a', 10);
      expect(map2.size).toBe(2);
      expect(map2.get('a')).toEqual(Option.some(10));
      expect(map2.get('b')).toEqual(Option.some(2));
      // Original should be unchanged
      expect(map1.get('a')).toEqual(Option.some(1));
    });

    it('remove - existing key', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const map2 = map1.remove('b');
      expect(map2.size).toBe(2);
      expect(map2.has('a')).toBe(true);
      expect(map2.has('b')).toBe(false);
      expect(map2.has('c')).toBe(true);
      // Original should be unchanged
      expect(map1.size).toBe(3);
      expect(map1.has('b')).toBe(true);
    });

    it('remove - non-existing key', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.remove('c');
      expect(map1).toBe(map2); // Should return same reference
      expect(map2.size).toBe(2);
    });

    it('getUnsafe - existing key', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.getUnsafe('a')).toBe(1);
      expect(map.getUnsafe('b')).toBe(2);
    });

    it('getUnsafe - non-existing key', () => {
      const map = HashMap.make(['a', 1]);
      expect(() => map.getUnsafe('b')).toThrow('HashMap.getUnsafe: key not found');
    });
  });

  describe('hash-optimized operations', () => {
    it('getHash finds values using a precomputed hash', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.getHash('a', Hash.hash('a'))).toEqual(Option.some(1));
      expect(map.getHash('missing', Hash.hash('missing'))).toEqual(Option.none());
    });

    it('hasHash checks membership using a precomputed hash', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      expect(map.hasHash('a', Hash.hash('a'))).toBe(true);
      expect(map.hasHash('missing', Hash.hash('missing'))).toBe(false);
    });

    it('modifyHash updates values using a precomputed hash', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.modifyHash('a', Hash.hash('a'), (option) =>
        option.isSome() ? Option.some(option.value * 10) : Option.none()
      );
      expect(map2.get('a')).toEqual(Option.some(10));
      expect(map2.get('b')).toEqual(Option.some(2));
    });
  });

  describe('iterators and getters', () => {
    it('keys', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const keys = Array.from(map.keys).sort();
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('values', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const values = Array.from(map.values).sort();
      expect(values).toEqual([1, 2, 3]);
    });

    it('toValues', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const values = map.toValues.sort();
      expect(values).toEqual([1, 2, 3]);
    });

    it('entries', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const entries = Array.from(map.entries).sort(([a], [b]) => a.localeCompare(b));
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2]
      ]);
    });

    it('toEntries', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const entries = map.toEntries.sort(([a], [b]) => a.localeCompare(b));
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2]
      ]);
    });

    it('Symbol.iterator', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const entries = Array.from(map).sort(([a], [b]) => a.localeCompare(b));
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2]
      ]);
    });
  });

  describe('bulk operations', () => {
    it('removeMany', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3], ['d', 4]);
      const map2 = map1.removeMany(['b', 'd']);
      expect(map2.size).toBe(2);
      expect(map2.has('a')).toBe(true);
      expect(map2.has('b')).toBe(false);
      expect(map2.has('c')).toBe(true);
      expect(map2.has('d')).toBe(false);
    });

    it('setMany', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const newEntries = [
        ['c', 3],
        ['d', 4],
        ['a', 10]
      ] as const; // "a" should be overwritten
      const map2 = map1.setMany(newEntries);

      expect(map2.size).toBe(4);
      expect(map2.get('a')).toEqual(Option.some(10)); // overwritten
      expect(map2.get('b')).toEqual(Option.some(2)); // preserved
      expect(map2.get('c')).toEqual(Option.some(3)); // new
      expect(map2.get('d')).toEqual(Option.some(4)); // new
    });

    it('setMany - different iterables', () => {
      const map1 = HashMap.make(['existing', 1]);

      // Test with Map
      const jsMap = new Map([
        ['from-map', 2],
        ['another', 3]
      ]);
      const map2 = map1.setMany(jsMap);

      expect(map2.size).toBe(3);
      expect(map2.get('existing')).toEqual(Option.some(1));
      expect(map2.get('from-map')).toEqual(Option.some(2));
      expect(map2.get('another')).toEqual(Option.some(3));

      // Test with Set of tuples
      const setOfTuples = new Set([['from-set', 4]] as const);
      const map3 = map2.setMany(setOfTuples);

      expect(map3.size).toBe(4);
      expect(map3.get('from-set')).toEqual(Option.some(4));
    });

    it('union', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = HashMap.make(['b', 20], ['c', 3]);
      const map3 = map1.union(map2);
      expect(map3.size).toBe(3);
      expect(map3.get('a')).toEqual(Option.some(1));
      expect(map3.get('b')).toEqual(Option.some(20)); // that side wins
      expect(map3.get('c')).toEqual(Option.some(3));
    });
  });

  describe('mapping operations', () => {
    it('map', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const map2 = map1.map((value, _key) => value * 2);
      expect(map2.size).toBe(3);
      expect(map2.get('a')).toEqual(Option.some(2));
      expect(map2.get('b')).toEqual(Option.some(4));
      expect(map2.get('c')).toEqual(Option.some(6));
    });

    it('flatMap', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.flatMap((value, key) => HashMap.make([key + '1', value], [key + '2', value * 2]));
      expect(map2.size).toBe(4);
      expect(map2.get('a1')).toEqual(Option.some(1));
      expect(map2.get('a2')).toEqual(Option.some(2));
      expect(map2.get('b1')).toEqual(Option.some(2));
      expect(map2.get('b2')).toEqual(Option.some(4));
    });
  });

  describe('filtering operations', () => {
    it('filter', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3], ['d', 4]);
      const map2 = map1.filter((value) => value % 2 === 0);
      expect(map2.size).toBe(2);
      expect(map2.has('a')).toBe(false);
      expect(map2.has('b')).toBe(true);
      expect(map2.has('c')).toBe(false);
      expect(map2.has('d')).toBe(true);
    });

    it('compact', () => {
      const map1 = HashMap.make(['a', Option.some(1)], ['b', Option.none<number>()], ['c', Option.some(3)]);
      const map2 = HashMap.compact(map1);
      expect(map2.size).toBe(2);
      expect(map2.get('a')).toEqual(Option.some(1));
      expect(map2.has('b')).toBe(false);
      expect(map2.get('c')).toEqual(Option.some(3));
    });

    it('filterMap', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3], ['d', 4]);
      const map2 = map1.filterMap((value) => (value % 2 === 0 ? Result.succeed(value * 2) : Result.failVoid));
      expect(map2.size).toBe(2);
      expect(map2.get('b')).toEqual(Option.some(4));
      expect(map2.get('d')).toEqual(Option.some(8));
      expect(map2.has('a')).toBe(false);
      expect(map2.has('c')).toBe(false);
    });

    it('filterMap - key argument', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2], ['c', 3], ['d', 4]);
      const map2 = map1.filterMap((value, key) => (key < 'c' ? Result.succeed(`${key}:${value}`) : Result.failVoid));

      expect(map2.size).toBe(2);
      expect(map2.get('a')).toEqual(Option.some('a:1'));
      expect(map2.get('b')).toEqual(Option.some('b:2'));
      expect(map2.has('c')).toBe(false);
      expect(map2.has('d')).toBe(false);
    });
  });

  describe('search operations', () => {
    it('findFirst returns an entry matching both key and value', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const result = map.findFirst((value) => value > 1);
      expect(result).toEqual(Option.some(['c', 3]));
    });

    it('findFirst - not found', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const result = map.findFirst((value) => value > 5);
      expect(result).toEqual(Option.none());
    });

    it('some', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      expect(map.some((value) => value > 2)).toBe(true);
      expect(map.some((value) => value > 5)).toBe(false);
    });

    it('every', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      expect(map.every((value) => value > 0)).toBe(true);
      expect(map.every((value) => value > 1)).toBe(false);
    });

    it('hasBy', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      expect(map.hasBy((value, key) => key === 'b' && value === 2)).toBe(true);
      expect(map.hasBy((value, key) => key === 'b' && value === 5)).toBe(false);
    });
  });

  describe('modification operations', () => {
    it('modifyAt - existing key', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.modifyAt('a', (option) =>
        option.isSome() ? Option.some(option.value * 2) : Option.none()
      );
      expect(map2.get('a')).toEqual(Option.some(2));
    });

    it('modifyAt - non-existing key', () => {
      const map1 = HashMap.make(['a', 1]);
      const map2 = map1.modifyAt('b', (option) => (option.isSome() ? option : Option.some(10)));
      expect(map2.get('b')).toEqual(Option.some(10));
    });

    it('modifyAt - remove via None', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.modifyAt('a', () => Option.none());
      expect(map2.has('a')).toBe(false);
      expect(map2.has('b')).toBe(true);
    });

    it('modify', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = map1.modify('a', (value) => value * 3);
      expect(map2.get('a')).toEqual(Option.some(3));
      expect(map2.get('b')).toEqual(Option.some(2));
    });
  });

  describe('reduction operations', () => {
    it('reduce', () => {
      const map = HashMap.make(['a', 1], ['b', 2], ['c', 3]);
      const sum = map.reduce(0, (acc, value) => acc + value);
      expect(sum).toBe(6);
    });

    it('forEach visits each key and value', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const collected: Array<[string, number]> = [];
      map.forEach((value, key) => {
        collected.push([key, value]);
      });
      expect(collected.sort()).toEqual([
        ['a', 1],
        ['b', 2]
      ]);
    });
  });

  describe('mutation helpers', () => {
    it('mutate allows in-place modifications', () => {
      const map1 = HashMap.make(['a', 1]);
      const map2 = map1.mutate((mutable) => {
        mutable.set('b', 2);
        mutable.set('c', 3);
      });
      // Original should be unchanged
      expect(map1.size).toBe(1);
      // Mutated map should have all entries
      expect(map2.size).toBe(3);
      expect(map2.get('a')).toEqual(Option.some(1));
      expect(map2.get('b')).toEqual(Option.some(2));
      expect(map2.get('c')).toEqual(Option.some(3));
    });

    it('beginMutation creates distinct mutable instance', () => {
      const map1 = HashMap.make(['a', 1]);
      const mutable = map1.beginMutation;

      // Should be different instances
      expect(map1).not.toBe(mutable);

      // Mutations on mutable should not affect original; set on a mutable map
      // mutates in place and returns the same fluent wrapper
      const afterSet = mutable.set('b', 2);
      expect(afterSet).toBe(mutable);
      expect(map1.size).toBe(1);
      expect(mutable.size).toBe(2);

      // endMutation returns same instance
      const immutable = mutable.endMutation;
      expect(mutable).toBe(immutable);
    });

    it('mutations are isolated from original', () => {
      const original = HashMap.make(['a', 1], ['b', 2]);
      const mutated = original.mutate((m) => {
        m.set('a', 100);
        m.remove('b');
        m.set('c', 3);
      });

      // Original unchanged
      expect(original.get('a')).toEqual(Option.some(1));
      expect(original.get('b')).toEqual(Option.some(2));
      expect(original.has('c')).toBe(false);

      // Mutated has changes
      expect(mutated.get('a')).toEqual(Option.some(100));
      expect(mutated.has('b')).toBe(false);
      expect(mutated.get('c')).toEqual(Option.some(3));
    });
  });

  describe('equality and hashing', () => {
    it('Equal.equals', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = HashMap.make(['b', 2], ['a', 1]); // Different order
      const map3 = HashMap.make(['a', 1], ['b', 3]); // Different value

      expect(Equal.equals(map1, map2)).toBe(true);
      expect(Equal.equals(map1, map3)).toBe(false);
    });

    it('Hash.hash', () => {
      const map1 = HashMap.make(['a', 1], ['b', 2]);
      const map2 = HashMap.make(['b', 2], ['a', 1]); // Different order

      expect(Hash.hash(map1)).toBe(Hash.hash(map2));
    });
  });

  describe('custom hash with Equal objects', () => {
    class Person implements Equal.Equal {
      constructor(
        readonly name: string,
        readonly age: number
      ) {}

      [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof Person && this.name === that.name && this.age === that.age;
      }

      [Hash.symbol](): number {
        return Hash.string(this.name) ^ Hash.number(this.age);
      }
    }

    it('should work with Equal objects as keys', () => {
      const person1 = new Person('Alice', 25);
      const person2 = new Person('Alice', 25); // Same data, different instance
      const person3 = new Person('Bob', 30);

      const map = HashMap.make([person1, 'value1'], [person3, 'value3']);

      // Should find value using structurally equal key
      expect(map.get(person2)).toEqual(Option.some('value1'));
      expect(map.has(person2)).toBe(true);

      // Should work with set operation
      const map2 = map.set(person2, 'updated');
      expect(map2.get(person1)).toEqual(Option.some('updated'));
      expect(map2.size).toBe(2); // Should not increase size
    });
  });

  describe('regressions', () => {
    class FixedHashKey implements Equal.Equal {
      constructor(
        readonly id: string,
        readonly hash: number
      ) {}

      [Equal.symbol](that: Equal.Equal): boolean {
        return that instanceof FixedHashKey && this.id === that.id;
      }

      [Hash.symbol](): number {
        return this.hash;
      }
    }

    it('keeps entries addressable when bit 31 is present in indexed leaf insert', () => {
      const bit31Key = new FixedHashKey('bit31', 31);
      const bit30Key = new FixedHashKey('bit30', 30);

      let map = HashMap.empty<FixedHashKey, string>();
      map = map.set(bit31Key, 'session1');
      map = map.set(bit30Key, 'session2');

      expect(map.size).toBe(2);
      expect(map.get(bit31Key)).toEqual(Option.some('session1'));
      expect(map.get(bit30Key)).toEqual(Option.some('session2'));
    });

    it('keeps entries addressable when mergeLeaves sees bit 31', () => {
      const collisionA = new FixedHashKey('collisionA', 31);
      const collisionB = new FixedHashKey('collisionB', 31);
      const bit30Key = new FixedHashKey('bit30', 30);

      let map = HashMap.empty<FixedHashKey, string>();
      map = map.set(collisionA, 'a');
      map = map.set(collisionB, 'b');
      map = map.set(bit30Key, 'c');

      expect(map.size).toBe(3);
      expect(map.get(collisionA)).toEqual(Option.some('a'));
      expect(map.get(collisionB)).toEqual(Option.some('b'));
      expect(map.get(bit30Key)).toEqual(Option.some('c'));
    });

    it('keeps all inserted entries addressable across random bit-31-heavy shapes', () => {
      const entriesArbitrary = fc
        .array(fc.integer({ min: 0, max: 31 }), { minLength: 0, maxLength: 80 })
        .chain((hashes) => {
          const allHashes = [31, 31, 30, ...hashes];
          return fc
            .uniqueArray(fc.uuid(), { minLength: allHashes.length, maxLength: allHashes.length })
            .map((ids) => allHashes.map((hash, i) => ({ id: ids[i], hash })));
        });

      fc.assert(
        fc.property(entriesArbitrary, (entries) => {
          let map = HashMap.empty<FixedHashKey, string>();
          const inserted: Array<readonly [FixedHashKey, string]> = [];

          for (const entry of entries) {
            const key = new FixedHashKey(entry.id, entry.hash);
            const value = `value-${entry.id}`;
            map = map.set(key, value);
            inserted.push([key, value]);
          }

          expect(map.size).toBe(inserted.length);
          for (const [key, value] of inserted) {
            expect(map.has(key)).toBe(true);
            expect(map.get(key)).toEqual(Option.some(value));
          }
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('type guards', () => {
    it('is identifies fluent HashMap values', () => {
      const map = HashMap.make(['a', 1]);
      const notMap = { a: 1 };

      expect(HashMap.is(map)).toBe(true);
      expect(HashMap.is(notMap)).toBe(false);
      expect(HashMap.is(null)).toBe(false);
      expect(HashMap.is(undefined)).toBe(false);
      expect(HashMap.is(_HashMap.make(['a', 1]))).toBe(false); // core maps are not fluent maps
    });
  });

  describe('stress tests', () => {
    it('handles many inserts, lookups, and removals', () => {
      let map = HashMap.empty<number, string>();

      // Add many entries
      for (let i = 0; i < 1000; i++) {
        map = map.set(i, `value${i}`);
      }

      expect(map.size).toBe(1000);

      // Check random entries
      for (let i = 0; i < 100; i++) {
        const key = Math.floor(Math.random() * 1000);
        expect(map.get(key)).toEqual(Option.some(`value${key}`));
      }

      // Remove half the entries
      for (let i = 0; i < 500; i++) {
        map = map.remove(i);
      }

      expect(map.size).toBe(500);

      // Verify removals
      for (let i = 0; i < 500; i++) {
        expect(map.has(i)).toBe(false);
      }
      for (let i = 500; i < 1000; i++) {
        expect(map.has(i)).toBe(true);
      }
    });

    it('should handle hash collisions', () => {
      // Create objects with same hash but different equality
      class CollidingKey implements Equal.Equal {
        constructor(readonly id: number) {}

        [Equal.symbol](that: Equal.Equal): boolean {
          return that instanceof CollidingKey && this.id === that.id;
        }

        [Hash.symbol](): number {
          return 42; // Same hash for all instances
        }
      }

      const key1 = new CollidingKey(1);
      const key2 = new CollidingKey(2);
      const key3 = new CollidingKey(3);

      let map = HashMap.empty<CollidingKey, string>();
      map = map.set(key1, 'value1');
      map = map.set(key2, 'value2');
      map = map.set(key3, 'value3');

      expect(map.size).toBe(3);
      expect(map.get(key1)).toEqual(Option.some('value1'));
      expect(map.get(key2)).toEqual(Option.some('value2'));
      expect(map.get(key3)).toEqual(Option.some('value3'));

      // Remove one
      map = map.remove(key2);
      expect(map.size).toBe(2);
      expect(map.has(key1)).toBe(true);
      expect(map.has(key2)).toBe(false);
      expect(map.has(key3)).toBe(true);
    });
  });

  describe('fluent chaining', () => {
    it('chains combinators in a single expression', () => {
      const result = HashMap.make(['a', 1], ['b', 2], ['c', 3], ['d', 4])
        .filter((value) => value % 2 === 0)
        .map((value) => value * 10)
        .set('e', 5)
        .remove('b')
        .union(HashMap.make(['f', 100]));

      expect(result.toEntries.sort(([a], [b]) => a.localeCompare(b))).toEqual([
        ['d', 40],
        ['e', 5],
        ['f', 100]
      ]);
    });
  });

  describe('core interop', () => {
    it('wrap and the hashMap getter round-trip the underlying map', () => {
      const core = _HashMap.make(['a', 1], ['b', 2]);
      const fluent = HashMap.wrap(core);

      expect(fluent.size).toBe(2);
      expect(fluent.hashMap).toBe(core);
    });

    it('with applies a core transformation and re-wraps', () => {
      const map = HashMap.make(['a', 1], ['b', 2]);
      const result = map.with((core) => _HashMap.map(core, (n) => n + 1));

      expect(HashMap.is(result)).toBe(true);
      expect(result.get('a')).toEqual(Option.some(2));
      expect(result.get('b')).toEqual(Option.some(3));
    });
  });
});
