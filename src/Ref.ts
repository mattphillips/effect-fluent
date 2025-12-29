import { Ref as _Ref, Effect as _Effect } from 'effect';
import { Class } from 'effect/Effectable';
import { hasProperty } from 'effect/Predicate';
import { Effect } from './Effect.js';
import { Readable, ReadableTypeId } from './Readable.js';

/**
 * @category Symbols
 */
export const RefTypeId: unique symbol = Symbol.for('effect-fluent/Ref') as RefTypeId;

/**
 * @category Symbols
 */
export type RefTypeId = typeof RefTypeId;

export class Ref<A> extends Class<A, never, never> implements Readable<A, never, never> {
  readonly [ReadableTypeId]: ReadableTypeId = ReadableTypeId;
  readonly [RefTypeId]: RefTypeId = RefTypeId;

  static of<A>(ref: _Ref.Ref<A>): Ref<A> {
    return new Ref(ref);
  }

  static make<A>(value: A): Effect<Ref<A>> {
    return Effect.of(_Ref.make(value)).map(Ref.of);
  }

  static unsafeMake<A>(value: A): Ref<A> {
    return Ref.of(_Ref.unsafeMake(value));
  }

  static is(u: unknown): u is Ref<unknown> {
    return hasProperty(u, RefTypeId);
  }

  commit(): _Effect.Effect<A, never, never> {
    return this.get.asEffect;
  }

  private constructor(private readonly ref: _Ref.Ref<A>) {
    super();
  }

  get get(): Effect<A, never, never> {
    return Effect.of(this.ref.get);
  }

  getAndSet(value: A): Effect<A> {
    return Effect.of(_Ref.getAndSet(this.ref, value));
  }

  getAndUpdate(f: (a: A) => A): Effect<A> {
    return Effect.of(_Ref.getAndUpdate(this.ref, f));
  }

  // TODO: add option methods when fluent `Option` is available

  modify(f: (a: A) => readonly [A, A]): Effect<A> {
    return Effect.of(_Ref.modify(this.ref, f));
  }

  set(value: A): Effect<void> {
    return Effect.of(_Ref.set(this.ref, value));
  }

  setAndGet(value: A): Effect<A> {
    return Effect.of(_Ref.setAndGet(this.ref, value));
  }

  update(f: (a: A) => A): Effect<void> {
    return Effect.of(_Ref.update(this.ref, f));
  }

  updateAndGet(f: (a: A) => A): Effect<A> {
    return Effect.of(_Ref.updateAndGet(this.ref, f));
  }
}
