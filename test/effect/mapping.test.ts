import { Cause } from 'effect';
import { Effect } from '../../src/Effect.js';
import { describe, it } from '../../src/vitest/index.js';
import { assertFailure, strictEqual } from '../../src/vitest/utils.js';

describe('Effect', () => {
  describe('mapping', () => {
    describe('map', () => {
      it.effect('successful effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).map((x) => x * 2);
          strictEqual(result, 84);
        });
      });

      it.effect('failed effects cannot be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).map((x) => x * 2).flip;
          strictEqual(result, 42);
        });
      });
    });

    describe('mapError', () => {
      it.effect('successful effects are unaffected', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapError((x) => x * 2);
          strictEqual(result, 42);
        });
      });

      it.effect('failed effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapError((x) => x * 2).flip;
          strictEqual(result, 84);
        });
      });
    });

    describe('mapErrorCause', () => {
      it.effect('successful effects are unaffected', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapErrorCause((cause) => cause.pipe(Cause.map((x) => x * 2)));
          strictEqual(result, 42);
        });
      });

      it.effect('failed effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapErrorCause((cause) => cause.pipe(Cause.map((x) => x * 2))).flip;
          strictEqual(result, 84);
        });
      });
    });

    describe('mapBoth', () => {
      it.effect('successful effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapBoth({ onSuccess: (x) => x * 2, onFailure: (e) => e });
          strictEqual(result, 84);
        });
      });

      it.effect('failed effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapBoth({ onSuccess: (x) => x * 2, onFailure: (e) => e + 1 }).flip;
          strictEqual(result, 43);
        });
      });
    });

    describe('as', () => {
      it.effect('successful effects are ased', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).as(43);
          strictEqual(result, 43);
        });
      });

      it.effect('failed effects are not affected by as', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).as(43).flip;
          strictEqual(result, 42);
        });
      });
    });

    describe('asVoid', () => {
      it.effect('successful effects are ased to void', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).asVoid;
          strictEqual(result, undefined);
        });
      });
    });

    describe('flip', () => {
      it.effect('successful effects are flipped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).flip.exit;
          assertFailure(result, Cause.fail(42));
        });
      });

      it.effect('failed effects are flipped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flip;
          strictEqual(result, 42);
        });
      });
    });

    describe('flipWith', () => {
      it.effect('successful effects are flipped with a function', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).flipWith(() => Effect.succeed(84)).exit;
          assertFailure(result, Cause.fail(84));
        });
      });

      it.effect('failed effects are flipped with a function', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flipWith(() => Effect.fail(84));
          strictEqual(result, 84);
        });
      });
    });

    describe('merge', () => {
      it.effect('successful effects can be merged', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).merge;
          strictEqual(result, 42);
        });
      });

      it.effect('failed effects are merged', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).merge;
          strictEqual(result, 42);
        });
      });
    });
  });
});
