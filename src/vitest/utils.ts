import { Option } from '../Option.js';
import { deepStrictEqual } from '@effect/vitest/utils';

export * from '@effect/vitest/utils';

// ----------------------------
// Option
// ----------------------------

/**
 * Asserts that `option` is `None`.
 *
 */
export function assertNone<A>(option: Option<A>, ..._: Array<never>): asserts option is Option.None<never> {
  deepStrictEqual(option, Option.none());
}

/**
 * Asserts that `option` is `Some`.
 *
 */
export function assertSome<A>(option: Option<A>, expected: A, ..._: Array<never>): asserts option is Option.Some<A> {
  deepStrictEqual(option, Option.some(expected));
}
