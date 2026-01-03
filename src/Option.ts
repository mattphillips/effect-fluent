import { Option as _Option, Equal, Hash, Inspectable, Order, Either, Equivalence, Unify } from 'effect';
import { type LazyArg, dual, isFunction } from 'effect/Function';
import { TypeLambda } from 'effect/HKT';
import { NodeInspectSymbol } from 'effect/Inspectable';
import { pipeArguments } from 'effect/Pipeable';
import { hasProperty, isObject, type Predicate, type Refinement } from 'effect/Predicate';
import { Covariant, NotFunction, NoInfer } from 'effect/Types';
import * as Gen from 'effect/Utils';

/*
TODO:
- Effect prototype
*/

export const TypeId: unique symbol = Symbol.for('effect-fluent/Option');

export type TypeId = typeof TypeId;

export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this['Target']>;
}

export interface OptionUnify<A extends { [Unify.typeSymbol]?: any }> {
  Option?: () => A[Unify.typeSymbol] extends Option<infer A0> | infer _ ? Option<A0> : never;
}

export interface OptionUnifyIgnore {}

abstract class OptionBase<A> implements Inspectable.Inspectable {
  abstract readonly _tag: 'Some' | 'None';
  abstract readonly _op: 'Some' | 'None';

  [Symbol.iterator]() {
    return new Gen.SingleShotGen(new Gen.YieldWrap(this)) as any;
  }

  [Unify.typeSymbol]?: unknown;
  [Unify.unifySymbol]?: OptionUnify<this>;
  [Unify.ignoreSymbol]?: OptionUnifyIgnore;

  get [TypeId](): {
    readonly _A: Covariant<A>;
  } {
    return {
      _A: (_: never) => _
    };
  }

  constructor(protected readonly option: _Option.Option<A>) {}

  map<B>(f: (a: A) => B): Option<B> {
    return Option.of(_Option.map(this.option, f));
  }

  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return Option.of(_Option.flatMap(this.option, (a) => f(a).asOption));
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

  andThen<B>(f: (a: A) => Option<B>): Option<B>;
  andThen<B>(option: Option<B>): Option<B>;
  andThen<B>(f: (a: A) => B): Option<B>;
  andThen<B>(f: NotFunction<B>): Option<B>;
  andThen<B>(f: ((a: A) => Option<B>) | Option<B> | ((a: A) => B) | NotFunction<B>): Option<B> {
    return Option.of(
      _Option.andThen(this.option, (a) => {
        const b = isFunction(f) ? f(a) : f;

        return Option.is(b) ? b.asOption : _Option.some(b);
      })
    );
  }

  orElse<B>(that: LazyArg<Option<B>>): Option<A | B> {
    return Option.of(_Option.orElse(this.option, () => that().asOption));
  }

  // TODO: Replace with fluent `Either`
  partitionMap<B, C>(f: (a: A) => Either.Either<C, B>): [left: Option<B>, right: Option<C>] {
    const [leftOpt, rightOpt] = _Option.partitionMap(this.option, f);
    return [Option.of(leftOpt), Option.of(rightOpt)];
  }

  filterMap<B>(f: (a: A) => Option<B>): Option<B> {
    return Option.of(_Option.filterMap(this.option, (a) => f(a).asOption));
  }

  flatMapNullable<B>(f: (a: A) => B | null | undefined): Option<NonNullable<B>> {
    return Option.of(_Option.flatMapNullable(this.option, f));
  }

  containsWith(isEquivalent: (self: A, that: A) => boolean, a: A): boolean {
    return _Option.containsWith(isEquivalent)(a)(this.option);
  }

  contains(a: A): boolean {
    return _Option.contains(this.option, a);
  }

  exists<B extends A>(refinement: Refinement<NoInfer<A>, B>): this is Option<B>;
  exists(predicate: Predicate<NoInfer<A>>): boolean;
  exists<B extends A>(predicate: Predicate<NoInfer<A>> | Refinement<NoInfer<A>, B>): this is Option<B> {
    return _Option.exists(this.option, predicate);
  }

  // TODO: Replace with fluent `Either`
  orElseEither<B>(that: LazyArg<Option<B>>): Option<Either.Either<B, A>> {
    return Option.of(_Option.orElseEither(this.option, () => that().asOption));
  }

  orElseSome<B>(onNone: LazyArg<B>): Option<A | B> {
    return Option.of(_Option.orElseSome(this.option, onNone));
  }

  getOrThrow(): A {
    return _Option.getOrThrow(this.option);
  }

  getOrThrowWith(onNone: () => unknown): A {
    return _Option.getOrThrowWith(this.option, onNone);
  }

  product<B>(that: Option<B>): Option<[A, B]> {
    return Option.of(_Option.product(this.option, that.asOption));
  }

