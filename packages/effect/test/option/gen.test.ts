import { describe, it } from '@effect-fluent/vitest';
import { assertExitFailure, assertNone, assertSome, strictEqual } from '@effect-fluent/vitest/utils';
import { Cause } from 'effect';
import { Effect } from '../../src/Effect.js';
import { Option } from '../../src/Option.js';

describe('Option', () => {
  describe('gen', () => {
    it('returns Some when all yields are Some', () => {
      const result = Option.gen(function* () {
        const a = yield* Option.some(1);
        const b = yield* Option.some(2);
        return a + b;
      });
      assertSome(result, 3);
    });

    it('short-circuits on None', () => {
      const result = Option.gen(function* () {
        const a = yield* Option.some(1);
        const _b: number = yield* Option.none<number>();
        return a + _b;
      });
      assertNone(result);
    });

    it('supports this binding', () => {
      class MyService {
        readonly local = 10;
        compute = Option.gen(this, function* () {
          const a = yield* Option.some(1);
          return a + this.local;
        });
      }
      const result = new MyService().compute;
      assertSome(result, 11);
    });
  });

  describe('Effect.gen interop', () => {
    it.effect('Option.some can be yielded in Effect.gen', () =>
      Effect.gen(function* () {
        const result = yield* Option.some(42);
        strictEqual(result, 42);
      })
    );

    it.effect('Option.none fails with NoSuchElementError in Effect.gen', () =>
      Effect.gen(function* () {
        const exit = yield* Effect.fromOption(Option.none<number>()).exit;
        assertExitFailure(exit, Cause.fail(new Cause.NoSuchElementError()));
      })
    );
  });
});
