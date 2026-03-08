import { describe, it } from '@effect-fluent/vitest';
import { assertFailure, assertSuccess } from '@effect-fluent/vitest/utils';
import { Result as _Result } from 'effect';
import { Result } from 'effect-fluent/Result';

describe('Result Interop', () => {
  it('wrap lifts a native result to a fluent result', () => {
    assertSuccess(Result.wrap(_Result.succeed(42)), 42);
  });

  describe('with', () => {
    it('applies a single native operator', () => {
      const result = Result.succeed(42).with(_Result.map((n) => n * 2));
      assertSuccess(result, 84);
    });

    it('chains native operators via pipe', () => {
      const result = Result.succeed(42).with((r) =>
        r.pipe(
          _Result.map((n) => n * 2),
          _Result.map((n) => `value: ${n}`)
        )
      );
      assertSuccess(result, 'value: 84');
    });

    it('returns fluent Option with chainable methods', () => {
      const result = Result.succeed(42)
        .with(_Result.map((n) => n * 2))
        .map((n) => n + 1);
      assertSuccess(result, 85);
    });

    it('returns native result and skips fluent methods', () => {
      const result = Result.succeed(42)
        .with(_Result.flatMap((n) => _Result.fail(n * 2)))
        .map((n) => n + 1);
      assertFailure(result, 84);
    });
  });
});
