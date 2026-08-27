import { describe, it } from '@effect-fluent/vitest';
import {
  assertDefined,
  assertExitFailure,
  assertExitSuccess,
  assertInstanceOf,
  assertTrue,
  deepStrictEqual,
  fail,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Context } from 'effect';
import { Cause } from '../../src/Cause.js';
import { Effect } from '../../src/Effect.js';
import { Exit } from '../../src/Exit.js';
import { Fiber } from '../../src/Fiber.js';

// Runs `thunk`, returning the value it throws; fails the test if it returns.
const captureThrown = (thunk: () => unknown): unknown => {
  try {
    thunk();
  } catch (e) {
    return e;
  }
  return fail('Expected thunk to throw');
};

// Awaits `promise`, returning its rejection value; fails the test if it resolves.
const captureRejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  return fail('Expected promise to reject');
};

describe('Effect', () => {
  describe('running', () => {
    it('compile-time: Effect stays covariant in A and E with run* members present', () => {
      const narrowError: Effect<number, never> = Effect.succeed(1);
      const widenedError: Effect<number, string> = narrowError;
      const narrowSuccess: Effect<never, string> = Effect.fail('boom');
      const widenedSuccess: Effect<number, string> = narrowSuccess;
      assertTrue(Effect.is(widenedError));
      assertTrue(Effect.is(widenedSuccess));
    });

    it('compile-time: effects with unsatisfied requirements cannot be run', () => {
      const Dep = Context.Service<{ readonly n: number }>('running.CompileDep');
      const requires = Effect.gen(function* () {
        const dep = yield* Dep;
        return dep.n;
      });
      const deps = Context.make(Dep, { n: 1 });
      // Never invoked — the point is that these calls do not typecheck.
      const rejects = () => {
        // @ts-expect-error — runSync requires all services to be provided
        requires.runSync();
        // @ts-expect-error — runSyncExit requires all services to be provided
        requires.runSyncExit();
        // @ts-expect-error — runPromise requires all services to be provided
        void requires.runPromise();
        // @ts-expect-error — runPromiseExit requires all services to be provided
        void requires.runPromiseExit();
        // @ts-expect-error — runFork requires all services to be provided
        requires.runFork();
        // @ts-expect-error — runCallback requires all services to be provided
        requires.runCallback();
        // @ts-expect-error — the provided services must cover the effect's requirements
        requires.runSyncWith(Context.empty());
        // a context covering the requirements is accepted by every *With variant
        requires.runSyncWith(deps);
        requires.runSyncExitWith(deps);
        void requires.runPromiseWith(deps);
        void requires.runPromiseExitWith(deps);
        requires.runForkWith(deps);
        requires.runCallbackWith(deps);
      };
      assertTrue(typeof rejects === 'function');
    });

    // Ported from upstream Effect.test.ts ("callback can branch over sync/async").
    it('callback can branch over sync/async', async () => {
      const program = Effect.callback<number>(function (resume) {
        if (this.executionMode === 'sync') {
          resume(Effect.succeed(1));
        } else {
          Promise.resolve().then(() => resume(Effect.succeed(2)));
        }
      });

      const isSync = program.runSync();
      const isAsync = await program.runPromise();

      strictEqual(isSync, 1);
      strictEqual(isAsync, 2);
    });

    // Upstream only tests runPromise success directly; the remaining tests
    // patch upstream coverage holes for the run* family.

    describe('runSync', () => {
      it('returns the success value synchronously', () => {
        strictEqual(
          Effect.succeed(1)
            .map((n) => n + 1)
            .runSync(),
          2
        );
      });

      it('evaluates synchronous side effects', () => {
        let ran = false;
        const result = Effect.sync(() => {
          ran = true;
          return 'done';
        }).runSync();
        assertTrue(ran);
        strictEqual(result, 'done');
      });

      it('throws the typed error as-is on failure', () => {
        strictEqual(
          captureThrown(() => Effect.fail('my error').runSync()),
          'my error'
        );
      });

      it('throws the defect as-is when the effect dies', () => {
        const defect = new Error('boom');
        strictEqual(
          captureThrown(() => Effect.die(defect).runSync()),
          defect
        );
      });

      it('throws an Error when the effect is interrupted', () => {
        const thrown = captureThrown(() => Effect.interrupt.runSync());
        assertInstanceOf(thrown, Error);
        strictEqual(thrown.message, 'All fibers interrupted without error');
      });

      it('throws an AsyncFiberError when the effect performs async work', () => {
        const thrown = captureThrown(() => Effect.promise(() => Promise.resolve(1)).runSync());
        assertTrue(Cause.isAsyncFiberError(thrown));
        assertInstanceOf(thrown, Cause.AsyncFiberError);
        strictEqual(thrown.message, 'An asynchronous Effect was executed with Effect.runSync');
      });
    });

    describe('runSyncExit', () => {
      it('captures success as a fluent Exit', () => {
        const exit = Effect.succeed(1).runSyncExit();
        assertTrue(Exit.is(exit));
        assertExitSuccess(exit, 1);
      });

      it('captures typed failure as a fluent Exit', () => {
        const exit = Effect.fail('my error').runSyncExit();
        assertTrue(Exit.is(exit));
        assertExitFailure(exit, Cause.fail('my error'));
      });

      it('captures defects as a fluent Exit', () => {
        const defect = new Error('boom');
        assertExitFailure(Effect.die(defect).runSyncExit(), Cause.die(defect));
      });

      it('captures async work as a Die with an AsyncFiberError', () => {
        const exit = Effect.promise(() => Promise.resolve(1)).runSyncExit();
        assertTrue(exit.isFailure());
        assertTrue(exit.hasDies());
        const defect = exit.cause.findDefect.getOrNull;
        assertTrue(Cause.isAsyncFiberError(defect));
      });
    });

    describe('runSyncWith', () => {
      const Math = Context.Service<{ readonly add: (a: number, b: number) => number }>('running.Math');
      const services = Context.make(Math, { add: (a, b) => a + b });
      const program = Effect.gen(function* () {
        const math = yield* Math;
        return math.add(2, 3);
      });

      it('supplies services and returns the success value', () => {
        strictEqual(program.runSyncWith(services), 5);
      });

      it('throws the typed error as-is on failure', () => {
        strictEqual(
          captureThrown(() => Effect.fail('boom').runSyncWith(services)),
          'boom'
        );
      });
    });

    describe('runSyncExitWith', () => {
      const Math = Context.Service<{ readonly add: (a: number, b: number) => number }>('running.MathExit');
      const services = Context.make(Math, { add: (a, b) => a + b });

      it('supplies services and captures success as a fluent Exit', () => {
        const program = Effect.gen(function* () {
          const math = yield* Math;
          return math.add(20, 22);
        });
        const exit = program.runSyncExitWith(services);
        assertTrue(Exit.is(exit));
        assertExitSuccess(exit, 42);
      });

      it('captures typed failure as a fluent Exit', () => {
        assertExitFailure(Effect.fail('boom').runSyncExitWith(services), Cause.fail('boom'));
      });
    });

    describe('runPromise', () => {
      // Ported from upstream Effect.test.ts ("runPromise").
      it('runPromise', async () => {
        const result = await Effect.succeed(1).runPromise();
        strictEqual(result, 1);
      });

      it('resolves with the value of an async effect', async () => {
        strictEqual(
          await Effect.promise(() => Promise.resolve(41))
            .map((n) => n + 1)
            .runPromise(),
          42
        );
      });

      it('rejects with the typed error as-is on failure', async () => {
        strictEqual(await captureRejection(Effect.fail('my error').runPromise()), 'my error');
      });

      it('rejects with the defect as-is when the effect dies', async () => {
        const defect = new Error('boom');
        strictEqual(await captureRejection(Effect.die(defect).runPromise()), defect);
      });

      it('aborting the signal interrupts the fiber and rejects', async () => {
        const controller = new AbortController();
        const promise = Effect.never.runPromise({ signal: controller.signal });
        controller.abort();
        const rejection = await captureRejection(promise);
        assertInstanceOf(rejection, Error);
        strictEqual(rejection.message, 'All fibers interrupted without error');
      });
    });

    describe('runPromiseExit', () => {
      it('resolves with a fluent success Exit', async () => {
        const exit = await Effect.promise(() => Promise.resolve(1)).runPromiseExit();
        assertTrue(Exit.is(exit));
        assertExitSuccess(exit, 1);
      });

      it('resolves with a fluent failure Exit instead of rejecting', async () => {
        const exit = await Effect.fail('my error').runPromiseExit();
        assertTrue(Exit.is(exit));
        assertExitFailure(exit, Cause.fail('my error'));
      });

      it('aborting the signal resolves with an interrupted Exit', async () => {
        const controller = new AbortController();
        const promise = Effect.never.runPromiseExit({ signal: controller.signal });
        controller.abort();
        assertExitFailure(await promise, Cause.interrupt());
      });
    });

    describe('runPromiseWith', () => {
      const Config = Context.Service<{ readonly apiUrl: string }>('running.Config');
      const services = Context.make(Config, { apiUrl: 'https://api.example.com' });

      it('supplies services and resolves with the success value', async () => {
        const program = Effect.gen(function* () {
          const config = yield* Config;
          return `Connecting to ${config.apiUrl}`;
        });
        strictEqual(await program.runPromiseWith(services), 'Connecting to https://api.example.com');
      });

      it('rejects with the typed error as-is on failure', async () => {
        strictEqual(await captureRejection(Effect.fail('boom').runPromiseWith(services)), 'boom');
      });
    });

    describe('runPromiseExitWith', () => {
      const Database = Context.Service<{ readonly query: (sql: string) => string }>('running.Database');
      const services = Context.make(Database, { query: (sql) => `Result for: ${sql}` });

      it('supplies services and resolves with a fluent success Exit', async () => {
        const program = Effect.gen(function* () {
          const db = yield* Database;
          return db.query('SELECT 1');
        });
        const exit = await program.runPromiseExitWith(services);
        assertTrue(Exit.is(exit));
        assertExitSuccess(exit, 'Result for: SELECT 1');
      });

      it('resolves with a fluent failure Exit instead of rejecting', async () => {
        assertExitFailure(await Effect.fail('boom').runPromiseExitWith(services), Cause.fail('boom'));
      });
    });

    describe('runFork', () => {
      it('returns a fluent Fiber that can be joined', async () => {
        const fiber = Effect.succeed(42).runFork();
        assertTrue(Fiber.is(fiber));
        strictEqual(await fiber.join.runPromise(), 42);
      });

      it('awaiting the fiber yields its outcome as a fluent Exit', async () => {
        const fiber = Effect.fail('boom').runFork();
        const exit = await fiber.await.runPromise();
        assertTrue(Exit.is(exit));
        assertExitFailure(exit, Cause.fail('boom'));
      });

      // Interrupt mechanics and assertion ported from upstream Effect.test.ts
      // ("acquireUseRelease interrupt"): interruptUnsafe then await must
      // produce Exit.failCause(Cause.interrupt()).
      it('interrupting the fiber completes it with an interrupted Exit', async () => {
        const fiber = Effect.never.runFork();
        fiber.interruptUnsafe();
        const exit = await fiber.await.runPromise();
        assertExitFailure(exit, Cause.interrupt());
      });

      it('aborting the signal interrupts the fiber', async () => {
        const controller = new AbortController();
        const fiber = Effect.never.runFork({ signal: controller.signal });
        controller.abort();
        const exit = await fiber.await.runPromise();
        assertTrue(exit.hasInterrupts());
      });

      it('onFiberStart observes the started fiber', async () => {
        let observedId: number | undefined;
        const fiber = Effect.never.runFork({
          onFiberStart: (started) => {
            observedId = started.id;
          }
        });
        assertDefined(observedId);
        strictEqual(observedId, fiber.id);
        await fiber.interrupt.runPromise();
      });
    });

    describe('runForkWith', () => {
      it('supplies services to a background fiber', async () => {
        const Dep = Context.Service<{ readonly n: number }>('running.ForkDep');
        const program = Effect.gen(function* () {
          const dep = yield* Dep;
          return dep.n + 1;
        });
        const fiber = program.runForkWith(Context.make(Dep, { n: 41 }));
        assertTrue(Fiber.is(fiber));
        strictEqual(await fiber.join.runPromise(), 42);
      });
    });

    describe('runCallback', () => {
      it('invokes onExit with a fluent success Exit', async () => {
        const exit = await new Promise<Exit<string>>((resolve) => {
          Effect.succeed('done').runCallback({ onExit: resolve });
        });
        assertTrue(Exit.is(exit));
        assertExitSuccess(exit, 'done');
      });

      it('invokes onExit with a fluent failure Exit', async () => {
        const exit = await new Promise<Exit<never, string>>((resolve) => {
          Effect.fail('boom').runCallback({ onExit: resolve });
        });
        assertTrue(Exit.is(exit));
        assertExitFailure(exit, Cause.fail('boom'));
      });

      it('returns an interruptor that interrupts the fiber', async () => {
        const exit = await new Promise<Exit<never>>((resolve) => {
          const interrupt = Effect.never.runCallback({ onExit: resolve });
          interrupt();
        });
        assertExitFailure(exit, Cause.interrupt());
      });

      it('the interruptor records the interruptor id in the cause', async () => {
        const exit = await new Promise<Exit<never>>((resolve) => {
          const interrupt = Effect.never.runCallback({ onExit: resolve });
          interrupt(123);
        });
        assertTrue(exit.isFailure());
        deepStrictEqual(Array.from(exit.cause.interruptors), [123]);
      });
    });

    describe('runCallbackWith', () => {
      it('supplies services and invokes onExit with a fluent Exit', async () => {
        const Dep = Context.Service<{ readonly n: number }>('running.CallbackDep');
        const program = Effect.gen(function* () {
          const dep = yield* Dep;
          return dep.n * 2;
        });
        const exit = await new Promise<Exit<number>>((resolve) => {
          program.runCallbackWith(Context.make(Dep, { n: 21 }), { onExit: resolve });
        });
        assertExitSuccess(exit, 42);
      });

      it('returns an interruptor that interrupts the fiber', async () => {
        const exit = await new Promise<Exit<never>>((resolve) => {
          const interrupt = Effect.never.runCallbackWith(Context.empty(), { onExit: resolve });
          interrupt();
        });
        assertExitFailure(exit, Cause.interrupt());
      });
    });
  });
});
