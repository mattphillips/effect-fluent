import { Option } from 'effect';
import { describe, it } from '@effect-fluent/vitest';
import { deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Effect } from '../src/Effect.js';
import { Ref } from '../src/Ref.js';

const current = 'value';
const update = 'new value';

type State = Active | Changed | Closed;

interface Active {
  readonly _tag: 'Active';
}

interface Changed {
  readonly _tag: 'Changed';
}

interface Closed {
  readonly _tag: 'Closed';
}

const Active: State = { _tag: 'Active' };
const Changed: State = { _tag: 'Changed' };
const Closed: State = { _tag: 'Closed' };

const isActive = (self: State): boolean => self._tag === 'Active';
const isChanged = (self: State): boolean => self._tag === 'Changed';
const isClosed = (self: State): boolean => self._tag === 'Closed';

describe('Ref', () => {
  it.effect('get', () =>
    Effect.gen(function* () {
      const ref = Ref.makeUnsafe(current);
      const result = yield* ref.get;
      strictEqual(result, current);
    })
  );

  it.effect('getAndSet', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result = yield* ref.getAndSet(update);
      strictEqual(result, current);
    })
  );

  it.effect('getAndUpdate', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result = yield* ref.getAndUpdate(() => update);
      strictEqual(result, current);
    })
  );

  it.effect('getAndUpdateSome - once', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result1 = yield* ref.getAndUpdateSome((state) => (isClosed(state) ? Option.some(Changed) : Option.none()));
      const result2 = yield* ref.get;
      strictEqual(result1, Active);
      strictEqual(result2, Active);
    })
  );

  it.effect('getAndUpdateSome - twice', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result1 = yield* ref.getAndUpdateSome((state) => (isActive(state) ? Option.some(Changed) : Option.none()));
      const result2 = yield* ref.getAndUpdateSome((state) =>
        isActive(state) ? Option.some(Changed) : isChanged(state) ? Option.some(Closed) : Option.none()
      );
      const result3 = yield* ref.get;
      strictEqual(result1, Active);
      strictEqual(result2, Changed);
      strictEqual(result3, Closed);
    })
  );

  it.effect('set', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      yield* ref.set(update);
      const result = yield* ref.get;
      strictEqual(result, update);
    })
  );

  it.effect('update', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      yield* ref.update(() => update);
      const result = yield* ref.get;
      strictEqual(result, update);
    })
  );

  it.effect('updateAndGet', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result = yield* ref.updateAndGet(() => update);
      strictEqual(result, update);
    })
  );

  it.effect('updateSome - once', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      yield* ref.updateSome((state) => (isClosed(state) ? Option.some(Changed) : Option.none()));
      const result = yield* ref.get;
      deepStrictEqual(result, Active);
    })
  );

  it.effect('updateSome - twice', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      yield* ref.updateSome((state) => (isActive(state) ? Option.some(Changed) : Option.none()));
      const result1 = yield* ref.get;
      yield* ref.updateSome((state) =>
        isActive(state) ? Option.some(Changed) : isChanged(state) ? Option.some(Closed) : Option.none()
      );
      const result2 = yield* ref.get;
      deepStrictEqual(result1, Changed);
      deepStrictEqual(result2, Closed);
    })
  );

  it.effect('updateSomeAndGet - once', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result = yield* ref.updateSomeAndGet((state) => (isClosed(state) ? Option.some(Changed) : Option.none()));
      strictEqual(result, Active);
    })
  );

  it.effect('updateSomeAndGet - twice', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result1 = yield* ref.updateSomeAndGet((state) => (isActive(state) ? Option.some(Changed) : Option.none()));
      const result2 = yield* ref.updateSomeAndGet(
        (state): Option.Option<State> =>
          isActive(state) ? Option.some(Changed) : isChanged(state) ? Option.some(Closed) : Option.none()
      );
      deepStrictEqual(result1, Changed);
      deepStrictEqual(result2, Closed);
    })
  );

  it.effect('modify', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result1 = yield* ref.modify(() => ['hello', update]);
      const result2 = yield* ref.get;
      strictEqual(result1, 'hello');
      strictEqual(result2, update);
    })
  );

  it.effect('modifySome - once', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result = yield* ref.modifySome((state) =>
        isClosed(state) ? ['active', Option.some(Active)] : ['state does not change', Option.none()]
      );
      strictEqual(result, 'state does not change');
    })
  );

  it.effect('modifySome - twice', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make<State>(Active);
      const result1 = yield* ref.modifySome((state) =>
        isActive(state) ? ['changed', Option.some(Changed)] : ['state does not change', Option.none()]
      );
      const result2 = yield* ref.modifySome((state) =>
        isActive(state)
          ? ['changed', Option.some(Changed)]
          : isChanged(state)
            ? ['closed', Option.some(Closed)]
            : ['state does not change', Option.none()]
      );
      strictEqual(result1, 'changed');
      strictEqual(result2, 'closed');
    })
  );

  it('toJSON', () => {
    const ref = Ref.makeUnsafe(42);
    deepStrictEqual(ref.toJSON(), { _id: 'Ref', ref: { current: 42 } });
  });
});
