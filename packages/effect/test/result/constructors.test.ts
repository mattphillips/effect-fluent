import { describe, it } from '@effect-fluent/vitest';
import {
  assertFalse,
  assertFailure,
  assertNone,
  assertSome,
  assertSuccess,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Equal, Hash } from 'effect';
import { Option } from '../../src/Option.js';
import { Result } from '../../src/Result.js';

describe('Result', () => {
  describe('constructors', () => {
    it('succeed', () => {
      assertSuccess(Result.succeed(1), 1);
    });

    it('fail', () => {
      assertFailure(Result.fail('err'), 'err');
    });

    it('void', () => {
      assertSuccess(Result.void, undefined);
    });

    it('failVoid', () => {
      assertFailure(Result.failVoid, undefined);
    });

    it('try - simple thunk succeeds', () => {
      const r = Result.try(() => 42);
      assertSuccess(r, 42);
    });

    it('try - simple thunk throws', () => {
      const r = Result.try(() => {
        throw new Error('boom');
      });
      assertTrue(r.isFailure());
    });

    it('try - with catch', () => {
      const r = Result.try({
        try: () => JSON.parse('not json'),
        catch: (e) => `Parse failed: ${e}`
      });
      assertTrue(r.isFailure());
    });

    it('try - with catch succeeds', () => {
      const r = Result.try({
        try: () => JSON.parse('{"a":1}'),
        catch: (e) => `Parse failed: ${e}`
      });
      assertSuccess(r, { a: 1 });
    });

    it('fromNullishOr - data-first, non-null', () => {
      const r = Result.fromNullishOr(42, () => 'was null');
      assertSuccess(r, 42);
    });

    it('fromNullishOr - data-first, null', () => {
      const r = Result.fromNullishOr(null, () => 'was null');
      assertFailure(r, 'was null');
    });

    it('fromNullishOr - data-last', () => {
      const f = Result.fromNullishOr(() => 'was null');
      assertSuccess(f(42), 42);
      assertFailure(f(null), 'was null');
    });

    it('fromOption - data-first, Some', () => {
      const r = Result.fromOption(Option.some(42), () => 'missing');
      assertSuccess(r, 42);
    });

    it('fromOption - data-first, None', () => {
      const r = Result.fromOption(Option.none(), () => 'missing');
      assertFailure(r, 'missing');
    });

    it('fromOption - data-last', () => {
      const f = Result.fromOption(() => 'missing');
      assertSuccess(f(Option.some(42)), 42);
      assertFailure(f(Option.none()), 'missing');
    });

    it('liftPredicate - data-first, passes', () => {
      const r = Result.liftPredicate(
        5,
        (n: number) => n > 0,
        (n) => `${n} is not positive`
      );
      assertSuccess(r, 5);
    });

    it('liftPredicate - data-first, fails', () => {
      const r = Result.liftPredicate(
        -1,
        (n: number) => n > 0,
        (n) => `${n} is not positive`
      );
      assertFailure(r, '-1 is not positive');
    });

    it('liftPredicate - data-last', () => {
      const ensurePositive = Result.liftPredicate(
        (n: number) => n > 0,
        (n) => `${n} is not positive`
      );
      assertSuccess(ensurePositive(5), 5);
      assertFailure(ensurePositive(-1), '-1 is not positive');
    });

    it('liftPredicate - refinement', () => {
      const r = Result.liftPredicate(
        42 as string | number,
        (v): v is number => typeof v === 'number',
        () => 'not a number'
      );
      assertSuccess(r, 42);
    });

    it('succeedNone', () => {
      const r = Result.succeedNone;
      assertTrue(r.isSuccess());
      assertNone(r.getOrThrow);
    });

    it('succeedSome', () => {
      const r = Result.succeedSome(42);
      assertTrue(r.isSuccess());
      assertSome(r.getOrThrow, 42);
    });
  });

  describe('guards', () => {
    it('is - Success', () => {
      assertTrue(Result.is(Result.succeed(1)));
    });

    it('is - Failure', () => {
      assertTrue(Result.is(Result.fail('err')));
    });

    it('is - non-Result', () => {
      assertFalse(Result.is(42));
      assertFalse(Result.is(null));
      assertFalse(Result.is({}));
    });

    it('isSuccess', () => {
      assertTrue(Result.succeed(1).isSuccess());
      assertFalse(Result.fail('err').isSuccess());
    });

    it('isFailure', () => {
      assertTrue(Result.fail('err').isFailure());
      assertFalse(Result.succeed(1).isFailure());
    });
  });

  describe('Equal', () => {
    it('Success equals Success with same value', () => {
      assertTrue(Equal.equals(Result.succeed(1), Result.succeed(1)));
    });

    it('Success not equal to Success with different value', () => {
      assertFalse(Equal.equals(Result.succeed(1), Result.succeed(2)));
    });

    it('Failure equals Failure with same error', () => {
      assertTrue(Equal.equals(Result.fail('err'), Result.fail('err')));
    });

    it('Failure not equal to Failure with different error', () => {
      assertFalse(Equal.equals(Result.fail('a'), Result.fail('b')));
    });

    it('Success not equal to Failure', () => {
      assertFalse(Equal.equals(Result.succeed(1), Result.fail(1) as any));
    });

    it('not equal to non-Result', () => {
      assertFalse(Equal.equals(Result.succeed(1), 1 as any));
    });
  });

  describe('Hash', () => {
    it('equal Success values have equal hashes', () => {
      strictEqual(Hash.hash(Result.succeed(1)), Hash.hash(Result.succeed(1)));
    });

    it('equal Failure values have equal hashes', () => {
      strictEqual(Hash.hash(Result.fail('err')), Hash.hash(Result.fail('err')));
    });
  });

  describe('Inspectable', () => {
    it('toJSON - Success', () => {
      deepStrictEqual(Result.succeed(42).toJSON(), { _id: 'Result', _tag: 'Success', value: 42 });
    });

    it('toJSON - Failure', () => {
      deepStrictEqual(Result.fail('err').toJSON(), { _id: 'Result', _tag: 'Failure', failure: 'err' });
    });

    it('toString - Success', () => {
      const s = Result.succeed(42).toString();
      assertTrue(s.includes('Success'));
    });

    it('toString - Failure', () => {
      const s = Result.fail('err').toString();
      assertTrue(s.includes('Failure'));
    });
  });
});