  productMany(collection: Iterable<Option<A>>): Option<[A, ...Array<A>]> {
    const nativeCollection = Array.from(collection).map((opt) => opt.asOption);
    return Option.of(_Option.productMany(this.option, nativeCollection));
  }

  as<B>(b: B): Option<B> {
    return Option.of(_Option.map(this.option, () => b));
  }

  get asVoid(): Option<void> {
    return Option.of(_Option.asVoid(this.option));
  }

  tap<X>(f: (a: A) => Option<X>): Option<A> {
    return Option.of(_Option.tap(this.option, (a) => f(a).asOption));
  }

  zipWith<B, C>(that: Option<B>, f: (a: A, b: B) => C): Option<C> {
    return Option.of(_Option.zipWith(this.option, that.asOption, f));
  }

  filter<B extends A>(refinement: Refinement<NoInfer<A>, B>): Option<B>;
  filter(predicate: Predicate<NoInfer<A>>): Option<A>;
  filter<B extends A>(predicate: Predicate<NoInfer<A>> | Refinement<NoInfer<A>, B>): Option<B> | Option<A> {
    return Option.of(_Option.filter(this.option, predicate as any));
  }

  bindTo<N extends string>(name: N): Option<{ [K in N]: A }> {
    return Option.of(_Option.bindTo(this.option, name));
  }

  pipe<B>(ab: (a: Option<A>) => B): B;
  pipe<B, C>(ab: (a: Option<A>) => B, bc: (b: B) => C): C;
  pipe<B, C, D>(ab: (a: Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D): D;
  pipe<B, C, D, E>(ab: (a: Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: E) => E): E;
  pipe<B, C, D, E, F>(ab: (a: Option<A>) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: E) => E, ef: (e: F) => F): F;
  pipe(...args: any): any {
    return pipeArguments(this, args);
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

  abstract toJSON(): unknown;

  abstract [Equal.symbol](that: unknown): boolean;

  abstract [Hash.symbol](): number;
}

class Some<A> extends OptionBase<A> {
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
    return Option.is(that) && that.isSome() && Equal.equals(this.value, that.value);
  }

  [Hash.symbol]() {
    return Hash.cached(this, Hash.combine(Hash.hash(this._tag))(Hash.hash(this.value)));
  }
}

const NoneHash = Hash.hash('None');
class None<A = never> extends OptionBase<A> {
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
    return Option.is(that) && that.isNone();
  }

  [Hash.symbol]() {
    return NoneHash;
  }
}

export type Option<A> = Some<A> | None<A>;

const ap: {
  <A>(that: Option<A>): <B>(self: Option<(a: A) => B>) => Option<B>;
  <A, B>(self: Option<(a: A) => B>, that: Option<A>): Option<B>;
} = dual(
  2,
  <A, B>(self: Option<(a: A) => B>, that: Option<A>): Option<B> => Option.of(_Option.ap(self.asOption, that.asOption))
);

const reduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<Option<A>>) => B;
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B;
} = dual(3, <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B => {
  const nativeCollection = Array.from(self).map((opt) => opt.asOption);
  return _Option.reduceCompact(nativeCollection, b, f);
});

const liftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>;
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>;
  <A, B extends A>(self: A, refinement: Refinement<A, B>): Option<B>;
  <B extends A, A = B>(self: B, predicate: Predicate<A>): Option<B>;
} = dual(2, <B extends A, A = B>(b: B, predicate: Predicate<A>): Option<B> => {
  return Option.of(_Option.liftPredicate(b, predicate));
});

export const bind: {
  <N extends string, A extends object, B>(name: Exclude<N, keyof A>, f: (a: NoInfer<A>) => Option<B>): (
    self: Option<A>
  ) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
} = dual(
  3,
  <N extends string, A extends object, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }> => {
    return Option.of(_Option.bind(self.asOption, name, (a) => f(a).asOption));
  }
);

const let_: {
  <N extends string, A extends object, B>(name: Exclude<N, keyof A>, f: (a: NoInfer<A>) => B): (
    self: Option<A>
  ) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
  <A extends object, N extends string, B>(self: Option<A>, name: Exclude<N, keyof A>, f: (a: NoInfer<A>) => B): Option<{
    [K in N | keyof A]: K extends keyof A ? A[K] : B;
  }>;
} = dual(
  3,
  <N extends string, A extends object, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): Option<{
    [K in N | keyof A]: K extends keyof A ? A[K] : B;
  }> => {
    return Option.of(_Option.let(self.asOption, name, (a) => f(a)));
  }
);

export const lift2 = <A, B, C>(
  f: (a: A, b: B) => C
): {
  (that: Option<B>): (self: Option<A>) => Option<C>;
  (self: Option<A>, that: Option<B>): Option<C>;
} =>
  dual(2, (self: Option<A>, that: Option<B>): Option<C> => Option.of(_Option.lift2(f)(self.asOption, that.asOption)));

