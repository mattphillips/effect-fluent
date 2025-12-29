import { Cause } from 'effect';
import { Effect } from '../../src/Effect.js';
import { describe, it } from '../../src/vitest/index.js';
import { assertFailure, assertSuccess } from '../../src/vitest/utils.js';

describe('Effect', () => {
  describe('outcome', () => {
    describe('exit', () => {
      it.effect('successful effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const success = yield* Effect.succeed(42).exit;
          assertSuccess(success, 42);
        });
      });

      it.effect('failed effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).exit;
          assertFailure(result, Cause.fail(42));
        });
      });

      it.effect('defect effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.die(42).exit;
          assertFailure(result, Cause.die(42));
        });
      });
    });
  });
});
