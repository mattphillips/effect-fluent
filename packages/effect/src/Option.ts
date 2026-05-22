import { Equal, Equivalence, Hash, Result } from 'effect';
import type { Filter } from 'effect/Filter';
import { dual, type LazyArg } from 'effect/Function';
import type { TypeLambda } from 'effect/HKT';
import * as _Option from 'effect/Option';
import type { Order } from 'effect/Order';
import * as order from 'effect/Order';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty, isFunction } from 'effect/Predicate';
import type { NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import { Inspectable } from './Inspectable.js';

export const OptionTypeId: unique symbol = Symbol.for('~effect-fluent/Option') as OptionTypeId;
export type OptionTypeId = typeof OptionTypeId;

export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this['Target']>;
}

export interface OptionIterator<T extends Option<any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<T, T extends Option<infer A> ? A : never>;
}

abstract class OptionBase<out A> extends Inspectable {
  private readonly option: _Option.Option<A>;
  abstract readonly _tag: 'Some' | 'None';
  abstract readonly _op: 'Some' | 'None';
  readonly [OptionTypeId]: OptionTypeId = OptionTypeId;

  constructor(option: _Option.Option<A>) {
    super();
    this.option = option;
  }

  asOption(): _Option.Option<A> {
    return this.option;
  }

  // --- Equal & Hash ---

  [Equal.symbol](that: unknown): boolean {
    return is(that) && Equal.equals(this.option, that.asOption());
  }

  [Hash.symbol](): number {
    return Hash.hash(this.option);
  }

  // --- Type guards ---

  isSome(): this is Some<A> {
    return this._tag === 'Some';
  }

  isNone(): this is None<A> {
    return this._tag === 'None';
  }

  // --- Generator interop ---

  [Symbol.iterator](): OptionIterator<Option<A>> {
    return new Gen.SingleShotGen(this) as any;
  }

  // --- Instance methods: Pattern matching ---

  match<B, C = B>(options: { readonly onNone: LazyArg<B>; readonly onSome: (a: A) => C }): B | C {
    return _Option.match(this.option, options);
  }

  // --- Instance methods: Mapping ---

  map<B>(f: (a: A) => B): Option<B> {
    return wrap(_Option.map(this.option, f));
  }

  as<B>(value: B): Option<B> {
    return wrap(_Option.as(this.option, value));
  }

  get asVoid(): Option<void> {
    return wrap(_Option.asVoid(this.option));
  }

  // --- Instance methods: Sequencing ---

  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    return wrap(_Option.flatMap(this.option, (a) => f(a).option));
  }

  andThen<B>(f: (a: A) => Option<B>): Option<B>;
  andThen<B>(f: Option<B>): Option<B>;
  andThen<B>(f: (a: A) => B): Option<B>;
  andThen<B>(f: NotFunction<B>): Option<B>;
  andThen(f: any): Option<any> {
    return this.flatMap((a) => {
      const b = isFunction(f) ? f(a) : f;
      if (b != null && typeof b === 'object' && OptionTypeId in b) {
        return b as Option<any>;
      }
      return new Some(b);
    });
  }

  tap<X>(f: (a: A) => Option<X>): Option<A> {
    return wrap(_Option.tap(this.option, (a) => f(a).option));
  }

  flatMapNullishOr<B>(f: (a: A) => B): Option<NonNullable<B>> {
    return wrap(_Option.flatMapNullishOr(this.option, f));
  }

  // --- Instance methods: Getters ---

  getOrElse<B>(onNone: LazyArg<B>): A | B {
    return _Option.getOrElse(this.option, onNone);
  }

  get getOrNull(): A | null {
    return _Option.getOrNull(this.option);
  }

  get getOrUndefined(): A | undefined {
    return _Option.getOrUndefined(this.option);
  }

  get getOrThrow(): A {
    return _Option.getOrThrow(this.option);
  }

  getOrThrowWith(onNone: () => unknown): A {
    return _Option.getOrThrowWith(this.option, onNone);
  }

  // --- Instance methods: Fallbacks ---

  orElse<B>(that: LazyArg<Option<B>>): Option<A | B> {
    return wrap(_Option.orElse(this.option, () => that().option));
  }

  orElseSome<B>(value: LazyArg<B>): Option<A | B> {
    return wrap(_Option.orElseSome(this.option, value));
  }

  // --- Instance methods: Zipping ---

  zipWith<B, C>(that: Option<B>, f: (a: A, b: B) => C): Option<C> {
    return wrap(_Option.zipWith(this.option, that.option, f));
  }

  zipRight<B>(that: Option<B>): Option<B> {
    return wrap(_Option.zipRight(this.option, that.option));
  }

  zipLeft<B>(that: Option<B>): Option<A> {
    return wrap(_Option.zipLeft(this.option, that.option));
  }

  product<B>(that: Option<B>): Option<[A, B]> {
    return wrap(_Option.product(this.option, that.option));
  }

  productMany(others: Iterable<Option<A>>): Option<[A, ...Array<A>]> {
    return wrap(
      _Option.productMany(
        this.option,
        (function* (iter: Iterable<Option<A>>) {
          for (const o of iter) yield o.option;
        })(others)
      )
    );
  }

  // --- Instance methods: Filtering ---

  filter<B extends A>(refinement: Refinement<A, B>): Option<B>;
  filter(predicate: Predicate<A>): Option<A>;
  filter(predicate: Predicate<A>): Option<A> {
    return wrap(_Option.filter(this.option, predicate));
  }

  filterMap<B, X>(f: Filter<A, B, X>): Option<B> {
    return wrap(_Option.filterMap(this.option, f));
  }

  partitionMap<B, C>(f: (a: A) => Result.Result<C, B>): [left: Option<B>, right: Option<C>] {
    const [left, right] = _Option.partitionMap(this.option, f);
    return [wrap(left), wrap(right)];
  }

  // --- Instance methods: Conversions/checks ---

  get toArray(): Array<A> {
    return _Option.toArray(this.option);
  }

  exists(predicate: Predicate<A>): boolean {
    return _Option.exists(this.option, predicate);
  }

  contains(value: A): boolean {
    return _Option.contains(this.option, value);
  }

  // --- Instance methods: Do notation ---

  bindTo<N extends string>(name: N): Option<{ [K in N]: A }> {
    return wrap(_Option.bindTo(this.option, name));
  }

  with<B>(f: (option: _Option.Option<A>) => _Option.Option<B>): Option<B> {
    return wrap(f(this.option));
  }
}

