import { describe, it } from '@effect-fluent/vitest';
import { assertNone, assertSome, deepStrictEqual, strictEqual, assertTrue } from '@effect-fluent/vitest/utils';
import { Effect as _Effect, Cause, Exit, Fiber, Option as _Option } from 'effect';
import { TestClock } from 'effect/testing';
import { Effect } from '../../src/Effect.js';
import { Option } from '../../src/Option.js';
import { Result } from 'effect-fluent/Result';

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
            .effect
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

    it.effect('suspend lifts a lazy effect to an effect', () => {
      return Effect.gen(function* () {
        const result = yield* Effect.suspend(() => Effect.succeed(42));
        strictEqual(result, 42);
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
          deepStrictEqual(result, new Cause.NoSuchElementError('Effect.fromOption: Option.none'));
        });
      });
    });

    describe('fromResult', () => {
      it.effect('lifts result success to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fromResult(Result.succeed(42));
          strictEqual(result, 42);
        });
      });

      it.effect('lifts result failure to an effect', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fromResult(Result.fail('error')).flip;
          deepStrictEqual(result, 'error');
        });
      });
    });

    describe('never', () => {
      it.live('never does not complete', () =>
        Effect.gen(function* () {
          const result = yield* Effect.never.with(_Effect.timeout('50 millis')).option;
          assertNone(result);
        })
      );
    });

    describe('succeedNone', () => {
      it.effect('produces None', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeedNone;
          assertNone(result);
        })
      );
    });

    describe('succeedSome', () => {
      it.effect('produces Some', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeedSome(42);
          assertSome(result, 42);
        })
      );
    });

    describe('sleep', () => {
      it.live('completes after duration', () =>
        Effect.gen(function* () {
          yield* Effect.sleep('10 millis');
        })
      );
    });

    describe('yieldNow', () => {
      it.effect('yields to scheduler', () =>
        Effect.gen(function* () {
          yield* Effect.yieldNow;
        })
      );
    });

    describe('interrupt', () => {
      it.effect('interrupts the fiber', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.interrupt.exit;
          assertTrue(Exit.isFailure(exit));
        })
      );
    });

    describe('all', () => {
      it.effect('combines a tuple of effects', () =>
        Effect.gen(function* () {
          const [a, b, c] = yield* Effect.all([Effect.succeed(1), Effect.succeed('hello'), Effect.succeed(true)]);
          strictEqual(a, 1);
          strictEqual(b, 'hello');
          strictEqual(c, true);
        })
      );

      it.effect('combines a record of effects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.all({ x: Effect.succeed(1), y: Effect.succeed('hello') });
          strictEqual(result.x, 1);
          strictEqual(result.y, 'hello');
        })
      );

      it.effect('record with discard option', () =>
        Effect.gen(function* () {
          const result = yield* Effect.all(
            {
              a: Effect.succeed(1),
              b: Effect.succeed('2'),
              c: Effect.succeed(true)
            },
            { discard: true }
          );
          strictEqual(result, undefined);
        })
      );

      it.effect('combines an iterable of effects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.all(new Set([Effect.succeed(1), Effect.succeed(2), Effect.succeed(3)]));
          deepStrictEqual(result, [1, 2, 3]);
        })
      );

      it.effect('tuple with result mode', () =>
        Effect.gen(function* () {
          const results = yield* Effect.all([Effect.succeed(1), Effect.fail('boom'), Effect.succeed(3)] as const, {
            mode: 'result'
          });
          deepStrictEqual(results, [Result.succeed(1), Result.fail('boom'), Result.succeed(3)]);
        })
      );

      it.effect('record with result mode', () =>
        Effect.gen(function* () {
          const results = yield* Effect.all(
            {
              a: Effect.succeed(1),
              b: Effect.fail('boom'),
              c: Effect.succeed(true)
            },
            { mode: 'result' }
          );
          deepStrictEqual(results, {
            a: Result.succeed(1),
            b: Result.fail('boom'),
            c: Result.succeed(true)
          });
        })
      );
    });

    describe('forEach', () => {
      it.effect('sequential', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach([1, 2, 3], (n) => Effect.succeed(n * 2));
          deepStrictEqual(result, [2, 4, 6]);
        })
      );

      it.effect('unbounded concurrency', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach([1, 2, 3], (n) => Effect.succeed(n), {
            concurrency: 'unbounded'
          });
          deepStrictEqual(result, [1, 2, 3]);
        })
      );

      it.effect('bounded concurrency', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach([1, 2, 3, 4, 5], (n) => Effect.succeed(n), {
            concurrency: 2
          });
          deepStrictEqual(result, [1, 2, 3, 4, 5]);
        })
      );

      it.effect('empty iterable', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach([], (n: number) => Effect.succeed(n));
          deepStrictEqual(result, []);
        })
      );

      it.effect('string as iterable', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach('abc', (c) => Effect.succeed(c));
          deepStrictEqual(result, ['a', 'b', 'c']);
        })
      );

      it.effect('discard option', () =>
        Effect.gen(function* () {
          const collected: Array<number> = [];
          const result = yield* Effect.forEach(
            [1, 2, 3],
            (n) =>
              Effect.sync(() => {
                collected.push(n);
              }),
            { discard: true }
          );
          strictEqual(result, undefined);
          deepStrictEqual(collected, [1, 2, 3]);
        })
      );

      it.effect('provides index to callback', () =>
        Effect.gen(function* () {
          const result = yield* Effect.forEach(['a', 'b', 'c'], (val, i) => Effect.succeed(`${val}:${i}`));
          deepStrictEqual(result, ['a:0', 'b:1', 'c:2']);
        })
      );

      it.effect('data-last (curried) form', () =>
        Effect.gen(function* () {
          const double = Effect.forEach((n: number) => Effect.succeed(n * 2));
          const result = yield* double([1, 2, 3]);
          deepStrictEqual(result, [2, 4, 6]);
        })
      );

      it.effect('inherit unbounded concurrency', () =>
        Effect.gen(function* () {
          const handle = yield* Effect.forEach([1, 2, 3], (n) => Effect.succeed(n).with(_Effect.delay(50)), {
            concurrency: 'inherit'
          })
            .effect
            .pipe(_Effect.withConcurrency('unbounded'), _Effect.forkChild);
          yield* TestClock.adjust(90);
          deepStrictEqual(handle.pollUnsafe(), Exit.succeed([1, 2, 3]));
        })
      );

      it.effect('sequential interrupt', () =>
        Effect.gen(function* () {
          const done: Array<number> = [];
          const fiber = yield* Effect.forEach([1, 2, 3, 4, 5, 6], (i) =>
            Effect.sync(() => {
              done.push(i);
              return i;
            }).with(_Effect.delay(300))
          ).with(_Effect.forkChild);
          yield* TestClock.adjust(800);
          yield* Fiber.interrupt(fiber);
          const result = yield* Fiber.await(fiber);
          assertTrue(Exit.hasInterrupts(result));
          deepStrictEqual(done, [1, 2]);
        })
      );

      it.effect('unbounded interrupt', () =>
        Effect.gen(function* () {
          const done: Array<number> = [];
          const fiber = yield* Effect.forEach(
            [1, 2, 3],
            (i) =>
              Effect.sync(() => {
                done.push(i);
                return i;
              }).with(_Effect.delay(150)),
            { concurrency: 'unbounded' }
          ).with(_Effect.forkChild);
          yield* TestClock.adjust(50);
          yield* Fiber.interrupt(fiber);
          const result = yield* Fiber.await(fiber);
          assertTrue(Exit.hasInterrupts(result));
          deepStrictEqual(done, []);
        })
      );

      it.effect('bounded interrupt', () =>
        Effect.gen(function* () {
          const done: Array<number> = [];
          const fiber = yield* Effect.forEach(
            [1, 2, 3, 4, 5, 6],
            (i) =>
              Effect.sync(() => {
                done.push(i);
                return i;
              }).with(_Effect.delay(200)),
            { concurrency: 2 }
          ).with(_Effect.forkChild);
          yield* TestClock.adjust(350);
          yield* Fiber.interrupt(fiber);
          const result = yield* Fiber.await(fiber);
          assertTrue(Exit.hasInterrupts(result));
          deepStrictEqual(done, [1, 2]);
        })
      );

      it.effect('unbounded fail', () =>
        Effect.gen(function* () {
          const done: Array<number> = [];
          const handle = yield* Effect.forEach(
            [1, 2, 3, 4, 5],
            (i) =>
              Effect.suspend(() => {
                done.push(i);
                return i === 3 ? Effect.fail('error') : Effect.succeed(i);
              }).with(_Effect.delay(i * 100)),
            { concurrency: 'unbounded' }
          ).with(_Effect.forkChild);
          yield* TestClock.adjust(500);
          const result = yield* Fiber.await(handle);
          deepStrictEqual(result, Exit.fail('error'));
          deepStrictEqual(done, [1, 2, 3]);
        })
      );
    });

    describe('partition', () => {
      it.effect('splits successes and failures', () =>
        Effect.gen(function* () {
          const [errors, successes] = yield* Effect.partition([1, 2, 3, 4], (n) =>
            n % 2 === 0 ? Effect.succeed(n) : Effect.fail(`odd: ${n}`)
          );
          deepStrictEqual(successes, [2, 4]);
          deepStrictEqual(errors, ['odd: 1', 'odd: 3']);
        })
      );
    });
  });
});
