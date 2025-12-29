import { Effect as _Effect } from 'effect';

export class Effect<A, E = never, R = never> {
  static of<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  private constructor(private readonly effect: _Effect.Effect<A, E, R>) {}

  get asEffect(): _Effect.Effect<A, E, R> {
    return this.effect;
  }
}
