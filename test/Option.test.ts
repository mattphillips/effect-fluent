import { Chunk, Either, Equal, Hash, pipe, String as S, Number as N } from 'effect';
import { Option } from '../src/Option.js';
import { describe, it } from '../src/vitest/index.js';
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, throws } from '../src/vitest/utils.js';
import { strictEqual } from 'assert';

const gt2 = (n: number): boolean => n > 2;

describe('Option', () => {
  it('gen', () => {
    const a = Option.gen(function* () {
      const x = yield* Option.some(1);
      const y = yield* Option.some(2);
      return x + y;
    });
    const b = Option.gen(function* () {
      return 10;
    });
    const c = Option.gen(function* () {
      yield* Option.some(1);
      yield* Option.some(2);
    });
    const d = Option.gen(function* () {
      yield* Option.some(1);
      return yield* Option.some(2);
    });
    const e = Option.gen(function* () {
      yield* Option.some(1);
      yield* Option.none();
      return yield* Option.some(2);
    });
    const f = Option.gen(function* () {
      yield* Option.none();
    });
    const g = Option.gen({ ctx: 'testContext' as const }, function* (this: { ctx: 'testContext' }) {
      return yield* Option.some(this.ctx);
    });
    // TODO(4.0) remove this test
    // test adapter
    const h = Option.gen(function* ($: any) {
      const x = yield* $(Option.some(1));
      const y = yield* $(Option.some(2));
      return x + y;
    });
    assertSome(a, 3);
    assertSome(b, 10);
    assertSome(c, undefined);
    assertSome(d, 2);
    assertNone(e);
    assertNone(f);
    assertSome(g, 'testContext');
    assertSome(h, 3);
  });

  it('toString', () => {
    strictEqual(
      String(Option.none()),
      `{
  "_id": "Option",
  "_tag": "None"
}`
    );
    strictEqual(
      String(Option.some(1)),
      `{
  "_id": "Option",
  "_tag": "Some",
  "value": 1
}`
    );
    strictEqual(
      String(Option.some(Chunk.make(1, 2, 3))),
      `{
  "_id": "Option",
  "_tag": "Some",
  "value": {
    "_id": "Chunk",
    "values": [
      1,
      2,
      3
    ]
  }
}`
    );
  });

  it('toJSON', () => {
    deepStrictEqual(Option.none().toJSON(), { _id: 'Option', _tag: 'None' });
    deepStrictEqual(Option.some(1).toJSON(), { _id: 'Option', _tag: 'Some', value: 1 });
  });

  it('inspect', () => {
    if (typeof window !== 'undefined') {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require('node:util');
    deepStrictEqual(inspect(Option.none()), inspect({ _id: 'Option', _tag: 'None' }));
    deepStrictEqual(inspect(Option.some(1)), inspect({ _id: 'Option', _tag: 'Some', value: 1 }));
  });

  it('Equal', () => {
    assertTrue(Equal.equals(Option.some(1), Option.some(1)));
    assertFalse(Equal.equals(Option.some(1), Option.some(2)));
    assertTrue(Equal.equals(Option.none(), Option.none()));
  });

  it('Hash', () => {
    strictEqual(Hash.hash(Option.some(1)), Hash.hash(Option.some(1)));
    strictEqual(Hash.hash(Option.some(1)) === Hash.hash(Option.some(2)), false);
    strictEqual(Hash.hash(Option.none()), Hash.hash(Option.none()));
  });

  it('getRight', () => {
    assertSome(Option.getRight(Either.right(1)), 1);
    assertNone(Option.getRight(Either.left('a')));
  });

  it('getLeft', () => {
    assertNone(Option.getLeft(Either.right(1)));
    assertSome(Option.getLeft(Either.left('a')), 'a');
  });

  it('toRefinement', () => {
    const f = (s: string | number): Option<string> => (typeof s === 'string' ? Option.some(s) : Option.none());
    const isString = Option.toRefinement(f);
    assertTrue(isString('s'));
    assertFalse(isString(1));
    type A = { readonly type: 'A' };
    type B = { readonly type: 'B' };
    type C = A | B;
    const isA = Option.toRefinement<C, A>((c) => (c.type === 'A' ? Option.some(c) : Option.none()));
    assertTrue(isA({ type: 'A' }));
    assertFalse(isA({ type: 'B' }));
  });

  it('isOption', () => {
    assertTrue(pipe(Option.some(1), Option.is));
    assertTrue(pipe(Option.none(), Option.is));
    // TODO: Replace with fluent `Either`
    assertFalse(pipe(Either.right(1), Option.is));
  });

  it('firstSomeOf', () => {
    assertNone(Option.firstSomeOf([]));
    assertSome(Option.firstSomeOf([Option.some(1)]), 1);
    assertNone(Option.firstSomeOf([Option.none()]));
    assertSome(Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none(), Option.some(1)]), 1);
    assertNone(Option.firstSomeOf([Option.none(), Option.none(), Option.none(), Option.none()]));
  });

  it('orElseEither', () => {
    assertSome(
      Option.some(1).orElseEither(() => Option.some(2)),
      Either.left(1)
    );
    assertSome(
      Option.some(1).orElseEither(() => Option.none()),
      Either.left(1)
    );
    assertSome(
      Option.none().orElseEither(() => Option.some(2)),
      Either.right(2)
    );
    assertNone(Option.none().orElseEither(() => Option.none()));
  });

  it('orElseSome', () => {
    assertSome(
      Option.some(1).orElseSome(() => 2),
      1
    );
    assertSome(
      Option.none().orElseSome(() => 2),
      2
    );
  });

  it('getOrThrow', () => {
    strictEqual(Option.some(1).getOrThrow(), 1);
    throws(() => Option.none().getOrThrow(), new Error('getOrThrow called on a None'));
  });

  it('getOrThrowWith', () => {
    strictEqual(
      Option.some(1).getOrThrowWith(() => new Error('Unexpected None')),
      1
    );
    throws(() => Option.none().getOrThrowWith(() => new Error('Unexpected None')), new Error('Unexpected None'));
  });

  it('unit', () => {
    assertSome(Option.void, undefined);
  });

  it('product', () => {
    assertNone(Option.none().product(Option.none()));
    assertNone(Option.some(1).product(Option.none()));
    assertNone(Option.none().product(Option.some('a')));
    assertSome(Option.some(1).product(Option.some('a')), [1, 'a']);
  });

  it('productMany', () => {
    assertNone(Option.none().productMany([]));
    assertSome(Option.some(1).productMany([]), [1]);
    assertNone(Option.some(1).productMany([Option.none()]));
    assertSome(Option.some(1).productMany([Option.some(2)]), [1, 2]);
  });

  it('fromIterable', () => {
    assertNone(Option.fromIterable([]));
    assertSome(Option.fromIterable(['a']), 'a');
  });

  it('map', () => {
    assertSome(
      Option.some(2).map((n) => n * 2),
      4
    );
    assertNone(Option.none().map((n) => n * 2));
  });

  it('flatMap', () => {
    const f = (n: number) => Option.some(n * 2);
    const g = () => Option.none();
    assertSome(Option.some(1).flatMap(f), 2);
    assertNone(Option.none().flatMap(f));
    assertNone(Option.some(1).flatMap(g));
    assertNone(Option.none().flatMap(g));
  });

  it('andThen', () => {
    assertSome(
      Option.some(1).andThen(() => Option.some(2)),
      2
    );
    assertSome(Option.some(1).andThen(Option.some(2)), 2);
    assertSome(Option.some(1).andThen(2), 2);
    assertSome(
      Option.some(1).andThen(() => 2),
      2
    );
    assertSome(
      Option.some(1).andThen((a) => a),
      1
    );
  });

  it('orElse', () => {
    const assertOrElse = (a: Option<number>, b: Option<number>, expected: Option<number>) => {
      deepStrictEqual(
        a.orElse(() => b),
        expected
      );
    };
    assertOrElse(Option.some(1), Option.some(2), Option.some(1));
    assertOrElse(Option.some(1), Option.none(), Option.some(1));
    assertOrElse(Option.none(), Option.some(2), Option.some(2));
    assertOrElse(Option.none(), Option.none(), Option.none());
  });

  it('partitionMap', () => {
    const f = (n: number) => (gt2(n) ? Either.right(n + 1) : Either.left(n - 1));
    deepStrictEqual(Option.none().partitionMap(f), [Option.none(), Option.none()]);
    deepStrictEqual(Option.some(1).partitionMap(f), [Option.some(0), Option.none()]);
    deepStrictEqual(Option.some(3).partitionMap(f), [Option.none(), Option.some(4)]);
  });

  it('filter', () => {
    const isEven = (n: number) => n % 2 === 0;
    assertNone(Option.none().filter(isEven));
    assertNone(Option.some(3).filter(isEven));
    assertSome(Option.some(2).filter(isEven), 2);
    // Test refinement
    const isNumber = (v: unknown): v is number => typeof v === 'number';
    assertNone(Option.none().filter(isNumber));
    assertNone(Option.some('hello').filter(isNumber));
    assertSome(Option.some(2).filter(isNumber), 2);
  });

  it('filterMap', () => {
    const f = (n: number) => (gt2(n) ? Option.some(n + 1) : Option.none());
    assertNone(Option.none().filterMap(f));
    assertNone(Option.some(1).filterMap(f));
    assertSome(Option.some(3).filterMap(f), 4);
  });

  it('match', () => {
    const onNone = () => 'none';
    const onSome = (s: string) => `some${s.length}`;
    strictEqual(Option.none().match({ onNone, onSome }), 'none');
    strictEqual(Option.some('abc').match({ onNone, onSome }), 'some3');
  });

  it('getOrElse', () => {
    strictEqual(
      Option.some(1).getOrElse(() => 0),
      1
    );
    strictEqual(
      Option.none().getOrElse(() => 0),
      0
    );
  });

  it('getOrNull', () => {
    strictEqual(Option.none().getOrNull(), null);
    strictEqual(Option.some(1).getOrNull(), 1);
  });

  it('getOrUndefined', () => {
    strictEqual(Option.none().getOrUndefined(), undefined);
    strictEqual(Option.some(1).getOrUndefined(), 1);
  });

  it('getOrder', () => {
    const OS = Option.getOrder(S.Order);
    strictEqual(OS(Option.none(), Option.none()), 0);
    strictEqual(OS(Option.some('a'), Option.none()), 1);
    strictEqual(OS(Option.none(), Option.some('a')), -1);
    strictEqual(OS(Option.some('a'), Option.some('a')), 0);
    strictEqual(OS(Option.some('a'), Option.some('b')), -1);
    strictEqual(OS(Option.some('b'), Option.some('a')), 1);
  });

  it('flatMapNullable', () => {
    interface X {
      readonly a?: {
        readonly b?: {
          readonly c?: {
            readonly d: number;
          };
        };
      };
    }
    const x1: X = { a: {} };
    const x2: X = { a: { b: {} } };
    const x3: X = { a: { b: { c: { d: 1 } } } };
    assertNone(
      Option.fromNullable(x1.a)
        .flatMapNullable((x) => x.b)
        .flatMapNullable((x) => x.c)
        .flatMapNullable((x) => x.d)
    );
    assertNone(
      Option.fromNullable(x2.a)
        .flatMapNullable((x) => x.b)
        .flatMapNullable((x) => x.c)
        .flatMapNullable((x) => x.d)
    );
    assertSome(
      Option.fromNullable(x3.a)
        .flatMapNullable((x) => x.b)
        .flatMapNullable((x) => x.c)
        .flatMapNullable((x) => x.d),
      1
    );
  });

  it('fromNullable', () => {
    assertSome(Option.fromNullable(2), 2);
    assertNone(Option.fromNullable(null));
    assertNone(Option.fromNullable(undefined));
  });

  it('liftPredicate', () => {
    assertNone(pipe(1, Option.liftPredicate(gt2)));
    assertSome(pipe(3, Option.liftPredicate(gt2)), 3);
    assertNone(Option.liftPredicate(1, gt2));
    assertSome(Option.liftPredicate(3, gt2), 3);
    type Direction = 'asc' | 'desc';
    const isDirection = (s: string): s is Direction => s === 'asc' || s === 'desc';
    assertSome(pipe('asc', Option.liftPredicate(isDirection)), 'asc');
    assertNone(pipe('foo', Option.liftPredicate(isDirection)));
    assertSome(Option.liftPredicate('asc', isDirection), 'asc');
    assertNone(Option.liftPredicate('foo', isDirection));
  });

  it('containsWith', () => {
    const isEquivalent = (self: number, that: number) => self % 2 === that % 2;
    assertTrue(Option.some(2).containsWith(isEquivalent, 2));
    assertTrue(Option.some(4).containsWith(isEquivalent, 4));
    assertTrue(Option.some(1).containsWith(isEquivalent, 3));
    assertFalse(Option.none<number>().containsWith(isEquivalent, 2));
    assertFalse(Option.some(2).containsWith(isEquivalent, 1));
  });

  it('contains', () => {
    assertFalse(Option.none<number>().contains(2));
    assertTrue(Option.some(2).contains(2));
    assertFalse(Option.some(2).contains(1));
  });

  it('isNone', () => {
    assertTrue(Option.none().isNone());
    assertFalse(Option.some(1).isNone());
  });

  it('isSome', () => {
    assertFalse(Option.none().isSome());
    assertTrue(Option.some(1).isSome());
  });

  it('exists', () => {
    const predicate = (a: number) => a === 2;
    assertFalse(Option.none().exists(predicate));
    assertFalse(Option.some(1).exists(predicate));
    assertTrue(Option.some(2).exists(predicate));
  });

  it('liftNullable', () => {
    const f = Option.liftNullable((n: number) => (n > 0 ? n : null));
    assertSome(f(1), 1);
    assertNone(f(-1));
  });

  it('liftThrowable', () => {
    const parse = Option.liftThrowable(JSON.parse);
    assertSome(parse('1'), 1);
    assertNone(parse(''));
  });

  it('tap', () => {
    assertNone(Option.none().tap(() => Option.none()));
    assertNone(Option.some(1).tap(() => Option.none()));
    assertNone(Option.none().tap((n) => Option.some(n * 2)));
    assertSome(
      Option.some(1).tap((n) => Option.some(n * 2)),
      1
    );
  });

  it('zipWith', () => {
    assertNone(Option.none().zipWith(Option.some(2), (a, b) => a + b));
    assertNone(Option.some(1).zipWith(Option.none(), (a, b) => a + b));
    assertSome(
      Option.some(1).zipWith(Option.some(2), (a, b) => a + b),
      3
    );
  });

  it('ap', () => {
    assertNone(
      pipe(
        Option.some((a: number) => (b: number) => a + b),
        Option.ap(Option.none()),
        Option.ap(Option.some(2))
      )
    );
    assertNone(
      pipe(
        Option.some((a: number) => (b: number) => a + b),
        Option.ap(Option.some(1)),
        Option.ap(Option.none())
      )
    );
    assertSome(
      pipe(
        Option.some((a: number) => (b: number) => a + b),
        Option.ap(Option.some(1)),
        Option.ap(Option.some(2))
      ),
      3
    );
  });

  it('reduceCompact', () => {
    const sumCompact = Option.reduceCompact<number, number>(0, (b, a) => b + a);
    strictEqual(sumCompact([]), 0);
    strictEqual(sumCompact([Option.some(2), Option.some(3)]), 5);
    strictEqual(sumCompact([Option.some(2), Option.none(), Option.some(3)]), 5);
    // Test direct call form
    strictEqual(
      Option.reduceCompact([Option.some(2), Option.some(3)], 0, (b: number, a: number) => b + a),
      5
    );
  });

  it('getEquivalence', () => {
    const isEquivalent = Option.getEquivalence(N.Equivalence);
    assertTrue(isEquivalent(Option.none(), Option.none()));
    assertFalse(isEquivalent(Option.none(), Option.some(1)));
    assertFalse(isEquivalent(Option.some(1), Option.none()));
    assertFalse(isEquivalent(Option.some(2), Option.some(1)));
    assertFalse(isEquivalent(Option.some(1), Option.some(2)));
    assertTrue(isEquivalent(Option.some(2), Option.some(2)));
  });

  it('all/ tuple', () => {
    assertSome(Option.all([]), []);
    assertSome(Option.all([Option.some(1), Option.some('hello')]), [1, 'hello']);
    assertNone(Option.all([Option.some(1), Option.none()]));
  });

  it('all/ iterable', () => {
    assertSome(Option.all([]), []);
    assertNone(Option.all([Option.none()]));
    assertSome(Option.all([Option.some(1), Option.some(2)]), [1, 2]);
    assertSome(Option.all(new Set([Option.some(1), Option.some(2)])), [1, 2]);
    assertNone(Option.all([Option.some(1), Option.none()]));
  });

  it('all/ struct', () => {
    assertSome(Option.all({ a: Option.some(1), b: Option.some('hello') }), { a: 1, b: 'hello' });
    assertNone(Option.all({ a: Option.some(1), b: Option.none() }));
  });

  //   it('.pipe()', () => {
  //     assertSome(Option.some(1).pipe(Option.map((n) => n + 1)), 2);
  //   });

  it('lift2', () => {
    const f = Option.lift2((a: number, b: number): number => a + b);
    assertNone(f(Option.none(), Option.none()));
    assertNone(f(Option.some(1), Option.none()));
    assertNone(f(Option.none(), Option.some(2)));
    assertSome(f(Option.some(1), Option.some(2)), 3);
  });

  describe('do notation', () => {
    it('Do', () => {
      assertSome(Option.Do, {});
    });

    it('bindTo', () => {
      assertSome(Option.some(1).bindTo('a'), { a: 1 });
      assertNone(Option.none().bindTo('a'));
      // assertSome(
      //   Option.some(1)
      //     .bindTo('__proto__')
      //     .bind('x', () => Option.some(2)),
      //   { x: 2, ['__proto__']: 1 }
      // );
    });

    //     it('bind', () => {
    //       assertSome(
    //         pipe(
    //           Option.some(1),
    //           Option.bindTo('a'),
    //           Option.bind('b', ({ a }) => Option.some(a + 1))
    //         ),
    //         {
    //           a: 1,
    //           b: 2
    //         }
    //       );
    //       assertNone(
    //         pipe(
    //           Option.some(1),
    //           Option.bindTo('a'),
    //           Option.bind('b', () => Option.none())
    //         )
    //       );
    //       assertNone(
    //         pipe(
    //           Option.none(),
    //           Option.bindTo('a'),
    //           Option.bind('b', () => Option.some(2))
    //         )
    //       );
    //       assertSome(
    //         pipe(
    //           Option.some(1),
    //           Option.bindTo('a'),
    //           Option.bind('__proto__', ({ a }) => Option.some(a + 1)),
    //           Option.bind('b', ({ a }) => Option.some(a + 1))
    //         ),
    //         { a: 1, b: 2, ['__proto__']: 2 }
    //       );
    //     });

    //     it('let', () => {
    //       assertSome(
    //         pipe(
    //           Option.some(1),
    //           Option.bindTo('a'),
    //           Option.let('b', ({ a }) => a + 1)
    //         ),
    //         { a: 1, b: 2 }
    //       );
    //       assertNone(
    //         pipe(
    //           Option.none(),
    //           Option.bindTo('a'),
    //           Option.let('b', () => 2)
    //         )
    //       );
    //       assertSome(
    //         pipe(
    //           Option.some(1),
    //           Option.bindTo('a'),
    //           Option.let('__proto__', ({ a }) => a + 1),
    //           Option.let('b', ({ a }) => a + 1)
    //         ),
    //         { a: 1, b: 2, ['__proto__']: 2 }
    //       );
    //     });
  });

  it('as', () => {
    assertNone(Option.none().as('a'));
    assertSome(Option.some(1).as('a'), 'a');
  });

  it('asVoid', () => {
    assertNone(Option.none().asVoid);
    assertSome(Option.some(1).asVoid, undefined);
  });

  //   it('[internal] mergeWith', () => {
  //     const mergeWith = Option.mergeWith(N.sum);
  //     assertNone(mergeWith(Option.none(), Option.none()));
  //     assertSome(mergeWith(Option.some(1), Option.none()), 1);
  //     assertSome(mergeWith(Option.none(), Option.some(2)), 2);
  //     assertSome(mergeWith(Option.some(1), Option.some(2)), 3);
  //   });
});
