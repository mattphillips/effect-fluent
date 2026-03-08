import { describe, it } from '@effect-fluent/vitest';
import { assertExitFailure, assertFalse, assertTrue, deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Cause, Data, Exit, Result } from 'effect';
import { Effect } from '../../src/Effect.js';
import { Ref } from '../../src/Ref.js';

describe('Effect', () => {
  describe('sequencing', () => {
    describe('flatMap', () => {
      it.effect('successful effects can be flatMapped to a new effect', () => {
        return Effect.gen(function* () {
          const success = yield* Effect.succeed(42).flatMap((x) => Effect.succeed(x * 2));
          strictEqual(success, 84);

          const failure = yield* Effect.succeed(42).flatMap((n) => Effect.fail(n * 2)).exit;
          assertExitFailure(failure, Cause.fail(84));

          const die = yield* Effect.succeed(42).flatMap((n) => Effect.die(n * 2)).exit;
          assertExitFailure(die, Cause.die(84));
        });
      });

      it.effect('failed effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.fail(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertExitFailure(result, Cause.fail(42));
        });
      });

      it.effect('defect effects cannot be flatMapped', () => {
        return Effect.gen(function* () {
          const result = yield* Effect.die(42).flatMap((x) => Effect.succeed(x * 2)).exit;
          assertExitFailure(result, Cause.die(42));
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
        strictEqual(yield* a1, 1);
        strictEqual(yield* a2, 1);
      })
    );

    it.effect('tap', () =>
      Effect.gen(function* () {
        const ref = yield* Ref.make(-1);
        const a0 = yield* Effect.succeed(0).tap(() => ref.set(1));
        strictEqual(a0, 0);
        strictEqual(yield* ref.get, 1);

        const a9 = yield* Effect.succeed(0).tap((n) =>
          Effect.sync(() => {
            strictEqual(n, 0);
            return 1;
          })
        );
        strictEqual(a9, 0);
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

        assertExitFailure(yield* a0, Cause.fail(0));
        strictEqual(yield* a1, 0);
      })
    );

    describe('tapErrorTag', () => {
      class ErrorA extends Data.TaggedError('A') {}
      class ErrorB extends Data.TaggedError('B') {}
      class ErrorC extends Data.Error {}

      it.effect('taps matching tagged errors', () =>
        Effect.gen(function* () {
          let error: ErrorA | ErrorB | ErrorC = new ErrorA();
          const tapped: Array<string> = [];
          const effect = Effect.failSync(() => error)
            .tapErrorTag('A', () =>
              Effect.sync(() => {
                tapped.push('A');
              })
            )
            .tapErrorTag('B', () =>
              Effect.sync(() => {
                tapped.push('B');
              })
            ).exit;

          deepStrictEqual(yield* effect, Exit.fail(new ErrorA()));
          deepStrictEqual(tapped, ['A']);

          tapped.length = 0;
          error = new ErrorB();
          deepStrictEqual(yield* effect, Exit.fail(new ErrorB()));
          deepStrictEqual(tapped, ['B']);

          tapped.length = 0;
          error = new ErrorC();
          deepStrictEqual(yield* effect, Exit.fail(new ErrorC()));
          deepStrictEqual(tapped, []);
        })
      );
    });

    describe('tapCause', () => {
      it.effect('taps into the cause of a failure', () =>
        Effect.gen(function* () {
          const ref = yield* Ref.make<Cause.Cause<string>>(Cause.empty);
          const result = yield* Effect.fail('error').tapCause((cause) => ref.set(cause)).exit;
          assertExitFailure(result, Cause.fail('error'));
          deepStrictEqual(yield* ref.get, Cause.fail('error'));
        })
      );

      it.effect('does not tap on success', () =>
        Effect.gen(function* () {
          const ref = yield* Ref.make(false);
          const result = yield* Effect.succeed(42).tapCause(() => ref.set(true));
          strictEqual(result, 42);
          assertFalse(yield* ref.get);
        })
      );
    });

    describe('tapCauseIf', () => {
      it.effect('predicate match taps', () =>
        Effect.gen(function* () {
          const tapped: Array<string> = [];
          const result = yield* Effect.fail('e1').tapCauseIf(Cause.hasFails, (cause) =>
            Effect.sync(() => {
              tapped.push(Cause.squash(cause) as string);
            })
          ).exit;
          deepStrictEqual(tapped, ['e1']);
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );

      it.effect('predicate no match skips tap', () =>
        Effect.gen(function* () {
          const tapped: Array<string> = [];
          const result = yield* Effect.fail('e1').tapCauseIf(
            () => false,
            () =>
              Effect.sync(() => {
                tapped.push('tapped');
              })
          ).exit;
          deepStrictEqual(tapped, []);
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );

      it.effect('success skips tap', () =>
        Effect.gen(function* () {
          const tapped: Array<string> = [];
          const result = yield* Effect.succeed(42).tapCauseIf(
            () => true,
            () =>
              Effect.sync(() => {
                tapped.push('tapped');
              })
          );
          deepStrictEqual(tapped, []);
          strictEqual(result, 42);
        })
      );
    });

    describe('tapCauseFilter', () => {
      it.effect('filter match taps', () =>
        Effect.gen(function* () {
          const tapped: Array<string> = [];
          const result = yield* Effect.fail('e1').tapCauseFilter(
            (cause) => Result.succeed(cause),
            (cause) =>
              Effect.sync(() => {
                tapped.push(Cause.squash(cause) as string);
              })
          ).exit;
          deepStrictEqual(tapped, ['e1']);
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );

      it.effect('filter no match skips tap', () =>
        Effect.gen(function* () {
          const tapped: Array<string> = [];
          const result = yield* Effect.fail('e1').tapCauseFilter(
            (cause) => Result.fail(cause),
            () =>
              Effect.sync(() => {
                tapped.push('tapped');
              })
          ).exit;
          deepStrictEqual(tapped, []);
          deepStrictEqual(result, Exit.fail('e1'));
        })
      );
    });

    describe('tapDefect', () => {
      it.effect('effectually peeks at defects', () =>
        Effect.gen(function* () {
          const ref = yield* Ref.make(false);
          const result = yield* Effect.die('die').tapDefect(() => ref.set(true)).exit;

          assertExitFailure(result, Cause.die('die'));
          assertTrue(yield* ref.get);
        })
      );

      it.effect('leaves failures', () =>
        Effect.gen(function* () {
          const ref = yield* Ref.make(false);
          const result = yield* Effect.fail('fail').tapDefect(() => ref.set(true)).exit;
          deepStrictEqual(result, Exit.fail('fail'));
          assertFalse(yield* ref.get);
        })
      );
    });
  });
});
