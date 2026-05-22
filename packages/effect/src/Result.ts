import { Effect as _Effect, Equal, Equivalence, Hash } from 'effect';
import type { LazyArg } from 'effect/Function';
import { dual, identity } from 'effect/Function';
import type { TypeLambda } from 'effect/HKT';
import * as _Option from 'effect/Option';
import { pipeArguments } from 'effect/Pipeable';
import * as _Result from 'effect/Result';
import type { Predicate, Refinement } from 'effect/Predicate';
import { hasProperty, isFunction } from 'effect/Predicate';
import type { NoInfer, NotFunction } from 'effect/Types';
import * as Gen from 'effect/Utils';
import { Inspectable } from './Inspectable.js';
import { Option } from './Option.js';

export const ResultTypeId: unique symbol = Symbol.for('~effect-fluent/Result') as ResultTypeId;
export type ResultTypeId = typeof ResultTypeId;

export interface ResultTypeLambda extends TypeLambda {
  readonly type: Result<this['Target'], this['Out1']>;
}

export interface ResultIterator<T extends Result<any, any>> {
  next(...args: ReadonlyArray<any>): IteratorResult<T, T extends Result<infer A, any> ? A : never>;
}

abstract class ResultBase<out A, out E> extends Inspectable {
  private readonly result: _Result.Result<A, E>;
  abstract readonly _tag: 'Success' | 'Failure';
  abstract readonly _op: 'Success' | 'Failure';
  readonly [ResultTypeId]: ResultTypeId = ResultTypeId;

  constructor(result: _Result.Result<A, E>) {
    super();
    this.result = result;
  }

  asResult(): _Result.Result<A, E> {
    return this.result;
  }

  pipe() {
    return pipeArguments(this, arguments);
  }

  // --- Equal & Hash ---

  [Equal.symbol](that: unknown): boolean {
    return is(that) && Equal.equals(this.result, that.asResult());
  }

  [Hash.symbol](): number {
    return Hash.hash(this.result);
  }

  // --- Type guards ---

  isSuccess(): this is Success<A, E> {
    return this._tag === 'Success';
  }

  isFailure(): this is Failure<A, E> {
    return this._tag === 'Failure';
  }

  // --- Generator interop ---

  // Explicit conversion to an Effect — `Effect.fromResult` lifts Failure into
  // an Effect failure. Use this (or `Effect.fromResult`) to yield a Result
  // inside `Effect.gen`; the Result itself is only yieldable inside
  // `Result.gen`.
  asEffect(): _Effect.Effect<A, E> {
    return _Effect.fromResult(this.result);
  }

  [Symbol.iterator](): ResultIterator<Result<A, E>> {
    return new Gen.SingleShotGen(this) as any;
  }

  // --- Instance methods: Pattern matching ---

  match<B, C = B>(options: { readonly onFailure: (error: E) => B; readonly onSuccess: (a: A) => C }): B | C {
    return _Result.match(this.result, options);
  }

  // --- Instance methods: Mapping ---

  map<B>(f: (a: A) => B): Result<B, E> {
    return wrap(_Result.map(this.result, f));
  }

  mapError<E2>(f: (e: E) => E2): Result<A, E2> {
    return wrap(_Result.mapError(this.result, f));
  }

  mapBoth<E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): Result<A2, E2> {
    return wrap(_Result.mapBoth(this.result, options));
  }

  // --- Instance methods: Sequencing ---

  flatMap<B, E2>(f: (a: A) => Result<B, E2>): Result<B, E | E2> {
    return wrap(_Result.flatMap(this.result, (a) => f(a).asResult()));
  }

  andThen<B, E2>(f: (a: A) => Result<B, E2>): Result<B, E | E2>;
  andThen<B, E2>(f: Result<B, E2>): Result<B, E | E2>;
  andThen<B>(f: (a: A) => B): Result<B, E>;
  andThen<B>(f: NotFunction<B>): Result<B, E>;
  andThen(f: any): Result<any, any> {
    return this.flatMap((a) => {
      const b = isFunction(f) ? f(a) : f;
      if (b != null && typeof b === 'object' && ResultTypeId in b) {
        return b as Result<any, any>;
      }
      return new Success(b);
    });
  }

  tap(f: (a: A) => void): Result<A, E> {
    return wrap(_Result.tap(this.result, f));
  }

  // --- Instance methods: Getters ---

  getOrElse<B>(onFailure: (e: E) => B): A | B {
    return _Result.getOrElse(this.result, onFailure);
  }

  get getOrNull(): A | null {
    return _Result.getOrNull(this.result);
  }

  get getOrUndefined(): A | undefined {
    return _Result.getOrUndefined(this.result);
  }

  get getOrThrow(): A {
    return _Result.getOrThrow(this.result);
  }

  getOrThrowWith(onFailure: (e: E) => unknown): A {
    return _Result.getOrThrowWith(this.result, onFailure);
  }

  get merge(): A | E {
    return _Result.merge(this.result);
  }

  // --- Instance methods: Error handling ---

  orElse<A2, E2>(that: (err: E) => Result<A2, E2>): Result<A | A2, E2> {
    return wrap(_Result.orElse(this.result, (e) => that(e).asResult()));
  }

  get flip(): Result<E, A> {
    return wrap(_Result.flip(this.result));
  }

  filterOrFail<B extends A, E2>(refinement: Refinement<A, B>, orFailWith: (a: A) => E2): Result<B, E | E2>;
  filterOrFail<E2>(predicate: Predicate<A>, orFailWith: (a: A) => E2): Result<A, E | E2>;
  filterOrFail(predicate: Predicate<A>, orFailWith: (a: A) => unknown): Result<A, any> {
    return wrap(_Result.filterOrFail(this.result, predicate, orFailWith));
  }

  // --- Instance methods: Conversions to fluent Option ---

  get getSuccess(): Option<A> {
    return this.isSuccess() ? Option.some(this.success) : Option.none();
  }

  get getFailure(): Option<E> {
    return this.isFailure() ? Option.some(this.failure) : Option.none();
  }

  // --- Instance methods: Do notation ---

  bindTo<N extends string>(name: N): Result<{ [K in N]: A }, E> {
    return wrap(_Result.bindTo(this.result, name));
  }

  with<B, E2>(f: (result: _Result.Result<A, E>) => _Result.Result<B, E2>): Result<B, E | E2> {
    return wrap(f(this.result));
  }
}

