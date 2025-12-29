import { describe, it } from '@effect/vitest';
import { strictEqual } from '@effect/vitest/utils';
import { Effect as _Effect } from 'effect';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  it.effect('succeed lifts a value to an effect', () => {
    return _Effect.gen(function* () {
      const result = yield* Effect.succeed(42).asEffect;
      strictEqual(result, 42);
    });
  });
});