// --- Some and None classes ---

class Some<out A> extends OptionBase<A> {
  readonly _tag = 'Some' as const;
  readonly _op = 'Some' as const;
  readonly value: A;

  constructor(value: A) {
    super(_Option.some(value));
    this.value = value;
  }

  toJSON(): unknown {
    return { _id: 'Option', _tag: 'Some', value: this.value };
  }
}

class None<out A = never> extends OptionBase<A> {
  readonly _tag = 'None' as const;
  readonly _op = 'None' as const;

  constructor() {
    super(_Option.none<A>());
  }

  toJSON(): unknown {
    return { _id: 'Option', _tag: 'None' };
  }
}

// --- Public type alias ---

type _Some<A> = Some<A>;
type _None<A> = None<A>;

export type Option<A> = Some<A> | None<A>;

export namespace Option {
  export type Some<A> = _Some<A>;
  export type None<A = never> = _None<A>;
}

// --- Static functions (merged onto Option via declaration merging) ---

const some = <A>(value: A): Option<A> => new Some(value);

const none = <A = never>(): Option<A> => new None<A>();

const wrap = <A>(o: _Option.Option<A>): Option<A> => {
  return _Option.isSome(o) ? new Some(o.value) : new None<A>();
};

const is = (u: unknown): u is Option<unknown> => hasProperty(u, OptionTypeId);

const fromNullishOr = <A>(value: A): Option<NonNullable<A>> => wrap(_Option.fromNullishOr(value));

const fromUndefinedOr = <A>(value: A): Option<Exclude<A, undefined>> =>
  wrap(_Option.fromUndefinedOr(value)) as Option<Exclude<A, undefined>>;

const fromNullOr = <A>(value: A): Option<Exclude<A, null>> =>
  wrap(_Option.fromNullOr(value)) as Option<Exclude<A, null>>;

const fromIterable = <A>(collection: Iterable<A>): Option<A> => wrap(_Option.fromIterable(collection));

const getSuccess = <A, E>(self: Result.Result<A, E>): Option<A> =>
  Result.isSuccess(self) ? new Some(self.success) : new None<A>();

const getFailure = <A, E>(self: Result.Result<A, E>): Option<E> =>
  Result.isFailure(self) ? new Some(self.failure) : new None<E>();

const firstSomeOf = <A>(collection: Iterable<Option<A>>): Option<A> => {
  for (const o of collection) {
    if (o.isSome()) return o;
  }
  return new None<A>();
};

