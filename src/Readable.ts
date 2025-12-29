import { Pipeable } from 'effect';
import { Effect } from './Effect.js';
import { hasProperty } from 'effect/Predicate';

/**
 * @category type ids
 */
export const ReadableTypeId: unique symbol = Symbol.for('effect-fluent/Readable');

/**
 * @category type ids
 */
export type ReadableTypeId = typeof ReadableTypeId;

/**
 * @category models
 */
export interface Readable<A, E = never, R = never> extends Pipeable.Pipeable {
  readonly [ReadableTypeId]: ReadableTypeId;
  readonly get: Effect<A, E, R>;
}

export class Readable<A, E = never, R = never> {
  static is(u: unknown): u is Readable<unknown, unknown, unknown> {
    return hasProperty(u, ReadableTypeId);
  }
}
