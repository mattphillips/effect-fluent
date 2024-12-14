import { Effect as _Effect, type Cause, type FiberId } from 'effect';
import type { LazyArg } from 'effect/Function';

export class Effect<A, E = never, R = never> {
  static of<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  static fail<E>(error: E): Effect<never, E> {
    return new Effect(_Effect.fail(error));
  }

  static die<A, E, R>(error: unknown): Effect<A, E, R> {
    return new Effect(_Effect.die(error));
  }

  static sync<A>(thunk: LazyArg<A>): Effect<A> {
    return new Effect(_Effect.sync(thunk));
  }

  static suspend<A, E, R>(action: LazyArg<_Effect.Effect<A, E, R>>): Effect<A, E, R> {
    return new Effect(_Effect.suspend(action));
  }

  static async<A, E = never, R = never>(
    resume: (callback: (_: Effect<A, E, R>) => void, signal: AbortSignal) => void | Effect<void, never, R>,
    blockingOn?: FiberId.FiberId
  ): Effect<A, E, R> {
    return new Effect(
      _Effect.async<A, E, R>((callback) => {
        // TODO: the abort signal is wrong
        const res = resume((io) => callback(io.value), new AbortSignal());

        if (res instanceof Effect) {
          return res.value;
        }

        return res;
      }, blockingOn)
    );
  }

  static promise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A> {
    return new Effect(_Effect.promise(evaluate));
  }

  static tryPromise<A, E>(options: {
    readonly try: (signal: AbortSignal) => PromiseLike<A>;
    readonly catch: (error: unknown) => E;
  }): Effect<A, E>;
  static tryPromise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A, Cause.UnknownException>;
  static tryPromise<A, E>(
    arg:
      | ((signal: AbortSignal) => PromiseLike<A>)
      | {
          readonly try: (signal: AbortSignal) => PromiseLike<A>;
          readonly catch: (error: unknown) => E;
        }
  ): Effect<A, E | Cause.UnknownException> {
    // TODO: fix as any
    return new Effect(_Effect.tryPromise(arg as any));
  }

  constructor(public readonly value: _Effect.Effect<A, E, R>) {}

  map<B>(f: (a: A) => B): Effect<B, E, R> {
    return new Effect(_Effect.map(this.value, f));
  }

  flatMap<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2> {
    return new Effect(_Effect.flatMap(this.value, (a) => f(a).value));
  }

  with<A1, E1, R1>(f: (effect: _Effect.Effect<A, E, R>) => _Effect.Effect<A1, E1, R1>): Effect<A1, E1, R1> {
    return new Effect(f(this.value));
  }
}
