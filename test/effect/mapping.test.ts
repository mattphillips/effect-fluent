import { describe, it } from '@effect/vitest';
import { assertFailure, strictEqual } from '@effect/vitest/utils';
import { Effect as _Effect, Cause } from 'effect';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  describe('mapping', () => {
    describe('map', () => {
      it.effect('successful effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).map((x) => x * 2);
          strictEqual(result, 84);
        }).asEffect;
      });

      it.effect('failed effects cannot be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).map((x) => x * 2).flip;
          strictEqual(result, 42);
        }).asEffect;
      });
    });

    describe('mapError', () => {
      it.effect('successful effects are unaffected', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapError((x) => x * 2);
          strictEqual(result, 42);
        }).asEffect;
      });

      it.effect('failed effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapError((x) => x * 2).flip;
          strictEqual(result, 84);
        }).asEffect;
      });
    });

    describe('mapErrorCause', () => {
      it.effect('successful effects are unaffected', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapErrorCause((cause) => cause.pipe(Cause.map((x) => x * 2)));
          strictEqual(result, 42);
        }).asEffect;
      });

      it.effect('failed effects can be mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapErrorCause((cause) => cause.pipe(Cause.map((x) => x * 2))).flip;
          strictEqual(result, 84);
        }).asEffect;
      });
    });

    describe('mapBoth', () => {
      it.effect('successful effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapBoth({ onSuccess: (x) => x * 2, onFailure: (e) => e });
          strictEqual(result, 84);
        }).asEffect;
      });

      it.effect('failed effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapBoth({ onSuccess: (x) => x * 2, onFailure: (e) => e + 1 }).flip;
          strictEqual(result, 43);
        }).asEffect;
      });
    });

    describe('as', () => {
      it.effect('successful effects are ased', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).as(43);
          strictEqual(result, 43);
        }).asEffect;
      });

      it.effect('failed effects are not affected by as', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).as(43).flip;
          strictEqual(result, 42);
        }).asEffect;
      });
    });

    describe('asVoid', () => {
      it.effect('successful effects are ased to void', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).asVoid;
          strictEqual(result, undefined);
        }).asEffect;
      });
    });

    describe('flip', () => {
      it.effect('successful effects are flipped', () => {
        return Effect.gen(function* () {
          // TODO: Replace `exit` with a more fluent version
          const result = yield* Effect.succeed(42).flip.asEffect.pipe(_Effect.exit);
          assertFailure(result, Cause.fail(42));
        }).asEffect;
      });

      it.effect('failed effects are flipped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flip;
          strictEqual(result, 42);
        }).asEffect;
      });
    });

    describe('flipWith', () => {
      it.effect('successful effects are flipped with a function', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42)
            .flipWith(() => Effect.succeed(84))
            .asEffect.pipe(_Effect.exit);
          assertFailure(result, Cause.fail(84));
        }).asEffect;
      });

      it.effect('failed effects are flipped with a function', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flipWith(() => Effect.fail(84));
          strictEqual(result, 84);
        }).asEffect;
      });
    });

    describe('merge', () => {
      it.effect('successful effects can be merged', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).merge;
          strictEqual(result, 42);
        }).asEffect;
      });

      it.effect('failed effects are merged', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).merge;
          strictEqual(result, 42);
        }).asEffect;
      });
    });
  });
});
