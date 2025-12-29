import { Effect as _Effect } from 'effect';
import { Effect } from '../../src/Effect.js';
import { describe, it } from '../../src/vitest/index.js';
import { assertTrue, assertFalse } from '../../src/vitest/utils.js';

describe('Effect', () => {
  describe('guards', () => {
    describe('is', () => {
      it('should return true for Effect instances', () => {
        const success = Effect.succeed(42).map((x) => x * 2);
        const failure = Effect.fail(42);
        const die = Effect.die(new Error('Failed'));

        assertTrue(Effect.is(success));
        assertTrue(Effect.is(failure));
        assertTrue(Effect.is(die));
      });

      it('should return false for non-Effect instances', () => {
        const nonEffect = 42;
        const effectPrimitive = _Effect.succeed(42);

        assertFalse(Effect.is(nonEffect));
        assertFalse(Effect.is(effectPrimitive));
      });
    });
  });
});
