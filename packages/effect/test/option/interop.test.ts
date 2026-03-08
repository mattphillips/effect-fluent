import { describe, it } from '@effect-fluent/vitest';
import { assertNone, assertSome } from '@effect-fluent/vitest/utils';
import { Option as _Option } from 'effect';
import { Option } from '../../src/Option.js';

describe('Option Interop', () => {
  it('wrap lifts a native option to a fluent option', () => {
    assertSome(Option.wrap(_Option.some(42)), 42);
  });

  describe('with', () => {
    it('applies a single native operator', () => {
      const result = Option.some(42).with(_Option.map((n) => n * 2));
      assertSome(result, 84);
    });

    it('chains native operators via pipe', () => {
      const result = Option.some(42).with((o) =>
        o.pipe(
          _Option.map((n) => n * 2),
          _Option.map((n) => `value: ${n}`)
        )
      );
      assertSome(result, 'value: 84');
    });

    it('returns fluent Option with chainable methods', () => {
      const result = Option.some(42)
        .with(_Option.map((n) => n * 2))
        .map((n) => n + 1);
      assertSome(result, 85);
    });

    it('returns native option and skips fluent methods', () => {
      const result = Option.some(42)
        .with(_Option.flatMap(() => _Option.none()))
        .map((n) => n + 1);
      assertNone(result);
    });
  });
});
