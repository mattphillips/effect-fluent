import { Array as Arr, Effect as _Effect, Cause, Duration, Exit, Scheduler, Scope } from 'effect';
import type { Filter } from 'effect/Filter';
import { dual, identity, type LazyArg } from 'effect/Function';
import { NodeInspectSymbol } from 'effect/Inspectable';
import { Class as PipeableClass } from 'effect/Pipeable';
import { hasProperty, isFunction, isIterable } from 'effect/Predicate';
import type { Concurrency, ExtractTag, Tags } from 'effect/Types';
import { Option } from './Option.js';
import { Result } from './Result.js';

/**
 * Unique identifier used to brand fluent `Effect` instances.
 */
export const EffectTypeId: unique symbol = Symbol.for('~effect-fluent/Effect') as EffectTypeId;
/**
 * The type of {@link EffectTypeId}.
 */
export type EffectTypeId = typeof EffectTypeId;

/**
 * A fluent, class-based wrapper around Effect's `Effect` data type.
 *
 * An `Effect<A, E, R>` is an immutable, lazy description of a workflow that may
 * succeed with a value of type `A`, fail with an error of type `E`, and require
 * services of type `R`. Combinators are exposed as chainable methods and
 * getters instead of standalone functions.
 *
 * Fluent Effects implement the core `Effect` interface, so they can be yielded
 * with `yield*` inside both core and fluent `Effect.gen`, and passed to any API
 * that expects a core Effect. Use {@link Effect.wrap | wrap} to lift a core
 * Effect into the fluent class, the {@link Effect.effect | effect} getter to
 * unwrap it, and {@link Effect.with | with} to apply a core transformation
 * while staying fluent.
 *
 * @example
 * ```ts
 * import { Effect } from "effect-fluent"
 *
 * const program = Effect.succeed(1)
 *   .map((n) => n + 1)
 *   .flatMap((n) => Effect.succeed(n * 10))
 *   .tap((n) => Effect.sync(() => console.log(n))) // logs 20
 *
 * const doubled = Effect.gen(function* () {
 *   const n = yield* program
 *   return n * 2 // 40
 * })
 * ```
 */
export class Effect<A, E = never, R = never> extends PipeableClass implements _Effect.Effect<A, E, R> {
  /**
   * Brand identifying fluent `Effect` instances; used by {@link Effect.is | is}.
   */
  readonly [EffectTypeId]: EffectTypeId = EffectTypeId;

  // Brand for compatibility with `_Effect.Effect<A, E, R>` so fluent values are
  // assignable wherever core effects are expected (notably `yield*` inside
  // `_Effect.gen`). The actual fiber-level evaluation always happens on the
  // inner `_effect` via `[Symbol.iterator]()` delegation below.
  get [_Effect.TypeId](): _Effect.Variance<A, E, R> {
    return (this._effect as any)[_Effect.TypeId];
  }

  /**
   * Type guard that checks whether a value is a fluent `Effect`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * console.log(Effect.is(Effect.succeed(1))) // true
   * console.log(Effect.is({ value: 1 })) // false
   * ```
   */
  static is(u: unknown): u is Effect<unknown, unknown, unknown> {
    return hasProperty(u, EffectTypeId);
  }

  /**
   * Wraps a core `Effect` in the fluent class, enabling method chaining.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.wrap(CoreEffect.succeed(1)).map((n) => n + 1)
   * // yields 2
   * ```
   */
  static wrap<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  /**
   * Creates an `Effect` that always succeeds with the given value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(42).map((n) => n + 1)
   * // yields 43
   * ```
   */
  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  /**
   * Creates an `Effect` from a synchronous side-effectful computation. The
   * thunk is evaluated lazily each time the effect runs and must not throw — a
   * thrown value becomes a defect. Use {@link Effect.try | try} when throwing
   * is expected.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const log = (message: string) => Effect.sync(() => console.log(message))
   *
   * const program = log("Hello, World!") // Effect<void>
   * ```
   */
  static sync<A>(thunk: LazyArg<A>): Effect<A> {
    return new Effect(_Effect.sync(thunk));
  }

