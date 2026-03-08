import { Effect as _Effect, Cause, Exit, Option, Scheduler, Scope } from 'effect';
import type { LazyArg } from 'effect/Function';
import { hasProperty } from 'effect/Predicate';

export const EffectTypeId: unique symbol = Symbol.for('~effect-fluent/Effect') as EffectTypeId;
export type EffectTypeId = typeof EffectTypeId;

export class Effect<A, E = never, R = never> implements _Effect.Yieldable<Effect<A, E, R>, A, E, R> {
  readonly [EffectTypeId]: EffectTypeId = EffectTypeId;

  static is(u: unknown): u is Effect<unknown, unknown, unknown> {
    return hasProperty(u, EffectTypeId);
  }

  static of<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  static sync<A>(thunk: LazyArg<A>): Effect<A> {
    return new Effect(_Effect.sync(thunk));
  }

  static suspend<A, E, R>(thunk: LazyArg<Effect<A, E, R>>): Effect<A, E, R> {
    return new Effect(_Effect.suspend(() => thunk().asEffect()));
  }

  static fail<E>(error: E): Effect<never, E> {
    return new Effect(_Effect.fail(error));
  }

  static failSync<E>(evaluate: LazyArg<E>): Effect<never, E> {
    return new Effect(_Effect.failSync(evaluate));
  }

  static failCause<E>(cause: Cause.Cause<E>): Effect<never, E> {
    return new Effect(_Effect.failCause(cause));
  }

  static failCauseSync<E>(evaluate: LazyArg<Cause.Cause<E>>): Effect<never, E> {
    return new Effect(_Effect.failCauseSync(evaluate));
  }

  static die(defect: unknown): Effect<never> {
    return new Effect(_Effect.die(defect));
  }

  static void(): Effect<void> {
    return new Effect(_Effect.void);
  }

  static try<A, E>(options: { try: LazyArg<A>; catch: (error: unknown) => E }): Effect<A, E> {
    return new Effect(_Effect.try(options));
  }

  static promise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A> {
    return new Effect(_Effect.promise(evaluate));
  }

  static tryPromise<A, E = Cause.UnknownError>(
    options:
      | { readonly try: (signal: AbortSignal) => PromiseLike<A>; readonly catch: (error: unknown) => E }
      | ((signal: AbortSignal) => PromiseLike<A>)
  ): Effect<A, E> {
    return new Effect(_Effect.tryPromise(options));
  }

  static callback<A, E = never, R = never>(
    register: (
      this: Scheduler.Scheduler,
      resume: (effect: Effect<A, E, R>) => void,
      signal: AbortSignal
    ) => void | Effect<void, never, R>
  ): Effect<A, E, R> {
    return new Effect(
      _Effect.callback(function (this: Scheduler.Scheduler, resume, signal) {
        const result = register.call(this, (effect) => resume(effect.asEffect()), signal);
        if (result !== undefined) {
          return result.asEffect();
        }
      })
    );
  }

  static gen<Eff extends _Effect.Yieldable<any, any, any, any>, AEff>(
    f: () => Generator<Eff, AEff, never>
  ): Effect<
    AEff,
    [Eff] extends [never]
      ? never
      : [Eff] extends [_Effect.Yieldable<infer _Self, infer _A, infer E, infer _R>]
        ? E
        : never,
    [Eff] extends [never]
      ? never
      : [Eff] extends [_Effect.Yieldable<infer _Self, infer _A, infer _E, infer R>]
        ? R
        : never
  >;
  static gen<Self, Eff extends _Effect.Yieldable<any, any, any, any>, AEff>(
    self: Self,
    f: (this: Self) => Generator<Eff, AEff, never>
  ): Effect<
    AEff,
    [Eff] extends [never]
      ? never
      : [Eff] extends [_Effect.Yieldable<infer _Self, infer _A, infer E, infer _R>]
        ? E
        : never,
    [Eff] extends [never]
      ? never
      : [Eff] extends [_Effect.Yieldable<infer _Self, infer _A, infer _E, infer R>]
        ? R
        : never
  >;
  static gen(...args: [any] | [any, any]) {
    const [f, self] = args.length === 1 ? [args[0], undefined] : [args[1], args[0]];
    // Convert the generator to work with Effects
    return new Effect(
      // Reminder a lot of this logic is the same in Option.ts
      _Effect.gen(function* () {
        const generator = self !== undefined ? f.call(self) : f();
        let result = generator.next();

        while (!result.done) {
          const yieldable = result.value;
          // Convert Yieldable to Effect using asEffect()
          const effect = yieldable.asEffect();
          const nextValue = yield* effect;
          result = generator.next(nextValue);
        }

        return result.value;
      })
    );
  }

  static scoped<A, E, R>(self: Effect<A, E, R>): Effect<A, E, Exclude<R, Scope.Scope>> {
    return new Effect(_Effect.scoped(self.asEffect()));
  }

  private readonly _effect: _Effect.Effect<A, E, R>;

  private constructor(effect: _Effect.Effect<A, E, R>) {
    this._effect = effect;
  }

  asEffect(): _Effect.Effect<A, E, R> {
    return this._effect;
  }

  [Symbol.iterator](): _Effect.EffectIterator<Effect<A, E, R>> {
    return this._effect[Symbol.iterator]() as any;
  }

  map<B>(f: (a: A) => B): Effect<B, E, R> {
    return new Effect(_Effect.map(this._effect, f));
  }

  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Effect<A2, E2, R> {
    return new Effect(_Effect.mapBoth(this._effect, options));
  }

  as<B>(value: B): Effect<B, E, R> {
    return new Effect(_Effect.as(this._effect, value));
  }

  get asVoid(): Effect<void, E, R> {
    return new Effect(_Effect.asVoid(this._effect));
  }

  get asSome(): Effect<Option.Option<A>, E, R> {
    return new Effect(_Effect.asSome(this._effect));
  }

  flatMap<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2> {
    return new Effect(_Effect.flatMap(this._effect, (a) => f(a).asEffect()));
  }

  get flip(): Effect<E, A, R> {
    return new Effect(_Effect.flip(this._effect));
  }

  get exit(): Effect<Exit.Exit<A, E>, never, R> {
    return new Effect(_Effect.exit(this._effect));
  }
}
