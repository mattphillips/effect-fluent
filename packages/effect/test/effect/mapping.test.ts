import { describe, it } from '@effect-fluent/vitest';
import { assertExitFailure, assertSome, strictEqual } from '@effect-fluent/vitest/utils';
import { Cause } from '../../src/Cause.js';
import { Effect } from '../../src/Effect.js';

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

    describe('mapBoth', () => {
      it.effect('successful effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).mapBoth({
            onSuccess: (x) => x * 2,
            onFailure: (e) => e
          });
          strictEqual(result, 84);
        });
      });

      it.effect('failed effects are mapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).mapBoth({
            onSuccess: (x) => x * 2,
            onFailure: (e) => e + 1
          }).flip;
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
          assertExitFailure(result, Cause.fail(42));
        });
      });

      it.effect('failed effects are flipped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flip;
          strictEqual(result, 42);
        });
      });
    });

    describe('asSome', () => {
      it.effect('successful effects are ased to Option.Some', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).asSome;
          assertSome(result, 42);
        });
      });

      it.effect('failed effects continue to fail', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).asSome.flip;
          strictEqual(result, 42);
        });
      });
    });
  });
});
