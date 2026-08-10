import { describe, it } from '@effect-fluent/vitest';
import {
  assertExitFailure,
  assertFalse,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Data, Effect as _Effect, ErrorReporter, Logger, type LogLevel, References } from 'effect';
import { Cause } from '../../src/Cause.js';
import { Effect } from '../../src/Effect.js';
import { Exit } from '../../src/Exit.js';
import { Option } from '../../src/Option.js';
import { Result } from '../../src/Result.js';

describe('Effect', () => {
  describe('error handling', () => {
    it('compile-time: Effect stays covariant in A and E', () => {
      const narrowError: Effect<number, never> = Effect.succeed(1);
      const widenedError: Effect<number, string> = narrowError;
      const narrowSuccess: Effect<never, string> = Effect.fail('boom');
      const widenedSuccess: Effect<number, string> = narrowSuccess;
      assertTrue(Effect.is(widenedError));
      assertTrue(Effect.is(widenedSuccess));
    });

    describe('catch', () => {
      it.effect('first argument as success', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(1).catch(() => Effect.fail('e2' as const));
          deepStrictEqual(result, 1);
        })
      );

      it.effect('first argument as failure', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catch(() => Effect.fail('e2' as const)).flip;
          deepStrictEqual(result, 'e2');
        })
      );

      it.effect('does not catch defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die('boom').catch(() => Effect.succeed('recovered')).exit;
          assertExitFailure(result, Cause.die('boom'));
        })
      );
    });

    describe('catchCause', () => {
      it.effect('first argument as success', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(1).catchCause(() => Effect.fail('e2' as const));
          deepStrictEqual(result, 1);
        })
      );

      it.effect('first argument as failure', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchCause(() => Effect.fail('e2' as const)).flip;
          deepStrictEqual(result, 'e2');
        })
      );

      it.effect('recovers from defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die('boom').catchCause((cause) =>
            Effect.succeed(cause.hasDies ? 'defect' : 'other')
          );
          strictEqual(result, 'defect');
        })
      );
    });

    describe('catchCauseFilter', () => {
      it.effect('first argument as success', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(1).catchCauseFilter(
            (_) => Result.fail(_),
            () => Effect.fail('e2')
          );
          deepStrictEqual(result, 1);
        })
      );

      it.effect('first argument as failure and predicate return false', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchCauseFilter(
            (_) => Result.fail(_),
            () => Effect.fail('e2' as const)
          ).flip;
          deepStrictEqual(result, 'e1');
        })
      );

      it.effect('first argument as failure and predicate return true', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchCauseFilter(
            (e) => Result.succeed(e),
            () => Effect.fail('e2' as const)
          ).flip;
          deepStrictEqual(result, 'e2');
        })
      );

      it.effect('handler receives the selected value and the original cause', () =>
        Effect.gen(function* () {
          const observed: Array<string> = [];
          const result = yield* Effect.fail('e1').catchCauseFilter(
            (cause) => (cause.hasFails ? Result.succeed(cause) : Result.fail(cause)),
            (selected, cause) =>
              Effect.sync(() => {
                observed.push(selected.squash as string);
                observed.push(cause.squash as string);
                return 'recovered';
              })
          );
          strictEqual(result, 'recovered');
          deepStrictEqual(observed, ['e1', 'e1']);
        })
      );
    });

    describe('catchCauseIf', () => {
      it.effect('predicate match recovers', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').catchCauseIf(
            (cause) => cause.hasFails,
            (cause) => Effect.succeed(`recovered: ${cause.squash}`)
          );
          deepStrictEqual(result, 'recovered: e1');
        })
      );

      it.effect('predicate no match preserves error', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchCauseIf(
            () => false,
            () => Effect.succeed('recovered')
          ).exit;
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );
    });

    describe('catchDefect', () => {
      it.effect('recovers from defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die('boom').catchDefect((defect) => Effect.succeed(`caught: ${defect}`));
          strictEqual(result, 'caught: boom');
        })
      );

      it.effect('does not catch typed failures', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('boom').catchDefect(() => Effect.succeed('recovered')).exit;
          deepStrictEqual(result, Exit.fail('boom'));
        })
      );

      it.effect('does not catch interruptions', () =>
        Effect.gen(function* () {
          const result = yield* Effect.interrupt.catchDefect(() => Effect.succeed('recovered')).exit;
          assertTrue(result.isFailure() && result.cause.hasInterrupts);
        })
      );

      it.effect('leaves success values unchanged', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(1).catchDefect(() => Effect.succeed(2));
          strictEqual(result, 1);
        })
      );
    });

    describe('catchFilter', () => {
      it.effect('filter pass recovers', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').catchFilter(
            (e) => (e === 'e1' ? Result.succeed(e) : Result.fail(e)),
            (e) => Effect.succeed(`recovered: ${e}`)
          );
          deepStrictEqual(result, 'recovered: e1');
        })
      );

      it.effect('filter fail without orElse preserves the original error', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchFilter(
            (e) => Result.fail(e),
            () => Effect.succeed('recovered')
          ).exit;
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );

      it.effect('filter fail with orElse receives the fail-side value', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').catchFilter(
            (e) => Result.fail(`residual: ${e}`),
            () => Effect.succeed('recovered'),
            (residual) => Effect.succeed(residual)
          );
          deepStrictEqual(result, 'residual: e1');
        })
      );

      it.effect('success passes through', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(1).catchFilter(
            (e) => Result.succeed(e),
            () => Effect.succeed(2)
          );
          strictEqual(result, 1);
        })
      );

      it.effect('does not catch defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die('boom').catchFilter(
            (e) => Result.succeed(e),
            () => Effect.succeed('recovered')
          ).exit;
          assertExitFailure(result, Cause.die('boom'));
        })
      );
    });

    describe('catchIf', () => {
      it.effect('catchIf with refinement', () =>
        Effect.gen(function* () {
          interface ErrorA {
            readonly _tag: 'ErrorA';
          }
          interface ErrorB {
            readonly _tag: 'ErrorB';
          }
          const effect: Effect<never, ErrorA | ErrorB> = Effect.fail({ _tag: 'ErrorB' as const });
          const result = yield* effect.catchIf(
            (e): e is ErrorA => e._tag === 'ErrorA',
            (e) => Effect.succeed(e)
          ).exit;
          deepStrictEqual(result, Exit.fail({ _tag: 'ErrorB' as const }));
        })
      );

      it.effect('catchIf with refinement orElse', () =>
        Effect.gen(function* () {
          interface ErrorA {
            readonly _tag: 'ErrorA';
          }
          interface ErrorB {
            readonly _tag: 'ErrorB';
          }
          const effect: Effect<never, ErrorA | ErrorB> = Effect.fail({ _tag: 'ErrorB' as const });
          const result = yield* effect.catchIf(
            (e): e is ErrorA => e._tag === 'ErrorA',
            (e) => Effect.succeed(e),
            (_) => {
              return Effect.succeed(1);
            }
          );
          deepStrictEqual(result, 1);
        })
      );

      it.effect('predicate match recovers', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').catchIf(
            (e) => typeof e === 'string',
            (e) => Effect.succeed(`recovered: ${e}`)
          );
          deepStrictEqual(result, 'recovered: e1');
        })
      );

      it.effect('predicate no match preserves error', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1' as const).catchIf(
            (_e) => false,
            () => Effect.succeed('recovered')
          ).exit;
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );
    });

    describe('catchNoSuchElement', () => {
      class ErrorA extends Data.TaggedError('A') {}

      it.effect('catchNoSuchElement', () =>
        Effect.gen(function* () {
          const some = yield* Effect.wrap(_Effect.fromNullishOr('value')).catchNoSuchElement;
          deepStrictEqual(some, Option.some('value'));

          const none = yield* Effect.wrap(_Effect.fromNullishOr(null as string | null)).catchNoSuchElement;
          deepStrictEqual(none, Option.none());
        })
      );

      it.effect('catchNoSuchElement preserves other errors', () =>
        Effect.gen(function* () {
          const error = new ErrorA();
          const result = yield* Effect.fail(error).catchNoSuchElement.exit;
          deepStrictEqual(result, Exit.fail(error));
        })
      );
    });

    describe('catchReason', () => {
      class RateLimitError extends Data.TaggedError('RateLimitError')<{
        readonly retryAfter: number;
      }> {}

      class QuotaExceededError extends Data.TaggedError('QuotaExceededError')<{
        readonly limit: number;
      }> {}

      class AiError extends Data.TaggedError('AiError')<{
        readonly reason: RateLimitError | QuotaExceededError;
      }> {}

      class OtherError extends Data.TaggedError('OtherError')<{
        readonly message: string;
      }> {}

      it.effect('catches matching reason - handler succeeds', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail(
            new AiError({ reason: new RateLimitError({ retryAfter: 60 }) })
          ).catchReason('AiError', 'RateLimitError', (r) => Effect.succeed(`retry: ${r.retryAfter}`));
          strictEqual(result, 'retry: 60');
        })
      );

      it.effect('orElse', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail(
            new AiError({ reason: new QuotaExceededError({ limit: 100 }) })
          ).catchReason(
            'AiError',
            'RateLimitError',
            (r) => Effect.succeed(`retry: ${r.retryAfter}`),
            (_) => Effect.succeed('quota')
          );
          strictEqual(result, 'quota');
        })
      );

      it.effect('catches matching reason - handler fails', () =>
        Effect.gen(function* () {
          const reason = new RateLimitError({ retryAfter: 60 });
          const error = new OtherError({ message: 'handled' });
          const exit = yield* Effect.fail(new AiError({ reason })).catchReason('AiError', 'RateLimitError', () =>
            Effect.fail(error)
          ).exit;
          assertExitFailure(exit, Cause.fail(error));
        })
      );

      it.effect('ignores non-matching reason', () =>
        Effect.gen(function* () {
          const reason = new QuotaExceededError({ limit: 100 });
          const exit = yield* Effect.fail(new AiError({ reason })).catchReason('AiError', 'RateLimitError', () =>
            Effect.succeed('no')
          ).exit;
          assertExitFailure(exit, Cause.fail(new AiError({ reason })));
        })
      );

      it.effect('ignores non-matching parent tag', () =>
        Effect.gen(function* () {
          const error = new OtherError({ message: 'test' });
          const exit = yield* (Effect.fail(error) as Effect<never, AiError | OtherError>).catchReason(
            'AiError',
            'RateLimitError',
            () => Effect.succeed('no')
          ).exit;
          assertExitFailure(exit, Cause.fail(error));
        })
      );
    });

    describe('catchReasons', () => {
      class RateLimitError extends Data.TaggedError('RateLimitError')<{
        readonly retryAfter: number;
      }> {}

      class QuotaExceededError extends Data.TaggedError('QuotaExceededError')<{
        readonly limit: number;
      }> {}

      class AiError extends Data.TaggedError('AiError')<{
        readonly reason: RateLimitError | QuotaExceededError;
      }> {}

      it.effect('catches with object handlers', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail(
            new AiError({ reason: new RateLimitError({ retryAfter: 60 }) })
          ).catchReasons('AiError', {
            RateLimitError: (r) => Effect.succeed(`rate: ${r.retryAfter}`),
            QuotaExceededError: (r) => Effect.succeed(`quota: ${r.limit}`)
          });
          strictEqual(result, 'rate: 60');
        })
      );

      it.effect('orElse', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail(
            new AiError({ reason: new RateLimitError({ retryAfter: 60 }) })
          ).catchReasons(
            'AiError',
            {
              QuotaExceededError: (r) => Effect.succeed(`quota: ${r.limit}`)
            },
            (_) => Effect.succeed('orElse')
          );
          strictEqual(result, 'orElse');
        })
      );

      it.effect('catches second reason type', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail(
            new AiError({ reason: new QuotaExceededError({ limit: 100 }) })
          ).catchReasons('AiError', {
            RateLimitError: (r) => Effect.succeed(`rate: ${r.retryAfter}`),
            QuotaExceededError: (r) => Effect.succeed(`quota: ${r.limit}`)
          });
          strictEqual(result, 'quota: 100');
        })
      );

      it.effect('partial handlers - unhandled passes through', () =>
        Effect.gen(function* () {
          const reason = new QuotaExceededError({ limit: 100 });
          const exit = yield* Effect.fail(new AiError({ reason })).catchReasons('AiError', {
            RateLimitError: () => Effect.succeed('handled')
          }).exit;
          assertExitFailure(exit, Cause.fail(new AiError({ reason })));
        })
      );
    });

    describe('catchTag', () => {
      class ErrorA extends Data.TaggedError('A') {}
      class ErrorB extends Data.TaggedError('B') {}
      class ErrorC extends Data.Error {}

      it.effect('catchTag', () =>
        Effect.gen(function* () {
          let error: ErrorA | ErrorB | ErrorC = new ErrorA();
          const effect = Effect.failSync(() => error)
            .catchTag('A', (_) => Effect.succeed(1))
            .catchTag('B', (_) => Effect.succeed(2))
            .with((core) => _Effect.orElseSucceed(core, () => 3));
          strictEqual(yield* effect, 1);
          error = new ErrorB();
          strictEqual(yield* effect, 2);
          error = new ErrorC();
          strictEqual(yield* effect, 3);
        })
      );

      it.effect('catchTag orElse', () =>
        Effect.gen(function* () {
          let error: ErrorA | ErrorB | ErrorC = new ErrorA();
          const effect = Effect.failSync(() => error).catchTag(
            ['A', 'B'],
            (_) => Effect.succeed(1),
            (_) => {
              return Effect.succeed(2);
            }
          );
          strictEqual(yield* effect, 1);
          error = new ErrorB();
          strictEqual(yield* effect, 1);
          error = new ErrorC();
          strictEqual(yield* effect, 2);
        })
      );

      it.effect('without orElse preserves unmatched errors', () =>
        Effect.gen(function* () {
          const error = new ErrorC();
          const result = yield* Effect.failSync<ErrorA | ErrorB | ErrorC>(() => error).catchTag('A', (_) =>
            Effect.succeed(1)
          ).exit;
          deepStrictEqual(result, Exit.fail(error));
        })
      );
    });

    describe('catchTags', () => {
      class ErrorA extends Data.TaggedError('A') {}
      class ErrorB extends Data.TaggedError('B') {}
      class ErrorC extends Data.Error {}

      it.effect('catchTags orElse', () =>
        Effect.gen(function* () {
          let error: ErrorA | ErrorB | ErrorC = new ErrorA();
          const effect = Effect.failSync(() => error).catchTags(
            {
              A: (_) => Effect.succeed(1),
              B: (_) => Effect.succeed(2)
            },
            (_) => Effect.succeed(3)
          );
          strictEqual(yield* effect, 1);
          error = new ErrorB();
          strictEqual(yield* effect, 2);
          error = new ErrorC();
          strictEqual(yield* effect, 3);
        })
      );

      it.effect('without orElse preserves unmatched errors', () =>
        Effect.gen(function* () {
          const error = new ErrorC();
          const result = yield* Effect.failSync<ErrorA | ErrorB | ErrorC>(() => error).catchTags({
            A: (_) => Effect.succeed(1),
            B: (_) => Effect.succeed(2)
          }).exit;
          deepStrictEqual(result, Exit.fail(error));
        })
      );
    });

    describe('ignore', () => {
      type IgnoreOptions = { readonly log?: boolean | LogLevel.Severity; readonly message?: string };

      const makeTestLogger = () => {
        const capturedLogs: Array<{
          readonly logLevel: LogLevel.LogLevel;
          readonly cause: Cause<unknown>;
          readonly message: unknown;
        }> = [];
        const testLogger = Logger.make<unknown, void>((options) => {
          capturedLogs.push({ logLevel: options.logLevel, cause: Cause.wrap(options.cause), message: options.message });
        });
        return { capturedLogs, testLogger };
      };

      const runIgnore = (options?: IgnoreOptions, currentLogLevel: LogLevel.Severity = 'Info') =>
        Effect.gen(function* () {
          const { capturedLogs, testLogger } = makeTestLogger();
          const program = options === undefined ? Effect.fail('boom').ignore() : Effect.fail('boom').ignore(options);
          yield* program.with((core) =>
            core.pipe(
              _Effect.provide(Logger.layer([testLogger])),
              _Effect.provideService(References.MinimumLogLevel, 'Trace'),
              _Effect.provideService(References.CurrentLogLevel, currentLogLevel)
            )
          );
          return capturedLogs;
        });

      it.effect('discards success and failure values', () =>
        Effect.gen(function* () {
          strictEqual(yield* Effect.succeed(5).ignore(), undefined);
          strictEqual(yield* Effect.fail('Uh oh!').ignore(), undefined);
        })
      );

      it.effect('does not ignore defects', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.die('boom').ignore().exit;
          assertExitFailure(exit, Cause.die('boom'));
        })
      );

      it.effect('does not log when log is omitted', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnore();
          strictEqual(logs.length, 0);
        })
      );

      it.effect('does not log when log is false', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnore({ log: false });
          strictEqual(logs.length, 0);
        })
      );

      it.effect('logs with the current level when log is true', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnore({ log: true }, 'Warn');
          strictEqual(logs.length, 1);
          strictEqual(logs[0].logLevel, 'Warn');
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );

      it.effect('logs with the provided level when log is a LogLevel', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnore({ log: 'Error' }, 'Warn');
          strictEqual(logs.length, 1);
          strictEqual(logs[0].logLevel, 'Error');
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );

      it.effect('prepends the provided message when logging', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnore({ log: true, message: 'Ignoring failure' });
          strictEqual(logs.length, 1);
          deepStrictEqual(logs[0].message, ['Ignoring failure']);
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );
    });

    describe('ignoreCause', () => {
      type IgnoreCauseOptions = { readonly log?: boolean | LogLevel.Severity; readonly message?: string };

      const makeTestLogger = () => {
        const capturedLogs: Array<{
          readonly logLevel: LogLevel.LogLevel;
          readonly cause: Cause<unknown>;
          readonly message: unknown;
        }> = [];
        const testLogger = Logger.make<unknown, void>((options) => {
          capturedLogs.push({ logLevel: options.logLevel, cause: Cause.wrap(options.cause), message: options.message });
        });
        return { capturedLogs, testLogger };
      };

      const runIgnoreCause = (options?: IgnoreCauseOptions, currentLogLevel: LogLevel.Severity = 'Info') =>
        Effect.gen(function* () {
          const { capturedLogs, testLogger } = makeTestLogger();
          const program =
            options === undefined ? Effect.fail('boom').ignoreCause() : Effect.fail('boom').ignoreCause(options);
          yield* program.with((core) =>
            core.pipe(
              _Effect.provide(Logger.layer([testLogger])),
              _Effect.provideService(References.MinimumLogLevel, 'Trace'),
              _Effect.provideService(References.CurrentLogLevel, currentLogLevel)
            )
          );
          return capturedLogs;
        });

      it.effect('ignores defects', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.die('boom').ignoreCause().exit;
          deepStrictEqual(exit, Exit.void);
        })
      );

      it.effect('ignores interrupts', () =>
        Effect.gen(function* () {
          const ignored = yield* Effect.interrupt.ignoreCause().exit;
          deepStrictEqual(ignored, Exit.void);
        })
      );

      it.effect('does not log when log is omitted', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnoreCause();
          strictEqual(logs.length, 0);
        })
      );

      it.effect('does not log when log is false', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnoreCause({ log: false });
          strictEqual(logs.length, 0);
        })
      );

      it.effect('logs with the current level when log is true', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnoreCause({ log: true }, 'Warn');
          strictEqual(logs.length, 1);
          strictEqual(logs[0].logLevel, 'Warn');
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );

      it.effect('logs with the provided level when log is a LogLevel', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnoreCause({ log: 'Error' }, 'Warn');
          strictEqual(logs.length, 1);
          strictEqual(logs[0].logLevel, 'Error');
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );

      it.effect('prepends the provided message when logging', () =>
        Effect.gen(function* () {
          const logs = yield* runIgnoreCause({ log: true, message: 'Ignoring cause' });
          strictEqual(logs.length, 1);
          deepStrictEqual(logs[0].message, ['Ignoring cause']);
          deepStrictEqual(logs[0].cause, Cause.fail('boom'));
        })
      );
    });

    describe('mapError', () => {
      it.effect('transforms the error', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('Oh no!').mapError((message) => new Error(message)).exit;
          deepStrictEqual(result, Exit.fail(new Error('Oh no!')));
        })
      );

      it.effect('leaves success values unchanged', () =>
        Effect.gen(function* () {
          let called = false;
          const result = yield* Effect.succeed(1).mapError(() => {
            called = true;
            return 'mapped';
          });
          strictEqual(result, 1);
          assertFalse(called);
        })
      );

      it.effect('does not transform defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die('boom').mapError(() => 'mapped').exit;
          assertExitFailure(result, Cause.die('boom'));
        })
      );
    });

    describe('orDie', () => {
      it.effect('converts typed failures into defects', () =>
        Effect.gen(function* () {
          const error = new Error('boom');
          const exit = yield* Effect.fail(error).orDie.exit;
          assertExitFailure(exit, Cause.die(error));
        })
      );

      it.effect('leaves success values unchanged', () =>
        Effect.gen(function* () {
          strictEqual(yield* Effect.succeed(1).orDie, 1);
        })
      );

      it.effect('leaves existing defects unchanged', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.die('boom').orDie.exit;
          assertExitFailure(exit, Cause.die('boom'));
        })
      );
    });

    describe('sandbox', () => {
      it.effect('exposes typed failures as causes', () =>
        Effect.gen(function* () {
          const cause = yield* Effect.fail('Something went wrong').sandbox.flip;
          deepStrictEqual(cause, Cause.fail('Something went wrong'));
        })
      );

      it.effect('exposes defects as causes', () =>
        Effect.gen(function* () {
          const error = new Error('boom');
          const cause = yield* Effect.die(error).sandbox.flip;
          deepStrictEqual(cause, Cause.die(error));
        })
      );

      it.effect('leaves success values unchanged', () =>
        Effect.gen(function* () {
          strictEqual(yield* Effect.succeed(1).sandbox, 1);
        })
      );
    });

    describe('unwrapReason', () => {
      class RateLimitError extends Data.TaggedError('RateLimitError')<{
        readonly retryAfter: number;
      }> {}

      class QuotaExceededError extends Data.TaggedError('QuotaExceededError')<{
        readonly limit: number;
      }> {}

      class AiError extends Data.TaggedError('AiError')<{
        readonly reason: RateLimitError | QuotaExceededError;
      }> {}

      class OtherError extends Data.TaggedError('OtherError')<{
        readonly message: string;
      }> {}

      it.effect('extracts reason into error channel', () =>
        Effect.gen(function* () {
          const reason = new RateLimitError({ retryAfter: 60 });
          const exit = yield* Effect.fail(new AiError({ reason })).unwrapReason('AiError').exit;
          assertExitFailure(exit, Cause.fail(reason));
        })
      );

      it.effect('extracts second reason type', () =>
        Effect.gen(function* () {
          const reason = new QuotaExceededError({ limit: 100 });
          const exit = yield* Effect.fail(new AiError({ reason })).unwrapReason('AiError').exit;
          assertExitFailure(exit, Cause.fail(reason));
        })
      );

      it.effect('preserves other errors', () =>
        Effect.gen(function* () {
          const error = new OtherError({ message: 'test' });
          const exit = yield* (Effect.fail(error) as Effect<never, AiError | OtherError>).unwrapReason('AiError').exit;
          assertExitFailure(exit, Cause.fail(error));
        })
      );
    });

    describe('withErrorReporting', () => {
      const makeReporter = () => {
        const reported: Array<Error> = [];
        const reporter = ErrorReporter.make(({ error }) => {
          reported.push(error);
        });
        return { reported, reporter };
      };

      it.effect('reports typed failures and preserves the outcome', () =>
        Effect.gen(function* () {
          const { reported, reporter } = makeReporter();
          const error = new Error('boom');
          const exit = yield* Effect.fail(error)
            .withErrorReporting()
            .with((core) => _Effect.provide(core, ErrorReporter.layer([reporter]))).exit;
          assertExitFailure(exit, Cause.fail(error));
          strictEqual(reported.length, 1);
          strictEqual(reported[0].message, 'boom');
        })
      );

      it.effect('reports defects', () =>
        Effect.gen(function* () {
          const { reported, reporter } = makeReporter();
          const error = new Error('boom');
          const exit = yield* Effect.die(error)
            .withErrorReporting()
            .with((core) => _Effect.provide(core, ErrorReporter.layer([reporter]))).exit;
          assertExitFailure(exit, Cause.die(error));
          strictEqual(reported.length, 1);
          strictEqual(reported[0].message, 'boom');
        })
      );

      it.effect('defectsOnly skips typed failures', () =>
        Effect.gen(function* () {
          const { reported, reporter } = makeReporter();
          const error = new Error('boom');
          const exit = yield* Effect.fail(error)
            .withErrorReporting({ defectsOnly: true })
            .with((core) => _Effect.provide(core, ErrorReporter.layer([reporter]))).exit;
          assertExitFailure(exit, Cause.fail(error));
          strictEqual(reported.length, 0);
        })
      );

      it.effect('defectsOnly still reports defects', () =>
        Effect.gen(function* () {
          const { reported, reporter } = makeReporter();
          const error = new Error('boom');
          const exit = yield* Effect.die(error)
            .withErrorReporting({ defectsOnly: true })
            .with((core) => _Effect.provide(core, ErrorReporter.layer([reporter]))).exit;
          assertExitFailure(exit, Cause.die(error));
          strictEqual(reported.length, 1);
        })
      );

      it.effect('success is not reported', () =>
        Effect.gen(function* () {
          const { reported, reporter } = makeReporter();
          const result = yield* Effect.succeed(1)
            .withErrorReporting()
            .with((core) => _Effect.provide(core, ErrorReporter.layer([reporter])));
          strictEqual(result, 1);
          strictEqual(reported.length, 0);
        })
      );
    });
  });

  describe('pattern matching', () => {
    describe('match', () => {
      it.effect('handles both success and failure', () =>
        Effect.gen(function* () {
          const success = yield* Effect.succeed(42).match({
            onFailure: (error) => `failure: ${error}`,
            onSuccess: (value) => `success: ${value}`
          });
          strictEqual(success, 'success: 42');

          const failure = yield* (Effect.fail('Uh oh!') as Effect<number, string>).match({
            onFailure: (error) => `failure: ${error}`,
            onSuccess: (value) => `success: ${value}`
          });
          strictEqual(failure, 'failure: Uh oh!');
        })
      );

      it.effect('does not handle defects', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.die('boom').match({
            onFailure: () => 'failure',
            onSuccess: () => 'success'
          }).exit;
          assertExitFailure(exit, Cause.die('boom'));
        })
      );
    });

    describe('matchEffect', () => {
      it.effect('runs effectful handlers', () =>
        Effect.gen(function* () {
          const success = yield* Effect.succeed(42).matchEffect({
            onFailure: (error) => Effect.succeed(`failure: ${error}`),
            onSuccess: (value) => Effect.succeed(`success: ${value}`)
          });
          strictEqual(success, 'success: 42');

          const failure = yield* (Effect.fail('Uh oh!') as Effect<number, string>).matchEffect({
            onFailure: (error) => Effect.succeed(`failure: ${error}`),
            onSuccess: (value) => Effect.succeed(`success: ${value}`)
          });
          strictEqual(failure, 'failure: Uh oh!');
        })
      );

      it.effect('propagates handler failures', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').matchEffect({
            onFailure: () => Effect.fail('e2' as const),
            onSuccess: () => Effect.succeed('unreachable')
          }).flip;
          strictEqual(result, 'e2');
        })
      );

      it.effect('does not handle defects', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.die('boom').matchEffect({
            onFailure: () => Effect.succeed('failure'),
            onSuccess: () => Effect.succeed('success')
          }).exit;
          assertExitFailure(exit, Cause.die('boom'));
        })
      );
    });

    describe('matchCause', () => {
      it.effect('matches on the full cause', () =>
        Effect.gen(function* () {
          const failed = yield* (Effect.fail('Something went wrong') as Effect<number, string>).matchCause({
            onFailure: (cause) => `Failed: ${cause.squash}`,
            onSuccess: (value) => `Success: ${value}`
          });
          strictEqual(failed, 'Failed: Something went wrong');

          const succeeded = yield* Effect.succeed(42).matchCause({
            onFailure: (cause) => `Failed: ${cause.squash}`,
            onSuccess: (value) => `Success: ${value}`
          });
          strictEqual(succeeded, 'Success: 42');
        })
      );

      it.effect('observes defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die(new Error('boom')).matchCause({
            onFailure: (cause) => cause.hasDies,
            onSuccess: () => false
          });
          assertTrue(result);
        })
      );
    });

    describe('matchCauseEffect', () => {
      class TaskError extends Data.TaggedError('TaskError')<{ readonly message: string }> {}

      it.effect('handles causes effectfully', () =>
        Effect.gen(function* () {
          const messages: Array<string> = [];
          const result = yield* Effect.fail(new TaskError({ message: 'Task failed' })).matchCauseEffect({
            onFailure: (cause) =>
              Effect.gen(function* () {
                if (cause.hasFails) {
                  const error = cause.findErrorOption;
                  yield* Effect.sync(() => messages.push(`Handling error: ${error.getOrThrow.message}`));
                  return 'recovered from error';
                }
                yield* Effect.sync(() => messages.push('Handling interruption or defect'));
                return 'recovered from interruption/defect';
              }),
            onSuccess: (value) => Effect.succeed(`processed ${value}`)
          });
          strictEqual(result, 'recovered from error');
          deepStrictEqual(messages, ['Handling error: Task failed']);
        })
      );

      it.effect('runs the success handler on success', () =>
        Effect.gen(function* () {
          const result = yield* Effect.succeed(42).matchCauseEffect({
            onFailure: () => Effect.succeed('failure'),
            onSuccess: (value) => Effect.succeed(`processed ${value}`)
          });
          strictEqual(result, 'processed 42');
        })
      );

      it.effect('observes defects', () =>
        Effect.gen(function* () {
          const result = yield* Effect.die(new Error('boom')).matchCauseEffect({
            onFailure: (cause) => Effect.succeed(cause.hasDies),
            onSuccess: () => Effect.succeed(false)
          });
          assertTrue(result);
        })
      );

      it.effect('propagates handler failures', () =>
        Effect.gen(function* () {
          const result = yield* Effect.fail('e1').matchCauseEffect({
            onFailure: () => Effect.fail('e2' as const),
            onSuccess: () => Effect.succeed('unreachable')
          }).flip;
          strictEqual(result, 'e2');
        })
      );
    });
  });
});