  /**
   * Creates an `Effect` lazily, delaying construction until it is run. Useful
   * for recursive definitions, deferring expensive construction, and unifying
   * branches that build different effects.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const countdown = (n: number): Effect<number> =>
   *   n <= 0 ? Effect.succeed(0) : Effect.suspend(() => countdown(n - 1)).map((sum) => sum + n)
   *
   * const program = countdown(3) // yields 6
   * ```
   */
  static suspend<A, E, R>(thunk: LazyArg<Effect<A, E, R>>): Effect<A, E, R> {
    return new Effect(_Effect.suspend(() => thunk().effect));
  }

  /**
   * Creates an `Effect` that fails with the given recoverable error. The error
   * propagates through the error channel until it is handled.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const validate = (age: number) =>
   *   age >= 18 ? Effect.succeed(age) : Effect.fail(new Error("Too young"))
   *
   * // validate(17) fails with Error("Too young")
   * ```
   */
  static fail<E>(error: E): Effect<never, E> {
    return new Effect(_Effect.fail(error));
  }

  /**
   * Creates an `Effect` that fails with a lazily evaluated error. The
   * error-producing function is evaluated each time the effect runs.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.failSync(() => new Error(`Failed at ${Date.now()}`))
   * ```
   */
  static failSync<E>(evaluate: LazyArg<E>): Effect<never, E> {
    return new Effect(_Effect.failSync(evaluate));
  }

  /**
   * Creates an `Effect` that fails with the given `Cause`, preserving defects,
   * interruptions, and combined failures.
   *
   * @example
   * ```ts
   * import { Cause } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.failCause(Cause.fail("Something went wrong"))
   * ```
   */
  static failCause<E>(cause: Cause.Cause<E>): Effect<never, E> {
    return new Effect(_Effect.failCause(cause));
  }

  /**
   * Creates an `Effect` that fails with a lazily computed `Cause`. The
   * cause-producing function is evaluated each time the effect runs.
   *
   * @example
   * ```ts
   * import { Cause } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.failCauseSync(() => Cause.die(new Error("Boom")))
   * ```
   */
  static failCauseSync<E>(evaluate: LazyArg<Cause.Cause<E>>): Effect<never, E> {
    return new Effect(_Effect.failCauseSync(evaluate));
  }

  /**
   * Creates an `Effect` that dies with the given defect — a critical,
   * unexpected error that is not represented in the error channel and
   * terminates the fiber.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0 ? Effect.die(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
   *
   * // divide(1, 0) terminates with a defect
   * ```
   */
  static die(defect: unknown): Effect<never> {
    return new Effect(_Effect.die(defect));
  }

  /**
   * Creates an `Effect` that succeeds with `void`. Useful as a no-op or as a
   * neutral completion value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.void() // Effect<void>
   * ```
   */
  static void(): Effect<void> {
    return new Effect(_Effect.void);
  }

  /**
   * Creates an `Effect` from a synchronous computation that may throw. A thrown
   * value is passed to `catch` and surfaces as a typed failure.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const parse = (json: string) =>
   *   Effect.try({
   *     try: () => JSON.parse(json),
   *     catch: (error) => new Error(`Failed to parse JSON: ${error}`)
   *   })
   * ```
   */
  static try<A, E>(options: { try: LazyArg<A>; catch: (error: unknown) => E }): Effect<A, E> {
    return new Effect(_Effect.try(options));
  }

  /**
   * Creates an `Effect` from an asynchronous computation that is guaranteed to
   * succeed. A rejected promise becomes a defect — use
   * {@link Effect.tryPromise | tryPromise} when rejection is expected. The
   * provided `AbortSignal` is aborted if the effect is interrupted.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const delay = (ms: number) =>
   *   Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
   * ```
   */
  static promise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A> {
    return new Effect(_Effect.promise(evaluate));
  }

