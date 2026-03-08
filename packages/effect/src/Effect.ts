import { Effect as _Effect, Cause, Exit, Scheduler, Scope } from 'effect';
import type { Filter } from 'effect/Filter';
import type { LazyArg } from 'effect/Function';
import { hasProperty, isFunction } from 'effect/Predicate';
import type { ExtractTag, Tags } from 'effect/Types';
import { Option } from './Option.js';
import type { Result as FluentResult } from './Result.js';

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

  static fromOption<A>(option: Option<A>): Effect<A, Cause.NoSuchElementError> {
    return new Effect(_Effect.fromOption(option.asOption()));
  }

  static fromResult<A, E>(result: FluentResult<A, E>): Effect<A, E> {
    return new Effect(result.asEffect());
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

  get asSome(): Effect<Option<A>, E, R> {
    return this.map(Option.some);
  }

  flatMap<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2> {
    return new Effect(_Effect.flatMap(this._effect, (a) => f(a).asEffect()));
  }

  static flatten<A, E, R, E2, R2>(self: Effect<Effect<A, E, R>, E2, R2>): Effect<A, E | E2, R | R2> {
    return self.flatMap((inner) => inner);
  }

  andThen<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen<B, E2, R2>(f: Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.andThen(this._effect, (a: A) => {
          return f(a).asEffect();
        })
      );
    }
    return new Effect(_Effect.andThen(this._effect, f.asEffect()));
  }

  tap<B, E2, R2>(f: (a: NoInfer<A>) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap<B, E2, R2>(f: Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.tap(this._effect, (a: NoInfer<A>) => {
          return f(a).asEffect();
        })
      );
    }
    return new Effect(_Effect.tap(this._effect, f.asEffect()));
  }

  tapError<X, E2, R2>(f: (e: E) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapError(this._effect, (e) => f(e).asEffect()));
  }

  tapDefect<B, E2, R2>(f: (defect: unknown) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapDefect(this._effect, (defect) => f(defect).asEffect()));
  }

  tapErrorTag<K extends Tags<E>, A1, E1, R1>(
    k: K,
    f: (e: ExtractTag<E, K>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1> {
    return new Effect(_Effect.tapErrorTag(this._effect, k, (e: any) => f(e).asEffect()));
  }

  tapCause<X, E2, R2>(f: (cause: Cause.Cause<E>) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCause(this._effect, (cause) => f(cause).asEffect()));
  }

  tapCauseIf<B, E2, R2>(
    predicate: (cause: Cause.Cause<E>) => boolean,
    f: (cause: Cause.Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCauseIf(this._effect, predicate, (cause) => f(cause).asEffect()));
  }

  tapCauseFilter<B, E2, R2, EB, X extends Cause.Cause<any>>(
    filter: Filter<Cause.Cause<E>, EB, X>,
    f: (a: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCauseFilter(this._effect, filter, (a, cause) => f(a, cause).asEffect()));
  }

  get flip(): Effect<E, A, R> {
    return new Effect(_Effect.flip(this._effect));
  }

  get exit(): Effect<Exit.Exit<A, E>, never, R> {
    return new Effect(_Effect.exit(this._effect));
  }
}
