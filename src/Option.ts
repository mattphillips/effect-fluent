import { Unify } from 'effect';
import { TypeLambda } from 'effect/HKT';
import {
  all,
  Do,
  firstSomeOf,
  fromIterable,
  fromNullable,
  gen,
  getEquivalence,
  getLeft,
  getOrder,
  getRight,
  is,
  lift2,
  liftNullable,
  liftPredicate,
  liftThrowable,
  None,
  none,
  of,
  reduceCompact,
  Some,
  some,
  toRefinement,
  void_,
  TypeId
} from './internal/option.js';

export { TypeId };

export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this['Target']>;
}

export interface OptionUnify<A extends { [Unify.typeSymbol]?: any }> {
  Option?: () => A[Unify.typeSymbol] extends Option<infer A0> | infer _ ? Option<A0> : never;
}

export interface OptionUnifyIgnore {}

export type Option<A> = Some<A> | None<A>;

export namespace Option {
  export type Some<A> = InstanceType<typeof Some<A>>;
  export type None<A = never> = InstanceType<typeof None<A>>;
}

export const Option = {
  of,
  some,
  none,
  is,
  fromIterable,
  fromNullable,
  getRight,
  getLeft,
  toRefinement,
  firstSomeOf,
  all,
  void: void_,
  getOrder,
  reduceCompact,
  liftPredicate,
  liftNullable,
  liftThrowable,
  getEquivalence,
  lift2,
  gen,
  Do
};
