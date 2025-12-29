import { Effect as _Effect, Cause, FiberId } from 'effect';
import { LazyArg } from 'effect/Function';
import { YieldWrap, yieldWrapGet } from 'effect/Utils';

export class Effect<A, E = never, R = never> {
  /**
   * Creates an `Effect` from an existing `Effect` primitive.
   *
   * **When to Use**
   *
   * Use this function when you need to convert an existing `Effect` primitive to a fluent `Effect` object.
   *
   * @param effect The `Effect` primitive to convert.
   *
   * @example
   * ```ts
   * // Title: Creating an Effect from a Primitive
   * import { Effect } from "effect-fluent"
   * import { Effect as _Effect } from "effect"
   *
   * const primitive = _Effect.succeed(42)
   *
   * const effect = Effect.of(primitive)
   *
   * console.log(effect.runSync) // Output: 42
   * ```
   *
   * @category Creating Effects
   */
  static of<A, E = never, R = never>(effect: _Effect.Effect<A, E, R>): Effect<A, E, R> {
    return new Effect(effect);
  }

  /**
   * Creates an `Effect` that always succeeds with a given value.
   *
   * **When to Use**
   *
   * Use this function when you need an effect that completes successfully with a
   * specific value without any errors or external dependencies.
   *
   * @see {@link Effect.fail} to create an effect that represents a failure.
   *
   * @example
   * ```ts
   * // Title: Creating a Successful Effect
   * import { Effect } from "effect-fluent"
   *
   * // Creating an effect that represents a successful scenario
   * //
   * //      ┌─── Effect<number, never, never>
   * //      ▼
   * const success = Effect.succeed(42)
   * ```
   *
   * @category Creating Effects
   */
  static succeed<A>(value: A): Effect<A> {
    return new Effect(_Effect.succeed(value));
  }

  /**
   * @category Creating Effects
   */
  static void(): Effect<void> {
    return new Effect(_Effect.void);
  }

  /**
   * Returns an effect that will never produce anything. The moral equivalent of
   * `while(true) {}`, only without the wasted CPU cycles.
   *
   * @category Creating Effects
   */
  static never(): Effect<never> {
    return new Effect(_Effect.never);
  }

  /**
   * Creates an `Effect` that represents a recoverable error.
   *
   * **When to Use**
   *
   * Use this function to explicitly signal an error in an `Effect`. The error
   * will keep propagating unless it is handled. You can handle the error with
   * TODO: Replace `catchAll` and `catchTag` with `Effect.catchAll` and `Effect.catchTag` a more fluent version
   * functions like {@link catchAll} or {@link catchTag}.
   *
   * @see {@link Effect.succeed} to create an effect that represents a successful value.
   *
   * @example
   * ```ts
   * // Title: Creating a Failed Effect
   * import { Effect } from "effect-fluent"
   *
   * //      ┌─── Effect<never, Error, never>
   * //      ▼
   * const failure = Effect.fail(
   *   new Error("Operation failed due to network error")
   * )
   * ```
   *
   * @category Creating Effects
   */
  static fail<E>(error: E): Effect<never, E> {
    return new Effect(_Effect.fail(error));
  }

  /**
   * @category Creating Effects
   */
  static failSync<E>(evaluate: LazyArg<E>): Effect<never, E> {
    return new Effect(_Effect.failSync(evaluate));
  }

  /**
   * @category Creating Effects
   */
  static failCause<E>(cause: Cause.Cause<E>): Effect<never, E> {
    return new Effect(_Effect.failCause(cause));
  }

  /**
   * @category Creating Effects
   */
  static failCauseSync<E>(evaluate: LazyArg<Cause.Cause<E>>): Effect<never, E> {
    return new Effect(_Effect.failCauseSync(evaluate));
  }

  /**
   * Creates an effect that terminates a fiber with a specified error.
   *
   * **When to Use**
   *
   * Use `die` when encountering unexpected conditions in your code that should
   * not be handled as regular errors but instead represent unrecoverable defects.
   *
   * **Details**
   *
   * The `die` function is used to signal a defect, which represents a critical
   * and unexpected error in the code. When invoked, it produces an effect that
   * does not handle the error and instead terminates the fiber.
   *
   * The error channel of the resulting effect is of type `never`, indicating that
   * it cannot recover from this failure.
   *
   * @see {@link Effect.dieSync} for a variant that throws a specified error, evaluated lazily.
   * @see {@link Effect.dieMessage} for a variant that throws a `RuntimeException` with a message.
   *
   * @example
   * ```ts
   * // Title: Terminating on Division by Zero with a Specified Error
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0
   *     ? Effect.die(new Error("Cannot divide by zero"))
   *     : Effect.succeed(a / b)
   *
   * //      ┌─── Effect<number, never, never>
   * //      ▼
   * const program = divide(1, 0)
   *
   * program.runPromise.catch(console.error)
   * // Output:
   * // (FiberFailure) Error: Cannot divide by zero
   * //   ...stack trace...
   * ```
   *
   * @category Creating Effects
   */
  static die(error: unknown): Effect<never> {
    return new Effect(_Effect.die(error));
  }

