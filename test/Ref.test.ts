import { Effect } from 'src/Effect.js';
import { describe, it } from '../src/vitest/index.js';
import { assertTrue, strictEqual } from '../src/vitest/utils.js';
import { Ref } from 'src/Ref.js';
import { Readable } from 'src/Readable.js';

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

export const Active: State = { _tag: 'Active' };
export const Changed: State = { _tag: 'Changed' };
export const Closed: State = { _tag: 'Closed' };

describe('Ref', () => {
  it.effect('implements Readable', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(123);
      assertTrue(Readable.is(ref));
    })
  );

  it.effect('implements Effectable', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(123);
      strictEqual(yield* ref, 123);
    })
  );

  it.effect('get', () =>
    Effect.gen(function* () {
      const result = yield* Ref.make(current).flatMap((r) => r.get);
      strictEqual(result, current);
    })
  );

  it.effect('getAndSet', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result1 = yield* ref.getAndSet(update);
      const result2 = yield* ref.get;

      strictEqual(result1, current);
      strictEqual(result2, update);
    })
  );

  it.effect('getAndUpdate', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result1 = yield* ref.getAndUpdate(() => update);
      const result2 = yield* ref.get;
      strictEqual(result1, current);
      strictEqual(result2, update);
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

  it.effect('modify', () =>
    Effect.gen(function* () {
      const ref = yield* Ref.make(current);
      const result1 = yield* ref.modify(() => ['hello', update]);
      const result2 = yield* ref.get;
      strictEqual(result1, 'hello');
      strictEqual(result2, update);
    })
  );
});
