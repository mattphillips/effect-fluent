import { describe, it } from '@effect/vitest';
import { strictEqual, assertInclude } from '@effect/vitest/utils';
import { Effect as _Effect, Cause } from 'effect';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  describe('success constructors', () => {
    it.effect('succeed lifts a value to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.succeed(42);
        strictEqual(result, 42);
      });
    });

    it.effect('void lifts a void to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.void();
        strictEqual(result, undefined);
      });
    });
  });

  describe('failure constructors', () => {
    it.effect('fail lifts an error to an effect', () => {
      return _Effect.gen(function* () {
        const error = new Error('Failed');
        const result = yield* Effect.fail(error).flip;
        strictEqual(result, error);
      });
    });

    it.effect('failSync lifts a thunk to an effect', () => {
      return _Effect.gen(function* () {
        const error = new Error('Failed');
        const result = yield* Effect.failSync(() => error).flip;
        strictEqual(result, error);
      });
    });

    it.effect('failCause lifts a cause to an effect', () => {
      return _Effect.gen(function* () {
        const error = new Error('Failed');
        const cause = Cause.fail(error);
        const result = yield* Effect.failCause(cause).flip;
        strictEqual(result, error);
      });
    });

    it.effect('failCauseSync lifts a thunk to an effect', () => {
      return _Effect.gen(function* () {
        const error = new Error('Failed');
        const cause = Cause.fail(error);
        const result = yield* Effect.failCauseSync(() => cause).flip;
        strictEqual(result, error);
      });
    });
  });

  describe('defect constructors', () => {
    it.effect('die lifts a defect to an effect', () => {
      return _Effect.gen(function* () {
        const defect = new Error('Failed');
        const result = yield* Effect.die(defect).asEffect.pipe(
          _Effect.catchAllDefect((defect) => _Effect.succeed(defect))
        );
        strictEqual(result, defect);
      });
    });

    it.effect('dieMessage lifts a defect message to an effect', () => {
      return _Effect.gen(function* () {
        const message = 'Something went wrong';
        const result = yield* Effect.dieMessage(message).asEffect.pipe(
          _Effect.catchAllDefect((defect) => _Effect.succeed(defect)),
          _Effect.map(String)
        );
        assertInclude(result, message);
      });
    });

    it.effect('dieSync lifts a thunk to an effect', () => {
      return _Effect.gen(function* () {
        const defect = new Error('Failed');
        const result = yield* Effect.dieSync(() => defect).asEffect.pipe(
          _Effect.catchAllDefect((defect) => _Effect.succeed(defect))
        );
        strictEqual(result, defect);
      });
    });
  });

  describe('sync constructors', () => {
    it.effect('sync lifts a thunk to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.sync(() => 42);
        strictEqual(result, 42);
      });
    });

    describe('try', () => {
      it.effect('lifts a thunk to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.try(() => 42);
          strictEqual(result, 42);
        });
      });

      it.effect('lifts an options object to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.try({ try: () => 42, catch: (error) => error });
          strictEqual(result, 42);
        });
      });

      it.effect('throws an unknown exception', () => {
        return _Effect.gen(function* () {
          const error = new Error('Failed');
          const result = yield* Effect.try({
            try: () => {
              throw error;
            },
            catch: (error) => error
          }).flip;
          strictEqual(result, error);
        });
      });
    });
  });

  describe('async constructors', () => {
    it.effect('promise lifts a promise to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.promise(() => Promise.resolve(42));
        strictEqual(result, 42);
      });
    });

    describe('tryPromise', () => {
      it.effect('lifts a promise to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.tryPromise(() => Promise.resolve(42));
          strictEqual(result, 42);
        });
      });

      it.effect('lifts a promise to an effect with an options object', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.tryPromise({ try: () => Promise.resolve(42), catch: (error) => error });
          strictEqual(result, 42);
        });
      });

      it.effect('throws an unknown exception', () => {
        return _Effect.gen(function* () {
          const error = new Error('Failed');
          const result = yield* Effect.tryPromise({
            try: () => Promise.reject(error),
            catch: (error) => error
          }).flip;
          strictEqual(result, error);
        });
      });
    });

    describe('async', () => {
      it.effect('lifts a resume function to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.async((callback) => callback(Effect.succeed(42)));
          strictEqual(result, 42);
        });
      });

      it.effect('lifts a resume function to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.async((callback) => callback(Effect.succeed(42)));
          strictEqual(result, 42);
        });
      });
    });

    describe('asyncEffect', () => {
      it.effect('lifts a register function to an effect', () => {
        return _Effect.gen(function* () {
          const result = yield* Effect.asyncEffect<number, never, never, never, never, never>((callback) =>
            Effect.succeed(callback(Effect.succeed(42)))
          );
          strictEqual(result, 42);
        });
      });
    });
  });

  describe('other constructors', () => {
    it.effect('of lifts an effect to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.of(_Effect.succeed(42));
        strictEqual(result, 42);
      });
    });

    it.effect('suspend lifts a lazy effect to an effect', () => {
      return _Effect.gen(function* () {
        const result = yield* Effect.suspend(() => Effect.succeed(42));
        strictEqual(result, 42);
      });
    });
  });
});
