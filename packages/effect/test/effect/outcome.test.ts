import { describe, it } from '@effect-fluent/vitest';
import { assertExitFailure, assertExitSuccess } from '@effect-fluent/vitest/utils';
import { Cause } from 'effect';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  describe('outcome', () => {
    describe('exit', () => {
      it.effect('successful effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const success = yield* Effect.succeed(42).exit;
          assertExitSuccess(success, 42);
        });
      });

      it.effect('failed effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).exit;
          assertExitFailure(result, Cause.fail(42));
        });
      });

      it.effect('defect effects can be converted to an exit', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.die(42).exit;
          assertExitFailure(result, Cause.die(42));
        });
      });
    });
  });
});
