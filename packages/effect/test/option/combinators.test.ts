import { describe, it } from '@effect-fluent/vitest';
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from '@effect-fluent/vitest/utils';
import { pipe, Result } from 'effect';
import { Option } from '../../src/Option.js';

describe('Option', () => {
  describe('match', () => {
    it('Some', () => {
      const result = Option.some(42).match({
        onNone: () => 'none',
        onSome: (n) => `some: ${n}`
      });
      strictEqual(result, 'some: 42');
    });

    it('None', () => {
      const result = Option.none<number>().match({
        onNone: () => 'none',
        onSome: (n) => `some: ${n}`
      });
      strictEqual(result, 'none');
    });
  });

  describe('map', () => {
    it('Some', () => {
      const o = Option.some(2).map((n) => n * 3);
      assertSome(o, 6);
    });

    it('None', () => {
      const o = Option.none<number>().map((n) => n * 3);
      assertNone(o);
    });
  });

  describe('as', () => {
    it('Some', () => {
      const o = Option.some(42).as('hello');
      assertSome(o, 'hello');
    });

    it('None', () => {
      assertNone(Option.none().as('hello'));
    });
  });

  describe('asVoid', () => {
    it('Some', () => {
      const o = Option.some(42).asVoid;
      assertSome(o, undefined);
    });

    it('None', () => {
      assertNone(Option.none().asVoid);
    });
  });

  describe('flatMap', () => {
    it('Some -> Some', () => {
      const o = Option.some(2).flatMap((n) => Option.some(n * 3));
      assertSome(o, 6);
    });

    it('Some -> None', () => {
      const o = Option.some(2).flatMap(() => Option.none());
      assertNone(o);
    });

    it('None', () => {
      const o = Option.none<number>().flatMap((n) => Option.some(n * 3));
      assertNone(o);
    });
  });

  describe('andThen', () => {
    it('with function returning Option', () => {
      const o = Option.some(5).andThen((x) => Option.some(x * 2));
      assertSome(o, 10);
    });

    it('with Option value', () => {
      const o = Option.some(5).andThen(Option.some('hello'));
      assertSome(o, 'hello');
    });

    it('with plain function', () => {
      const o = Option.some(5).andThen((x) => x * 2);
      assertSome(o, 10);
    });

    it('with plain value', () => {
      const o = Option.some(5).andThen('hello' as const);
      assertSome(o, 'hello');
    });

    it('None short-circuits', () => {
      assertTrue(
        Option.none<number>()
          .andThen((x) => Option.some(x * 2))
          .isNone()
      );
    });
  });

  describe('tap', () => {
    it('Some where f returns Some', () => {
      const o = Option.some(42).tap((n) => Option.some(n > 0));
      assertSome(o, 42);
    });

    it('Some where f returns None', () => {
      const o = Option.some(42).tap(() => Option.none());
      assertNone(o);
    });

    it('None', () => {
      assertTrue(
        Option.none<number>()
          .tap((n) => Option.some(n))
          .isNone()
      );
    });
  });

  describe('flatMapNullishOr', () => {
    it('Some -> non-null', () => {
      const o = Option.some({ name: 'Matt' }).flatMapNullishOr((u) => u.name);
      assertSome(o, 'Matt');
    });

    it('Some -> null', () => {
      const o = Option.some(1).flatMapNullishOr(() => null);
      assertNone(o);
    });

    it('None', () => {
      assertTrue(
        Option.none<number>()
          .flatMapNullishOr((n) => n)
          .isNone()
      );
    });
  });

  describe('flatten', () => {
    it('Some(Some)', () => {
      const o = Option.flatten(Option.some(Option.some('value')));
      assertSome(o, 'value');
    });

    it('Some(None)', () => {
      assertNone(Option.flatten(Option.some(Option.none())));
    });

    it('None', () => {
      assertNone(Option.flatten(Option.none<Option<string>>()));
    });
  });

  describe('getOrElse', () => {
    it('Some', () => {
      strictEqual(
        Option.some(1).getOrElse(() => 0),
        1
      );
    });

    it('None', () => {
      strictEqual(
        Option.none<number>().getOrElse(() => 0),
        0
      );
    });
  });

  describe('getOrNull', () => {
    it('Some', () => {
      strictEqual(Option.some(1).getOrNull, 1);
    });

    it('None', () => {
      strictEqual(Option.none<number>().getOrNull, null);
    });
  });

  describe('getOrUndefined', () => {
    it('Some', () => {
      strictEqual(Option.some(1).getOrUndefined, 1);
    });

    it('None', () => {
      strictEqual(Option.none<number>().getOrUndefined, undefined);
    });
  });

  describe('getOrThrow', () => {
    it('Some', () => {
      strictEqual(Option.some(1).getOrThrow, 1);
    });

    it('None', () => {
      throws(() => Option.none<number>().getOrThrow);
    });
  });

  describe('getOrThrowWith', () => {
    it('Some', () => {
      strictEqual(
        Option.some(1).getOrThrowWith(() => new Error('missing')),
        1
      );
    });

    it('None', () => {
      throws(() => Option.none<number>().getOrThrowWith(() => new Error('missing')));
    });
  });

  describe('orElse', () => {
    it('Some', () => {
      const o = Option.some('a').orElse(() => Option.some('b'));
      assertSome(o, 'a');
    });

    it('None', () => {
      const o = Option.none<string>().orElse(() => Option.some('b'));
      assertSome(o, 'b');
    });
  });

  describe('orElseSome', () => {
    it('Some', () => {
      const o = Option.some('a').orElseSome(() => 'b');
      assertSome(o, 'a');
    });

    it('None', () => {
      const o = Option.none<string>().orElseSome(() => 'b');
      assertSome(o, 'b');
    });
  });

  describe('firstSomeOf', () => {
    it('finds first Some', () => {
      const o = Option.firstSomeOf([Option.none<number>(), Option.some(1), Option.some(2)]);
      assertSome(o, 1);
    });

    it('all None', () => {
      assertNone(Option.firstSomeOf([Option.none(), Option.none()]));
    });

    it('empty', () => {
      assertNone(Option.firstSomeOf([]));
    });
  });

  describe('zipWith', () => {
    it('both Some', () => {
      const o = Option.some('John').zipWith(Option.some(25), (name, age) => ({ name, age }));
      assertSome(o, { name: 'John', age: 25 });
    });

    it('first None', () => {
      assertNone(Option.none<string>().zipWith(Option.some(25), (name, age) => ({ name, age })));
    });

    it('second None', () => {
      assertNone(Option.some('John').zipWith(Option.none<number>(), (name, age) => ({ name, age })));
    });
  });

  describe('zipRight', () => {
    it('both Some', () => {
      const o = Option.some(1).zipRight(Option.some('hello'));
      assertSome(o, 'hello');
    });

    it('first None', () => {
      assertNone(Option.none().zipRight(Option.some('hello')));
    });
  });

  describe('zipLeft', () => {
    it('both Some', () => {
      const o = Option.some('hello').zipLeft(Option.some(1));
      assertSome(o, 'hello');
    });

    it('second None', () => {
      assertNone(Option.some('hello').zipLeft(Option.none()));
    });
  });

  describe('product', () => {
    it('both Some', () => {
      const o = Option.some('hello').product(Option.some(42));
      assertSome(o, ['hello', 42] as const);
    });

    it('either None', () => {
      assertNone(Option.none().product(Option.some(42)));
      assertNone(Option.some('hello').product(Option.none()));
    });
  });

  describe('productMany', () => {
    it('all Some', () => {
      const o = Option.some(1).productMany([Option.some(2), Option.some(3)]);
      assertSome(o, [1, 2, 3] as const);
    });

    it('self None', () => {
      assertNone(Option.none<number>().productMany([Option.some(2)]));
    });

    it('any in collection None', () => {
      assertNone(Option.some(1).productMany([Option.some(2), Option.none()]));
    });
  });

  describe('filter', () => {
    it('Some + true predicate', () => {
      const o = Option.some(2).filter((n) => n % 2 === 0);
      assertSome(o, 2);
    });

    it('Some + false predicate', () => {
      assertNone(Option.some(3).filter((n) => n % 2 === 0));
    });

    it('None', () => {
      assertNone(Option.none<number>().filter((n) => n % 2 === 0));
    });

    it('refinement', () => {
      const o = Option.some<string | number>(42).filter((v): v is number => typeof v === 'number');
      assertSome(o, 42);
    });
  });

  describe('filterMap', () => {
    it('Some + success filter', () => {
      const o = Option.some(2).filterMap((n) => (n % 2 === 0 ? Result.succeed(`Even: ${n}`) : Result.fail(undefined)));
      assertSome(o, 'Even: 2');
    });

    it('Some + fail filter', () => {
      assertNone(
        Option.some(3).filterMap((n) => (n % 2 === 0 ? Result.succeed(`Even: ${n}`) : Result.fail(undefined)))
      );
    });

    it('None', () => {
      assertNone(Option.none<number>().filterMap((n) => Result.succeed(n)));
    });
  });

  describe('partitionMap', () => {
    it('Some + success', () => {
      const [left, right] = Option.some(42).partitionMap((n) => Result.succeed(n * 2));
      assertNone(left);
      assertSome(right, 84);
    });

    it('Some + failure', () => {
      const [left, right] = Option.some(42).partitionMap((n) => Result.fail(`err: ${n}`));
      assertSome(left, 'err: 42');
      assertNone(right);
    });

    it('None', () => {
      const [left, right] = Option.none<number>().partitionMap((n) => Result.succeed(n));
      assertNone(left);
      assertNone(right);
    });
  });

  describe('toArray', () => {
    it('Some', () => {
      deepStrictEqual(Option.some(1).toArray, [1]);
    });

    it('None', () => {
      deepStrictEqual(Option.none().toArray, []);
    });
  });

  describe('exists', () => {
    it('Some + true', () => {
      assertTrue(Option.some(2).exists((n) => n % 2 === 0));
    });

    it('Some + false', () => {
      assertFalse(Option.some(3).exists((n) => n % 2 === 0));
    });

    it('None', () => {
      assertFalse(Option.none<number>().exists((n) => n % 2 === 0));
    });
  });

  describe('contains', () => {
    it('Some + equal', () => {
      assertTrue(Option.some(2).contains(2));
    });

    it('Some + not equal', () => {
      assertFalse(Option.some(2).contains(3));
    });

    it('None', () => {
      assertFalse(Option.none<number>().contains(2));
    });
  });

  describe('all', () => {
    it('tuple - all Some', () => {
      const result = Option.all([Option.some(1), Option.some('hello'), Option.some(true)]);
      assertSome(result, [1, 'hello', true] as const);
    });

    it('tuple - one None', () => {
      assertNone(Option.all([Option.some(1), Option.none(), Option.some(true)]));
    });

    it('record - all Some', () => {
      const result = Option.all({
        name: Option.some('John'),
        age: Option.some(25)
      });
      assertSome(result, { name: 'John', age: 25 } as const);
    });

    it('record - one None', () => {
      assertNone(
        Option.all({
          name: Option.some('John'),
          age: Option.none<number>()
        })
      );
    });

    it('empty tuple', () => {
      const result = Option.all([]);
      assertSome(result, [] as any);
    });
  });

  describe('Do notation', () => {
    it('bindTo', () => {
      const result = Option.some(2).bindTo('x');
      assertSome(result, { x: 2 } as const);
    });

    it('bind', () => {
      const result = pipe(
        Option.Do,
        Option.bind('x', () => Option.some(2)),
        Option.bind('y', () => Option.some(3))
      );
      assertSome(result, { x: 2, y: 3 } as const);
    });

    it('let', () => {
      const result = pipe(
        Option.Do,
        Option.bind('x', () => Option.some(2)),
        Option.bind('y', () => Option.some(3)),
        Option.let('sum', ({ x, y }) => x + y)
      );
      assertSome(result, { x: 2, y: 3, sum: 5 } as const);
    });

    it('bind short-circuits on None', () => {
      const result = pipe(
        Option.Do,
        Option.bind('x', () => Option.some(2)),
        Option.bind('y', () => Option.none<number>())
      );

      assertNone(result);
    });
  });
});