  /**
   * Creates an `Effect` from an asynchronous computation that may throw or
   * reject. Pass `{ try, catch }` to map failures to a typed error, or pass the
   * thunk directly to map them to `UnknownError`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const fetchTodo = (id: number) =>
   *   Effect.tryPromise({
   *     try: (signal) => fetch(`/todos/${id}`, { signal }),
   *     catch: (error) => new Error(`Request failed: ${error}`)
   *   })
   * ```
   */
  static tryPromise<A, E = Cause.UnknownError>(
    options:
      | { readonly try: (signal: AbortSignal) => PromiseLike<A>; readonly catch: (error: unknown) => E }
      | ((signal: AbortSignal) => PromiseLike<A>)
  ): Effect<A, E> {
    return new Effect(_Effect.tryPromise(options));
  }

  /**
   * Creates an `Effect` from a callback-based asynchronous API. Call `resume`
   * at most once with the effect that completes the fiber; optionally return a
   * cleanup effect to run on interruption.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const delay = (ms: number) =>
   *   Effect.callback<void>((resume) => {
   *     const timer = setTimeout(() => resume(Effect.void()), ms)
   *     return Effect.sync(() => clearTimeout(timer))
   *   })
   * ```
   */
  static callback<A, E = never, R = never>(
    register: (
      this: Scheduler.Scheduler,
      resume: (effect: Effect<A, E, R>) => void,
      signal: AbortSignal
    ) => void | Effect<void, never, R>
  ): Effect<A, E, R> {
    return new Effect(
      _Effect.callback(function (this: Scheduler.Scheduler, resume, signal) {
        const result = register.call(this, (effect) => resume(effect.effect), signal);
        if (result !== undefined) {
          return result.effect;
        }
      })
    );
  }

  /**
   * Converts a fluent `Option` into an `Effect`. A `Some` becomes a success
   * with the contained value and a `None` becomes a failure with
   * `NoSuchElementError`.
   *
   * @example
   * ```ts
   * import { Effect, Option } from "effect-fluent"
   *
   * const found = Effect.fromOption(Option.some(1)) // succeeds with 1
   * const missing = Effect.fromOption(Option.none()) // fails with NoSuchElementError
   * ```
   */
  static fromOption<A>(option: Option<A>): Effect<A, Cause.NoSuchElementError> {
    return new Effect(_Effect.fromOption(option.option));
  }

  /**
   * Converts a fluent `Result` into an `Effect`. A `Success` becomes a success
   * and a `Failure` becomes a typed failure.
   *
   * @example
   * ```ts
   * import { Effect, Result } from "effect-fluent"
   *
   * const ok = Effect.fromResult(Result.succeed(1)) // succeeds with 1
   * const bad = Effect.fromResult(Result.fail("Boom")) // fails with "Boom"
   * ```
   */
  static fromResult<A, E>(result: Result<A, E>): Effect<A, E> {
    return new Effect(_Effect.fromResult(result.result));
  }

  /**
   * Writes effectful code with generator functions, so workflows read like
   * synchronous code while errors and requirements stay in the Effect type.
   * Both fluent and core Effects can be yielded with `yield*`; lift an `Option`
   * or `Result` explicitly via {@link Effect.fromOption | fromOption} /
   * {@link Effect.fromResult | fromResult}.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const a = yield* Effect.succeed(10)
   *   const b = yield* Effect.succeed(2)
   *   return a / b
   * }) // yields 5
   * ```
   */
  static gen<Eff extends Gen.Yieldable<any, any, any>, AEff>(
    f: () => Generator<Eff, AEff, never>
  ): Effect<AEff, Gen.YieldError<Eff>, Gen.YieldServices<Eff>>;
  static gen<Self, Eff extends Gen.Yieldable<any, any, any>, AEff>(
    self: Self,
    f: (this: Self) => Generator<Eff, AEff, never>
  ): Effect<AEff, Gen.YieldError<Eff>, Gen.YieldServices<Eff>>;
  static gen(...args: [any] | [any, any]) {
    const [f, self] = args.length === 1 ? [args[0], undefined] : [args[1], args[0]];
    return new Effect(
      _Effect.gen(function* () {
        const generator = self !== undefined ? f.call(self) : f();
        let result = generator.next();
        while (!result.done) {
          const nextValue = yield* result.value;
          result = generator.next(nextValue);
        }
        return result.value;
      })
    );
  }