// --- Success and Failure classes ---

class Success<out A, out E> extends ResultBase<A, E> {
  readonly _tag = 'Success' as const;
  readonly _op = 'Success' as const;
  readonly success: A;

  constructor(value: A) {
    super(_Result.succeed(value));
    this.success = value;
  }

  toJSON(): unknown {
    return { _id: 'Result', _tag: 'Success', value: this.success };
  }
}

class Failure<out A, out E> extends ResultBase<A, E> {
  readonly _tag = 'Failure' as const;
  readonly _op = 'Failure' as const;
  readonly failure: E;

  constructor(error: E) {
    super(_Result.fail(error));
    this.failure = error;
  }

  toJSON(): unknown {
    return { _id: 'Result', _tag: 'Failure', failure: this.failure };
  }
}

// --- Public type alias ---

export type Result<A, E = never> = Success<A, E> | Failure<A, E>;

type _Success<A, E> = Success<A, E>;
type _Failure<A, E> = Failure<A, E>;

export namespace Result {
  export type Success<A, E = never> = _Success<A, E>;
  export type Failure<A, E> = _Failure<A, E>;
}

// --- Static functions ---

const succeed = <A>(value: A): Result<A> => new Success(value);

const fail = <E>(error: E): Result<never, E> => new Failure(error);

const void_: Result<void> = succeed(undefined as void);

const failVoid: Result<never, void> = fail(undefined as void);

const wrap = <A, E>(r: _Result.Result<A, E>): Result<A, E> => {
  return _Result.isSuccess(r) ? new Success(r.success) : new Failure(r.failure);
};

const is = (u: unknown): u is Result<unknown, unknown> => hasProperty(u, ResultTypeId);

const try_: {
  <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }): Result<A, E>;
  <A>(evaluate: LazyArg<A>): Result<A, unknown>;
} = <A, E>(
  evaluate: LazyArg<A> | { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E }
): Result<A, E> | Result<A, unknown> => {
  if (isFunction(evaluate)) {
    return wrap(_Result.try(evaluate));
  } else {
    return wrap(_Result.try(evaluate));
  }
};

const fromNullishOr: {
  <A, E>(onNullish: (a: A) => E): (self: A) => Result<NonNullable<A>, E>;
  <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E>;
} = dual(2, <A, E>(self: A, onNullish: (a: A) => E): Result<NonNullable<A>, E> => {
  return wrap(_Result.fromNullishOr(self, onNullish));
});

const fromOption: {
  <E>(onNone: () => E): <A>(self: Option<A>) => Result<A, E>;
  <A, E>(self: Option<A>, onNone: () => E): Result<A, E>;
} = dual(2, <A, E>(self: Option<A>, onNone: () => E): Result<A, E> => {
  return wrap(_Result.fromOption(self.asOption(), onNone));
});