  /**
   * Creates an effect that terminates a fiber with a `RuntimeException`
   * containing the specified message.
   *
   * **When to Use**
   *
   * Use `dieMessage` when you want to terminate a fiber due to an unrecoverable
   * defect and include a clear explanation in the message.
   *
   * **Details**
   *
   * The `dieMessage` function is used to signal a defect, representing a critical
   * and unexpected error in the code. When invoked, it produces an effect that
   * terminates the fiber with a `RuntimeException` carrying the given message.
   *
   * The resulting effect has an error channel of type `never`, indicating it does
   * not handle or recover from the error.
   *
   * @see {@link Effect.die} for a variant that throws a specified error.
   * @see {@link Effect.dieSync} for a variant that throws a specified error, evaluated
   * lazily.
   *
   * @example
   * ```ts
   * // Title: Terminating on Division by Zero with a Specified Message
   * import { Effect } from "effect-fluent"
   *
   * const divide = (a: number, b: number) =>
   *   b === 0
   *     ? Effect.dieMessage("Cannot divide by zero")
   *     : Effect.succeed(a / b)
   *
   * //      ┌─── Effect<number, never, never>
   * //      ▼
   * const program = divide(1, 0)
   *
   * program.runPromise.catch(console.error)
   * // Output:
   * // (FiberFailure) RuntimeException: Cannot divide by zero
   * //   ...stack trace...
   * ```
   *
   * @category Creating Effects
   */
  static dieMessage(message: string): Effect<never> {
    return new Effect(_Effect.dieMessage(message));
  }

  /**
   * Creates an effect that dies with the specified error, evaluated lazily.
   *
   * This function allows you to create an effect that will terminate with a fatal error.
   * The error is provided as a lazy argument, meaning it will only be evaluated when the effect runs.
   *
   * @see {@link Effect.die} if you don't need to evaluate the error lazily.
   *
   * @category Creating Effects
   */
  static dieSync(evaluate: LazyArg<unknown>): Effect<never> {
    return new Effect(_Effect.dieSync(evaluate));
  }

  /**
   * Creates an `Effect` that represents a synchronous side-effectful computation.
   *
   * **When to Use**
   *
   * Use `sync` when you are sure the operation will not fail.
   *
   * **Details**
   *
   * The provided function (`thunk`) must not throw errors; if it does, the error
   * will be treated as a "defect".
   *
   * This defect is not a standard error but indicates a flaw in the logic that
   * was expected to be error-free. You can think of it similar to an unexpected
   * crash in the program, which can be further managed or logged using tools like
   * TODO: Replace `catchAllDefect` with `Effect.catchAllDefault` a more fluent version
   * {@link catchAllDefect}.
   *
   * @see {@link Effect.try} for a version that can handle failures.
   *
   * @example
   * ```ts
   * // Title: Logging a Message
   * import { Effect } from "effect-fluent"
   *
   * const log = (message: string) =>
   *   Effect.sync(() => {
   *     console.log(message) // side effect
   *   })
   *
   * //      ┌─── Effect<void, never, never>
   * //      ▼
   * const program = log("Hello, World!")
   * ```
   *
   * @category Creating Effects
   */
  static sync<A>(thunk: LazyArg<A>): Effect<A> {
    return new Effect(_Effect.sync(thunk));
  }