  /**
   * Runs an effect with a scope that closes when the effect completes, running
   * finalizers for resources acquired within it on success, failure, or
   * interruption.
   *
   * @example
   * ```ts
   * import type { Scope } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * declare const workflow: Effect<string, never, Scope.Scope>
   *
   * const program = Effect.scoped(workflow) // Effect<string>
   * ```
   */
  static scoped<A, E, R>(self: Effect<A, E, R>): Effect<A, E, Exclude<R, Scope.Scope>> {
    return new Effect(_Effect.scoped(self.effect));
  }

  /**
   * An `Effect` that never produces a value and never terminates on its own —
   * only interruption can end it.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.never // Effect<never> — suspends forever
   * ```
   */
  static get never(): Effect<never> {
    return new Effect(_Effect.never);
  }

  /**
   * An `Effect` that succeeds with `Option.none()`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeedNone // yields Option.none()
   * ```
   */
  static get succeedNone(): Effect<Option<never>> {
    return Effect.succeed(Option.none());
  }

  /**
   * Creates an `Effect` that succeeds with the value wrapped in `Option.some`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeedSome(42) // yields Option.some(42)
   * ```
   */
  static succeedSome<A>(value: A): Effect<Option<A>> {
    return Effect.succeed(Option.some(value));
  }

  /**
   * Creates an `Effect` that suspends the current fiber for the given duration
   * without blocking the JavaScript thread.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.sleep(1000).andThen(Effect.succeed("done"))
   * // yields "done" after one second
   * ```
   */
  static sleep(duration: Duration.Input): Effect<void> {
    return new Effect(_Effect.sleep(duration));
  }

  /**
   * An `Effect` that yields control back to the runtime, allowing other fibers
   * to execute before continuing.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.yieldNow.andThen(Effect.succeed("resumed"))
   * ```
   */
  static get yieldNow(): Effect<void> {
    return new Effect(_Effect.yieldNow);
  }

  /**
   * An `Effect` that interrupts the current fiber immediately.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   yield* Effect.succeed("before")
   *   yield* Effect.interrupt
   *   // unreachable
   * })
   * ```
   */
  static get interrupt(): Effect<never> {
    return new Effect(_Effect.interrupt);
  }

  /**
   * Combines multiple effects into one. Accepts a tuple, iterable, or struct of
   * effects and collects their results in the same shape. Options control
   * `concurrency`, discarding results (`discard`), and collecting failures as
   * `Result`s instead of short-circuiting (`mode: "result"`).
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const tuple = Effect.all([Effect.succeed(42), Effect.succeed("hello")])
   * // yields [42, "hello"]
   *
   * const struct = Effect.all({ a: Effect.succeed(1), b: Effect.succeed(2) })
   * // yields { a: 1, b: 2 }
   * ```
   *
   * @see {@link Effect.forEach | forEach} for iterating over elements with an effectful function.
   */
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

