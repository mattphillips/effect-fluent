import { describe, it } from '@effect-fluent/vitest';
import { assertNone, assertSome } from '@effect-fluent/vitest/utils';
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
});
