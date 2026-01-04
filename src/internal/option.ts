import { Option as _Option, Either, Equal, Equivalence, Hash, Inspectable, Order, Unify } from 'effect';
import { dual, isFunction, type LazyArg } from 'effect/Function';
import { NodeInspectSymbol } from 'effect/Inspectable';
import { pipeArguments } from 'effect/Pipeable';
import { hasProperty, type Predicate, type Refinement } from 'effect/Predicate';
import { Covariant, NoInfer, NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import type * as O from '../Option.js';

export const TypeId: unique symbol = Symbol.for('effect-fluent/Option');

export type TypeId = typeof TypeId;

abstract class Option<A> implements Inspectable.Inspectable {
  abstract readonly _tag: 'Some' | 'None';
  abstract readonly _op: 'Some' | 'None';

  [Symbol.iterator]() {
    return new Gen.SingleShotGen(new Gen.YieldWrap(this)) as any;
  }

  [Unify.typeSymbol]?: unknown;
  [Unify.unifySymbol]?: O.OptionUnify<this>;
  [Unify.ignoreSymbol]?: O.OptionUnifyIgnore;

  get [TypeId](): {
    readonly _A: Covariant<A>;
  } {
    return {
      _A: (_: never) => _
    };
  }

  constructor(protected readonly option: _Option.Option<A>) {}

  map<B>(f: (a: A) => B): O.Option<B> {
    return of(_Option.map(this.option, f));
  }

  flatMap<B>(f: (a: A) => O.Option<B>): O.Option<B> {
    return of(_Option.flatMap(this.option, (a) => f(a).asOption));
  }

  isSome(): this is Some<A> {
    return this.option._tag === 'Some';
  }

  isNone(): this is None<A> {
    return this.option._tag === 'None';
  }

  match<B, C = B>(options: { readonly onNone: LazyArg<B>; readonly onSome: (a: A) => C }): B | C {
    return _Option.match(this.option, options);
  }

  getOrElse<B>(onNone: LazyArg<B>): A | B {
    return _Option.getOrElse(this.option, onNone);
  }

  getOrNull(): A | null {
    return _Option.getOrNull(this.option);
  }

  getOrUndefined(): A | undefined {
    return _Option.getOrUndefined(this.option);
  }

  andThen<B>(f: (a: A) => O.Option<B>): O.Option<B>;
  andThen<B>(option: O.Option<B>): O.Option<B>;
  andThen<B>(f: (a: A) => B): O.Option<B>;
  andThen<B>(f: NotFunction<B>): O.Option<B>;
  andThen<B>(f: ((a: A) => O.Option<B>) | O.Option<B> | ((a: A) => B) | NotFunction<B>): O.Option<B> {
    return of(
      _Option.andThen(this.option, (a) => {
        const b = isFunction(f) ? f(a) : f;

        return is(b) ? b.asOption : _Option.some(b);
      })
    );
  }

  orElse<B>(that: LazyArg<O.Option<B>>): O.Option<A | B> {
    return of(_Option.orElse(this.option, () => that().asOption));
  }

  // TODO: Replace with fluent `Either`
  partitionMap<B, C>(f: (a: A) => Either.Either<C, B>): [left: O.Option<B>, right: O.Option<C>] {
    const [leftOpt, rightOpt] = _Option.partitionMap(this.option, f);
    return [of(leftOpt), of(rightOpt)];
  }

  filterMap<B>(f: (a: A) => O.Option<B>): O.Option<B> {
    return of(_Option.filterMap(this.option, (a) => f(a).asOption));
  }

  flatMapNullable<B>(f: (a: A) => B | null | undefined): O.Option<NonNullable<B>> {
    return of(_Option.flatMapNullable(this.option, f));
  }

  containsWith(isEquivalent: (self: A, that: A) => boolean, a: A): boolean {
    return _Option.containsWith(isEquivalent)(a)(this.option);
  }

  contains(a: A): boolean {
    return _Option.contains(this.option, a);
  }

  exists<B extends A>(refinement: Refinement<NoInfer<A>, B>): this is O.Option<B>;
  exists(predicate: Predicate<NoInfer<A>>): boolean;
  exists<B extends A>(predicate: Predicate<NoInfer<A>> | Refinement<NoInfer<A>, B>): this is O.Option<B> {
    return _Option.exists(this.option, predicate);
  }

  // TODO: Replace with fluent `Either`
  orElseEither<B>(that: LazyArg<O.Option<B>>): O.Option<Either.Either<B, A>> {
    return of(_Option.orElseEither(this.option, () => that().asOption));
  }

  orElseSome<B>(onNone: LazyArg<B>): O.Option<A | B> {
    return of(_Option.orElseSome(this.option, onNone));
  }

  getOrThrow(): A {
    return _Option.getOrThrow(this.option);
  }

  getOrThrowWith(onNone: () => unknown): A {
    return _Option.getOrThrowWith(this.option, onNone);
  }

  product<B>(that: O.Option<B>): O.Option<[A, B]> {
    return of(_Option.product(this.option, that.asOption));
  }

  productMany(collection: Iterable<O.Option<A>>): O.Option<[A, ...Array<A>]> {
    const nativeCollection = Array.from(collection).map((opt) => opt.asOption);
    return of(_Option.productMany(this.option, nativeCollection));
  }

  as<B>(b: B): O.Option<B> {
    return of(_Option.map(this.option, () => b));
  }

  get asVoid(): O.Option<void> {
    return of(_Option.asVoid(this.option));
  }

  tap<X>(f: (a: A) => O.Option<X>): O.Option<A> {
    return of(_Option.tap(this.option, (a) => f(a).asOption));
  }

  zipWith<B, C>(that: O.Option<B>, f: (a: A, b: B) => C): O.Option<C> {
    return of(_Option.zipWith(this.option, that.asOption, f));
  }

  filter<B extends A>(refinement: Refinement<NoInfer<A>, B>): O.Option<B>;
  filter(predicate: Predicate<NoInfer<A>>): O.Option<A>;
  filter<B extends A>(predicate: Predicate<NoInfer<A>> | Refinement<NoInfer<A>, B>): O.Option<B> | O.Option<A> {
    return of(_Option.filter(this.option, predicate as any));
  }

  bindTo<N extends string>(name: N): O.Option<{ [K in N]: A }> {
    return of(_Option.bindTo(this.option, name));
  }

  // TODO: add more overloads for pipe
  pipe<B>(ab: (a: O.Option<A>) => B): B;
  pipe<B, C>(ab: (a: O.Option<A>) => B, bc: (b: B) => C): C;
  pipe<B, C, D>(ab: (a: O.Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D): D;
  pipe<B, C, D, E>(ab: (a: O.Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: E) => E): E;
  pipe<B, C, D, E, F>(ab: (a: O.Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: E) => E, ef: (e: F) => F): F;
  pipe(...args: any): any {
    return pipeArguments(this, args);
  }

  bind<X extends A & object, N extends string, B>(
    this: O.Option<X>,
    name: Exclude<N, keyof X>,
    f: (a: NoInfer<X>) => O.Option<B>
  ): O.Option<{ [K in N | keyof X]: K extends keyof X ? X[K] : B }> {
    return of(_Option.bind(this.asOption, name, (a) => f(a).asOption));
  }

  let<X extends A & object, N extends string, B>(
    this: O.Option<X>,
    name: Exclude<N, keyof X>,
    f: (a: NoInfer<X>) => B
  ): O.Option<{
    [K in N | keyof X]: K extends keyof X ? X[K] : B;
  }> {
    return of(_Option.let(this.asOption, name, (a) => f(a)));
  }

  ap<A, B>(this: O.Option<(a: A) => B>, that: O.Option<A>): O.Option<B> {
    return of(_Option.ap(this.asOption, that.asOption));
  }

  get asOption(): _Option.Option<A> {
    return this.option;
  }

  [NodeInspectSymbol]() {
    return this.toJSON();
  }

  toString() {
    return Inspectable.format(this.toJSON());
  }

  with<B>(f: (option: _Option.Option<A>) => _Option.Option<B>): O.Option<B> {
    return of(f(this.asOption));
  }

  abstract toJSON(): unknown;

  abstract [Equal.symbol](that: unknown): boolean;

  abstract [Hash.symbol](): number;
}

export class Some<A> extends Option<A> {
  readonly _tag = 'Some';
  readonly _op = 'Some';

  constructor(private readonly _value: A, option: _Option.Option<A>) {
    super(option);
  }

  get value(): A {
    return this._value;
  }

  toJSON(): unknown {
    return {
      _id: 'Option',
      _tag: this._tag,
      value: Inspectable.toJSON(this.value)
    };
  }

  [Equal.symbol](that: unknown): boolean {
    return is(that) && that.isSome() && Equal.equals(this.value, that.value);
  }

  [Hash.symbol]() {
    return Hash.cached(this, Hash.combine(Hash.hash(this._tag))(Hash.hash(this.value)));
  }
}

const NoneHash = Hash.hash('None');
export class None<A = never> extends Option<A> {
  readonly _tag = 'None';
  readonly _op = 'None';

  constructor(option: _Option.Option<A>) {
    super(option);
  }

  toJSON(): unknown {
    return {
      _id: 'Option',
      _tag: this._tag
    };
  }

  [Equal.symbol](that: unknown): boolean {
    return is(that) && that.isNone();
  }

  [Hash.symbol]() {
    return NoneHash;
  }
}

export const some = <A>(a: A): O.Option<A> => {
  return new Some(a, _Option.some(a));
};

export const none = <A = never>(): O.Option<A> => {
  return new None(_Option.none());
};

export const of = <A>(option: _Option.Option<A>): O.Option<A> => {
  return _Option.match(option, {
    onNone: none,
    onSome: some
  });
};

export const reduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<O.Option<A>>) => B;
  <A, B>(self: Iterable<O.Option<A>>, b: B, f: (b: B, a: A) => B): B;
} = dual(3, <A, B>(self: Iterable<O.Option<A>>, b: B, f: (b: B, a: A) => B): B => {
  const nativeCollection = Array.from(self).map((opt) => opt.asOption);
  return _Option.reduceCompact(nativeCollection, b, f);
});