  /**
   * Runs an effectful function for each element of an iterable, collecting the
   * results in order. Iteration short-circuits on the first failure. Use
   * `concurrency` to run elements in parallel and `discard: true` to ignore
   * results.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.forEach([1, 2, 3], (n) => Effect.succeed(n * 2))
   * // yields [2, 4, 6]
   * ```
   *
   * @see {@link Effect.all | all} for combining multiple effects into one.
   */
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
      return new Effect(_Effect.forEach(iterable, (a, i) => f(a, i).effect, options));
    }
  );

  /**
   * Runs an effectful function for each element and separates failures from
   * successes. The returned tuple is `[excluded, satisfying]` — the effect
   * never fails, since every element is always evaluated.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.partition([0, 1, 2, 3], (n) =>
   *   n % 2 === 0 ? Effect.fail(`${n} is even`) : Effect.succeed(n)
   * )
   * // yields [["0 is even", "2 is even"], [1, 3]]
   * ```
   */
  static partition<A, B, E, R>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<B, E, R>,
    options?: { readonly concurrency?: Concurrency }
  ): Effect<[excluded: Array<E>, satisfying: Array<B>], never, R> {
    return new Effect(_Effect.partition(elements, (a, i) => f(a, i).effect, options));
  }

  private readonly _effect: _Effect.Effect<A, E, R>;

  private constructor(effect: _Effect.Effect<A, E, R>) {
    super();
    this._effect = effect;
  }

  /**
   * The underlying core `Effect`. Use this to hand a fluent Effect to APIs
   * that operate on core effects.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1).map((n) => n + 1)
   *
   * console.log(CoreEffect.runSync(program.effect)) // 2
   * ```
   */
  get effect(): _Effect.Effect<A, E, R> {
    return this._effect;
  }

  /**
   * Makes fluent Effects directly yieldable with `yield*` inside both core and
   * fluent `Effect.gen` generators.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const n = yield* Effect.succeed(1) // fluent Effect yielded directly
   *   return n + 1
   * })
   * ```
   */
  [Symbol.iterator](): _Effect.EffectIterator<Effect<A, E, R>> {
    return this._effect[Symbol.iterator]() as any;
  }

  /**
   * Returns a plain-object representation of this Effect for serialization and
   * debugging output.
   */
  toJSON(): unknown {
    return { _id: 'effect-fluent/Effect', effect: (this._effect as any).toJSON?.() };
  }

  /**
   * Customizes Node.js `util.inspect` output for this Effect.
   */
  [NodeInspectSymbol](): unknown {
    return this.toJSON();
  }

  /**
   * Transforms the success value with a pure function, returning a new `Effect`
   * with the transformed value.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(2).map((n) => n * 10)
   * // yields 20
   * ```
   */
  map<B>(f: (a: A) => B): Effect<B, E, R> {
    return new Effect(_Effect.map(this._effect, f));
  }

  /**
   * Transforms both channels at once: `onFailure` maps the error and
   * `onSuccess` maps the success value, without changing whether the effect
   * succeeds or fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * declare const parse: Effect<number, string>
   *
   * const program = parse.mapBoth({
   *   onFailure: (message) => new Error(message),
   *   onSuccess: (n) => n * 2
   * })
   * ```
   */
  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Effect<A2, E2, R> {
    return new Effect(_Effect.mapBoth(this._effect, options));
  }

  /**
   * Replaces the success value with a constant, preserving failures and
   * requirements.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).as("new value")
   * // yields "new value"
   * ```
   */
  as<B>(value: B): Effect<B, E, R> {
    return new Effect(_Effect.as(this._effect, value));
  }

  /**
   * This effect with its success value replaced by `void`, preserving failures.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).asVoid // Effect<void>
   * ```
   */
  get asVoid(): Effect<void, E, R> {
    return new Effect(_Effect.asVoid(this._effect));
  }

  /**
   * This effect with its success value wrapped in `Option.some`, preserving
   * failures.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(5).asSome
   * // yields Option.some(5)
   * ```
   */
  get asSome(): Effect<Option<A>, E, R> {
    return this.map(Option.some);
  }

  /**
   * Chains a computation that depends on the success value, flattening the
   * resulting `Effect` so chains never nest.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0 ? Effect.fail(new Error("Cannot divide by zero")) : Effect.succeed(a / b)
   *
   * const program = Effect.succeed(10).flatMap((n) => divide(n, 2))
   * // yields 5
   * ```
   */
  flatMap<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2> {
    return new Effect(_Effect.flatMap(this._effect, (a) => f(a).effect));
  }

  /**
   * Flattens an `Effect` whose success value is another `Effect` into a single
   * effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const nested = Effect.succeed(Effect.succeed(1))
   * const program = Effect.flatten(nested)
   * // yields 1
   * ```
   */
  static flatten<A, E, R, E2, R2>(self: Effect<Effect<A, E, R>, E2, R2>): Effect<A, E | E2, R | R2> {
    return self.flatMap((inner) => inner);
  }

  /**
   * Runs another effect after this one. Accepts either an `Effect`, which
   * discards this effect's value, or a function receiving the success value
   * and returning the next `Effect`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1)
   *   .andThen((n) => Effect.succeed(n + 1))
   *   .andThen(Effect.succeed("done"))
   * // yields "done"
   * ```
   */
  andThen<B, E2, R2>(f: (a: A) => Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen<B, E2, R2>(f: Effect<B, E2, R2>): Effect<B, E | E2, R | R2>;
  andThen(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.andThen(this._effect, (a: A) => {
          return f(a).effect;
        })
      );
    }
    return new Effect(_Effect.andThen(this._effect, f.effect));
  }

  /**
   * Runs a side effect with the success value without changing it — useful for
   * logging or metrics. If the side effect fails, the whole chain fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(42).tap((n) => Effect.sync(() => console.log(n)))
   * // logs 42, still yields 42
   * ```
   */
  tap<B, E2, R2>(f: (a: NoInfer<A>) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap<B, E2, R2>(f: Effect<B, E2, R2>): Effect<A, E | E2, R | R2>;
  tap(f: any): Effect<any, any, any> {
    if (isFunction(f)) {
      return new Effect(
        _Effect.tap(this._effect, (a: NoInfer<A>) => {
          return f(a).effect;
        })
      );
    }
    return new Effect(_Effect.tap(this._effect, f.effect));
  }

  /**
   * Runs a side effect with the error when this effect fails, preserving the
   * original failure. If the side effect itself fails, its error is also
   * reflected in the error channel.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").tapError((error) =>
   *   Effect.sync(() => console.error(`Failure: ${error}`))
   * )
   * // logs "Failure: Boom", still fails with "Boom"
   * ```
   */
  tapError<X, E2, R2>(f: (e: E) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapError(this._effect, (e) => f(e).effect));
  }

  /**
   * Runs a side effect when this effect dies with a defect, preserving the
   * original defect. Recoverable failures are not observed.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapDefect((defect) =>
   *   Effect.sync(() => console.error("Defect:", defect))
   * )
   * ```
   */
  tapDefect<B, E2, R2>(f: (defect: unknown) => Effect<B, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapDefect(this._effect, (defect) => f(defect).effect));
  }

  /**
   * Runs a side effect when a tagged error's `_tag` matches, preserving the
   * original failure.
   *
   * @example
   * ```ts
   * import { Data } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * class NetworkError extends Data.TaggedError("NetworkError")<{ message: string }> {}
   *
   * const program = Effect.fail(new NetworkError({ message: "timeout" })).tapErrorTag(
   *   "NetworkError",
   *   (error) => Effect.sync(() => console.error(error.message))
   * )
   * ```
   */
  tapErrorTag<K extends Tags<E>, A1, E1, R1>(
    k: K,
    f: (e: ExtractTag<E, K>) => Effect<A1, E1, R1>
  ): Effect<A, E | E1, R | R1> {
    return new Effect(_Effect.tapErrorTag(this._effect, k, (e: any) => f(e).effect));
  }

  /**
   * Runs a side effect with the full `Cause` when this effect fails, observing
   * typed failures, defects, and interruptions while preserving the original
   * cause.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").tapCause((cause) =>
   *   Effect.sync(() => console.error("Failed with cause:", cause))
   * )
   * ```
   */
  tapCause<X, E2, R2>(f: (cause: Cause.Cause<E>) => Effect<X, E2, R2>): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCause(this._effect, (cause) => f(cause).effect));
  }

  /**
   * Runs a side effect with the `Cause` only when it satisfies the given
   * predicate — useful for conditional logging or monitoring.
   *
   * @example
   * ```ts
   * import { Cause } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapCauseIf(
   *   (cause) => Cause.hasDies(cause),
   *   (cause) => Effect.sync(() => console.error("Defect cause:", cause))
   * )
   * ```
   */
  tapCauseIf<B, E2, R2>(
    predicate: (cause: Cause.Cause<E>) => boolean,
    f: (cause: Cause.Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCauseIf(this._effect, predicate, (cause) => f(cause).effect));
  }

  /**
   * Runs a side effect only when the `Cause` passes the given `Filter`. The
   * side effect receives both the value selected by the filter and the
   * original cause, which is always preserved.
   *
   * @example
   * ```ts
   * import { Cause, Result } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.die(new Error("Boom")).tapCauseFilter(
   *   (cause) => (Cause.hasDies(cause) ? Result.succeed(cause) : Result.fail(cause)),
   *   (selected) => Effect.sync(() => console.error("Defect cause:", selected))
   * )
   * ```
   */
  tapCauseFilter<B, E2, R2, EB, X extends Cause.Cause<any>>(
    filter: Filter<Cause.Cause<E>, EB, X>,
    f: (a: EB, cause: Cause.Cause<E>) => Effect<B, E2, R2>
  ): Effect<A, E | E2, R | R2> {
    return new Effect(_Effect.tapCauseFilter(this._effect, filter, (a, cause) => f(a, cause).effect));
  }

  /**
   * This effect with its success and failure channels swapped: an
   * `Effect<A, E, R>` becomes an `Effect<E, A, R>`.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.fail("Boom").flip
   * // succeeds with "Boom"
   * ```
   */
  get flip(): Effect<E, A, R> {
    return new Effect(_Effect.flip(this._effect));
  }

  /**
   * This effect with its entire outcome — success, typed failure, defect, or
   * interruption — captured as a core `Exit` value. The resulting effect never
   * fails.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const exit = yield* Effect.succeed(1).exit
   *   console.log(exit._tag) // "Success"
   * })
   * ```
   */
  get exit(): Effect<Exit.Exit<A, E>, never, R> {
    return new Effect(_Effect.exit(this._effect));
  }

  /**
   * This effect with success and typed failure captured as a fluent `Result`.
   * The resulting effect never fails with a typed error — defects and
   * interruptions still fail the effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const result = yield* Effect.fail("Boom").result
   *   console.log(result.isFailure()) // true
   * })
   * ```
   */
  get result(): Effect<Result<A, E>, never, R> {
    return new Effect(_Effect.result(this._effect)).map(Result.wrap);
  }

  /**
   * This effect with success captured as `Option.some` and typed failure as
   * `Option.none`, as a fluent `Option`. The failure value is discarded — use
   * {@link Effect.result | result} when it matters. Defects still fail the
   * effect.
   *
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.gen(function* () {
   *   const option = yield* Effect.succeed(1).option
   *   console.log(option.isSome()) // true
   * })
   * ```
   */
  get option(): Effect<Option<A>, never, R> {
    return new Effect(_Effect.option(this._effect)).map(Option.wrap);
  }

  /**
   * Escape hatch: applies a transformation to the underlying core `Effect` and
   * re-wraps the result as a fluent Effect. Use this for core combinators that
   * are not yet exposed on the fluent API.
   *
   * @example
   * ```ts
   * import { Effect as CoreEffect } from "effect"
   * import { Effect } from "effect-fluent"
   *
   * const program = Effect.succeed(1).with((core) => CoreEffect.delay(core, 1000))
   * // still a fluent Effect<number>, delayed by one second
   * ```
   */
  with<B, E2, R2>(f: (effect: _Effect.Effect<A, E, R>) => _Effect.Effect<B, E2, R2>): Effect<B, E2, R2> {
    return new Effect(f(this._effect));
  }
}

