import { Duration as _Duration, Effect as _Effect, Fiber, Option as _Option } from 'effect';
import { constFalse, constTrue } from 'effect/Function';
import { TestClock } from 'effect/testing';
import { describe, it } from '@effect-fluent/vitest';
import { deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Effect } from '../../src/Effect.js';
import { Schedule } from '../../src/Schedule.js';

describe('Effect', () => {
  describe('repeat', () => {
    it.effect('is interruptible', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.void()
          .forever()
          .with((effect) => _Effect.timeoutOption(effect, 50))
          .with(_Effect.forkChild);
        yield* TestClock.adjust(50);
        const result = yield* Fiber.join(fiber);
        deepStrictEqual(result, _Option.none());
      }));

    it.effect('repeat/until - repeats until a condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).repeat({ until: (n) => n === 0 });
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('repeat/until - repeats until an effectful condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).repeat({ until: (n) => Effect.succeed(n === 0) });
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('repeat/until - always evaluates at least once', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => n++);
        yield* increment.repeat({ until: constTrue });
        strictEqual(n, 1);
      }));

    it.effect('repeat/while - repeats while a condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).repeat({ while: (n) => n > 0 });
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('repeat/while - repeats while an effectful condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).repeat({ while: (n) => Effect.succeed(n > 0) });
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('repeat/while - always evaluates at least once', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => n++);
        yield* increment.repeat({ while: constFalse });
        strictEqual(n, 1);
      }));

    it.effect('repeat/times', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.repeat({ times: 2 });
        strictEqual(n, 3);
        strictEqual(result, 3);
      }));

    it.effect('repeat/schedule - repeats according to the specified schedule', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.repeat(Schedule.recurs(3));
        strictEqual(result, 3);
      }));

    it.effect('repeat/schedule - builder form', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.repeat(($) => $(Schedule.recurs(3)));
        strictEqual(result, 3);
      }));

    it.effect('repeat/schedule - with until', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.repeat({
          schedule: Schedule.recurs(3),
          until: (n) => n === 3
        });
        strictEqual(n, 3);
        strictEqual(result, 3);
      }));

    it.effect('repeat/schedule - with while', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.repeat({
          schedule: Schedule.recurs(3),
          while: (n) => n < 3
        });
        strictEqual(n, 3);
        strictEqual(result, 3); // schedule result
      }));
  });

  describe('retry', () => {
    it.live('nothing on success', () =>
      Effect.gen(function* () {
        let count = 0;
        yield* Effect.sync(() => count++).retry({ times: 10000 });
        strictEqual(count, 1);
      }));

    it.effect('retry/until - retries until a condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).flip.retry({ until: (n) => n === 0 }).flip;
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('retry/until - retries until an effectful condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).flip.retry({ until: (n) => Effect.succeed(n === 0) }).flip;
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('retry/until - always evaluates at least once', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => n++);
        yield* increment.retry({ until: constTrue }).flip;
        strictEqual(n, 1);
      }));

    it.effect('retry/while - retries while a condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).flip.retry({ while: (n) => n > 0 }).flip;
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('retry/while - retries while an effectful condition is true', () =>
      Effect.gen(function* () {
        let input = 10;
        let output = 0;
        const decrement = Effect.sync(() => --input);
        const increment = Effect.sync(() => output++);
        const result = yield* decrement.tap(increment).flip.retry({ while: (n) => Effect.succeed(n > 0) }).flip;
        strictEqual(result, 0);
        strictEqual(output, 10);
      }));

    it.effect('retry/while - always evaluates at least once', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => n++);
        yield* increment.retry({ while: constFalse }).flip;
        strictEqual(n, 1);
      }));

    it.effect('retry/schedule - retries according to the specified schedule', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => n++);
        yield* increment.retry(Schedule.recurs(3)).flip;
        strictEqual(n, 4);
      }));

    it.effect('retry/schedule - with until', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => ++n);
        yield* increment
          .retry({
            schedule: Schedule.recurs(3),
            until: (n) => n === 3
          })
          .flip;
        strictEqual(n, 3);
      }));

    it.effect('retry/schedule - until errors', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => ++n);
        const result = yield* increment
          .retry({
            schedule: Schedule.recurs(3),
            until: () => Effect.fail('boom')
          })
          .flip;
        strictEqual(n, 1);
        strictEqual(result, 'boom');
      }));

    it.effect('retry/schedule - with while', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => ++n);
        yield* increment
          .retry({
            schedule: Schedule.recurs(3),
            while: (n) => n < 3
          })
          .flip;
        strictEqual(n, 3);
      }));

    it.effect('retry/schedule - while errors', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.failSync(() => ++n);
        const result = yield* increment
          .retry({
            schedule: Schedule.recurs(3),
            while: () => Effect.fail('boom')
          })
          .flip;
        strictEqual(n, 1);
        strictEqual(result, 'boom');
      }));

    it.effect('retry/schedule - CurrentMetadata', () =>
      Effect.gen(function* () {
        const metadata: Array<Schedule.Metadata> = [];
        yield* Effect.gen(function* () {
          const meta = yield* Schedule.CurrentMetadata;
          metadata.push(meta);
        }).flip.retry(Schedule.recurs(3)).flip;
        deepStrictEqual(metadata, [
          {
            elapsed: 0,
            elapsedSincePrevious: 0,
            attempt: 0,
            input: undefined,
            output: undefined,
            now: 0,
            start: 0,
            duration: _Duration.zero
          },
          {
            elapsed: 0,
            elapsedSincePrevious: 0,
            attempt: 1,
            input: undefined,
            output: 0,
            now: 0,
            start: 0,
            duration: _Duration.zero
          },
          {
            elapsed: 0,
            elapsedSincePrevious: 0,
            attempt: 2,
            input: undefined,
            output: 1,
            now: 0,
            start: 0,
            duration: _Duration.zero
          },
          {
            elapsed: 0,
            elapsedSincePrevious: 0,
            attempt: 3,
            input: undefined,
            output: 2,
            now: 0,
            start: 0,
            duration: _Duration.zero
          }
        ]);
      }));
  });

  // The tests below patch upstream coverage holes: repeatOrElse, retryOrElse,
  // schedule, scheduleFrom, and eventually have no upstream Effect tests.

  describe('repeatOrElse', () => {
    it.effect('recovers with the error and last schedule output as a fluent Option', () =>
      Effect.gen(function* () {
        let n = 0;
        const flaky = Effect.suspend(() => (++n < 3 ? Effect.succeed(n) : Effect.fail('boom')));
        const result = yield* flaky.repeatOrElse(Schedule.recurs(5), (_error, lastOutput) =>
          Effect.succeed(lastOutput.getOrElse(() => -1))
        );
        strictEqual(result, 1);
      }));
  });

  describe('retryOrElse', () => {
    it.effect('recovers once the policy is exhausted', () =>
      Effect.gen(function* () {
        let n = 0;
        const failing = Effect.failSync(() => ++n);
        const result = yield* failing.retryOrElse(Schedule.recurs(2), (e, out) =>
          Effect.succeed(`gave up on error ${e} after ${out} retries`)
        );
        strictEqual(n, 3);
        strictEqual(result, 'gave up on error 3 after 2 retries');
      }));
  });

  describe('schedule', () => {
    it.effect('runs the effect on the schedule cadence', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.schedule(Schedule.recurs(3));
        strictEqual(n, 3);
        strictEqual(result, 3);
      }));
  });

  describe('scheduleFrom', () => {
    it.effect('seeds the schedule with an initial input', () =>
      Effect.gen(function* () {
        let n = 0;
        const increment = Effect.sync(() => ++n);
        const result = yield* increment.scheduleFrom(
          0,
          Schedule.identity<number>().while(({ input }) => input < 3)
        );
        strictEqual(result, 3);
      }));
  });

  describe('eventually', () => {
    it.effect('retries until the effect succeeds', () =>
      Effect.gen(function* () {
        let attempts = 0;
        const flaky = Effect.suspend(() => (++attempts < 3 ? Effect.fail('not yet') : Effect.succeed(attempts)));
        const result = yield* flaky.eventually;
        strictEqual(result, 3);
      }));
  });
});
