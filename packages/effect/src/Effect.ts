import { Array as Arr, Effect as _Effect, Cause, Duration, Exit, Scheduler, Scope } from 'effect';
import type { Filter } from 'effect/Filter';
import { dual, identity, type LazyArg } from 'effect/Function';
import { hasProperty, isFunction, isIterable } from 'effect/Predicate';
import type { Concurrency, ExtractTag, Tags } from 'effect/Types';
import { Option } from './Option.js';
import { Result } from './Result.js';

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

  static fromResult<A, E>(result: Result<A, E>): Effect<A, E> {
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

  static get never(): Effect<never> {
    return new Effect(_Effect.never);
  }

  static get succeedNone(): Effect<Option<never>> {
    return Effect.succeed(Option.none());
  }

  static succeedSome<A>(value: A): Effect<Option<A>> {
    return Effect.succeed(Option.some(value));
  }

  static sleep(duration: Duration.Input): Effect<void> {
    return new Effect(_Effect.sleep(duration));
  }

  static get yieldNow(): Effect<void> {
    return new Effect(_Effect.yieldNow);
  }

  static get interrupt(): Effect<never> {
    return new Effect(_Effect.interrupt);
  }

  static all<
    const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>,
    O extends {
      readonly concurrency?: Concurrency | undefined;
      readonly discard?: boolean | undefined;
      readonly mode?: 'default' | 'result' | undefined;
    }
  >(arg: Arg, options?: O): All.Return<Arg, O> {
    const result = (self: Effect<any, any, any>) => self.result;

    if (isIterable(arg)) {
      return options?.mode === 'result'
        ? (Effect.forEach as any)(arg, result, options)
        : (Effect.forEach as any)(arg, identity, options);
    } else if (options?.discard) {
      return options.mode === 'result'
        ? (Effect.forEach as any)(Object.values(arg), result, options)
        : (Effect.forEach as any)(Object.values(arg), identity, options);
    }

    return Effect.suspend(() => {
      const out: Record<string, unknown> = {};

      return Effect.forEach(
        Object.entries(arg),
        ([key, effect]) => {
          return (options?.mode === 'result' ? result(effect) : effect).map((value) => {
            out[key] = value;
          });
        },
        {
          discard: true,
          concurrency: options?.concurrency
        }
      ).as(out);
    }) as any;
  }

  static forEach: {
    <B, E, R, S extends Iterable<any>, const Discard extends boolean = false>(
      f: (a: Arr.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
      options?:
        | {
            readonly concurrency?: Concurrency | undefined;
            readonly discard?: Discard | undefined;
          }
        | undefined
    ): (self: S) => Effect<Discard extends false ? Arr.ReadonlyArray.With<S, B> : void, E, R>;
    <B, E, R, S extends Iterable<any>, const Discard extends boolean = false>(
      self: S,
      f: (a: Arr.ReadonlyArray.Infer<S>, i: number) => Effect<B, E, R>,
      options?:
        | {
            readonly concurrency?: Concurrency | undefined;
            readonly discard?: Discard | undefined;
          }
        | undefined
    ): Effect<Discard extends false ? Arr.ReadonlyArray.With<S, B> : void, E, R>;
  } = dual(
    (args) => typeof args[1] === 'function',
    <A, B, E, R>(
      iterable: Iterable<A>,
      f: (a: A, index: number) => Effect<B, E, R>,
      options?: {
        readonly concurrency?: Concurrency | undefined;
        readonly discard?: boolean | undefined;
      }
    ): Effect<any, E, R> => {
      return new Effect(_Effect.forEach(iterable, (a, i) => f(a, i).asEffect(), options));
    }
  );

  static partition<A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: { readonly concurrency?: Concurrency }
  ): Effect<[excluded: Array<E>, satisfying: Array<B>], never, R> {
    return new Effect(_Effect.partition(elements, (a, i) => f(a, i).asEffect(), options));
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

  get result(): Effect<Result<A, E>, never, R> {
    return new Effect(_Effect.result(this._effect)).map(Result.of);
  }

  get option(): Effect<Option<A>, never, R> {
    return new Effect(_Effect.option(this._effect)).map(Option.of);
  }

  with<B, E2, R2>(f: (effect: _Effect.Effect<A, E, R>) => _Effect.Effect<B, E2, R2>): Effect<B, E2, R2> {
    return new Effect(f(this._effect));
  }
}

export type EffectAny = Effect<any, any, any>;

export namespace All {
  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import { Data, Effect } from "effect"
   *
   * class OopsError extends Data.TaggedError("OopsError")<{}> {}
   *
   * // EffectAny represents an Effect with any type parameters
   * const effects: Array<Effect.All.EffectAny> = [
   *   Effect.succeed(42),
   *   Effect.succeed("hello"),
   *   Effect.fail(new OopsError())
   * ]
   * ```
   */
  export type EffectAny = Effect<any, any, any>;

  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import type { Effect } from "effect"
   *
   * // ReturnIterable computes the return type for Effect.all with iterables
   * type EffectArray = Array<Effect.Effect<number, string, never>>
   * type Result = Effect.All.ReturnIterable<EffectArray, false>
   * // Result: Effect<Array<number>, string, never>
   * ```
   */
  export type ReturnIterable<T extends Iterable<EffectAny>, Discard extends boolean, Mode extends boolean = false> = [
    T
  ] extends [Iterable<Effect<infer A, infer E, infer R>>]
    ? Effect<
        Discard extends true ? void : Array<Mode extends true ? Result<A, E> : A>,
        Mode extends true ? never : E,
        R
      >
    : never;

  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import type { Effect } from "effect"
   *
   * // ReturnTuple computes the return type for Effect.all with tuples
   * type EffectTuple = [
   *   Effect.Effect<string, Error, never>,
   *   Effect.Effect<number, Error, never>
   * ]
   * type Result = Effect.All.ReturnTuple<EffectTuple, false>
   * // Result: Effect<[string, number], Error, never>
   * ```
   */
  export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean, Mode extends boolean = false> =
    Effect<
      Discard extends true
        ? void
        : T[number] extends never
          ? []
          : {
              -readonly [K in keyof T]: T[K] extends Effect<infer _A, infer _E, infer _R>
                ? Mode extends true
                  ? Result<_A, _E>
                  : _A
                : never;
            },
      Mode extends true
        ? never
        : T[number] extends never
          ? never
          : T[number] extends Effect<infer _A, infer _E, infer _R>
            ? _E
            : never,
      T[number] extends never ? never : T[number] extends Effect<infer _A, infer _E, infer _R> ? _R : never
    > extends infer X
      ? X
      : never;

  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import type { Effect } from "effect"
   *
   * // ReturnObject computes the return type for Effect.all with objects
   * type EffectRecord = {
   *   a: Effect.Effect<string, Error, never>
   *   b: Effect.Effect<number, Error, never>
   * }
   * type Result = Effect.All.ReturnObject<EffectRecord, false>
   * // Result: Effect<{ a: string, b: number }, Error, never>
   * ```
   */
  export type ReturnObject<T, Discard extends boolean, Mode extends boolean = false> = [T] extends [
    Record<string, EffectAny>
  ]
    ? Effect<
        Discard extends true
          ? void
          : {
              -readonly [K in keyof T]: [T[K]] extends [Effect<infer _A, infer _E, infer _R>]
                ? Mode extends true
                  ? Result<_A, _E>
                  : _A
                : never;
            },
        Mode extends true
          ? never
          : keyof T extends never
            ? never
            : T[keyof T] extends Effect<infer _A, infer _E, infer _R>
              ? _E
              : never,
        keyof T extends never ? never : T[keyof T] extends Effect<infer _A, infer _E, infer _R> ? _R : never
      >
    : never;

  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import type { Effect } from "effect"
   *
   * // IsDiscard checks if options have discard flag set to true
   * type DiscardOptions = { discard: true }
   * type NoDiscardOptions = { discard: false }
   * type WithDiscard = Effect.All.IsDiscard<DiscardOptions> // true
   * type WithoutDiscard = Effect.All.IsDiscard<NoDiscardOptions> // false
   * ```
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true;

  /**
   * @since 4.0.0
   * @category Models
   */
  export type IsResult<A> = [Extract<A, { readonly mode: 'result' }>] extends [never] ? false : true;

  /**
   * @since 2.0.0
   * @category Models
   * @example
   * ```ts
   * import type { Effect } from "effect"
   *
   * // Return determines the result type based on input and options
   * type EffectArray = Array<Effect.Effect<number, string, never>>
   * type Options = { discard: false }
   * type Result = Effect.All.Return<EffectArray, Options>
   * // Result: Effect<Array<number>, string, never>
   * ```
   */
  export type Return<
    Arg extends Iterable<EffectAny> | Record<string, EffectAny>,
    O extends {
      readonly concurrency?: Concurrency | undefined;
      readonly discard?: boolean | undefined;
      readonly mode?: 'default' | 'result' | undefined;
    }
  > = [Arg] extends [ReadonlyArray<EffectAny>]
    ? ReturnTuple<Arg, IsDiscard<O>, IsResult<O>>
    : [Arg] extends [Iterable<EffectAny>]
      ? ReturnIterable<Arg, IsDiscard<O>, IsResult<O>>
      : [Arg] extends [Record<string, EffectAny>]
        ? ReturnObject<Arg, IsDiscard<O>, IsResult<O>>
        : never;
}
