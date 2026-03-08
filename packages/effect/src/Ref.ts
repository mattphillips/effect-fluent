import { Ref as _Ref } from 'effect';
import type { Option } from 'effect/Option';
import { Effect } from './Effect.js';
import { Inspectable } from './Inspectable.js';

/**
 * A mutable reference that provides atomic read, write, and update operations.
 *
 * Ref is a thread-safe mutable reference type that allows for atomic operations
 * on shared state. It supports both simple read/write operations and complex
 * atomic transformations.
 *
 * @example
 * ```ts
 * import { Effect, Ref } from "effect-fluent"
 *
 * const program = Effect.gen(function*() {
 *   const counter = yield* Ref.make(0)
 *
 *   yield* counter.update((n) => n + 1)
 *   yield* counter.update((n) => n * 2)
 *
 *   const value = yield* counter.get
 *   console.log(value) // 2
 *
 *   const previous = yield* counter.getAndSet(100)
 *   console.log(previous) // 2
 * })
 * ```
 */
export class Ref<in out A> extends Inspectable {
  /**
   * Creates a new Ref with the specified initial value.
   *
   * @param value - The initial value for the Ref
   * @returns An Effect that creates a new Ref
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const ref = yield* Ref.make(42)
   *   const value = yield* ref.get
   *   console.log(value) // 42
   * })
   * ```
   */
  static make<A>(value: A): Effect<Ref<A>> {
    return Effect.of(_Ref.make(value)).map((ref) => new Ref(ref));
  }

  /**
   * Creates a new Ref with the specified initial value (unsafe version).
   *
   * This function creates a Ref synchronously without wrapping in Effect.
   * Use this only when you're sure about the safety of immediate creation.
   *
   * @example
   * ```ts
   * import { Ref } from "effect-fluent"
   *
   * const counter = Ref.makeUnsafe(0)
   * const value = counter.getUnsafe
   * console.log(value) // 0
   * ```
   */
  static makeUnsafe<A>(value: A): Ref<A> {
    return new Ref(_Ref.makeUnsafe(value));
  }

  private readonly _ref: _Ref.Ref<A>;

  private constructor(ref: _Ref.Ref<A>) {
    super();
    this._ref = ref;
  }

  toJSON(): unknown {
    return (this._ref as any).toJSON();
  }

  /**
   * Gets the current value of the Ref.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const ref = yield* Ref.make(42)
   *   const value = yield* ref.get
   *   console.log(value) // 42
   * })
   * ```
   */
  get get(): Effect<A> {
    return Effect.of(_Ref.get(this._ref));
  }

  /**
   * Sets the value of the Ref to the specified value.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const ref = yield* Ref.make(0)
   *   yield* ref.set(42)
   *   const value = yield* ref.get
   *   console.log(value) // 42
   * })
   * ```
   */
  set(value: A): Effect<void> {
    return Effect.of(_Ref.set(this._ref, value));
  }

  /**
   * Atomically gets the current value of the Ref and sets it to the specified value.
   *
   * Returns the value that was in the Ref before the update.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const ref = yield* Ref.make("initial")
   *   const previous = yield* ref.getAndSet("updated")
   *   console.log(previous) // "initial"
   *
   *   const current = yield* ref.get
   *   console.log(current) // "updated"
   * })
   * ```
   */
  getAndSet(value: A): Effect<A> {
    return Effect.of(_Ref.getAndSet(this._ref, value));
  }

  /**
   * Atomically gets the current value of the Ref and updates it with the given function.
   *
   * Returns the value that was in the Ref before the update.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(10)
   *   const previous = yield* counter.getAndUpdate((n) => n * 2)
   *   console.log(previous) // 10
   *
   *   const current = yield* counter.get
   *   console.log(current) // 20
   * })
   * ```
   */
  getAndUpdate(f: (a: A) => A): Effect<A> {
    return Effect.of(_Ref.getAndUpdate(this._ref, f));
  }

  /**
   * Atomically gets the current value of the Ref and updates it with the given partial function.
   *
   * If the partial function returns `Option.some`, the Ref is updated with the new value.
   * If it returns `Option.none`, the Ref is left unchanged.
   * Always returns the value that was in the Ref before the attempted update.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   * import { Option } from "effect"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(5)
   *   const previous = yield* counter.getAndUpdateSome(
   *     (n) => n > 3 ? Option.some(n * 2) : Option.none()
   *   )
   *   console.log(previous) // 5
   *
   *   const current = yield* counter.get
   *   console.log(current) // 10
   * })
   * ```
   */
  getAndUpdateSome(pf: (a: A) => Option<A>): Effect<A> {
    return Effect.of(_Ref.getAndUpdateSome(this._ref, pf));
  }

