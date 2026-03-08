import { describe, it } from '@effect-fluent/vitest';
import { strictEqual } from '@effect-fluent/vitest/utils';
import { Effect as _Effect, Fiber } from 'effect';
import { TestClock } from 'effect/testing';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  describe('with', () => {
    it.effect('applies a single native operator', () =>
      Effect.gen(function* () {
        const result = yield* Effect.succeed(42).with(_Effect.map((n) => n * 2));
        strictEqual(result, 84);
      })
    );

    it.effect('chains native operators via pipe', () =>
      Effect.gen(function* () {
        const result = yield* Effect.succeed(42).with((e) =>
          e.pipe(_Effect.map((n) => n * 2), _Effect.map((n) => `value: ${n}`))
        );
        strictEqual(result, 'value: 84');
      })
    );

    it.effect('returns fluent Effect with chainable methods', () =>
      Effect.gen(function* () {
        const result = yield* Effect.succeed(42)
          .with(_Effect.map((n) => n * 2))
          .map((n) => n + 1);
        strictEqual(result, 85);
      })
    );

    it.effect('interop with forkChild and TestClock', () =>
      Effect.gen(function* () {
        const fiber = yield* Effect.succeed(1).with((e) =>
          e.pipe(_Effect.delay(50), _Effect.forkChild)
        );
        yield* TestClock.adjust(50);
        const result = yield* Fiber.join(fiber);
        strictEqual(result, 1);
      })
    );
  });
});
