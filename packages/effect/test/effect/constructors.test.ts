import { describe, it } from '@effect-fluent/vitest';
import { deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Effect as _Effect, Cause } from 'effect';
import { Effect } from '../../src/Effect.js';
import { Option } from '../../src/Option.js';

describe('Effect', () => {
  describe('constructors', () => {
    describe('success', () => {
      it.effect('succeed lifts a value to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.succeed(42);
          strictEqual(result, 42);
        });
      });

      it.effect('void lifts a void to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.void();
          strictEqual(result, undefined);
        });
      });
    });

    describe('failure', () => {
      it.effect('fail lifts an error to an effect', () => {
        return Effect.gen(function* () {
          const error = new Error('Failed');
          const result = yield* Effect.fail(error).flip;
          strictEqual(result, error);
        });
      });

      it.effect('failSync lifts a thunk to an effect', () => {
        return Effect.gen(function* () {
          const error = new Error('Failed');
          const result = yield* Effect.failSync(() => error).flip;
          strictEqual(result, error);
        });
      });

      it.effect('failCause lifts a cause to an effect', () => {
        return Effect.gen(function* () {
          const error = new Error('Failed');
          const cause = Cause.fail(error);
          const result = yield* Effect.failCause(cause).flip;
          strictEqual(result, error);
        });
      });

      it.effect('failCauseSync lifts a thunk to an effect', () => {
        return Effect.gen(function* () {
          const error = new Error('Failed');
          const cause = Cause.fail(error);
          const result = yield* Effect.failCauseSync(() => cause).flip;
          strictEqual(result, error);
        });
      });
    });

    describe('defect', () => {
      it.effect('die lifts a defect to an effect', () => {
        return Effect.gen(function* () {
          const defect = new Error('Failed');
          const result = yield* Effect.die(defect)
            .asEffect()
            // TODO: Replace `catchDefect` with a more fluent version
            .pipe(_Effect.catchDefect((defect) => _Effect.succeed(defect)));
          strictEqual(result, defect);
        });
      });
    });

    describe('sync', () => {
      it.effect('sync lifts a thunk to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.sync(() => 42);
          strictEqual(result, 42);
        });
      });

      describe('try', () => {
        it.effect('lifts an options object to an effect', () => {
          return Effect.gen(function* () {
            const result = yield* Effect.try({ try: () => 42, catch: (error) => error });
            strictEqual(result, 42);
          });
        });

        it.effect('throws an unknown exception', () => {
          return Effect.gen(function* () {
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

    describe('async', () => {
      it.effect('promise lifts a promise to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.promise(() => Promise.resolve(42));
          strictEqual(result, 42);
        });
      });

      describe('tryPromise', () => {
        it.effect('lifts a promise to an effect', () => {
          return Effect.gen(function* () {
            const result = yield* Effect.tryPromise(() => Promise.resolve(42));
            strictEqual(result, 42);
          });
        });

        it.effect('lifts a promise to an effect with an options object', () => {
          return Effect.gen(function* () {
            const result = yield* Effect.tryPromise({ try: () => Promise.resolve(42), catch: (error) => error });
            strictEqual(result, 42);
          });
        });

        it.effect('throws an unknown exception', () => {
          return Effect.gen(function* () {
            const error = new Error('Failed');
            const result = yield* Effect.tryPromise({
              try: () => Promise.reject(error),
              catch: (error) => error
            }).flip;
            strictEqual(result, error);
          });
        });
      });

      describe('callback', () => {
        it.effect('lifts a resume function to an effect', () => {
          return Effect.gen(function* () {
            const result = yield* Effect.callback((callback) => callback(Effect.succeed(42)));
            strictEqual(result, 42);
          });
        });

        it.effect('lifts a resume function to an effect', () => {
          return Effect.gen(function* () {
            const result = yield* Effect.callback((callback) => callback(Effect.succeed(42)));
            strictEqual(result, 42);
          });
        });
      });
    });

    describe('other', () => {
      it.effect('of lifts an effect to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.of(_Effect.succeed(42));
          strictEqual(result, 42);
        });
      });

      it.effect('suspend lifts a lazy effect to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.suspend(() => Effect.succeed(42));
          strictEqual(result, 42);
        });
      });
    });

    describe('fromOption', () => {
      it.effect('lifts option some to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fromOption(Option.some(42));
          strictEqual(result, 42);
        });
      });

      it.effect('lifts option none to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fromOption(Option.none()).flip;
          deepStrictEqual(result, new Cause.NoSuchElementError());
        });
      });
    });
  });
});