const adapter = Gen.adapter<OptionTypeLambda>();

const gen: Gen.Gen<OptionTypeLambda, Gen.Adapter<OptionTypeLambda>> = (...args) => {
  let f: any;
  if (args.length === 1) {
    f = args[0];
  } else {
    f = args[1].bind(args[0]);
  }
  const iterator = f(adapter);
  let state: IteratorYieldResult<any> | IteratorReturnResult<any> = iterator.next();
  if (state.done) {
    return Option.some(state.value);
  } else {
    let current = state.value;
    if (Gen.isGenKind(current)) {
      current = current.value;
    } else {
      current = Gen.yieldWrapGet(current);
    }
    if (Option.is(current) && current.isNone()) {
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
        if (Option.is(current) && current.isNone()) {
          return current;
        }
      }
    }
    return Option.some(state.value);
  }
};

/**
 * Static methods for creating and working with Options
 */
export const Option = {
  of<A>(option: _Option.Option<A>): Option<A> {
    return _Option.match(option, {
      onNone: () => Option.none(),
      onSome: (a) => Option.some(a)
    });
  },

  some<A>(a: A): Option<A> {
    return new Some(a, _Option.some(a));
  },

  none<A = never>(): Option<A> {
    return new None(_Option.none());
  },

  is(u: unknown): u is Option<unknown> {
    return hasProperty(u, TypeId);
  },

  fromIterable<A>(collection: Iterable<A>): Option<A> {
    return Option.of(_Option.fromIterable(collection));
  },

  fromNullable<A>(nullableValue: A): Option<NonNullable<A>> {
    return Option.of(_Option.fromNullable(nullableValue));
  },

  // TODO: Replace with fluent `Either`
  getRight<R, L>(either: Either.Either<R, L>): Option<R> {
    return Option.of(_Option.getRight(either));
  },

  // TODO: Replace with fluent `Either`
  getLeft<R, L>(either: Either.Either<R, L>): Option<L> {
    return Option.of(_Option.getLeft(either));
  },

  toRefinement<A, B extends A>(f: (a: A) => Option<B>): (a: A) => a is B {
    return _Option.toRefinement((a) => f(a).asOption);
  },

  firstSomeOf<T, C extends Iterable<Option<T>> = Iterable<Option<T>>>(
    collection: C
  ): [C] extends [Iterable<Option<infer A>>] ? Option<A> : never {
    const nativeCollection = Array.from(collection).map((opt) => opt.asOption);
    const result = _Option.firstSomeOf(nativeCollection);
    return Option.of(result) as any;
  },

  all<const I extends Iterable<Option<any>> | Record<string, Option<any>>>(
    input: I
  ): [I] extends [ReadonlyArray<Option<any>>]
    ? Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>
    : [I] extends [Iterable<Option<infer A>>]
    ? Option<Array<A>>
    : Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }> {
    if (Symbol.iterator in input) {
      // TODO: refactor this
      const nativeCollection = Array.from(input as Iterable<Option<any>>).map((opt) => opt.asOption);
      const result = _Option.all(nativeCollection);
      return Option.of(result) as any;
    }
    const nativeStruct: Record<string, _Option.Option<any>> = {};
    for (const key of Object.keys(input)) {
      nativeStruct[key] = (input as Record<string, Option<any>>)[key].asOption;
    }
    const result = _Option.all(nativeStruct);
    return Option.of(result) as any;
  },

  get void(): Option<void> {
    return Option.some(undefined);
  },

  getOrder<A>(O: Order.Order<A>): Order.Order<Option<A>> {
    return Order.make((self: Option<A>, that: Option<A>) => {
      if (self.isSome()) {
        return that.isSome() ? O(self.value, that.value) : 1;
      }
      return that.isSome() ? -1 : 0;
    });
  },

  reduceCompact,

  liftPredicate,

  liftNullable<A extends ReadonlyArray<unknown>, B>(
    f: (...a: A) => B | null | undefined
  ): (...a: A) => Option<NonNullable<B>> {
    return (...a) => Option.of(_Option.liftNullable(f)(...a));
  },

  liftThrowable<A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): (...a: A) => Option<B> {
    return (...a) => Option.of(_Option.liftThrowable(f)(...a));
  },

  getEquivalence<A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Option<A>> {
    return Equivalence.make((x, y) => {
      if (x.isNone()) {
        return y.isNone();
      }
      if (y.isNone()) {
        return false;
      }
      return isEquivalent(x.value, y.value);
    });
  },

  lift2,

  gen,

  ap,

  get Do(): Option<{}> {
    return Option.some({});
  },

  bind,
  let: let_
};

export namespace Option {
  export type Some<A> = InstanceType<typeof Some<A>>;
  export type None<A = never> = InstanceType<typeof None<A>>;
}