const liftPredicate: {
  <A, B extends A, E>(refinement: Refinement<A, B>, orFailWith: (a: A) => E): (a: A) => Result<B, E>;
  <B extends A, E, A = B>(predicate: Predicate<A>, orFailWith: (a: A) => E): (b: B) => Result<B, E>;
  <A, E, B extends A>(self: A, refinement: Refinement<A, B>, orFailWith: (a: A) => E): Result<B, E>;
  <B extends A, E, A = B>(self: B, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<B, E>;
} = dual(3, <A, E>(a: A, predicate: Predicate<A>, orFailWith: (a: A) => E): Result<A, E> => {
  return wrap(_Result.liftPredicate(a, predicate, orFailWith));
});

const all: {
  <const I extends Iterable<Result<any, any>> | Record<string, Result<any, any>>>(
    input: I
  ): [I] extends [ReadonlyArray<Result<any, any>>]
    ? Result<
        { -readonly [K in keyof I]: [I[K]] extends [Result<infer A, any>] ? A : never },
        I[number] extends never ? never : [I[number]] extends [Result<any, infer E>] ? E : never
      >
    : [I] extends [Iterable<Result<infer A, infer E>>]
      ? Result<Array<A>, E>
      : Result<
          { -readonly [K in keyof I]: [I[K]] extends [Result<infer A, any>] ? A : never },
          I[keyof I] extends never ? never : [I[keyof I]] extends [Result<any, infer E>] ? E : never
        >;
} = <const I extends Iterable<Result<any, any>> | Record<string, Result<any, any>>>(input: I): any => {
  if (Symbol.iterator in input) {
    const out: Array<any> = [];
    for (const r of input as Iterable<Result<any, any>>) {
      if (r.isFailure()) return r;
      out.push(r.success);
    }
    return new Success(out);
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const r = (input as Record<string, Result<any, any>>)[key];
    if (r.isFailure()) return r;
    out[key] = r.success;
  }
  return new Success(out);
};

const gen: Gen.Gen<ResultTypeLambda> = (...args) => {
  const f = args.length === 1 ? args[0] : args[1].bind(args[0]);
  const iterator = f();
  let state: IteratorResult<any> = iterator.next();
  while (!state.done) {
    const current = state.value;
    if (current.isFailure()) {
      return current;
    }
    state = iterator.next(current.success as never);
  }
  return succeed(state.value);
};

const Do: Result<{}> = new Success({});

const bind: {
  <N extends string, A extends object, B, L2>(
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): <L1>(self: Result<A, L1>) => Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>;
  <A extends object, L1, N extends string, B, L2>(
    self: Result<A, L1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2>;
} = dual(
  3,
  <N extends string, A extends object, B, L1, L2>(
    self: Result<A, L1>,
    name: Exclude<N, keyof A>,
    f: (a: NoInfer<A>) => Result<B, L2>
  ): Result<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }, L1 | L2> => {
    return wrap(_Result.bind(self.asResult(), name, (a: A) => f(a).asResult()));
  }
);

const let_: {
  <N extends string, R extends object, B>(
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): <L>(self: Result<R, L>) => Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>;
  <R extends object, L, N extends string, B>(
    self: Result<R, L>,
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L>;
} = dual(
  3,
  <N extends string, R extends object, B, L1, L2>(
    self: Result<R, L1>,
    name: Exclude<N, keyof R>,
    f: (r: NoInfer<R>) => B
  ): Result<{ [K in N | keyof R]: K extends keyof R ? R[K] : B }, L1 | L2> => {
    return wrap(_Result.let(self.asResult(), name, (r: R) => f(r)));
  }
);

const flatten = <A, E, E2>(self: Result<Result<A, E>, E2>): Result<A, E | E2> => self.flatMap(identity);

const makeEquivalence = <A, E>(
  success: Equivalence.Equivalence<A>,
  failure: Equivalence.Equivalence<E>
): Equivalence.Equivalence<Result<A, E>> =>
  Equivalence.make((x, y) => {
    if (x.isFailure()) {
      return y.isFailure() ? failure(x.failure, y.failure) : false;
    }
    return y.isSuccess() ? success(x.success, y.success) : false;
  });

const succeedNone: Result<Option<never>> = succeed(Option.none());

const succeedSome = <A, E = never>(a: A): Result<Option<A>, E> => new Success(Option.some(a));

const transposeOption = <A = never, E = never>(self: Option<Result<A, E>>): Result<Option<A>, E> => {
  return wrap(_Result.transposeOption(self.map((r) => r.asResult()).asOption())).map(Option.wrap);
};

const transposeMapOption: {
  <A, B, E = never>(f: (self: A) => Result<B, E>): (self: Option<A>) => Result<Option<B>, E>;
  <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E>;
} = dual(2, <A, B, E = never>(self: Option<A>, f: (self: A) => Result<B, E>): Result<Option<B>, E> => {
  return wrap(_Result.transposeMapOption(self.asOption(), (a) => f(a).asResult())).map(Option.wrap);
});

export const Result = {
  succeed,
  fail,
  void: void_,
  failVoid,
  try: try_,
  wrap,
  is,
  fromNullishOr,
  fromOption,
  liftPredicate,
  all,
  gen,
  Do,
  bind,
  let: let_,
  flatten,
  makeEquivalence,
  succeedNone,
  succeedSome,
  transposeOption,
  transposeMapOption
} as const;