export const liftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => O.Option<B>;
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => O.Option<B>;
  <A, B extends A>(self: A, refinement: Refinement<A, B>): O.Option<B>;
  <B extends A, A = B>(self: B, predicate: Predicate<A>): O.Option<B>;
} = dual(2, <B extends A, A = B>(b: B, predicate: Predicate<A>): O.Option<B> => {
  return of(_Option.liftPredicate(b, predicate));
});

const adapter = Gen.adapter<O.OptionTypeLambda>();

export const gen: Gen.Gen<O.OptionTypeLambda, Gen.Adapter<O.OptionTypeLambda>> = (...args) => {
  let f: any;
  if (args.length === 1) {
    f = args[0];
  } else {
    f = args[1].bind(args[0]);
  }
  const iterator = f(adapter);
  let state: IteratorYieldResult<any> | IteratorReturnResult<any> = iterator.next();
  if (state.done) {
    return some(state.value);
  } else {
    let current = state.value;
    if (Gen.isGenKind(current)) {
      current = current.value;
    } else {
      current = Gen.yieldWrapGet(current);
    }
    if (is(current) && current.isNone()) {
      return current;
    }
    while (!state.done) {
      state = iterator.next(current.value as never);
      if (!state.done) {
        current = state.value;
        if (Gen.isGenKind(current)) {
          current = current.value;
        } else {
          current = Gen.yieldWrapGet(current);
        }
        if (is(current) && current.isNone()) {
          return current;
        }
      }
    }
    return some(state.value);
  }
};