  /**
   * Atomically sets the value of the Ref to the specified value and returns the new value.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const ref = yield* Ref.make(10)
   *   const newValue = yield* ref.setAndGet(42)
   *   console.log(newValue) // 42
   * })
   * ```
   */
  setAndGet(value: A): Effect<A> {
    return Effect.of(_Ref.setAndGet(this._ref, value));
  }

  /**
   * Atomically updates the value of the Ref using the given function.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(5)
   *   yield* counter.update((n) => n * 2)
   *
   *   const value = yield* counter.get
   *   console.log(value) // 10
   * })
   * ```
   */
  update(f: (a: A) => A): Effect<void> {
    return Effect.of(_Ref.update(this._ref, f));
  }

  /**
   * Atomically updates the value of the Ref using the given function and returns the new value.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(5)
   *   const newValue = yield* counter.updateAndGet((n) => n * 3)
   *   console.log(newValue) // 15
   * })
   * ```
   */
  updateAndGet(f: (a: A) => A): Effect<A> {
    return Effect.of(_Ref.updateAndGet(this._ref, f));
  }

  /**
   * Atomically updates the value of the Ref using the given partial function.
   *
   * If the partial function returns `Option.some`, the Ref is updated with the new value.
   * If it returns `Option.none`, the Ref is left unchanged.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   * import { Option } from "effect"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(5)
   *
   *   // Won't update since 5 is odd
   *   yield* counter.updateSome(
   *     (n) => n % 2 === 0 ? Option.some(n * 2) : Option.none()
   *   )
   *   const value1 = yield* counter.get
   *   console.log(value1) // 5
   *
   *   yield* counter.set(6)
   *   yield* counter.updateSome(
   *     (n) => n % 2 === 0 ? Option.some(n * 2) : Option.none()
   *   )
   *   const value2 = yield* counter.get
   *   console.log(value2) // 12
   * })
   * ```
   */
  updateSome(f: (a: A) => Option<A>): Effect<void> {
    return Effect.of(_Ref.updateSome(this._ref, f));
  }

  /**
   * Atomically updates the value of the Ref using the given partial function and returns the current value.
   *
   * If the partial function returns `Option.some`, the Ref is updated with the new value.
   * If it returns `Option.none`, the Ref is left unchanged.
   * Returns the current value of the Ref after the potential update.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   * import { Option } from "effect"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(10)
   *   const result = yield* counter.updateSomeAndGet(
   *     (n) => n > 5 ? Option.some(n / 2) : Option.none()
   *   )
   *   console.log(result) // 5
   * })
   * ```
   */
  updateSomeAndGet(pf: (a: A) => Option<A>): Effect<A> {
    return Effect.of(_Ref.updateSomeAndGet(this._ref, pf));
  }

  /**
   * Atomically modifies the value of the Ref using the given function.
   *
   * The function receives the current value and returns a tuple of `[result, newValue]`.
   * The Ref is updated with the `newValue` and the `result` is returned.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(10)
   *   const result = yield* counter.modify((n) => [
   *     `Previous value was ${n}`,
   *     n * 2
   *   ])
   *   console.log(result) // "Previous value was 10"
   *
   *   const current = yield* counter.get
   *   console.log(current) // 20
   * })
   * ```
   */
  modify<B>(f: (a: A) => readonly [B, A]): Effect<B> {
    return Effect.of(_Ref.modify(this._ref, f));
  }

  /**
   * Atomically modifies the value of the Ref using the given partial function.
   *
   * The function receives the current value and returns a tuple of `[result, Option<newValue>]`.
   * If the Option is `Some`, the Ref is updated with the new value.
   * If the Option is `None`, the Ref is left unchanged.
   * The result is always returned.
   *
   * @example
   * ```ts
   * import { Effect, Ref } from "effect-fluent"
   * import { Option } from "effect"
   *
   * const program = Effect.gen(function*() {
   *   const counter = yield* Ref.make(5)
   *   const result = yield* counter.modifySome(
   *     (n) => n > 3
   *       ? [`incremented ${n}`, Option.some(n + 10)]
   *       : ["no change", Option.none()]
   *   )
   *   console.log(result) // "incremented 5"
   *
   *   const current = yield* counter.get
   *   console.log(current) // 15
   * })
   * ```
   */
  modifySome<B>(pf: (a: A) => readonly [B, Option<A>]): Effect<B> {
    return Effect.of(_Ref.modifySome(this._ref, pf));
  }

  /**
   * Gets the current value of the Ref synchronously (unsafe version).
   *
   * This reads the current value without wrapping in Effect.
   * Use this only when you're sure about the safety of immediate access.
   *
   * @example
   * ```ts
   * import { Ref } from "effect-fluent"
   *
   * const counter = Ref.makeUnsafe(42)
   * const value = counter.getUnsafe
   * console.log(value) // 42
   * ```
   */
  get getUnsafe(): A {
    return _Ref.getUnsafe(this._ref);
  }
}
