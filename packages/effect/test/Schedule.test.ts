import { describe, it } from '@effect-fluent/vitest';
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import {
  Array as Arr,
  Deferred,
  Duration as _Duration,
  Effect as _Effect,
  Fiber,
  Pull,
  Random,
  Schedule as _Schedule
} from 'effect';
import { constant, constUndefined } from 'effect/Function';
import { TestClock } from 'effect/testing';
import { Duration } from '../src/Duration.js';
import { Effect } from '../src/Effect.js';
import { Result } from '../src/Result.js';
import { Schedule } from '../src/Schedule.js';

const identity = Schedule.identity;

describe('Schedule', () => {
  describe('combining', () => {
    it.effect('max - outputs the slowest schedule duration', () =>
      Effect.gen(function* () {
        const schedule = Schedule.max([
          Schedule.fixed('5 seconds'),
          Schedule.exponential('5 seconds'),
          Schedule.spaced('10 seconds')
        ]);
        const inputs = Arr.makeBy(3, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [_Duration.seconds(10), _Duration.seconds(10), _Duration.seconds(20)]);
      })
    );

    it.effect('max - stops when any schedule completes', () =>
      Effect.gen(function* () {
        const schedule = Schedule.max([Schedule.duration('1 second'), Schedule.spaced('5 seconds')]);
        const inputs = Arr.makeBy(3, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [_Duration.seconds(5), _Duration.zero]);
      })
    );

    it.effect('min - outputs the fastest schedule duration', () =>
      Effect.gen(function* () {
        const schedule = Schedule.min([
          Schedule.fixed('5 seconds'),
          Schedule.exponential('5 seconds'),
          Schedule.spaced('10 seconds')
        ]);
        const inputs = Arr.makeBy(3, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [_Duration.seconds(5), _Duration.seconds(5), _Duration.seconds(5)]);
      })
    );

    it.effect('min - continues after a schedule completes', () =>
      Effect.gen(function* () {
        const schedule = Schedule.min([Schedule.duration('1 second'), Schedule.spaced('5 seconds')]);
        const inputs = Arr.makeBy(3, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [_Duration.seconds(1), _Duration.seconds(5), _Duration.seconds(5)]);
      })
    );
  });

  describe('sequencing', () => {
    it.effect('tap - provides full metadata', () =>
      Effect.gen(function* () {
        const observed: Array<Schedule.Metadata<number, string>> = [];
        const schedule = Schedule.spaced(Duration.millis(250))
          .setInputType<string>()
          .tap((metadata) =>
            Effect.sync(() => {
              observed.push(metadata);
            })
          );
        const step = yield* schedule.toStep;
        const first = yield* step(1_000, 'a');
        const second = yield* step(1_250, 'b');

        deepStrictEqual(first, [0, _Duration.millis(250)]);
        deepStrictEqual(second, [1, _Duration.millis(250)]);
        deepStrictEqual(observed, [
          {
            input: 'a',
            output: 0,
            duration: _Duration.millis(250),
            attempt: 1,
            start: 1_000,
            now: 1_000,
            elapsed: 0,
            elapsedSincePrevious: 0
          },
          {
            input: 'b',
            output: 1,
            duration: _Duration.millis(250),
            attempt: 2,
            start: 1_000,
            now: 1_250,
            elapsed: 250,
            elapsedSincePrevious: 250
          }
        ]);
      })
    );

    it.effect('modifyDelay - provides full metadata', () =>
      Effect.gen(function* () {
        const observed: Array<Schedule.Metadata<number, string>> = [];
        const schedule = Schedule.spaced(Duration.millis(250))
          .setInputType<string>()
          .modifyDelay((metadata) =>
            Effect.sync(() => {
              observed.push(metadata);
              return _Duration.sum(metadata.duration, _Duration.millis(metadata.elapsedSincePrevious));
            })
          );
        const step = yield* schedule.toStep;
        const first = yield* step(1_000, 'a');
        const second = yield* step(1_250, 'b');

        deepStrictEqual(first, [0, _Duration.millis(250)]);
        deepStrictEqual(second, [1, _Duration.millis(500)]);
        deepStrictEqual(observed, [
          {
            input: 'a',
            output: 0,
            duration: _Duration.millis(250),
            attempt: 1,
            start: 1_000,
            now: 1_000,
            elapsed: 0,
            elapsedSincePrevious: 0
          },
          {
            input: 'b',
            output: 1,
            duration: _Duration.millis(250),
            attempt: 2,
            start: 1_000,
            now: 1_250,
            elapsed: 250,
            elapsedSincePrevious: 250
          }
        ]);
      })
    );

    it.effect('addDelay - provides full metadata', () =>
      Effect.gen(function* () {
        const observed: Array<Schedule.Metadata<number, string>> = [];
        const schedule = Schedule.spaced(Duration.millis(250))
          .setInputType<string>()
          .addDelay((metadata) =>
            Effect.sync(() => {
              observed.push(metadata);
              return _Duration.millis(metadata.elapsedSincePrevious);
            })
          );
        const step = yield* schedule.toStep;
        const first = yield* step(1_000, 'a');
        const second = yield* step(1_250, 'b');

        deepStrictEqual(first, [0, _Duration.millis(250)]);
        deepStrictEqual(second, [1, _Duration.millis(500)]);
        deepStrictEqual(observed, [
          {
            input: 'a',
            output: 0,
            duration: _Duration.millis(250),
            attempt: 1,
            start: 1_000,
            now: 1_000,
            elapsed: 0,
            elapsedSincePrevious: 0
          },
          {
            input: 'b',
            output: 1,
            duration: _Duration.millis(250),
            attempt: 2,
            start: 1_000,
            now: 1_250,
            elapsed: 250,
            elapsedSincePrevious: 250
          }
        ]);
      })
    );

    it.effect('andThenResult - sequences self then other when collecting delays', () =>
      Effect.gen(function* () {
        const left = Schedule.fixed('500 millis').while(({ attempt }) => Effect.succeed(attempt <= 3));
        const right = Schedule.fixed('1 second');
        const schedule = left.andThenResult(right);
        const inputs = Arr.makeBy(6, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.seconds(1),
          _Duration.seconds(1),
          _Duration.seconds(1)
        ]);
      })
    );

    it.effect('andThenResult - includes finite other completion when collecting delays', () =>
      Effect.gen(function* () {
        const left = Schedule.fixed('500 millis').while(({ attempt }) => Effect.succeed(attempt <= 2));
        const right = Schedule.duration('1 second');
        const schedule = left.andThenResult(right);
        const inputs = Arr.makeBy(5, constUndefined);
        const outputs = yield* runDelays(schedule, inputs);
        deepStrictEqual(outputs, [
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.seconds(1),
          _Duration.zero
        ]);
      })
    );

    it.effect('andThenResult - wraps self outputs as Failure and other outputs as Success', () =>
      Effect.gen(function* () {
        const left = identity<string>().upTo({ times: 2 });
        const right = identity<string>();
        const step = yield* left.andThenResult(right).toStep;

        const first = yield* step(0, 'left-1');
        const second = yield* step(0, 'left-2');
        const third = yield* step(0, 'right-1');

        deepStrictEqual(
          [first, second, third],
          [
            [Result.fail('left-1'), _Duration.zero],
            [Result.fail('left-2'), _Duration.zero],
            [Result.succeed('right-1'), _Duration.zero]
          ]
        );
      })
    );
  });

  describe('cron', () => {
    it.effect('should recur on interval matching cron expression', () =>
      Effect.gen(function* () {
        const now = new Date(2024, 0, 1, 0, 0, 35).getTime();
        // At every second minute
        const schedule = Schedule.cron('*/2 * * * *');
        const inputs = Arr.makeBy(4, constUndefined);
        yield* TestClock.setTime(now);
        const delays = yield* runDelays(schedule, inputs);
        const [, outputs] = Arr.mapAccum(delays, now, (next, delay) => {
          const timestamp = next + _Duration.toMillis(delay);
          return [timestamp, format(timestamp)];
        });
        deepStrictEqual(outputs, [
          'Mon Jan 01 2024 00:02:00',
          'Mon Jan 01 2024 00:04:00',
          'Mon Jan 01 2024 00:06:00',
          'Mon Jan 01 2024 00:08:00'
        ]);
      })
    );

    it.effect('should recur on interval matching cron expression (second granularity)', () =>
      Effect.gen(function* () {
        const now = new Date(2024, 0, 1, 0, 0, 0).getTime();
        // At every third minute
        const schedule = Schedule.cron('*/3 * * * * *');
        const inputs = Arr.makeBy(10, constUndefined);
        yield* TestClock.setTime(now);
        const delays = yield* runDelays(schedule, inputs);
        const [, outputs] = Arr.mapAccum(delays, now, (next, delay) => {
          const timestamp = next + _Duration.toMillis(delay);
          return [timestamp, format(timestamp)];
        });
        deepStrictEqual(outputs, [
          'Mon Jan 01 2024 00:00:03',
          'Mon Jan 01 2024 00:00:06',
          'Mon Jan 01 2024 00:00:09',
          'Mon Jan 01 2024 00:00:12',
          'Mon Jan 01 2024 00:00:15',
          'Mon Jan 01 2024 00:00:18',
          'Mon Jan 01 2024 00:00:21',
          'Mon Jan 01 2024 00:00:24',
          'Mon Jan 01 2024 00:00:27',
          'Mon Jan 01 2024 00:00:30'
        ]);
      })
    );

    it.effect('should recur at time matching cron expression', () =>
      Effect.gen(function* () {
        const now = new Date(2024, 0, 1, 0, 0, 0).getTime();
        // At 04:30 on day-of-month 5 and 15 and on Wednesday.
        const schedule = Schedule.cron('30 4 5,15 * WED');
        const inputs = Arr.makeBy(6, constUndefined);
        yield* TestClock.setTime(now);
        const delays = yield* runDelays(schedule, inputs);
        const [, outputs] = Arr.mapAccum(delays, now, (next, delay) => {
          const timestamp = next + _Duration.toMillis(delay);
          return [timestamp, format(timestamp)];
        });
        deepStrictEqual(outputs, [
          'Wed Jan 03 2024 04:30:00',
          'Fri Jan 05 2024 04:30:00',
          'Wed Jan 10 2024 04:30:00',
          'Mon Jan 15 2024 04:30:00',
          'Wed Jan 17 2024 04:30:00',
          'Wed Jan 24 2024 04:30:00'
        ]);
      })
    );

    it.effect('does not fail when the test clock is adjusted to infinity', () =>
      Effect.gen(function* () {
        const latch = yield* Deferred.make<void>();
        const fiber = yield* Deferred.await(latch).pipe(
          _Effect.repeat(Schedule.cron('0 0 4 8-14 * *', 'UTC').schedule),
          _Effect.forkChild
        );

        yield* TestClock.adjust(Infinity);
        yield* Deferred.succeed(latch, void 0);
        yield* Fiber.join(fiber);
      })
    );
  });

  describe('duration', () => {
    it.effect('recurs once after the provided duration', () =>
      Effect.gen(function* () {
        const schedule = Schedule.duration(Duration.seconds(1));
        const inputs = Arr.makeBy(5, constUndefined);
        const output = yield* runDelays(schedule, inputs);
        deepStrictEqual(output, [_Duration.seconds(1), _Duration.zero]);
      })
    );
  });

  describe('upTo', () => {
    it.effect('limits by times', () =>
      Effect.gen(function* () {
        const schedule = identity<string>().upTo({ times: 2 });
        const step = yield* schedule.toStep;

        const first = yield* step(0, 'a');
        const second = yield* step(0, 'b');
        const third = yield* Pull.matchEffect(step(0, 'c'), {
          onSuccess: () => _Effect.succeed('unexpected success'),
          onFailure: () => _Effect.succeed('unexpected failure'),
          onDone: (value) => _Effect.succeed(value)
        });

        deepStrictEqual([first, second, third], [['a', _Duration.zero], ['b', _Duration.zero], 'c']);
      })
    );

    it.effect('limits by duration', () =>
      Effect.gen(function* () {
        const schedule = identity<string>().upTo({ duration: '1 second' });
        const step = yield* schedule.toStep;

        const first = yield* step(0, 'a');
        const second = yield* step(1_000, 'b');
        const third = yield* Pull.matchEffect(step(1_001, 'c'), {
          onSuccess: () => _Effect.succeed('unexpected success'),
          onFailure: () => _Effect.succeed('unexpected failure'),
          onDone: (value) => _Effect.succeed(value)
        });

        deepStrictEqual([first, second, third], [['a', _Duration.zero], ['b', _Duration.zero], 'c']);
      })
    );

    it.effect('limits by the first exhausted option', () =>
      Effect.gen(function* () {
        const schedule = identity<string>().upTo({ duration: '1 hour', times: 1 });
        const step = yield* schedule.toStep;

        const first = yield* step(0, 'a');
        const second = yield* Pull.matchEffect(step(0, 'b'), {
          onSuccess: () => _Effect.succeed('unexpected success'),
          onFailure: () => _Effect.succeed('unexpected failure'),
          onDone: (value) => _Effect.succeed(value)
        });

        deepStrictEqual([first, second], [['a', _Duration.zero], 'b']);
      })
    );

    it.effect('leaves the schedule unchanged when no options are specified', () =>
      Effect.gen(function* () {
        const schedule = identity<string>().upTo({});
        const step = yield* schedule.toStep;

        const first = yield* step(0, 'a');
        const second = yield* step(0, 'b');

        deepStrictEqual(
          [first, second],
          [
            ['a', _Duration.zero],
            ['b', _Duration.zero]
          ]
        );
      })
    );
  });

  describe('jittered', () => {
    it.effect('keeps delays within 80%-120% of the original', () =>
      Effect.gen(function* () {
        const schedule = Schedule.spaced(Duration.seconds(1)).jittered;
        const inputs = Arr.makeBy(20, constUndefined);
        const output = yield* runDelays(schedule, inputs).with(Random.withSeed('jittered-bounds'));
        assertTrue(
          output.every((delay) => {
            const millis = _Duration.toMillis(delay);
            return millis >= 800 && millis <= 1200;
          })
        );
      })
    );

    it.effect('does not change completion output', () =>
      Effect.gen(function* () {
        const schedule = Schedule.duration(Duration.seconds(1)).jittered;
        const inputs = Arr.makeBy(5, constUndefined);
        const output = yield* runDelays(schedule, inputs).with(Random.withSeed('jittered-completion'));
        strictEqual(output.length, 2);
        assertTrue(_Duration.toMillis(output[0]) >= 800);
        assertTrue(_Duration.toMillis(output[0]) <= 1200);
        deepStrictEqual(output[1], _Duration.zero);
      })
    );
  });

  describe('spaced', () => {
    it.effect('constant delays', () =>
      Effect.gen(function* () {
        const schedule = Schedule.spaced(Duration.seconds(1));
        const inputs = Arr.makeBy(5, constUndefined);
        const output = yield* runDelays(schedule, inputs);
        deepStrictEqual(output, Arr.makeBy(5, constant(_Duration.seconds(1))));
      })
    );
  });

  describe('fixed', () => {
    it.effect('constant delays', () =>
      Effect.gen(function* () {
        const schedule = Schedule.fixed(Duration.seconds(1));
        const inputs = Arr.makeBy(5, constUndefined);
        const output = yield* runDelays(schedule, inputs);
        deepStrictEqual(output, Arr.makeBy(5, constant(_Duration.seconds(1))));
      })
    );

    it.effect('delays until the nearest window boundary when action is slow', () =>
      Effect.gen(function* () {
        const delays: Array<_Duration.Duration> = [];
        const schedule = Schedule.fixed('1 seconds')
          .while(({ attempt }) => Effect.succeed(attempt <= 5))
          .tap((metadata) =>
            Effect.sync(() => {
              delays.push(metadata.duration);
            })
          );
        yield* Effect.sleep('500 millis').with((effect) =>
          effect.pipe(
            _Effect.schedule(schedule.schedule),
            _Effect.andThen(_Effect.sync(() => delays.push(_Duration.zero))),
            _Effect.forkChild
          )
        );
        yield* TestClock.setTime(Number.POSITIVE_INFINITY);
        deepStrictEqual(delays, [
          _Duration.millis(1000),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.zero
        ]);
      })
    );

    it.effect('matches effect v3 when action duration exceeds the interval', () =>
      Effect.gen(function* () {
        const delays: Array<_Duration.Duration> = [];
        const schedule = Schedule.fixed('1 seconds')
          .while(({ attempt }) => Effect.succeed(attempt <= 5))
          .tap((metadata) =>
            Effect.sync(() => {
              delays.push(metadata.duration);
            })
          );
        yield* Effect.sleep('1.5 seconds').with((effect) =>
          effect.pipe(
            _Effect.schedule(schedule.schedule),
            _Effect.andThen(_Effect.sync(() => delays.push(_Duration.zero))),
            _Effect.forkChild
          )
        );
        yield* TestClock.setTime(Number.POSITIVE_INFINITY);
        deepStrictEqual(delays, [
          _Duration.millis(1000),
          _Duration.zero,
          _Duration.zero,
          _Duration.zero,
          _Duration.zero,
          _Duration.zero
        ]);
      })
    );
  });

  describe('windowed', () => {
    it.effect('constant delays', () =>
      Effect.gen(function* () {
        const schedule = Schedule.windowed(Duration.seconds(1));
        const inputs = Arr.makeBy(5, constUndefined);
        const output = yield* runDelays(schedule, inputs);
        deepStrictEqual(output, Arr.makeBy(5, constant(_Duration.seconds(1))));
      })
    );

    it.effect('delays until the nearest window boundary', () =>
      Effect.gen(function* () {
        const delays: Array<_Duration.Duration> = [];
        const schedule = Schedule.windowed('1 seconds')
          .while(({ attempt }) => Effect.succeed(attempt <= 5))
          .tap((metadata) =>
            Effect.sync(() => {
              delays.push(metadata.duration);
            })
          );
        yield* Effect.sleep('1.5 seconds').with((effect) =>
          effect.pipe(
            _Effect.schedule(schedule.schedule),
            _Effect.andThen(_Effect.sync(() => delays.push(_Duration.zero))),
            _Effect.forkChild
          )
        );
        yield* TestClock.setTime(Number.POSITIVE_INFINITY);
        deepStrictEqual(delays, [
          _Duration.millis(1000),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.millis(500),
          _Duration.zero
        ]);
      })
    );
  });

  describe('core interop', () => {
    it('wrap and the schedule getter round-trip', () => {
      const core = _Schedule.spaced('1 second');
      const wrapped = Schedule.wrap(core);
      assertTrue(Schedule.is(wrapped));
      strictEqual(wrapped.schedule, core);
    });

    it('is - true for fluent schedules, false for core schedules and null', () => {
      assertTrue(Schedule.is(Schedule.forever));
      assertTrue(Schedule.is(Schedule.recurs(3)));
      assertFalse(Schedule.is(_Schedule.forever));
      assertFalse(Schedule.is(_Schedule.spaced('1 second')));
      assertFalse(Schedule.is(null));
      assertFalse(Schedule.is(undefined));
      assertFalse(Schedule.is({}));
    });

    it.effect('with applies a core transformation and re-wraps', () =>
      Effect.gen(function* () {
        const schedule = Schedule.recurs(2).with((core) => _Schedule.map(core, ({ output }) => output * 10));
        assertTrue(Schedule.is(Schedule.recurs(2).with((core) => core)));
        const step = yield* schedule.toStep;
        const first = yield* step(0, void 0);
        const second = yield* step(0, void 0);
        deepStrictEqual(
          [first, second],
          [
            [0, _Duration.zero],
            [10, _Duration.zero]
          ]
        );
      })
    );
  });
});

const run = <A, E, R>(effect: Effect<A, E, R>): Effect<A, E, R> =>
  Effect.gen(function* () {
    const fiber = yield* effect.with(_Effect.forkChild);
    yield* TestClock.setTime(Number.POSITIVE_INFINITY);
    return yield* Fiber.join(fiber);
  });

const runDelays = <Output, Input, Error, Env>(schedule: Schedule<Output, Input, Error, Env>, input: Iterable<Input>) =>
  run(
    Effect.gen(function* () {
      const step = yield* schedule.toStepWithMetadata;
      const out: Array<_Duration.Duration> = [];
      yield* Effect.gen(function* () {
        for (const value of input) {
          out.push((yield* step(value)).duration);
        }
      }).effect.pipe(
        Pull.catchDone(() => {
          out.push(_Duration.zero);
          return _Effect.void;
        })
      );
      return out;
    })
  );

const format = (timestamp: number | string | Date): string => {
  const date = new Date(timestamp);
  const hours = `0${date.getHours()}`.slice(-2);
  const minutes = `0${date.getMinutes()}`.slice(-2);
  const seconds = `0${date.getSeconds()}`.slice(-2);
  return `${date.toDateString()} ${hours}:${minutes}:${seconds}`;
};