export const is = <A>(u: unknown): u is O.Option<A> => {
  return hasProperty(u, TypeId);
};

export const fromIterable = <A>(collection: Iterable<A>): O.Option<A> => {
  return of(_Option.fromIterable(collection));
};

export const fromNullable = <A>(nullableValue: A): O.Option<NonNullable<A>> => {
  return of(_Option.fromNullable(nullableValue));
};

// TODO: Replace with fluent `Either`
export const getRight = <R, L>(either: Either.Either<R, L>): O.Option<R> => {
  return of(_Option.getRight(either));
};

// TODO: Replace with fluent `Either`
export const getLeft = <R, L>(either: Either.Either<R, L>): O.Option<L> => {
  return of(_Option.getLeft(either));
};

export const toRefinement = <A, B extends A>(f: (a: A) => O.Option<B>): ((a: A) => a is B) => {
  return _Option.toRefinement((a) => f(a).asOption);
};

export const firstSomeOf = <T, C extends Iterable<O.Option<T>> = Iterable<O.Option<T>>>(
  collection: C
): [C] extends [Iterable<O.Option<infer A>>] ? O.Option<A> : never => {
  const nativeCollection = Array.from(collection).map((opt) => opt.asOption);
  const result = _Option.firstSomeOf(nativeCollection);
  return of(result) as any;
};

