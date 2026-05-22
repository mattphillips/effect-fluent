import { describe, it } from '@effect-fluent/vitest';
import { assertFailure, assertSuccess } from '@effect-fluent/vitest/utils';
import { Result } from '../../src/Result.js';

describe('Result', () => {
  describe('gen', () => {
    it('returns Success when all yields succeed', () => {
      const r = Result.gen(function* () {
        const a = yield* Result.succeed(1);
        const b = yield* Result.succeed(2);
        return a + b;
      });
      assertSuccess(r, 3);
    });

    it('short-circuits on Failure', () => {
      const r = Result.gen(function* () {
        const a = yield* Result.succeed(1);
        const _b: number = yield* Result.fail<string>('err');
        return a + _b;
      });
      assertFailure(r, 'err');
    });

    it('supports this binding', () => {
      class MyService {
        readonly local = 10;
        compute = Result.gen(this, function* () {
          const a = yield* Result.succeed(1);
          return a + this.local;
        });
      }
      const r = new MyService().compute;
      assertSuccess(r, 11);
    });
  });
});
