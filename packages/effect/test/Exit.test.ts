import { Effect as _CoreEffect, Exit as _Exit } from 'effect';
import { describe, it } from '@effect-fluent/vitest';
import {
  assertFailure,
  assertFalse,
  assertNone,
  assertSome,
  assertSuccess,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Cause } from '../src/Cause.js';
import { Effect } from '../src/Effect.js';
import { Exit } from '../src/Exit.js';

describe('Exit', () => {
  // Ported from upstream Exit.test.ts
  it('toString', () => {
    strictEqual(Exit.succeed(1).toString(), 'Success(1)');
    strictEqual(Exit.fail('error').toString(), `Failure(Cause([Fail("error")]))`);
    strictEqual(Exit.die('error').toString(), `Failure(Cause([Die("error")]))`);
    strictEqual(Exit.interrupt(1).toString(), `Failure(Cause([Interrupt(1)]))`);
    strictEqual(Exit.interrupt(undefined).toString(), `Failure(Cause([Interrupt(undefined)]))`);
  });

  // The tests below patch upstream coverage holes: upstream only tests toString.

  describe('constructors', () => {
    it('succeed carries the value', () => {
      const exit = Exit.succeed(42);
      assertTrue(exit.isSuccess());
      strictEqual(exit.isSuccess() && exit.value, 42);
    });

    it('fail carries a Fail cause', () => {
      const exit = Exit.fail('boom');
      assertTrue(exit.isFailure());
      assertTrue(exit.isFailure() && exit.cause.hasFails);
      deepStrictEqual(exit.isFailure() && exit.cause, Cause.fail('boom'));
    });

    it('failCause lifts a fluent Cause', () => {
      const cause = Cause.fail('boom').combine(Cause.die('defect'));
      const exit = Exit.failCause(cause);
      assertTrue(exit.isFailure());
      deepStrictEqual(exit.isFailure() && exit.cause, cause);
    });

    it('die carries a Die cause', () => {
      const exit = Exit.die('defect');
      assertTrue(exit.hasDies());
      assertFalse(exit.hasFails());
    });

    it('interrupt carries an Interrupt cause with the fiber id', () => {
      const exit = Exit.interrupt(7);
      assertTrue(exit.hasInterrupts());
      deepStrictEqual(exit.isFailure() && Array.from(exit.cause.interruptors), [7]);
    });

    it('void succeeds with undefined', () => {
      assertTrue(Exit.void.isSuccess());
      strictEqual(Exit.void.isSuccess() && Exit.void.value, undefined);
    });
  });

  describe('type guards', () => {
    it('isSuccess and isFailure narrow', () => {
      assertTrue(Exit.succeed(1).isSuccess());
      assertFalse(Exit.succeed(1).isFailure());
      assertTrue(Exit.fail('e').isFailure());
      assertFalse(Exit.fail('e').isSuccess());
    });

    it('hasFails, hasDies, hasInterrupts inspect the cause', () => {
      assertTrue(Exit.fail('e').hasFails());
      assertFalse(Exit.fail('e').hasDies());
      assertTrue(Exit.die('d').hasDies());
      assertTrue(Exit.interrupt().hasInterrupts());
      assertFalse(Exit.succeed(1).hasFails());
      assertFalse(Exit.succeed(1).hasDies());
      assertFalse(Exit.succeed(1).hasInterrupts());
    });

    it('is identifies fluent Exits', () => {
      assertTrue(Exit.is(Exit.succeed(1)));
      assertFalse(Exit.is(_Exit.succeed(1))); // core exits are not fluent exits
      assertFalse(Exit.is(null));
      assertFalse(Exit.is({ _tag: 'Success' }));
    });
  });

  describe('match', () => {
    it('onSuccess receives the value', () => {
      const message = Exit.succeed(42).match({
        onSuccess: (value) => `value: ${value}`,
        onFailure: (cause) => `cause: ${cause.pretty}`
      });
      strictEqual(message, 'value: 42');
    });

    it('onFailure receives the fluent Cause', () => {
      const message = Exit.fail('boom').match({
        onSuccess: (value) => `value: ${value}`,
        onFailure: (cause) => `error: ${cause.findErrorOption.getOrThrow}`
      });
      strictEqual(message, 'error: boom');
    });
  });

  describe('mapping', () => {
    it('map transforms the success value', () => {
      deepStrictEqual(Exit.succeed(1).map((n) => n + 1), Exit.succeed(2));
      deepStrictEqual(Exit.fail('e').map((n: number) => n + 1), Exit.fail('e'));
    });

    it('mapError transforms the typed error', () => {
      deepStrictEqual(Exit.fail('e').mapError((e) => e.toUpperCase()), Exit.fail('E'));
      deepStrictEqual(Exit.succeed(1).mapError((e: string) => e.toUpperCase()), Exit.succeed(1));
    });

    it('mapBoth transforms both channels', () => {
      const options = { onSuccess: (n: number) => n * 2, onFailure: (e: string) => e.toUpperCase() };
      deepStrictEqual(Exit.succeed(2).mapBoth(options), Exit.succeed(4));
      deepStrictEqual(Exit.fail('e').mapBoth(options), Exit.fail('E'));
    });

    it('asVoid discards the value', () => {
      deepStrictEqual(Exit.succeed(42).asVoid, Exit.void);
      deepStrictEqual(Exit.fail('e').asVoid, Exit.fail('e'));
    });
  });

  describe('filters', () => {
    it('filterSuccess', () => {
      const success = Exit.succeed(1).filterSuccess;
      assertTrue(success.isSuccess() && success.success.isSuccess());
      assertFailure(Exit.fail('e').filterSuccess, Exit.fail('e'));
    });

    it('filterValue', () => {
      assertSuccess(Exit.succeed(1).filterValue, 1);
      assertFailure(Exit.fail('e').filterValue, Exit.fail('e'));
    });

    it('filterFailure', () => {
      assertFailure(Exit.succeed(1).filterFailure, Exit.succeed(1));
      const failure = Exit.fail('e').filterFailure;
      assertTrue(failure.isSuccess() && failure.success.isFailure());
    });

    it('filterCause succeeds with the fluent Cause', () => {
      assertSuccess(Exit.fail('e').filterCause, Cause.fail('e'));
      assertFailure(Exit.succeed(1).filterCause, Exit.succeed(1));
    });

    it('findError finds the first typed error', () => {
      assertSuccess(Exit.fail('e').findError, 'e');
      assertFailure(Exit.succeed(1).findError, Exit.succeed(1));
      assertFailure(Exit.die('d').findError, Exit.die('d'));
    });

    it('findDefect finds the first defect', () => {
      assertSuccess(Exit.die('d').findDefect, 'd');
      assertFailure(Exit.fail('e').findDefect, Exit.fail('e'));
    });
  });

  describe('getters', () => {
    it('getSuccess returns the value as a fluent Option', () => {
      assertSome(Exit.succeed(1).getSuccess, 1);
      assertNone(Exit.fail('e').getSuccess);
    });

    it('getCause returns the fluent Cause as a fluent Option', () => {
      assertSome(Exit.fail('e').getCause, Cause.fail('e'));
      assertNone(Exit.succeed(1).getCause);
    });

    it('findErrorOption returns the first typed error', () => {
      assertSome(Exit.fail('e').findErrorOption, 'e');
      assertNone(Exit.die('d').findErrorOption);
      assertNone(Exit.succeed(1).findErrorOption);
    });
  });

  describe('asVoidAll', () => {
    it('succeeds when all exits succeed', () => {
      deepStrictEqual(Exit.asVoidAll([Exit.succeed(1), Exit.succeed(2)]), Exit.void);
    });

    it('fails with the combined causes of all failures', () => {
      deepStrictEqual(
        Exit.asVoidAll([Exit.succeed(1), Exit.fail('e1'), Exit.fail('e2')]),
        Exit.failCause(Cause.fail('e1').combine(Cause.fail('e2')))
      );
    });
  });

  describe('generator interop', () => {
    it.effect('a successful Exit resumes with its value inside Effect.gen', () => {
      return Effect.gen(function* () {
        const value = yield* Exit.succeed(42);
        strictEqual(value, 42);
      });
    });

    it.effect('a failed Exit fails the effect inside Effect.gen', () => {
      return Effect.gen(function* () {
        const exit = yield* Effect.suspend(() => {
          return Effect.gen(function* () {
            return yield* Exit.fail('boom');
          });
        }).exit;
        assertTrue(exit.isFailure());
        deepStrictEqual(exit.isFailure() && exit.cause, Cause.fail('boom'));
      });
    });
  });

  describe('Effect integration', () => {
    it.effect('.exit yields a fluent Exit with a fluent Cause', () => {
      return Effect.gen(function* () {
        const success = yield* Effect.succeed(1).exit;
        assertTrue(Exit.is(success));
        assertSome(success.getSuccess, 1);

        const failure = yield* Effect.fail('boom').exit;
        assertTrue(Exit.is(failure));
        assertTrue(failure.isFailure() && Cause.is(failure.cause));
      });
    });
  });

  describe('core interop', () => {
    it('wrap and the exit getter round-trip the underlying exit', () => {
      const core = _Exit.succeed(1);
      const fluent = Exit.wrap(core);
      assertTrue(fluent.exit === core);
    });

    it('the exit getter unboxes for direct core execution', () => {
      // Fluent Exits are yieldable inside gen; for any other core usage the
      // supported path is explicit unboxing via the exit getter.
      deepStrictEqual(_CoreEffect.runSyncExit(Exit.succeed(42).exit), _Exit.succeed(42));
      deepStrictEqual(_CoreEffect.runSyncExit(Exit.fail('boom').exit), _Exit.fail('boom'));
      deepStrictEqual(_CoreEffect.runSyncExit(Effect.succeed(10).map((n) => n * 2).effect), _Exit.succeed(20));
    });

    it('with applies a core transformation and re-wraps', () => {
      deepStrictEqual(
        Exit.succeed(1).with((core) => _Exit.map(core, (n) => n + 1)),
        Exit.succeed(2)
      );
    });
  });
});