export const all = <const I extends Iterable<O.Option<any>> | Record<string, O.Option<any>>>(
  input: I
): [I] extends [ReadonlyArray<O.Option<any>>]
  ? O.Option<{ -readonly [K in keyof I]: [I[K]] extends [O.Option<infer A>] ? A : never }>
  : [I] extends [Iterable<O.Option<infer A>>]
  ? O.Option<Array<A>>
  : O.Option<{ -readonly [K in keyof I]: [I[K]] extends [O.Option<infer A>] ? A : never }> => {
  if (Symbol.iterator in input) {
    // TODO: refactor this
    const nativeCollection = Array.from(input as Iterable<O.Option<any>>).map((opt) => opt.asOption);
    const result = _Option.all(nativeCollection);
    return of(result) as any;
  }
  const nativeStruct: Record<string, _Option.Option<any>> = {};
  for (const key of Object.keys(input)) {
    nativeStruct[key] = (input as Record<string, O.Option<any>>)[key].asOption;
  }
  const result = _Option.all(nativeStruct);
  return of(result) as any;
};

export const void_: O.Option<void> = some(undefined);

export const getOrder = <A>(O: Order.Order<A>): Order.Order<O.Option<A>> => {
  return Order.make((self: O.Option<A>, that: O.Option<A>) => {
    if (self.isSome()) {
      return that.isSome() ? O(self.value, that.value) : 1;
    }
    return that.isSome() ? -1 : 0;
  });
};

export const liftNullable = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B | null | undefined
): ((...a: A) => O.Option<NonNullable<B>>) => {
  return (...a) => of(_Option.liftNullable(f)(...a));
};

export const liftThrowable = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): ((...a: A) => O.Option<B>) => {
  return (...a) => of(_Option.liftThrowable(f)(...a));
};

export const getEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<O.Option<A>> => {
  return Equivalence.make((x, y) => {
    if (x.isNone()) {
      return y.isNone();
    }
    if (y.isNone()) {
      return false;
    }
    return isEquivalent(x.value, y.value);
  });
};

export const Do: O.Option<{}> = some({});

export const lift2 = <A, B, C>(
  f: (a: A, b: B) => C
): {
  (that: O.Option<B>): (self: O.Option<A>) => O.Option<C>;
  (self: O.Option<A>, that: O.Option<B>): O.Option<C>;
} => {
  return dual(
    2,
    (self: O.Option<A>, that: O.Option<B>): O.Option<C> => of(_Option.lift2(f)(self.asOption, that.asOption))
  );
};
