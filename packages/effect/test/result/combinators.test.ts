import { describe, it } from '@effect-fluent/vitest';
import {
  assertFailure,
  assertFalse,
  assertNone,
  assertSome,
  assertSuccess,
  assertTrue,
  strictEqual,
  throws
} from '@effect-fluent/vitest/utils';
import { Result } from '../../src/Result.js';
import { Option } from '../../src/Option.js';
import { pipe } from 'effect';

describe('Result', () => {
  describe('match', () => {
    it('Success', () => {
      const r = Result.succeed(42).match({
        onFailure: (e) => `err: ${e}`,
        onSuccess: (n) => `ok: ${n}`
      });
      strictEqual(r, 'ok: 42');
    });

    it('Failure', () => {
      const r = Result.fail('oops').match({
        onFailure: (e) => `err: ${e}`,
        onSuccess: (n) => `ok: ${n}`
      });
      strictEqual(r, 'err: oops');
    });
  });

  describe('map', () => {
    it('Success', () => {
      assertSuccess(
        Result.succeed(2).map((n) => n * 3),
        6
      );
    });

    it('Failure', () => {
      assertFailure(
        Result.fail<string>('err').map((n: number) => n * 3),
        'err'
      );
    });
  });

  describe('mapError', () => {
    it('Failure', () => {
      assertFailure(
        Result.fail('err').mapError((e) => `wrapped: ${e}`),
        'wrapped: err'
      );
    });

    it('Success passthrough', () => {
      assertSuccess(
        Result.succeed(42).mapError((e) => `wrapped: ${e}`),
        42
      );
    });
  });

  describe('mapBoth', () => {
    it('Success', () => {
      assertSuccess(
        Result.succeed(2).mapBoth({
          onFailure: (e: string) => `err: ${e}`,
          onSuccess: (n) => n * 3
        }),
        6
      );
    });

    it('Failure', () => {
      assertFailure(
        Result.fail<string>('oops').mapBoth({
          onFailure: (e) => `err: ${e}`,
          onSuccess: (n: number) => n * 3
        }),
        'err: oops'
      );
    });
  });

  describe('tap', () => {
    it('runs side-effect on Success', () => {
      let called = false;
      const r = Result.succeed(42).tap(() => {
        called = true;
      });
      assertTrue(called);
      assertSuccess(r, 42);
    });

    it('no-op on Failure', () => {
      let called = false;
      const r = Result.fail<string>('err').tap(() => {
        called = true;
      });
      assertFalse(called);
      assertFailure(r, 'err');
    });
  });

  describe('flatMap', () => {
    it('Success -> Success', () => {
      assertSuccess(
        Result.succeed(2).flatMap((n) => Result.succeed(n * 3)),
        6
      );
    });

    it('Success -> Failure', () => {
      assertFailure(
        Result.succeed(2).flatMap(() => Result.fail('err')),
        'err'
      );
    });

    it('Failure short-circuits', () => {
      assertFailure(
        Result.fail<string>('err').flatMap((n: number) => Result.succeed(n * 3)),
        'err'
      );
    });
  });

  describe('andThen', () => {
    it('with function returning Result', () => {
      assertSuccess(
        Result.succeed(5).andThen((x) => Result.succeed(x * 2)),
        10
      );
    });

    it('with Result value', () => {
      assertSuccess(Result.succeed(5).andThen(Result.succeed('hello')), 'hello');
    });

    it('with plain function', () => {
      assertSuccess(
        Result.succeed(5).andThen((x) => x * 2),
        10
      );
    });

    it('with plain value', () => {
      assertSuccess(Result.succeed(5).andThen('hello' as const), 'hello');
    });

    it('Failure short-circuits', () => {
      assertFailure(
        Result.fail<string>('err').andThen((x: number) => Result.succeed(x * 2)),
        'err'
      );
    });
  });

  describe('all', () => {
    it('tuple - all Success', () => {
      const r = Result.all([Result.succeed(1), Result.succeed('hello'), Result.succeed(true)]);
      assertSuccess(r, [1, 'hello', true] as const);
    });

    it('tuple - with Failure', () => {
      const r = Result.all([Result.succeed(1), Result.fail('err'), Result.succeed(true)]);
      assertFailure(r, 'err');
    });

    it('record - all Success', () => {
      const r = Result.all({
        name: Result.succeed('John'),
        age: Result.succeed(25)
      });
      assertSuccess(r, { name: 'John', age: 25 });
    });

    it('record - with Failure', () => {
      const r = Result.all({
        name: Result.succeed('John'),
        age: Result.fail('missing')
      });
      assertFailure(r, 'missing');
    });

    it('empty tuple', () => {
      assertSuccess(Result.all([]), []);
    });
  });

  describe('orElse', () => {
    it('Success passthrough', () => {
      assertSuccess(
        Result.succeed(42).orElse(() => Result.succeed(0)),
        42
      );
    });

    it('Failure recovers', () => {
      assertSuccess(
        Result.fail('err').orElse(() => Result.succeed(0)),
        0
      );
    });

    it('Failure to Failure', () => {
      assertFailure(
        Result.fail('err').orElse((e) => Result.fail(`wrapped: ${e}`)),
        'wrapped: err'
      );
    });
  });

  describe('flip', () => {
    it('Success becomes Failure', () => {
      assertFailure(Result.succeed(42).flip, 42);
    });

    it('Failure becomes Success', () => {
      assertSuccess(Result.fail('err').flip, 'err');
    });
  });

  describe('filterOrFail', () => {
    it('predicate passes', () => {
      assertSuccess(
        Result.succeed(5).filterOrFail(
          (n) => n > 0,
          (n) => `${n} is not positive`
        ),
        5
      );
    });

    it('predicate fails', () => {
      assertFailure(
        Result.succeed(-1).filterOrFail(
          (n) => n > 0,
          (n) => `${n} is not positive`
        ),
        '-1 is not positive'
      );
    });

    it('already Failure', () => {
      assertFailure(
        Result.fail<string>('err').filterOrFail(
          (_n: number) => true,
          () => 'unreachable'
        ),
        'err'
      );
    });
  });

  describe('merge', () => {
    it('Success', () => {
      strictEqual(Result.succeed(42).merge, 42);
    });

    it('Failure', () => {
      strictEqual(Result.fail('err').merge, 'err');
    });
  });

  describe('getOrElse', () => {
    it('Success', () => {
      strictEqual(
        Result.succeed(1).getOrElse(() => 0),
        1
      );
    });

    it('Failure', () => {
      strictEqual(
        Result.fail('err').getOrElse(() => 0),
        0
      );
    });
  });

  describe('getOrNull', () => {
    it('Success', () => {
      strictEqual(Result.succeed(1).getOrNull, 1);
    });

    it('Failure', () => {
      strictEqual(Result.fail('err').getOrNull, null);
    });
  });

  describe('getOrUndefined', () => {
    it('Success', () => {
      strictEqual(Result.succeed(1).getOrUndefined, 1);
    });

    it('Failure', () => {
      strictEqual(Result.fail('err').getOrUndefined, undefined);
    });
  });

  describe('getOrThrow', () => {
    it('Success', () => {
      strictEqual(Result.succeed(1).getOrThrow, 1);
    });

    it('Failure', () => {
      throws(() => Result.fail('err').getOrThrow);
    });
  });

  describe('getOrThrowWith', () => {
    it('Success', () => {
      strictEqual(
        Result.succeed(1).getOrThrowWith(() => new Error('missing')),
        1
      );
    });

    it('Failure', () => {
      throws(() => Result.fail('err').getOrThrowWith((e) => new Error(`fail: ${e}`)));
    });
  });

  describe('getSuccess', () => {
    it('Success returns Some', () => {
      assertSome(Result.succeed(42).getSuccess, 42);
    });

    it('Failure returns None', () => {
      assertNone(Result.fail('err').getSuccess);
    });
  });

  describe('getFailure', () => {
    it('Failure returns Some', () => {
      assertSome(Result.fail('err').getFailure, 'err');
    });

    it('Success returns None', () => {
      assertNone(Result.succeed(42).getFailure);
    });
  });

  describe('flatten', () => {
    it('Success(Success)', () => {
      assertSuccess(Result.flatten(Result.succeed(Result.succeed('value'))), 'value');
    });

    it('Success(Failure)', () => {
      assertFailure(Result.flatten(Result.succeed(Result.fail('err'))), 'err');
    });

    it('Failure', () => {
      assertFailure(Result.flatten(Result.fail<string>('err')), 'err');
    });
  });

  describe('transposeOption', () => {
    it('None -> Success(None)', () => {
      const r = Result.transposeOption(Option.none<Result<number, string>>());
      assertTrue(r.isSuccess());
      assertNone(r.getOrThrow);
    });

    it('Some(Success(a)) -> Success(Some(a))', () => {
      const r = Result.transposeOption(Option.some(Result.succeed(42)));
      assertTrue(r.isSuccess());
      assertSome(r.getOrThrow, 42);
    });

    it('Some(Failure(e)) -> Failure(e)', () => {
      const r = Result.transposeOption(Option.some(Result.fail('err')));
      assertFailure(r, 'err');
    });
  });

  describe('transposeMapOption', () => {
    it('None -> Success(None)', () => {
      const r = Result.transposeMapOption(Option.none<number>(), (n) => Result.succeed(n * 2));
      assertTrue(r.isSuccess());
      assertNone(r.getOrThrow);
    });

    it('Some + Success -> Success(Some)', () => {
      const r = Result.transposeMapOption(Option.some(21), (n) => Result.succeed(n * 2));
      assertTrue(r.isSuccess());
      assertSome(r.getOrThrow, 42);
    });

    it('Some + Failure -> Failure', () => {
      const r = Result.transposeMapOption(Option.some(21), () => Result.fail('err'));
      assertFailure(r, 'err');
    });

    it('data-last', () => {
      const f = Result.transposeMapOption((n: number) => Result.succeed(n * 2));
      const r = f(Option.some(21));
      assertTrue(r.isSuccess());
      assertSome(r.getOrThrow, 42);
    });
  });

  describe('Do notation', () => {
    it('bindTo', () => {
      assertSuccess(Result.succeed(2).bindTo('x'), { x: 2 });
    });

    it('bind', () => {
      const r = pipe(
        Result.Do,
        Result.bind('x', () => Result.succeed(2)),
        Result.bind('y', () => Result.succeed(3))
      );
      assertSuccess(r, { x: 2, y: 3 });
    });

    it('let', () => {
      const r = pipe(
        Result.Do,
        Result.bind('x', () => Result.succeed(2)),
        Result.bind('y', () => Result.succeed(3)),
        Result.let('sum', ({ x, y }) => x + y)
      );
      assertSuccess(r, { x: 2, y: 3, sum: 5 });
    });

    it('bind short-circuits on Failure', () => {
      const r = pipe(
        Result.Do,
        Result.bind('x', () => Result.succeed(2)),
        Result.bind('y', () => Result.fail<string>('err'))
      );
      assertFailure(r, 'err');
    });
  });
});