/**
 * A fluent `Effect` with any success, error, and requirement types.
 */
export type EffectAny = Effect<any, any, any>;

/**
 * Type-level utilities used to compute the return type of {@link Effect.all | Effect.all}.
 */
export namespace All {
  /**
   * @example
   * ```ts
   * import { Effect } from "effect-fluent"
   * import type { All } from "effect-fluent"
   *
   * // EffectAny represents an Effect with any type parameters
   * const effects: Array<All.EffectAny> = [
   *   Effect.succeed(42),
   *   Effect.succeed("hello"),
   *   Effect.fail(new Error("Oops"))
   * ]
   * ```
   */
  export type EffectAny = Effect<any, any, any>;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnIterable computes the return type for Effect.all with iterables
   * type EffectArray = Array<Effect<number, string, never>>
   * type Computed = All.ReturnIterable<EffectArray, false>
   * // Computed: Effect<Array<number>, string, never>
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
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnTuple computes the return type for Effect.all with tuples
   * type EffectTuple = [
   *   Effect<string, Error, never>,
   *   Effect<number, Error, never>
   * ]
   * type Computed = All.ReturnTuple<EffectTuple, false>
   * // Computed: Effect<[string, number], Error, never>
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
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // ReturnObject computes the return type for Effect.all with objects
   * type EffectRecord = {
   *   a: Effect<string, Error, never>
   *   b: Effect<number, Error, never>
   * }
   * type Computed = All.ReturnObject<EffectRecord, false>
   * // Computed: Effect<{ a: string, b: number }, Error, never>
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
   * @example
   * ```ts
   * import type { All } from "effect-fluent"
   *
   * // IsDiscard checks if options have discard flag set to true
   * type DiscardOptions = { discard: true }
   * type NoDiscardOptions = { discard: false }
   * type WithDiscard = All.IsDiscard<DiscardOptions> // true
   * type WithoutDiscard = All.IsDiscard<NoDiscardOptions> // false
   * ```
   */
  export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true;