  /**
   * Creates an `Effect` that represents a synchronous computation that might
   * fail.
   *
   * **When to Use**
   *
   * In situations where you need to perform synchronous operations that might
   * fail, such as parsing JSON, you can use the `try` constructor. This
   * constructor is designed to handle operations that could throw exceptions by
   * capturing those exceptions and transforming them into manageable errors.
   *
   * **Error Handling**
   *
   * There are two ways to handle errors with `try`:
   *
   * 1. If you don't provide a `catch` function, the error is caught and the
   *    effect fails with an `UnknownException`.
   * 2. If you provide a `catch` function, the error is caught and the `catch`
   *    function maps it to an error of type `E`.
   *
   * @see {@link Effect.sync} if the effectful computation is synchronous and does not
   * throw errors.
   *
   * @example
   * ```ts
   * // Title: Safe JSON Parsing
   * import { Effect } from "effect"
   *
   * const parse = (input: string) =>
   *   // This might throw an error if input is not valid JSON
   *   Effect.try(() => JSON.parse(input))
   *
   * //      ┌─── Effect<any, UnknownException, never>
   * //      ▼
   * const program = parse("")
   *
   * ```
   * @example
   * // Title: Custom Error Handling
   * import { Effect } from "effect-fluent"
   *
   * const parse = (input: string) =>
   *   Effect.try({
   *     // JSON.parse may throw for bad input
   *     try: () => JSON.parse(input),
   *     // remap the error
   *     catch: (unknown) => new Error(`something went wrong ${unknown}`)
   *   })
   *
   * //      ┌─── Effect<any, Error, never>
   * //      ▼
   * const program = parse("")
   *
   * @category Creating Effects
   */
  static try<A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Effect<A, E>;
  static try<A>(thunk: LazyArg<A>): Effect<A, Cause.UnknownException>;
  static try<A, E>(
    arg:
      | LazyArg<A>
      | {
          readonly try: LazyArg<A>;
          readonly catch: (error: unknown) => E;
        }
  ) {
    return new Effect(_Effect.try(arg as any));
  }

  // TODO: add docs when more fluent apis are available
  static async<A, E = never, R = never>(
    resume: (callback: (_: Effect<A, E, R>) => void, signal: AbortSignal) => void | Effect<void, never, R>,
    blockingOn?: FiberId.FiberId
  ): Effect<A, E, R> {
    return new Effect(
      _Effect.async<A, E, R>((callback, signal) => {
        const effect = resume((effect: Effect<A, E, R>) => callback(effect.asEffect), signal);
        // TODO: Replace `instanceof` with a more robust check
        if (effect instanceof Effect) {
          return effect.asEffect;
        }
        return effect;
      }, blockingOn)
    );
  }

  static asyncEffect<A, E, R, R3, E2, R2>(
    register: (callback: (_: Effect<A, E, R>) => void) => Effect<Effect<void, never, R3> | void, E2, R2>
  ): Effect<A, E | E2, R | R2 | R3> {
    return new Effect(
      _Effect.asyncEffect<A, E, R, R3, E2, R2>((callback) => {
        const effect = register((effect) => callback(effect.asEffect)).asEffect;

        return effect.pipe(
          // TODO: Replace `flatMap` when it's available in the Effect type
          _Effect.flatMap((e) => {
            // TODO: Replace `instanceof` with a more robust check
            if (e instanceof Effect) {
              return e.asEffect;
            }
            return _Effect.void;
          })
        ) as any;
      })
    );
  }

  /**
   * Creates an `Effect` that represents an asynchronous computation guaranteed to
   * succeed.
   *
   * **When to Use**
   *
   * Use `promise` when you are sure the operation will not reject.
   *
   * **Details**
   *
   * The provided function (`thunk`) returns a `Promise` that should never reject; if it does, the error
   * will be treated as a "defect".
   *
   * This defect is not a standard error but indicates a flaw in the logic that
   * was expected to be error-free. You can think of it similar to an unexpected
   * crash in the program, which can be further managed or logged using tools like
   * TODO: Replace `catchAllDefect` with `Effect.catchAllDefault` a more fluent version
   * {@link catchAllDefect}.
   *
   * **Interruptions**
   *
   * An optional `AbortSignal` can be provided to allow for interruption of the
   * wrapped `Promise` API.
   *
   * @see {@link Effect.tryPromise} for a version that can handle failures.
   *
   * @example
   * ```ts
   * // Title: Delayed Message
   * import { Effect } from "effect-fluent"
   *
   * const delay = (message: string) =>
   *   Effect.promise<string>(
   *     () =>
   *       new Promise((resolve) => {
   *         setTimeout(() => {
   *           resolve(message)
   *         }, 2000)
   *       })
   *   )
   *
   * //      ┌─── Effect<string, never, never>
   * //      ▼
   * const program = delay("Async operation completed successfully!")
   * ```
   *
   * @category Creating Effects
   */
  static promise<A>(evaluate: (signal: AbortSignal) => PromiseLike<A>): Effect<A> {
    return new Effect(_Effect.promise(evaluate));
  }

