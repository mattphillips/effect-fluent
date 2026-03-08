import { describe, it } from '@effect-fluent/vitest';
import { deepStrictEqual, strictEqual } from '@effect-fluent/vitest/utils';
import { Effect as _Effect, ServiceMap } from 'effect';
import { Effect } from '../../src/Effect.js';

describe('Effect', () => {
  describe('gen', () => {
    it.effect('fluent effects can be yielded from the primitive gen', () => {
      return Effect.gen(function* () {
        const result = yield* Effect.succeed(42);
        strictEqual(result, 42);
      });
    });

    it.effect('primitive effects can be yielded from the fluent gen', () => {
      return Effect.gen(function* () {
        const result = yield* _Effect.succeed(42);
        strictEqual(result, 42);
      });
    });

    it.effect('fluent effects can be yielded from the fluent gen', () => {
      return Effect.gen(function* () {
        const result = yield* Effect.succeed(42);
        strictEqual(result, 42);
      });
    });

    it.effect('mixing fluent and primitive effects is supported', () => {
      return Effect.gen(function* () {
        const result = yield* Effect.succeed(42);
        const result2 = yield* _Effect.succeed(42);
        strictEqual(result + result2, 84);
      });
    });

    it.effect('primitve services can be yielded from the fluent gen', () => {
      interface Database {
        readonly query: (sql: string) => _Effect.Effect<Array<unknown>>;
      }

      const Database = ServiceMap.Service<
        Database,
        { readonly query: (sql: string) => _Effect.Effect<Array<unknown>> }
      >('Database');

      return Effect.gen(function* () {
        const database = yield* Database;
        const result = yield* database.query('SELECT 1');
        deepStrictEqual(result, [1]);
      })
        .asEffect()
        .pipe(
          // TODO: Replace `provideService` with a more fluent version
          _Effect.provideService(Database, { query: () => _Effect.succeed([1]) }),
          Effect.of
        );
    });

    it.effect('fluent services can be yielded from the fluent gen', () => {
      interface Database {
        readonly query: (sql: string) => Effect<Array<unknown>>;
      }

      const Database = ServiceMap.Service<Database, { readonly query: (sql: string) => Effect<Array<unknown>> }>(
        'Database'
      );

      return Effect.gen(function* () {
        const database = yield* Database;
        const result = yield* database.query('SELECT 1');
        deepStrictEqual(result, [1]);
      })
        .asEffect()
        .pipe(
          // TODO: Replace `provideService` with a more fluent version
          _Effect.provideService(Database, { query: () => Effect.succeed([1]) }),
          Effect.of
        );
    });

    it.effect('can pass this to generator', () => {
      class MyService {
        readonly local = 1;
        compute = Effect.gen(this, function* () {
          return yield* Effect.succeed(this.local + 1);
        });
      }
      const instance = new MyService();

      return instance.compute.map((n) => {
        strictEqual(n, 2);
      });
    });
  });
});
