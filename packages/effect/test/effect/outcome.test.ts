import { describe, expect, it } from '@effect-fluent/vitest';
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

    describe('result', () => {
      it.effect('successful effect returns Result.succeed', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42).result;
          expect(result.isSuccess()).toBe(true);
          expect(result.isSuccess() && result.success).toBe(42);
        });
      });

      it.effect('failed effect returns Result.fail', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail('error').result;
          expect(result.isFailure()).toBe(true);
          expect(result.isFailure() && result.failure).toBe('error');
        });
      });

      it.effect('result is chainable', () => {
        return Effect.gen(function* () {
          const value = yield* Effect.succeed(42).result.map((r) => r.getOrThrow);
          expect(value).toBe(42);
        });
      });
    });

    describe('option', () => {
      it.effect('successful effect returns Some', () => {
        return Effect.gen(function* () {
          const option = yield* Effect.succeed(42).option;
          expect(option.isSome()).toBe(true);
          expect(option.getOrThrow).toBe(42);
        });
      });

      it.effect('failed effect returns None', () => {
        return Effect.gen(function* () {
          const option = yield* Effect.fail('error').option;
          expect(option.isNone()).toBe(true);
        });
      });

      it.effect('option is chainable', () => {
        return Effect.gen(function* () {
          const value = yield* Effect.succeed(42).option.map((o) => o.getOrElse(() => 0));
          expect(value).toBe(42);
        });
      });
    });
  });
});
