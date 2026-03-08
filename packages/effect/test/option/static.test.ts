import { describe, it } from '@effect-fluent/vitest';
import { strictEqual, assertTrue, assertFalse, assertSome, assertNone } from '@effect-fluent/vitest/utils';
import { Equivalence } from 'effect';
import * as N from 'effect/Number';
import { Option } from '../../src/Option.js';

describe('Option', () => {
  describe('liftPredicate', () => {
    it('true predicate', () => {
      const parsePositive = Option.liftPredicate((n: number) => n > 0);
      const o = parsePositive(5);
      assertSome(o, 5);
    });

    it('false predicate', () => {
      const parsePositive = Option.liftPredicate((n: number) => n > 0);
      assertNone(parsePositive(-1));
    });
  });

  describe('liftThrowable', () => {
    it('no throw', () => {
      const parse = Option.liftThrowable(JSON.parse);
      const o = parse('{"a":1}');
      assertSome(o, { a: 1 });
    });

    it('throws', () => {
      const parse = Option.liftThrowable(JSON.parse);
      assertNone(parse('invalid'));
    });
  });

  describe('liftNullishOr', () => {
    it('non-null result', () => {
      const f = Option.liftNullishOr((s: string) => (s.length > 0 ? s : null));
      const o = f('hello');
      assertSome(o, 'hello');
    });

    it('null result', () => {
      const f = Option.liftNullishOr((s: string) => (s.length > 0 ? s : null));
      assertNone(f(''));
    });
  });

  describe('composeK', () => {
    it('both succeed', () => {
      const parse = (s: string): Option<number> => {
        const n = Number(s);
        return isNaN(n) ? Option.none() : Option.some(n);
      };
      const double = (n: number): Option<number> => (n > 0 ? Option.some(n * 2) : Option.none());
      const parseAndDouble = Option.composeK(parse, double);

      const o = parseAndDouble('21');
      assertSome(o, 42);
    });

    it('first fails', () => {
      const parse = (_s: string): Option<number> => Option.none();
      const double = (n: number): Option<number> => Option.some(n * 2);
      const composed = Option.composeK(parse, double);
      assertNone(composed('x'));
    });
  });

  describe('toRefinement', () => {
    it('returns true for Some', () => {
      const isString = Option.toRefinement(
        (v: string | number): Option<string> => (typeof v === 'string' ? Option.some(v) : Option.none())
      );
      assertTrue(isString('hello'));
      assertFalse(isString(42));
    });
  });

  describe('makeEquivalence', () => {
    it('Some + Some equal', () => {
      const eq = Option.makeEquivalence(Equivalence.strictEqual<number>());
      assertTrue(eq(Option.some(1), Option.some(1)));
    });

    it('Some + Some not equal', () => {
      const eq = Option.makeEquivalence(Equivalence.strictEqual<number>());
      assertFalse(eq(Option.some(1), Option.some(2)));
    });

    it('None + None', () => {
      const eq = Option.makeEquivalence(Equivalence.strictEqual<number>());
      assertTrue(eq(Option.none(), Option.none()));
    });

    it('Some + None', () => {
      const eq = Option.makeEquivalence(Equivalence.strictEqual<number>());
      assertFalse(eq(Option.some(1), Option.none()));
    });
  });

  describe('makeOrder', () => {
    it('None < Some', () => {
      const ord = Option.makeOrder(N.Order);
      strictEqual(ord(Option.none(), Option.some(1)), -1);
    });

    it('Some > None', () => {
      const ord = Option.makeOrder(N.Order);
      strictEqual(ord(Option.some(1), Option.none()), 1);
    });

    it('Some vs Some', () => {
      const ord = Option.makeOrder(N.Order);
      strictEqual(ord(Option.some(1), Option.some(2)), -1);
      strictEqual(ord(Option.some(2), Option.some(1)), 1);
      strictEqual(ord(Option.some(1), Option.some(1)), 0);
    });

    it('None vs None', () => {
      const ord = Option.makeOrder(N.Order);
      strictEqual(ord(Option.none(), Option.none()), 0);
    });
  });

  describe('lift2', () => {
    it('both Some', () => {
      const add = Option.lift2((a: number, b: number) => a + b);
      const o = add(Option.some(2), Option.some(3));
      assertSome(o, 5);
    });

    it('one None', () => {
      const add = Option.lift2((a: number, b: number) => a + b);
      assertNone(add(Option.some(2), Option.none()));
    });
  });

  describe('containsWith', () => {
    it('Some + equivalent', () => {
      const check = Option.containsWith(Equivalence.strictEqual<number>());
      assertTrue(check(Option.some(2), 2));
    });

    it('Some + not equivalent', () => {
      const check = Option.containsWith(Equivalence.strictEqual<number>());
      assertFalse(check(Option.some(2), 3));
    });

    it('None', () => {
      const check = Option.containsWith(Equivalence.strictEqual<number>());
      assertFalse(check(Option.none(), 2));
    });
  });

  describe('reduceCompact', () => {
    it('sums Some values', () => {
      const items = [Option.some(1), Option.none<number>(), Option.some(2), Option.none<number>()];
      strictEqual(
        Option.reduceCompact(items, 0, (b, a) => b + a),
        3
      );
    });

    it('all None', () => {
      const items = [Option.none<number>(), Option.none<number>()];
      strictEqual(
        Option.reduceCompact(items, 0, (b, a) => b + a),
        0
      );
    });
  });
});
