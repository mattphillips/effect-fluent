import { Effect as _Effect, Cause } from 'effect';
import { Effect } from '../../src/Effect.js';
import { describe, it } from '../../src/vitest/index.js';
import { assertFailure, strictEqual } from '../../src/vitest/utils.js';

describe('Effect', () => {
  describe('sequencing', () => {
    describe('flatMap', () => {
      it.effect('successful effects can be flatMapped to a new effect', () => {
        return Effect.gen(function* () {
          const success = yield* Effect.succeed(42).flatMap((x) => Effect.succeed(x * 2));
          strictEqual(success, 84);

          const failure = yield* Effect.succeed(42).flatMap((n) => Effect.fail(n * 2)).exit;
          assertFailure(failure, Cause.fail(84));

          const die = yield* Effect.succeed(42).flatMap((n) => Effect.die(n * 2)).exit;
          assertFailure(die, Cause.die(84));
        });
      });

      it.effect('failed effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertFailure(result, Cause.fail(42));
        });
      });

      it.effect('defect effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.die(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertFailure(result, Cause.die(42));
        });
      });
    });
  });
});