  /**
   * Checks if options have `mode` set to `"result"`.
   */
  export type IsResult<A> = [Extract<A, { readonly mode: 'result' }>] extends [never] ? false : true;

  /**
   * @example
   * ```ts
   * import type { All, Effect } from "effect-fluent"
   *
   * // Return determines the result type based on input and options
   * type EffectArray = Array<Effect<number, string, never>>
   * type Options = { discard: false }
   * type Computed = All.Return<EffectArray, Options>
   * // Computed: Effect<Array<number>, string, never>
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

/**
 * Type-level utilities used by {@link Effect.gen | Effect.gen} to infer yielded
 * errors and services.
 */
export namespace Gen {
  // Only Effects (core or fluent — fluent implements `_Effect.Effect`) are
  // yieldable inside `Effect.gen`. To yield an Option or Result, lift them
  // explicitly via `Effect.fromOption` / `Effect.fromResult`. This matches
  // core's behaviour after the `Yieldable` removal.
  /**
   * A value that can be yielded inside `Effect.gen`: any core or fluent Effect.
   */
  export type Yieldable<A, E, R> = _Effect.Effect<A, E, R>;

  /**
   * Extracts the union of error types from yielded effects.
   */
  export type YieldError<Eff> = [Eff] extends [never]
    ? never
    : Eff extends _Effect.Effect<any, infer E, any>
      ? E
      : never;

  /**
   * Extracts the union of service requirements from yielded effects.
   */
  export type YieldServices<Eff> = [Eff] extends [never]
    ? never
    : Eff extends _Effect.Effect<any, any, infer R>
      ? R
      : never;
}