const flatten = <A>(self: Option<Option<A>>): Option<A> => self.flatMap((inner) => inner);

const all: {
  <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(
    input: I
  ): [I] extends [ReadonlyArray<Option<any>>]
    ? Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>
    : [I] extends [Iterable<Option<infer A>>]
      ? Option<Array<A>>
      : Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>;
} = <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(input: I): any => {
  if (Symbol.iterator in input) {
    const out: Array<any> = [];
    for (const o of input as Iterable<Option<any>>) {
      if (o.isNone()) return o;
      out.push(o.value);
    }
    return new Some(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const o = (input as Record<string, Option<any>>)[key];
    if (o.isNone()) return o;
    out[key] = o.value;
  }
  return new Some(out);
};

const gen: Gen.Gen<OptionTypeLambda> = (...args) => {
  const f = args.length === 1 ? args[0] : args[1].bind(args[0]);
  const iterator = f();
  let state: IteratorResult<any> = iterator.next();
  while (!state.done) {
    const current = state.value;
    if (current.isNone()) {
      return current;
    }
    state = iterator.next(current.value as never);
  }
  return some(state.value);
};

const Do: Option<{}> = new Some({});

const bind: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
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
    return wrap(_Option.bind(self.asOption(), name, (a: A) => f(a).asOption()));
  }
);

const let_: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => B
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>;
} = dual(
  3,
  <N extends string, A extends object, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }> => {
    return wrap(_Option.let(self.asOption(), name, (a: A) => f(a))) as any;
  }
);

const liftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>;
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>;
  <A, B extends A>(self: A, refinement: Refinement<A, B>): Option<B>;
  <B extends A, A = B>(self: B, predicate: Predicate<A>): Option<B>;
} = dual(2, <B extends A, A = B>(b: B, predicate: Predicate<A>): Option<B> => {
  return wrap(_Option.liftPredicate(b, predicate));
});

const liftThrowable = <A extends ReadonlyArray<unknown>, B>(f: (...a: A) => B): ((...a: A) => Option<B>) => {
  return (...a) => wrap(_Option.liftThrowable(f)(...a));
};

const liftNullishOr = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => B
): ((...a: A) => Option<NonNullable<B>>) => {
  return (...a) => fromNullishOr(f(...a));
};

const composeK = <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>): ((a: A) => Option<C>) => {
  return (a: A) => afb(a).flatMap(bfc);
};

const toRefinement = <A, B extends A>(f: (a: A) => Option<B>): ((a: A) => a is B) => {
  return (a: A): a is B => f(a).isSome();
};

const makeEquivalence = <A>(isEquivalent: Equivalence.Equivalence<A>): Equivalence.Equivalence<Option<A>> => {
  return Equivalence.make((x, y) => {
    if (x.isSome()) {
      return y.isSome() ? isEquivalent(x.value, y.value) : false;
    }
    return y.isNone();
  });
};

const makeOrder = <A>(O: Order<A>): Order<Option<A>> => {
  return order.make((self, that) => {
    if (self.isSome()) {
      return that.isSome() ? O(self.value, that.value) : 1;
    }
    return that.isSome() ? -1 : 0;
  });
};

const containsWith = <A>(isEquivalent: (self: A, that: A) => boolean): ((self: Option<A>, a: A) => boolean) => {
  return (self, a) => (self.isSome() ? isEquivalent(self.value, a) : false);
};

const reduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<Option<A>>) => B;
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B;
} = dual(3, <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B => {
  const nativeCollection = Array.from(self).map((opt) => opt.asOption());
  return _Option.reduceCompact(nativeCollection, b, f);
});

const lift2 = <A, B, C>(
  f: (a: A, b: B) => C
): {
  (that: Option<B>): (self: Option<A>) => Option<C>;
  (self: Option<A>, that: Option<B>): Option<C>;
} => {
  return dual(2, (self: Option<A>, that: Option<B>): Option<C> => {
    return wrap(_Option.lift2(f)(self.asOption(), that.asOption()));
  });
};

export const Option = {
  some,
  none,
  wrap,
  is,
  fromNullishOr,
  fromUndefinedOr,
  fromNullOr,
  fromIterable,
  getSuccess,
  getFailure,
  firstSomeOf,
  flatten,
  all,
  gen,
  Do,
  bind,
  let: let_,
  liftPredicate,
  liftThrowable,
  liftNullishOr,
  composeK,
  toRefinement,
  makeEquivalence,
  makeOrder,
  lift2,
  containsWith,
  reduceCompact
} as const;
