import { describe, it } from '@effect-fluent/vitest';
import {
  assertExitFailure,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import { Context, Layer } from 'effect';
import { Cause } from '../../src/Cause.js';
import { Effect } from '../../src/Effect.js';
import { Option } from '../../src/Option.js';

// Upstream has almost no direct tests for the context/environment family
// (only "Context.Service" and the provide MemoMap test in Effect.test.ts, both
// ported below); the remaining tests patch those coverage holes.

describe('Effect', () => {
  describe('context / environment', () => {
    it('compile-time: Effect stays covariant in A, E, and R with context members present', () => {
      const narrowError: Effect<number, never> = Effect.succeed(1);
      const widenedError: Effect<number, string> = narrowError;
      const narrowSuccess: Effect<never, string> = Effect.fail('boom');
      const widenedSuccess: Effect<number, string> = narrowSuccess;
      const noRequirements: Effect<number> = Effect.succeed(1);
      const widenedRequirements: Effect<number, never, unknown> = noRequirements;
      assertTrue(Effect.is(widenedError));
      assertTrue(Effect.is(widenedSuccess));
      assertTrue(Effect.is(widenedRequirements));
    });

    it('compile-time: an unprovided effect cannot run, a provided one can', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.CompileDep');
      const requires = Effect.service(Dep).map((dep) => dep.n);
      const layer = Layer.succeed(Dep, { n: 1 });
      // Never invoked — the point is that these calls typecheck (or not).
      const rejects = () => {
        // @ts-expect-error — service adds the key's identifier to R
        void requires.runPromise();
        // @ts-expect-error — context<R>() tracks R as a requirement
        void Effect.context<typeof Dep.Identifier>().runPromise();
        // serviceOption never adds a requirement
        void Effect.serviceOption(Dep).runPromise();
        // @ts-expect-error — updateService adds the service to the requirements
        void Effect.succeed(1).updateService(Dep, (d) => d).runPromise();
        // every provider eliminates the requirement
        void requires.provide(layer).runPromise();
        void requires.provide([layer]).runPromise();
        void requires.provide(Context.make(Dep, { n: 1 })).runPromise();
        void requires.provideContext(Context.make(Dep, { n: 1 })).runPromise();
        void requires.provideService(Dep, { n: 1 }).runPromise();
        void requires.provideServiceEffect(Dep, Effect.succeed({ n: 1 })).runPromise();
        void requires.setContext(Context.make(Dep, { n: 1 })).runPromise();
      };
      assertTrue(typeof rejects === 'function');
    });

    it('compile-time: partial provision leaves the remaining requirements', () => {
      const DepA = Context.Service<{ readonly a: number }>('context.CompileDepA');
      const DepB = Context.Service<{ readonly b: number }>('context.CompileDepB');
      const requiresBoth = Effect.all([Effect.service(DepA), Effect.service(DepB)]);
      const partially = requiresBoth.provideService(DepA, { a: 1 });
      const rejects = () => {
        // @ts-expect-error — DepB is still required
        void partially.runPromise();
        void partially.provideService(DepB, { b: 2 }).runPromise();
        // @ts-expect-error — setContext demands a context covering every requirement
        requiresBoth.setContext(Context.make(DepA, { a: 1 }));
        // @ts-expect-error — provideServiceEffect keeps the acquisition's own requirements
        void Effect.service(DepA).provideServiceEffect(DepA, Effect.service(DepB).map((dep) => ({ a: dep.b }))).runPromise();
      };
      assertTrue(typeof rejects === 'function');
    });

    describe('context', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.ContextDep');

      it.effect('succeeds with the complete context of provided services', () =>
        Effect.gen(function* () {
          const services = yield* Effect.context<typeof Dep.Identifier>();
          assertTrue(Context.isContext(services));
          strictEqual(Context.get(services, Dep).n, 7);
        }).provideService(Dep, { n: 7 })
      );

      it.effect('reads the ambient fiber context beyond the tracked requirements', () =>
        Effect.gen(function* () {
          // R = never, yet the runtime context still carries the service.
          const services = yield* Effect.context();
          assertSome(Option.wrap(Context.getOption(services, Dep)), { n: 7 });
        }).provideService(Dep, { n: 7 })
      );
    });

    describe('contextWith', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.ContextWithDep');

      it.effect('derives an effect from the complete context', () =>
        Effect.gen(function* () {
          const result = yield* Effect.contextWith((context: Context.Context<typeof Dep.Identifier>) =>
            Effect.succeed(Context.get(context, Dep).n * 2)
          );
          strictEqual(result, 42);
        }).provideService(Dep, { n: 21 })
      );

      it.effect('unions the requirements of the derived effect', () =>
        Effect.gen(function* () {
          const result = yield* Effect.contextWith((_: Context.Context<never>) =>
            Effect.service(Dep).map((dep) => dep.n + 1)
          );
          strictEqual(result, 42);
        }).provideService(Dep, { n: 41 })
      );

      it.effect('can branch on service availability', () =>
        Effect.gen(function* () {
          const read = Effect.contextWith((context: Context.Context<never>) =>
            Option.wrap(Context.getOption(context, Dep)).match({
              onSome: (dep) => Effect.succeed(`available: ${dep.n}`),
              onNone: () => Effect.succeed('unavailable')
            })
          );
          strictEqual(yield* read.provideService(Dep, { n: 1 }), 'available: 1');
          strictEqual(yield* read, 'unavailable');
        })
      );
    });

    describe('service', () => {
      class ATag extends Context.Service<ATag, 'A'>()('ATag') {}

      // Ported from upstream Effect.test.ts ("Context.Service").
      it.effect('Context.Service', () =>
        Effect.service(ATag)
          .tap((_) => Effect.sync(() => strictEqual(_, 'A')))
          .provideService(ATag, 'A')
      );

      it.effect('a Reference key yields its default when absent', () =>
        Effect.gen(function* () {
          const Counter = Context.Reference<number>('context.ServiceRef', { defaultValue: () => 42 });
          // References add no requirement, so no provision is needed.
          strictEqual(yield* Effect.service(Counter), 42);
        })
      );

      it.effect('a provided Reference overrides its default', () =>
        Effect.gen(function* () {
          const Counter = Context.Reference<number>('context.ServiceRefProvided', { defaultValue: () => 42 });
          strictEqual(yield* Effect.service(Counter).provideService(Counter, 5), 5);
        })
      );
    });

    describe('serviceOption', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.ServiceOptionDep');

      it.effect('returns a fluent Some when the service is present', () =>
        Effect.gen(function* () {
          const option = yield* Effect.serviceOption(Dep);
          assertTrue(Option.is(option));
          assertSome(option, { n: 7 });
        }).provideService(Dep, { n: 7 })
      );

      it('returns a fluent None when the service is absent, without requiring it', async () => {
        // Typechecking runPromise() proves serviceOption leaves R = never.
        const option = await Effect.serviceOption(Dep).runPromise();
        assertTrue(Option.is(option));
        assertNone(option);
      });

      it.effect('returns Some of the default for an unprovided Reference', () =>
        Effect.gen(function* () {
          const Counter = Context.Reference<number>('context.ServiceOptionRef', { defaultValue: () => 42 });
          assertSome(yield* Effect.serviceOption(Counter), 42);
        })
      );
    });

    describe('provide', () => {
      class MyNumber extends Context.Service<MyNumber, number>()('MyNumber') {}
      const DepA = Context.Service<{ readonly a: number }>('context.ProvideDepA');
      const DepB = Context.Service<{ readonly b: number }>('context.ProvideDepB');
      const Base = Context.Service<{ readonly base: number }>('context.ProvideBase');

      // Ported from upstream Effect.test.ts ("provide » subsequent calls share
      // MemoMap").
      it.effect('subsequent calls share MemoMap', () =>
        Effect.gen(function* () {
          let buildCount = 0;
          const layer = Layer.sync(MyNumber, () => {
            buildCount += 1;
            return 42;
          });

          yield* Effect.void()
            .provide(layer, { local: true }) // local always builds the layer
            .provide(layer)
            .provide(layer);

          strictEqual(buildCount, 2);
        })
      );

      it('a layer satisfies the requirement so the effect can run', async () => {
        const result = await Effect.service(MyNumber)
          .map((n) => n + 1)
          .provide(Layer.succeed(MyNumber, 42))
          .runPromise();
        strictEqual(result, 43);
      });

      it.effect('accepts a non-empty array of layers', () =>
        Effect.gen(function* () {
          const result = yield* Effect.all([Effect.service(DepA), Effect.service(DepB)]).provide([
            Layer.succeed(DepA, { a: 1 }),
            Layer.succeed(DepB, { b: 2 })
          ]);
          deepStrictEqual(result, [{ a: 1 }, { b: 2 }]);
        })
      );

      it.effect('accepts a Context', () =>
        Effect.gen(function* () {
          const n = yield* Effect.service(MyNumber).provide(Context.make(MyNumber, 3));
          strictEqual(n, 3);
        })
      );

      it.effect('layer construction failures surface in the error channel', () =>
        Effect.gen(function* () {
          const failing = Layer.effect(MyNumber, Effect.fail('nope' as const).effect);
          const exit = yield* Effect.service(MyNumber).provide(failing).exit;
          assertExitFailure(exit, Cause.fail('nope'));
        })
      );

      it.effect("a layer's own requirements remain until they are provided", () =>
        Effect.gen(function* () {
          const dependent = Layer.effect(MyNumber, Effect.service(Base).map((dep) => dep.base + 1).effect);
          const program = Effect.service(MyNumber).provide(dependent);
          const rejects = () => {
            // @ts-expect-error — the layer's own requirements remain in R
            void program.runPromise();
          };
          assertTrue(typeof rejects === 'function');
          strictEqual(yield* program.provideService(Base, { base: 41 }), 42);
        })
      );
    });

    describe('provideContext', () => {
      const Logger = Context.Service<{ readonly log: (msg: string) => void }>('context.ProvideContextLogger');
      const Database = Context.Service<{ readonly query: (sql: string) => string }>('context.ProvideContextDb');
      const Dep = Context.Service<{ readonly n: number }>('context.ProvideContextDep');

      it.effect('provides multiple services at once', () =>
        Effect.gen(function* () {
          const logged: Array<string> = [];
          const context = Context.make(Logger, { log: (msg) => logged.push(msg) }).pipe(
            Context.add(Database, { query: (sql) => `Result for: ${sql}` })
          );

          const program = Effect.gen(function* () {
            const logger = yield* Effect.service(Logger);
            const db = yield* Effect.service(Database);
            logger.log('Querying database');
            return db.query('SELECT * FROM users');
          });

          const result = yield* program.provideContext(context);
          strictEqual(result, 'Result for: SELECT * FROM users');
          deepStrictEqual(logged, ['Querying database']);
        })
      );

      it.effect('overrides ambient services with the provided ones', () =>
        Effect.gen(function* () {
          const n = yield* Effect.service(Dep)
            .map((dep) => dep.n)
            .provideContext(Context.make(Dep, { n: 2 }))
            .provideService(Dep, { n: 1 });
          strictEqual(n, 2);
        })
      );

      it.effect('leaves unprovided ambient services visible', () =>
        Effect.gen(function* () {
          const [dep, db] = yield* Effect.all([Effect.service(Dep), Effect.service(Database)])
            .provideContext(Context.make(Dep, { n: 1 }))
            .provideService(Database, { query: (sql) => sql });
          strictEqual(dep.n, 1);
          strictEqual(db.query('ok'), 'ok');
        })
      );
    });

    describe('provideService', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.ProvideServiceDep');

      it.effect('satisfies the requirement with the implementation', () =>
        Effect.gen(function* () {
          const dep = yield* Effect.service(Dep).provideService(Dep, { n: 7 });
          strictEqual(dep.n, 7);
        })
      );

      it.effect('the innermost provision wins', () =>
        Effect.gen(function* () {
          const n = yield* Effect.service(Dep)
            .map((dep) => dep.n)
            .provideService(Dep, { n: 2 })
            .provideService(Dep, { n: 1 });
          strictEqual(n, 2);
        })
      );

      it.effect('applies only within the wrapped effect', () =>
        Effect.gen(function* () {
          const inner = yield* Effect.service(Dep)
            .map((dep) => dep.n)
            .provideService(Dep, { n: 2 });
          const outer = yield* Effect.service(Dep).map((dep) => dep.n);
          strictEqual(inner, 2);
          strictEqual(outer, 1);
        }).provideService(Dep, { n: 1 })
      );
    });

    describe('provideServiceEffect', () => {
      const Dep = Context.Service<{ readonly n: number }>('context.ProvideServiceEffectDep');
      const Base = Context.Service<{ readonly value: number }>('context.ProvideServiceEffectBase');

      it.effect('acquires the service effectfully before the effect runs', () =>
        Effect.gen(function* () {
          const order: Array<string> = [];
          const acquire = Effect.sync(() => {
            order.push('acquire');
            return { n: 5 };
          });
          const program = Effect.service(Dep)
            .tap(() => Effect.sync(() => order.push('use')))
            .map((dep) => dep.n);

          strictEqual(yield* program.provideServiceEffect(Dep, acquire), 5);
          deepStrictEqual(order, ['acquire', 'use']);
        })
      );

      it('does not run the acquisition until the effect itself runs', async () => {
        let acquired = 0;
        const acquire = Effect.sync(() => {
          acquired += 1;
          return { n: 1 };
        });
        const program = Effect.service(Dep).provideServiceEffect(Dep, acquire);
        strictEqual(acquired, 0);
        await program.runPromise();
        strictEqual(acquired, 1);
      });

      it.effect('acquisition failures surface in the error channel', () =>
        Effect.gen(function* () {
          const exit = yield* Effect.service(Dep).provideServiceEffect(Dep, Effect.fail('no service' as const)).exit;
          assertExitFailure(exit, Cause.fail('no service'));
        })
      );

      it.effect('the acquisition effect can itself require services', () =>
        Effect.gen(function* () {
          const acquire = Effect.service(Base).map((base) => ({ n: base.value + 1 }));
          const result = yield* Effect.service(Dep)
            .map((dep) => dep.n)
            .provideServiceEffect(Dep, acquire)
            .provideService(Base, { value: 41 });
          strictEqual(result, 42);
        })
      );
    });

    describe('setContext', () => {
      const Config = Context.Service<{ readonly greeting: string }>('context.SetContextConfig');
      const Logger = Context.Service<{ readonly log: (msg: string) => void }>('context.SetContextLogger');

      it.effect('runs the effect with the provided context as its complete environment', () =>
        Effect.gen(function* () {
          const result = yield* Effect.service(Config)
            .map((config) => `${config.greeting}, World!`)
            .setContext(Context.make(Config, { greeting: 'Hello' }));
          strictEqual(result, 'Hello, World!');
        })
      );

      it.effect('outer services are not inherited, and the outer context is restored', () =>
        Effect.gen(function* () {
          const inner = yield* Effect.serviceOption(Logger).setContext(Context.empty());
          assertNone(inner);
          const outer = yield* Effect.serviceOption(Logger);
          assertTrue(outer.isSome());
        }).provideService(Logger, { log: () => undefined })
      );
    });

    describe('updateContext', () => {
      const Logger = Context.Service<{ readonly log: (msg: string) => void }>('context.UpdateContextLogger');
      const Config = Context.Service<{ readonly name: string }>('context.UpdateContextConfig');
      const Dep = Context.Service<{ readonly n: number }>('context.UpdateContextDep');

      it.effect('provides part of the context, leaving the rest required', () =>
        Effect.gen(function* () {
          const program = Effect.service(Config).map((config) => `Hello ${config.name}!`);
          const configured = program.updateContext((context: Context.Context<typeof Logger.Identifier>) =>
            Context.add(context, Config, { name: 'World' })
          );
          // The effect now requires only the Logger service.
          const result = yield* configured.provideService(Logger, { log: () => undefined });
          strictEqual(result, 'Hello World!');
        })
      );

      it.effect('the update applies only within the wrapped effect', () =>
        Effect.gen(function* () {
          const inner = yield* Effect.service(Dep)
            .map((dep) => dep.n)
            .updateContext((context: Context.Context<typeof Dep.Identifier>) => Context.add(context, Dep, { n: 2 }));
          const outer = yield* Effect.service(Dep).map((dep) => dep.n);
          strictEqual(inner, 2);
          strictEqual(outer, 1);
        }).provideService(Dep, { n: 1 })
      );
    });

    describe('updateService', () => {
      const Counter = Context.Service<{ readonly count: number }>('context.UpdateServiceCounter');

      it.effect('transforms the service for the wrapped effect', () =>
        Effect.gen(function* () {
          const updated = yield* Effect.service(Counter)
            .map((counter) => counter.count)
            .updateService(Counter, (counter) => ({ count: counter.count + 1 }));
          strictEqual(updated, 1);
        }).provideService(Counter, { count: 0 })
      );

      it.effect('the original service is restored afterwards', () =>
        Effect.gen(function* () {
          const updated = yield* Effect.service(Counter)
            .map((counter) => counter.count)
            .updateService(Counter, (counter) => ({ count: counter.count + 1 }));
          const restored = yield* Effect.service(Counter).map((counter) => counter.count);
          strictEqual(updated, 1);
          strictEqual(restored, 0);
        }).provideService(Counter, { count: 0 })
      );
    });
  });
});