  /**
   * Creates an `Effect` that represents an asynchronous computation that might
   * fail.
   *
   * **When to Use**
   *
   * In situations where you need to perform asynchronous operations that might
   * fail, such as fetching data from an API, you can use the `tryPromise`
   * constructor. This constructor is designed to handle operations that could
   * throw exceptions by capturing those exceptions and transforming them into
   * manageable errors.
   *
   * **Error Handling**
   *
   * There are two ways to handle errors with `tryPromise`:
   *
   * 1. If you don't provide a `catch` function, the error is caught and the
   *    effect fails with an `UnknownException`.
   * 2. If you provide a `catch` function, the error is caught and the `catch`
   *    function maps it to an error of type `E`.
   *
   * **Interruptions**
   *
   * An optional `AbortSignal` can be provided to allow for interruption of the
   * wrapped `Promise` API.
   *
   * @see {@link Effect.promise} if the effectful computation is asynchronous and does not throw errors.
   *
   * @example
   * ```ts
   * // Title: Fetching a TODO Item
   * import { Effect } from "effect-fluent"
   *
   * const getTodo = (id: number) =>
   *   // Will catch any errors and propagate them as UnknownException
   *   Effect.tryPromise(() =>
   *     fetch(`https://jsonplaceholder.typicode.com/todos/${id}`)
   *   )
   *
   * //      ┌─── Effect<Response, UnknownException, never>
   * //      ▼
   * const program = getTodo(1)
   * ```
   *
   * @example
   * // Title: Custom Error Handling
   * import { Effect } from "effect-fluent"
   *
   * const getTodo = (id: number) =>
   *   Effect.tryPromise({
   *     try: () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
   *     // remap the error
   *     catch: (unknown) => new Error(`something went wrong ${unknown}`)
   *   })
   *
   * //      ┌─── Effect<Response, Error, never>
   * //      ▼
   * const program = getTodo(1)
   *
   * @category Creating Effects
   */
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
  ) {
    return new Effect(_Effect.tryPromise(arg as any));
  }

  /**
   * Delays the creation of an `Effect` until it is actually needed.
   *
   * **When to Use**
   *
   * Use `suspend` when you need to defer the evaluation of an effect until it is required. This is particularly useful for optimizing expensive computations, managing circular dependencies, or resolving type inference issues.
   *
   * **Details**
   *
   * `suspend` takes a thunk that represents the effect and wraps it in a suspended effect. This means the effect will not be created until it is explicitly needed, which is helpful in various scenarios:
   * - **Lazy Evaluation**: Helps optimize performance by deferring computations, especially when the effect might not be needed, or when its computation is expensive. This also ensures that any side effects or scoped captures are re-executed on each invocation.
   * - **Handling Circular Dependencies**: Useful in managing circular dependencies, such as recursive functions that need to avoid eager evaluation to prevent stack overflow.
   * - **Unifying Return Types**: Can help TypeScript unify return types in situations where multiple branches of logic return different effects, simplifying type inference.
   *
   * @example
   * ```ts
   * // Title: Lazy Evaluation with Side Effects
   * import { Effect } from "effect-fluent"
   *
   * let i = 0
   *
   * const bad = Effect.succeed(i++)
   *
   * const good = Effect.suspend(() => Effect.succeed(i++))
   *
   * console.log(bad.runSync) // Output: 0
   * console.log(bad.runSync) // Output: 0
   *
   * console.log(good.runSync) // Output: 1
   * console.log(good.runSync) // Output: 2
   * ```
   *
   * @example
   * // Title: Recursive Fibonacci
   * import { Effect } from "effect-fluent"
   *
   * const blowsUp = (n: number): Effect.Effect<number> =>
   *   n < 2
   *     ? Effect.succeed(1)
   *     : Effect.zipWith(blowsUp(n - 1), blowsUp(n - 2), (a, b) => a + b)
   *
   * // console.log(Effect.runSync(blowsUp(32)))
   * // crash: JavaScript heap out of memory
   *
   * const allGood = (n: number): Effect.Effect<number> =>
   *   n < 2
   *     ? Effect.succeed(1)
   *     : Effect.zipWith(
   *         Effect.suspend(() => allGood(n - 1)),
   *         Effect.suspend(() => allGood(n - 2)),
   *         (a, b) => a + b
   *       )
   *
   * console.log(allGood(32).runSync)
   * // Output: 3524578
   *
   * @example
   * // Title: Using Effect.suspend to Help TypeScript Infer Types
   * import { Effect } from "effect-fluent"
   *
   * //   Without suspend, TypeScript may struggle with type inference.
   * //   Inferred type:
   * //     (a: number, b: number) =>
   * //       Effect<never, Error, never> | Effect<number, never, never>
   * const withoutSuspend = (a: number, b: number) =>
   *   b === 0
   *     ? Effect.fail(new Error("Cannot divide by zero"))
   *     : Effect.succeed(a / b)
   *
   * //   Using suspend to unify return types.
   * //   Inferred type:
   * //     (a: number, b: number) => Effect<number, Error, never>
   * const withSuspend = (a: number, b: number) =>
   *   Effect.suspend(() =>
   *     b === 0
   *       ? Effect.fail(new Error("Cannot divide by zero"))
   *       : Effect.succeed(a / b)
   *   )
   *
   * @category Creating Effects
   */
  static suspend<A, E, R>(effect: LazyArg<Effect<A, E, R>>): Effect<A, E, R> {
    return new Effect(_Effect.suspend(() => effect().asEffect));
  }

  // TODO: Add docs
  static gen<Eff extends YieldWrap<_Effect.Effect<any, any, any>> | YieldWrap<Effect<any, any, any>>, AEff>(
    f: (resume: Adapter) => Generator<Eff, AEff, never>
  ): Effect<
    AEff,
    [Eff] extends [never]
      ? never
      : [Eff] extends [YieldWrap<_Effect.Effect<infer _A, infer E, infer _R>>]
      ? E
      : [Eff] extends [YieldWrap<Effect<infer _A, infer E, infer _R>>]
      ? E
      : never,
    [Eff] extends [never]
      ? never
      : [Eff] extends [YieldWrap<_Effect.Effect<infer _A, infer _E, infer R>>]
      ? R
      : [Eff] extends [YieldWrap<Effect<infer _A, infer _E, infer R>>]
      ? R
      : never
  > {
    // Convert the generator to work with Effects
    return new Effect(
      _Effect.gen(function* () {
        const generator = f(adapter);
        let result = generator.next();

        while (!result.done) {
          const value = result.value;
          // Unwrap YieldWrap and convert Effect to Effect if needed
          const unwrapped = yieldWrapGet(value as YieldWrap<_Effect.Effect<any, any, any>>);
          // TODO: Replace `instanceof` with a more robust check
          const effect = unwrapped instanceof Effect ? unwrapped.effect : unwrapped;
          const nextValue = yield* effect;
          result = generator.next(nextValue as never);
        }

        return result.value;
      })
    );
  }

  private constructor(private readonly effect: _Effect.Effect<A, E, R>) {}

  map<B>(f: (a: A) => B): Effect<B, E, R> {
    return new Effect(_Effect.map(this.effect, f));
  }

  mapError<E2>(f: (e: E) => E2): Effect<A, E2, R> {
    _Effect.mapBoth;
    return new Effect(_Effect.mapError(this.effect, f));
  }

  mapErrorCause<E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<A, E2, R> {
    return new Effect(_Effect.mapErrorCause(this.effect, f));
  }

  mapBoth<A2, E2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Effect<A2, E2, R> {
    return new Effect(_Effect.mapBoth(this.effect, options));
  }

  as<B>(value: B): Effect<B, E, R> {
    return new Effect(_Effect.as(this.effect, value));
  }

  get asVoid(): Effect<void, E, R> {
    return new Effect(_Effect.asVoid(this.effect));
  }

  get flip(): Effect<E, A, R> {
    return new Effect(_Effect.flip(this.effect));
  }

  flipWith<A2, E2, R2>(f: (effect: Effect<E, A, R>) => Effect<E2, A2, R2>): Effect<A2, E2, R2> {
    return new Effect(_Effect.flipWith(this.effect, (effect) => f(new Effect(effect)).asEffect));
  }

  get merge(): Effect<A | E, never, R> {
    return new Effect(_Effect.merge(this.effect));
  }

  get asEffect(): _Effect.Effect<A, E, R> {
    return this.effect;
  }

  // Make Effect iterable - delegates to the underlying Effect
  [Symbol.iterator]() {
    return this.effect[Symbol.iterator]();
  }
}

interface Adapter {
  <A, E, R>(self: _Effect.Effect<A, E, R>): _Effect.Effect<A, E, R>;
  <A, E, R>(self: Effect<A, E, R>): Effect<A, E, R>;
}

const adapter: Adapter = ((self: any) => {
  // TODO: Replace `instanceof` with a more robust check
  if (self instanceof Effect) {
    return self;
  }
  return self;
}) as Adapter;
