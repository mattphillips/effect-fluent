import { Effect as _Effect, Exit as _Exit, Fiber as _Fiber, Latch, Scope } from 'effect';
import { TestClock } from 'effect/testing';
import { describe, it } from '@effect-fluent/vitest';
import {
  assertFalse,
  assertSome,
  assertTrue,
  assertUndefined,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Cause } from '../src/Cause.js';
import { Effect } from '../src/Effect.js';
import { Exit } from '../src/Exit.js';
import { Fiber } from '../src/Fiber.js';

describe('Fiber', () => {
  // Ported from upstream Fiber.test.ts (adapted to the fluent fork API)
  it.effect('is a fiber', () =>
    Effect.gen(function* () {
      const fiber = yield* Effect.succeed(1).forkChild();
      assertTrue(Fiber.is(fiber));
      assertFalse(Fiber.is(fiber.fiber)); // core fibers are not fluent fibers
      assertFalse(Fiber.is(null));
    }));

  describe('interruptAll', () => {
    it.effect('awaits fibers passed as a one-shot iterable', () =>
      Effect.gen(function* () {
        let cleaned = false;
        const latch = Latch.makeUnsafe();
        const fiber = yield* Effect.never.with((effect) =>
          _Effect.onInterrupt(effect, () =>
            latch.whenOpen(
              _Effect.sync(() => {
                cleaned = true;
              })
            )
          )
        ).forkChild({ startImmediately: true });
        yield* Effect.wrap(latch.open).forkChild();
        yield* Fiber.interruptAll(
          (function* () {
            yield fiber;
          })()
        );
        assertTrue(cleaned);
      }));
  });

  describe('interruptAllAs', () => {
    it.effect('awaits fibers passed as a one-shot iterable', () =>
      Effect.gen(function* () {
        const latch = Latch.makeUnsafe();
        let cleaned = false;
        const fiber = yield* Effect.never.with((effect) =>
          _Effect.onInterrupt(effect, () =>
            latch.whenOpen(
              _Effect.sync(() => {
                cleaned = true;
              })
            )
          )
        ).forkChild({ startImmediately: true });
        yield* Effect.wrap(latch.open).forkChild();
        yield* Fiber.interruptAllAs(
          (function* () {
            yield fiber;
          })(),
          0
        );
        assertTrue(cleaned);
      }));
  });

  it.effect('delivers a synchronous self-interrupt instead of completing to success', () =>
    Effect.gen(function* () {
      const closedScope = yield* Scope.make();
      yield* Scope.close(closedScope, _Exit.void);

      const child = yield* Effect.gen(function* () {
        const self = Fiber.getCurrent()!;
        self.runIn(closedScope);
        return 42;
      }).forkChild({ startImmediately: true });

      const exit = yield* child.await;
      assertTrue(exit.hasInterrupts());
    }));

  // The tests below patch upstream coverage holes: join, await, interrupt,
  // poll, observers, awaitAll/joinAll, the fork* family, and the fiber
  // accessor statics have no upstream Fiber tests.

  describe('await and join', () => {
    it.effect('await yields the outcome as a fluent Exit', () =>
      Effect.gen(function* () {
        const success = yield* Effect.succeed(42).forkChild({ startImmediately: true });
        const successExit = yield* success.await;
        assertTrue(Exit.is(successExit));
        assertSome(successExit.getSuccess, 42);

        const failure = yield* Effect.fail('boom').forkChild({ startImmediately: true });
        const failureExit = yield* failure.await;
        assertTrue(failureExit.isFailure());
        deepStrictEqual(failureExit.isFailure() && failureExit.cause, Cause.fail('boom'));
      }));

    it.effect('join succeeds with the value and propagates failure', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.succeed(7).forkChild({ startImmediately: true });
        strictEqual(yield* fiber.join, 7);

        const failing = yield* Effect.fail('boom').forkChild({ startImmediately: true });
        const exit = yield* failing.join.exit;
        assertTrue(exit.isFailure());
        deepStrictEqual(exit.isFailure() && exit.cause, Cause.fail('boom'));
      }));
  });

  describe('interrupt', () => {
    it.effect('interrupts the fiber and awaits termination', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.never.forkChild({ startImmediately: true });
        yield* fiber.interrupt;
        const exit = fiber.pollUnsafe;
        assertTrue(exit !== undefined && exit.hasInterrupts());
      }));

    it.effect('interruptAs records the interrupting fiber id', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.never.forkChild({ startImmediately: true });
        yield* fiber.interruptAs(99);
        const exit = fiber.pollUnsafe;
        assertTrue(exit !== undefined && exit.isFailure());
        deepStrictEqual(exit.isFailure() && Array.from(exit.cause.interruptors), [99]);
      }));
  });

  describe('pollUnsafe and observers', () => {
    it.effect('pollUnsafe is undefined while running and a fluent Exit after', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.sleep('1 second').as('done').forkChild({ startImmediately: true });
        assertUndefined(fiber.pollUnsafe);
        yield* TestClock.adjust('1 second');
        const exit = fiber.pollUnsafe;
        assertTrue(exit !== undefined);
        assertTrue(Exit.is(exit));
        assertSome(fiber.pollUnsafe!.getSuccess, 'done');
      }));

    it.effect('addObserver receives the fluent Exit and can be unregistered', () =>
      Effect.gen(function* () {
        const seen: Array<Exit<number, never>> = [];
        const fiber = yield* Effect.sleep('1 second').as(1).forkChild({ startImmediately: true });
        const unregister = fiber.addObserver((exit) => seen.push(exit));
        fiber.addObserver(() => undefined)(); // register + immediately unregister
        unregister();
        const observed: Array<Exit<number, never>> = [];
        fiber.addObserver((exit) => observed.push(exit));
        yield* TestClock.adjust('1 second');
        deepStrictEqual(seen, []);
        strictEqual(observed.length, 1);
        assertTrue(Exit.is(observed[0]));
        assertSome(observed[0].getSuccess, 1);
      }));
  });

  describe('awaitAll and joinAll', () => {
    it.effect('awaitAll collects fluent Exits for mixed outcomes', () =>
      Effect.gen(function* () {
        const a = yield* Effect.succeed(1).forkChild({ startImmediately: true });
        const b = yield* Effect.fail('boom').forkChild({ startImmediately: true });
        const exits = yield* Fiber.awaitAll([a, b]);
        strictEqual(exits.length, 2);
        assertTrue(exits[0].isSuccess());
        assertTrue(exits[1].isFailure());
      }));

    it.effect('joinAll succeeds with all values', () =>
      Effect.gen(function* () {
        const a = yield* Effect.succeed(1).forkChild({ startImmediately: true });
        const b = yield* Effect.succeed(2).forkChild({ startImmediately: true });
        deepStrictEqual(yield* Fiber.joinAll([a, b]), [1, 2]);
      }));
  });

  describe('fork variants', () => {
    it.effect('forkScoped ties the fiber to the enclosing scope', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.scoped(
          Effect.gen(function* () {
            return yield* Effect.never.forkScoped({ startImmediately: true });
          })
        );
        // leaving the scope interrupts the fiber
        const exit = yield* fiber.await;
        assertTrue(exit.hasInterrupts());
      }));

    it.effect('forkIn ties the fiber to the given scope', () =>
      Effect.gen(function* () {
        const scope = yield* Scope.make();
        const fiber = yield* Effect.never.forkIn(scope, { startImmediately: true });
        yield* Scope.close(scope, _Exit.void);
        const exit = yield* fiber.await;
        assertTrue(exit.hasInterrupts());
      }));

    it.effect('forkDetach outlives the parent', () =>
      Effect.gen(function* () {
        const latch = Latch.makeUnsafe();
        let finished = false;
        const parent = yield* Effect.gen(function* () {
          yield* Effect.wrap(latch.whenOpen(_Effect.sync(() => (finished = true)))).forkDetach({
            startImmediately: true
          });
        }).forkChild({ startImmediately: true });
        yield* parent.await;
        assertFalse(finished);
        yield* Effect.wrap(latch.open);
        yield* Effect.yieldNow;
        assertTrue(finished);
      }));

    it.effect('awaitAllChildren waits for forked children', () =>
      Effect.gen(function* () {
        let childDone = false;
        yield* Effect.gen(function* () {
          yield* Effect.sleep('1 second')
            .tap(Effect.sync(() => (childDone = true)))
            .forkChild({ startImmediately: true });
        }).awaitAllChildren.forkChild({ startImmediately: true });
        assertFalse(childDone);
        yield* TestClock.adjust('1 second');
        assertTrue(childDone);
      }));
  });

  describe('fiber accessors', () => {
    it.effect('Effect.fiber yields the executing fluent Fiber', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.fiber;
        assertTrue(Fiber.is(fiber));
        strictEqual(typeof fiber.id, 'number');
      }));

    it.effect('Effect.fiberId matches the current fiber id', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.fiber;
        const id = yield* Effect.fiberId;
        strictEqual(id, fiber.id);
      }));

    it.effect('Effect.withFiber receives the executing fluent Fiber', () =>
      Effect.gen(function* () {
        const id = yield* Effect.withFiber((fiber) => {
          assertTrue(Fiber.is(fiber));
          return Effect.succeed(fiber.id);
        });
        strictEqual(id, yield* Effect.fiberId);
      }));

    it.effect('getCurrent returns the running fluent Fiber', () =>
      Effect.gen(function* () {
        const current = Fiber.getCurrent();
        assertTrue(current !== undefined && Fiber.is(current));
      }));
  });

  describe('core interop', () => {
    it.effect('wrap and the fiber getter round-trip the underlying fiber', () =>
      Effect.gen(function* () {
        const fluent = yield* Effect.succeed(1).forkChild();
        const core = fluent.fiber;
        assertTrue(_Fiber.isFiber(core));
        strictEqual(Fiber.wrap(core).fiber, core);
      }));
  });
});
