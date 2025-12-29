import { Cause, Exit, Option } from 'effect';
import { Effect } from '../../src/Effect.js';
import { Ref } from '../../src/Ref.js';
// import { describe, it } from '@effect/vitest';
import { describe, it } from '../../src/vitest/index.js';
import { assertFailure, assertFalse, assertTrue, deepStrictEqual, strictEqual } from '../../src/vitest/utils.js';

describe('Effect', () => {
  describe('sequencing', () => {
    describe('flatMap', () => {
      it.effect('successful effects can be flatMapped to a new effect', () => {
        return Effect.gen(function* () {
          const success = yield* Effect.succeed(42).flatMap((x) => Effect.succeed(x * 2));
          strictEqual(success, 84);

          const failure = yield* Effect.succeed(42).flatMap((n) => Effect.fail(n * 2)).exit;
          assertFailure(failure, Cause.fail(84));

          const die = yield* Effect.succeed(42).flatMap((n) => Effect.die(n * 2)).exit;
          assertFailure(die, Cause.die(84));
        });
      });

      it.effect('failed effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertFailure(result, Cause.fail(42));
        });
      });

      it.effect('defect effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.die(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertFailure(result, Cause.die(42));
        });
      });
    });

    describe('flatten', () => {
      it.effect('flattens nested effects', () =>
        Effect.gen(function* () {
          const effect = Effect.succeed(Effect.succeed('test'));
          const flatten1 = yield* Effect.flatten(effect);
          const flatten2 = yield* Effect.flatten(effect);
          strictEqual(flatten1, 'test');
          strictEqual(flatten2, 'test');
        })
      );
    });

    it.effect('andThen', () =>
      Effect.gen(function* () {
        const a1 = Effect.succeed(0).andThen(Effect.succeed(1));
        const a2 = Effect.succeed(0).andThen((n) => Effect.succeed(n + 1));
        const a3 = Effect.succeed(0).andThen('ok');
        const a4 = Effect.succeed(0).andThen(() => 'ok');
        const a5 = Effect.succeed(0).andThen(() => Promise.resolve('ok'));
        const a6 = Effect.succeed(0).andThen(() => Promise.resolve('ok'));
        strictEqual(yield* a1, 1);
        strictEqual(yield* a2, 1);
        strictEqual(yield* a3, 'ok');
        strictEqual(yield* a4, 'ok');
        strictEqual(yield* a5, 'ok');
        strictEqual(yield* a6, 'ok');
      })
    );

    it.effect('tap', () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(-1);
        const a0 = yield* Effect.succeed(0).tap(() => ref.set(1));
        strictEqual(a0, 0);
        strictEqual(yield* ref.get, 1);

        const a1 = yield* Effect.succeed(0).tap(() => ref.set(2), { onlyEffect: true });
        strictEqual(a1, 0);
        strictEqual(yield* ref.get, 2);

        const a4 = yield* Effect.succeed(0).tap('ok');
        strictEqual(a4, 0);

        const a5 = yield* Effect.succeed(0).tap(() => 'ok');
        strictEqual(a5, 0);

        const a6 = yield* Effect.succeed(0).tap(() => Promise.resolve('ok'));
        strictEqual(a6, 0);

        const a7 = yield* Effect.succeed(0).tap(Promise.resolve('ok'));
        strictEqual(a7, 0);

        const a8 = yield* Effect.succeed(0).tap((n) => {
          strictEqual(n, 0);
          return 1;
        });
        strictEqual(a8, 0);

        const a9 = yield* Effect.succeed(0).tap((n) =>
          Effect.sync(() => {
            strictEqual(n, 0);
            return 1;
          })
        );
        strictEqual(a9, 0);

        const a10 = yield* Effect.succeed(0).tap((n) =>
          Promise.resolve(1).then(() => {
            strictEqual(n, 0);
          })
        );
        strictEqual(a10, 0);
      })
    );

    it.effect('tapError', () =>
      Effect.gen(function* () {
        const a0 = Effect.fail(0).tapError((n) =>
          Effect.sync(() => {
            strictEqual(n, 0);
            return 1;
          })
        ).exit;

        const a1 = Effect.succeed(0).tapError(() =>
          Effect.sync(() => {
            // This should not be executed
            assertTrue(false);
          })
        );

        assertFailure(yield* a0, Cause.fail(0));
        strictEqual(yield* a1, 0);
      })
    );

    describe('tapBoth', () => {
      it.effect('successful effects are tapped', () =>
        Effect.gen(function* () {
          const success = yield* Ref.make(false);
          const failure = yield* Ref.make(false);

          const result = yield* Effect.succeed(0).tapBoth({
            onFailure: (e) => failure.set(true),
            onSuccess: (a) => success.set(true)
          });

          strictEqual(result, 0);
          assertTrue(yield* success.get);
          assertFalse(yield* failure.get);
        })
      );

      it.effect('failed effects are tapped', () =>
        Effect.gen(function* () {
          const success = yield* Ref.make(false);
          const failure = yield* Ref.make(false);

          const result = yield* Effect.fail(0).tapBoth({
            onFailure: (e) => failure.set(true),
            onSuccess: (a) => success.set(true)
          }).flip;

          strictEqual(result, 0);
          assertTrue(yield* failure.get);
          assertFalse(yield* success.get);
        })
      );
    });

    it.effect('tapDefect - effectually peeks at defects', () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(false);
        const result = yield* Effect.dieMessage('die').tapDefect(() => ref.set(true)).exit;

        assertTrue(Exit.isFailure(result) && Option.isSome(Cause.dieOption(result.cause)));
        assertTrue(yield* ref.get);
      })
    );

    it.effect('tapDefect - leaves failures', () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(false);
        const result = yield* Effect.fail('fail').tapDefect(() => ref.set(true)).exit;
        deepStrictEqual(result, Exit.fail('fail'));
        assertFalse(yield* ref.get);
      })
    );
  });
});
