import { describe, it } from '@effect-fluent/vitest';
import { assertFalse, assertNone, assertSome, assertTrue, deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Equal, Hash, Result } from 'effect';
import { Option } from '../../src/Option.js';

describe('Option', () => {
  describe('constructors', () => {
    it('some', () => {
      const o = Option.some(1);
      assertSome(o, 1);
    });

    it('none', () => {
      const o = Option.none();
      assertNone(o);
    });

    it('fromNullishOr - non-null', () => {
      const o = Option.fromNullishOr(42);
      assertSome(o, 42);
    });

    it('fromNullishOr - null', () => {
      const o = Option.fromNullishOr(null);
      assertNone(o);
    });

    it('fromNullishOr - undefined', () => {
      const o = Option.fromNullishOr(undefined);
      assertNone(o);
    });

    it('fromUndefinedOr - value', () => {
      const o = Option.fromUndefinedOr(42);
      assertSome(o, 42);
    });

    it('fromUndefinedOr - undefined', () => {
      const o = Option.fromUndefinedOr(undefined);
      assertNone(o);
    });

    it('fromUndefinedOr - null is Some', () => {
      const o = Option.fromUndefinedOr(null);
      assertSome(o, null);
    });

    it('fromNullOr - value', () => {
      const o = Option.fromNullOr(42);
      assertSome(o, 42);
    });

    it('fromNullOr - null', () => {
      const o = Option.fromNullOr(null);
      assertNone(o);
    });

    it('fromNullOr - undefined is Some', () => {
      const o = Option.fromNullOr(undefined);
      assertSome(o, undefined);
    });

    it('fromIterable - non-empty', () => {
      const o = Option.fromIterable([1, 2, 3]);
      assertSome(o, 1);
    });

    it('fromIterable - empty', () => {
      const o = Option.fromIterable([]);
      assertNone(o);
    });

    it('getSuccess - success', () => {
      const o = Option.getSuccess(Result.succeed('ok'));
      assertSome(o, 'ok');
    });

    it('getSuccess - failure', () => {
      const o = Option.getSuccess(Result.fail('err'));
      assertNone(o);
    });

    it('getFailure - failure', () => {
      const o = Option.getFailure(Result.fail('err'));
      assertSome(o, 'err');
    });

    it('getFailure - success', () => {
      const o = Option.getFailure(Result.succeed('ok'));
      assertTrue(o.isNone());
    });
  });

  describe('guards', () => {
    it('is - Some', () => {
      assertTrue(Option.is(Option.some(1)));
    });

    it('is - None', () => {
      assertTrue(Option.is(Option.none()));
    });

    it('is - non-option', () => {
      assertFalse(Option.is(42));
      assertFalse(Option.is(null));
      assertFalse(Option.is({}));
    });

    it('isSome', () => {
      assertTrue(Option.some(1).isSome());
      assertFalse(Option.none().isSome());
    });

    it('isNone', () => {
      assertTrue(Option.none().isNone());
      assertFalse(Option.some(1).isNone());
    });
  });

  describe('Equal', () => {
    it('Some equals Some with same value', () => {
      assertTrue(Equal.equals(Option.some(1), Option.some(1)));
    });

    it('Some not equal to Some with different value', () => {
      assertFalse(Equal.equals(Option.some(1), Option.some(2)));
    });

    it('None equals None', () => {
      assertTrue(Equal.equals(Option.none(), Option.none()));
    });

    it('Some not equal to None', () => {
      assertFalse(Equal.equals(Option.some(1), Option.none()));
    });

    it('None not equal to Some', () => {
      assertFalse(Equal.equals(Option.none(), Option.some(1)));
    });

    it('not equal to non-Option', () => {
      assertFalse(Equal.equals(Option.some(1), 1 as any));
    });
  });

  describe('Hash', () => {
    it('equal values have equal hashes', () => {
      strictEqual(Hash.hash(Option.some(1)), Hash.hash(Option.some(1)));
    });

    it('None has consistent hash', () => {
      strictEqual(Hash.hash(Option.none()), Hash.hash(Option.none()));
    });
  });

  describe('Inspectable', () => {
    it('toJSON - Some', () => {
      deepStrictEqual(Option.some(42).toJSON(), { _id: 'Option', _tag: 'Some', value: 42 });
    });

    it('toJSON - None', () => {
      deepStrictEqual(Option.none().toJSON(), { _id: 'Option', _tag: 'None' });
    });

    it('toString - Some', () => {
      const s = Option.some(42).toString();
      assertTrue(s.includes('Some'));
    });

    it('toString - None', () => {
      const s = Option.none().toString();
      assertTrue(s.includes('None'));
    });
  });
});
