import { describe, it } from '@effect-fluent/vitest';
import {
  assertFailure,
  assertSuccess,
  assertFalse,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from '@effect-fluent/vitest/utils';
import {
  Config as _Config,
  ConfigProvider,
  Effect as _Effect,
  Option as _Option,
  Redacted,
  Schema,
  SchemaIssue
} from 'effect';
import { Config } from '../src/Config.js';
import { Duration } from '../src/Duration.js';
import { Effect } from '../src/Effect.js';
import { Option } from '../src/Option.js';

async function assertConfigSuccess<T>(config: Config<T>, provider: ConfigProvider.ConfigProvider, expected: T) {
  const r = await _Effect.runPromise(config.parse(provider).result.effect);
  assertSuccess(r, expected);
}

async function assertConfigFailure<T>(config: Config<T>, provider: ConfigProvider.ConfigProvider, message: string) {
  const r = await _Effect.runPromise(
    config
      .parse(provider)
      .with((core) => _Effect.mapError(core, (e) => e.cause.message))
      .result.effect
  );
  assertFailure(r, message);
}

describe('Config', () => {
  it('a config is an Effect and can be yielded', () => {
    const provider = ConfigProvider.fromEnv({ env: { STRING: 'value' } });
    const program = Effect.gen(function* () {
      return yield* Config.schema(Schema.Struct({ STRING: Schema.String }));
    });
    const result = program.provide(ConfigProvider.layer(provider)).runSync();
    deepStrictEqual(result, { STRING: 'value' });
  });

  describe('schema', () => {
    it('should not leak any information about the value', async () => {
      const provider = ConfigProvider.fromUnknown({});
      await assertConfigFailure(
        Config.schema(Schema.Redacted(Schema.Literal('secret')), 'a'),
        provider,
        `Invalid data <redacted>
  at ["a"]`
      );
    });
  });

  describe('constructors', () => {
    it('fail', async () => {
      await assertConfigFailure(
        Config.fail(new Schema.SchemaError(new SchemaIssue.Forbidden(_Option.none(), { message: 'failure message' }))),
        ConfigProvider.fromUnknown({}),
        `failure message`
      );
    });

    it('succeed', async () => {
      const provider = ConfigProvider.fromUnknown({});
      await assertConfigSuccess(Config.succeed(1), provider, 1);
    });

    it('string', async () => {
      const provider = ConfigProvider.fromUnknown({ a: 'value' });
      await assertConfigSuccess(Config.string('a'), provider, 'value');
      await assertConfigFailure(
        Config.string('b'),
        provider,
        `Expected string, got undefined
  at ["b"]`
      );
    });

    it('nonEmptyString', async () => {
      const provider = ConfigProvider.fromUnknown({ a: 'value', b: '' }, { preserveEmptyStrings: true });
      await assertConfigSuccess(Config.nonEmptyString('a'), provider, 'value');
      await assertConfigFailure(
        Config.nonEmptyString('b'),
        provider,
        `Expected a value with a length of at least 1, got ""
  at ["b"]`
      );
    });

    it('number', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '1', c: 'c', d: 'Infinity' });
      await assertConfigSuccess(Config.number('a'), provider, 1);
      await assertConfigSuccess(Config.number('d'), provider, Infinity);
      await assertConfigFailure(
        Config.number('b'),
        provider,
        `Expected string | "Infinity" | "-Infinity" | "NaN", got undefined
  at ["b"]`
      );
    });

    it('finite', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '1', b: 'a', c: 'Infinity' });
      await assertConfigSuccess(Config.finite('a'), provider, 1);
      await assertConfigFailure(
        Config.finite('b'),
        provider,
        `Expected a string representing a finite number, got "a"
  at ["b"]`
      );
      await assertConfigFailure(
        Config.finite('c'),
        provider,
        `Expected a string representing a finite number, got "Infinity"
  at ["c"]`
      );
    });

    it('int', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '1', b: '1.2' });
      await assertConfigSuccess(Config.int('a'), provider, 1);
      await assertConfigFailure(
        Config.int('b'),
        provider,
        `Expected an integer, got 1.2
  at ["b"]`
      );
    });

    it('literal', async () => {
      const provider = ConfigProvider.fromUnknown({ a: 'L' });
      await assertConfigSuccess(Config.literal('L', 'a'), provider, 'L');
      await assertConfigFailure(
        Config.literal('-', 'a'),
        provider,
        `Expected "-", got "L"
  at ["a"]`
      );
    });

    it('literals', async () => {
      const provider = ConfigProvider.fromUnknown({ a: 'production', b: 'staging' });
      await assertConfigSuccess(Config.literals(['development', 'production'], 'a'), provider, 'production');
      await assertConfigFailure(
        Config.literals(['development', 'production'], 'b'),
        provider,
        `Expected "development" | "production", got "staging"
  at ["b"]`
      );
    });

    it('literals (numbers)', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '1', b: '3' });
      await assertConfigSuccess(Config.literals([1, 2], 'a'), provider, 1);
      await assertConfigFailure(
        Config.literals([1, 2], 'b'),
        provider,
        `Expected "1" | "2", got "3"
  at ["b"]`
      );
    });

    it('date', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '2021-01-01', b: 'invalid' });
      await assertConfigSuccess(Config.date('a'), provider, new Date('2021-01-01'));
      await assertConfigFailure(
        Config.date('b'),
        provider,
        `Expected a valid date, got Invalid Date
  at ["b"]`
      );
    });

    it('redacted', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: 'value'
      });

      await assertConfigSuccess(Config.redacted('a'), provider, Redacted.make('value'));
      await assertConfigFailure(
        Config.redacted('failure'),
        provider,
        `Invalid data <redacted>
  at ["failure"]`
      );
    });

    it('url', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: 'https://example.com'
      });

      await assertConfigSuccess(Config.url('a'), provider, new URL('https://example.com'));
      await assertConfigFailure(
        Config.url('failure'),
        provider,
        `Expected string, got undefined
  at ["failure"]`
      );
    });
  });

  describe('combinators', () => {
    it('map', async () => {
      const config = Config.schema(Schema.String);

      // Upstream exercises both the data-first and the pipe form; both
      // collapse to the fluent method.
      await assertConfigSuccess(
        config.map((value) => value.toUpperCase()),
        ConfigProvider.fromUnknown('value'),
        'VALUE'
      );
      await assertConfigSuccess(
        config.map((value) => value.toUpperCase()),
        ConfigProvider.fromUnknown('value'),
        'VALUE'
      );
    });

    it('mapOrFail', async () => {
      const config = Config.schema(Schema.String);
      const f = (s: string) =>
        s === ''
          ? Effect.fail(
              new Config.ConfigError(
                new Schema.SchemaError(new SchemaIssue.InvalidValue(_Option.some(s), { message: 'empty' }))
              )
            )
          : Effect.succeed(s.toUpperCase());

      await assertConfigSuccess(config.mapOrFail(f), ConfigProvider.fromUnknown('value'), 'VALUE');
      await assertConfigFailure(
        config.mapOrFail(f),
        ConfigProvider.fromUnknown('', { preserveEmptyStrings: true }),
        `empty`
      );
    });

    it('orElse', async () => {
      const config = Config.string('a').orElse(() => Config.finite('b'));

      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'value' }), 'value');
      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: '1' }), 1);
    });

    describe('all', () => {
      it('tuple', async () => {
        const config = Config.all([Config.nonEmptyString('a'), Config.finite('b')]);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a', b: '1' }), ['a', 1]);
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: '', b: '1' }, { preserveEmptyStrings: true }),
          `Expected a value with a length of at least 1, got ""
  at ["a"]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'a', b: 'b' }),
          `Expected a string representing a finite number, got "b"
  at ["b"]`
        );
      });

      it('iterable', async () => {
        const config = Config.all(new Set([Config.nonEmptyString('a'), Config.finite('b')]));

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a', b: '1' }), ['a', 1]);
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: '', b: '1' }, { preserveEmptyStrings: true }),
          `Expected a value with a length of at least 1, got ""
  at ["a"]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'a', b: 'b' }),
          `Expected a string representing a finite number, got "b"
  at ["b"]`
        );
      });

      it('struct', async () => {
        const config = Config.all({ a: Config.nonEmptyString('b'), c: Config.finite('d') });

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: 'b', d: '1' }), { a: 'b', c: 1 });
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ b: '', d: '1' }, { preserveEmptyStrings: true }),
          `Expected a value with a length of at least 1, got ""
  at ["b"]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ b: 'b', d: 'b' }),
          `Expected a string representing a finite number, got "b"
  at ["d"]`
        );
      });
    });

    describe('withDefault', () => {
      it('value', async () => {
        const defaultValue = 0;
        const config = Config.finite('a').withDefault(defaultValue);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), 1);
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), defaultValue);
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'value' }),
          `Expected a string representing a finite number, got "value"
  at ["a"]`
        );
      });

      it('redacted', async () => {
        const defaultValue = Redacted.make('default');
        const config = Config.redacted('a').withDefault(defaultValue);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'value' }), Redacted.make('value'));
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), defaultValue);
      });

      it('uses default for empty env strings', async () => {
        const config = Config.string('a').withDefault('default');

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' } }), 'default');
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }), '');
      });

      it('uses default for empty env numbers', async () => {
        const config = Config.number('a').withDefault(0);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' } }), 0);
        await assertConfigFailure(
          config,
          ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }),
          `Expected a string representing a finite number, got ""
  at ["a"]
Expected "Infinity" | "-Infinity" | "NaN", got ""
  at ["a"]`
        );
      });

      it('struct', async () => {
        const defaultValue = { a: 'a', c: 0 };
        const config = Config.all({ a: Config.nonEmptyString('b'), c: Config.finite('d') }).withDefault(defaultValue);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: 'b', d: '1' }), { a: 'b', c: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: 'b' }), defaultValue);
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ d: '1' }), defaultValue);

        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ b: '', d: '1' }, { preserveEmptyStrings: true }),
          `Expected a value with a length of at least 1, got ""
  at ["b"]`
        );
      });

      it('does not recover from invalid union values', async () => {
        const config = Config.logLevel('LOG_LEVEL').withDefault('Info');

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), 'Info');
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ LOG_LEVEL: 'debug' }),
          `Expected "All" | "Fatal" | "Error" | "Warn" | "Info" | "Debug" | "Trace" | "None", got "debug"
  at ["LOG_LEVEL"]`
        );
      });

      it('does not recover from filter failures', async () => {
        const schema = Schema.String.check(
          Schema.makeFilter((s) =>
            s === 'a' ? undefined : new SchemaIssue.InvalidValue(_Option.none(), { message: `must be "a"` })
          )
        );
        const config = Config.schema(schema, 'a').withDefault('fallback');

        // missing key -> default
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), 'fallback');
        // valid present value -> parsed
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a' }), 'a');
        // present value that fails the refinement must fail, not use the default
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'b' }),
          `must be "a"
  at ["a"]`
        );
      });

      it('array', async () => {
        const config = Config.schema(Schema.Array(Schema.String), 'a').withDefault(['default']);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'value' } }), ['value']);
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' } }), ['default']);
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }), []);
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: {} }), ['default']);
      });

      it('schema containers', async () => {
        const provider = ConfigProvider.fromEnv({ env: {} });

        await assertConfigSuccess(
          Config.schema(Schema.Struct({ value: Schema.String }), 'a').withDefault({ value: 'default' }),
          provider,
          { value: 'default' }
        );
        await assertConfigSuccess(
          Config.schema(Schema.Struct({ value: Schema.optionalKey(Schema.String) }), 'a').withDefault({
            value: 'default'
          }),
          provider,
          { value: 'default' }
        );
        await assertConfigSuccess(Config.schema(Schema.Struct({}), 'a').withDefault({ value: 'default' }), provider, {
          value: 'default'
        });
        await assertConfigSuccess(
          Config.schema(Schema.Record(Schema.String, Schema.String), 'a').withDefault({ value: 'default' }),
          provider,
          { value: 'default' }
        );
        await assertConfigSuccess(Config.schema(Schema.Tuple([Schema.String]), 'a').withDefault(['default']), provider, [
          'default'
        ]);
        await assertConfigSuccess(
          Config.schema(Schema.ReadonlySet(Schema.String), 'a').withDefault(new Set(['default'])),
          provider,
          new Set(['default'])
        );
        await assertConfigSuccess(
          Config.schema(Schema.ReadonlyMap(Schema.String, Schema.String), 'a').withDefault(
            new Map([['default', 'value']])
          ),
          provider,
          new Map([['default', 'value']])
        );
      });
    });

    describe('option', () => {
      it('value', async () => {
        const config = Config.finite('a').option;
        const stringConfig = Config.string('a').option;

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), Option.some(1));
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), Option.none());
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' } }), Option.none());
        await assertConfigSuccess(
          stringConfig,
          ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }),
          Option.some('')
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'value' }),
          `Expected a string representing a finite number, got "value"
  at ["a"]`
        );
      });

      it('struct', async () => {
        const config = Config.all({ a: Config.nonEmptyString('b'), c: Config.finite('d') }).option;

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: 'b', d: '1' }), Option.some({ a: 'b', c: 1 }));
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: 'b' }), Option.none());
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ d: '1' }), Option.none());
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: '', d: '1' }), Option.none());

        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ b: '', d: '1' }, { preserveEmptyStrings: true }),
          `Expected a value with a length of at least 1, got ""
  at ["b"]`
        );
      });
    });

    describe('nested', () => {
      describe('fromUnknown', () => {
        it('nested', async () => {
          const config = Config.string().nested('a');

          await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'value' }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromUnknown({}),
            `Expected string, got undefined
  at ["a"]`
          );
        });

        it('name + nested', async () => {
          const config = Config.string('a').nested('b');

          await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: { a: 'value' } }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromUnknown({}),
            `Expected string, got undefined
  at ["b"]["a"]`
          );
        });

        it('name + nested + nested', async () => {
          const config = Config.string('a').nested('b').nested('c');

          await assertConfigSuccess(config, ConfigProvider.fromUnknown({ c: { b: { a: 'value' } } }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromUnknown({ c: { b: {} } }),
            `Expected string, got undefined
  at ["c"]["b"]["a"]`
          );
        });

        it('all', async () => {
          const config = Config.all({
            host: Config.string('host'),
            port: Config.number('port')
          }).nested('database');

          await assertConfigSuccess(
            config,
            ConfigProvider.fromUnknown({ database: { host: 'localhost', port: '5432' } }),
            { host: 'localhost', port: 5432 }
          );
          await assertConfigFailure(
            config,
            ConfigProvider.fromUnknown({}),
            `Expected string, got undefined
  at ["database"]["host"]`
          );
        });
      });

      describe('fromEnv', () => {
        it('nested', async () => {
          const config = Config.string().nested('a');

          await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'value' } }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromEnv({ env: {} }),
            `Expected string, got undefined
  at ["a"]`
          );
        });

        it('name + nested', async () => {
          const config = Config.string('a').nested('b');

          await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { b_a: 'value' } }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromEnv({ env: {} }),
            `Expected string, got undefined
  at ["b"]["a"]`
          );
        });

        it('name + nested + nested', async () => {
          const config = Config.string('a').nested('b').nested('c');

          await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { c_b_a: 'value' } }), 'value');
          await assertConfigFailure(
            config,
            ConfigProvider.fromEnv({ env: { c_b: 'value' } }),
            `Expected string, got undefined
  at ["c"]["b"]["a"]`
          );
        });

        it('all', async () => {
          const config = Config.all({
            host: Config.string('host'),
            port: Config.number('port')
          }).nested('database');

          await assertConfigSuccess(
            config,
            ConfigProvider.fromEnv({ env: { database_host: 'localhost', database_port: '5432' } }),
            { host: 'localhost', port: 5432 }
          );
          await assertConfigFailure(
            config,
            ConfigProvider.fromEnv({ env: {} }),
            `Expected string, got undefined
  at ["database"]["host"]`
          );
        });

        it('config nested and provider nested compose lookup but not error paths', async () => {
          const config = Config.string('host').nested('database');
          const provider = ConfigProvider.fromEnv({
            env: { app_database_host: 'localhost' }
          }).pipe(ConfigProvider.nested('app'));

          await assertConfigSuccess(config, provider, 'localhost');
          await assertConfigFailure(
            config,
            ConfigProvider.fromEnv({ env: {} }).pipe(ConfigProvider.nested('app')),
            `Expected string, got undefined
  at ["database"]["host"]`
          );
        });

        it('provider nested over orElse keeps the logical error path', async () => {
          const provider = ConfigProvider.fromEnv({ env: { app_port: 'abc' } }).pipe(
            ConfigProvider.orElse(ConfigProvider.fromEnv({ env: {} })),
            ConfigProvider.nested('app')
          );

          await assertConfigFailure(
            Config.number('port'),
            provider,
            `Expected a string representing a finite number, got "abc"
  at ["port"]
Expected "Infinity" | "-Infinity" | "NaN", got "abc"
  at ["port"]`
          );
        });
      });
    });

    describe('unwrap', () => {
      it('plain object', async () => {
        const config = Config.unwrap({
          a: Config.schema(Schema.String, 'a2')
        });

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a2: 'value' }), { a: 'value' });
      });

      it('nested', async () => {
        const config = Config.unwrap({
          a: {
            b: Config.schema(Schema.String, 'b2')
          }
        });

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b2: 'value' }), { a: { b: 'value' } });
      });
    });
  });

  describe('Config built-in schemas', () => {
    it('Boolean', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: 'true',
        b: 'false',
        c: 'yes',
        d: 'no',
        e: 'on',
        f: 'off',
        g: '1',
        h: '0',
        i: 'y',
        j: 'n',
        failure: 'value'
      });

      await assertConfigSuccess(Config.boolean('a'), provider, true);
      await assertConfigSuccess(Config.boolean('b'), provider, false);
      await assertConfigSuccess(Config.boolean('c'), provider, true);
      await assertConfigSuccess(Config.boolean('d'), provider, false);
      await assertConfigSuccess(Config.boolean('e'), provider, true);
      await assertConfigSuccess(Config.boolean('f'), provider, false);
      await assertConfigSuccess(Config.boolean('g'), provider, true);
      await assertConfigSuccess(Config.boolean('h'), provider, false);
      await assertConfigSuccess(Config.boolean('i'), provider, true);
      await assertConfigSuccess(Config.boolean('j'), provider, false);
      await assertConfigFailure(
        Config.boolean('failure'),
        provider,
        `Expected "true" | "yes" | "on" | "1" | "y" | "false" | "no" | "off" | "0" | "n", got "value"
  at ["failure"]`
      );
    });

    it('Duration', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: '1000 millis',
        b: '1 second',
        c: 'Infinity',
        d: '-Infinity',
        failure: 'value'
      });

      await assertConfigSuccess(Config.duration('a'), provider, Duration.millis(1000));
      await assertConfigSuccess(Config.duration('b'), provider, Duration.seconds(1));
      await assertConfigSuccess(Config.duration('c'), provider, Duration.infinity);
      await assertConfigSuccess(Config.duration('d'), provider, Duration.negativeInfinity);
      await assertConfigFailure(
        Config.duration('failure'),
        provider,
        `Invalid Duration string: value
  at ["failure"]`
      );
    });

    it('Port', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: '8080',
        failure: '-1'
      });

      await assertConfigSuccess(Config.port('a'), provider, 8080);
      await assertConfigFailure(
        Config.port('failure'),
        provider,
        `Expected a value between 1 and 65535, got -1
  at ["failure"]`
      );
    });

    it('LogLevel / logLevel', async () => {
      const provider = ConfigProvider.fromUnknown({
        a: 'Info',
        failure_1: 'info',
        failure_2: 'value'
      });

      await assertConfigSuccess(Config.logLevel('a'), provider, 'Info');
      await assertConfigFailure(
        Config.logLevel('failure_1'),
        provider,
        `Expected "All" | "Fatal" | "Error" | "Warn" | "Info" | "Debug" | "Trace" | "None", got "info"
  at ["failure_1"]`
      );
      await assertConfigFailure(
        Config.logLevel('failure_2'),
        provider,
        `Expected "All" | "Fatal" | "Error" | "Warn" | "Info" | "Debug" | "Trace" | "None", got "value"
  at ["failure_2"]`
      );
    });

    describe('Record', () => {
      it('from record', async () => {
        const schema = Config.Record(Schema.String, Schema.String);
        const config = Config.schema(schema, 'OTEL_RESOURCE_ATTRIBUTES');

        await assertConfigSuccess(
          config,
          ConfigProvider.fromUnknown({
            OTEL_RESOURCE_ATTRIBUTES: {
              'service.name': 'my-service',
              'service.version': '1.0.0',
              'custom.attribute': 'value'
            }
          }),
          {
            'service.name': 'my-service',
            'service.version': '1.0.0',
            'custom.attribute': 'value'
          }
        );
      });

      it('from string', async () => {
        const schema = Config.Record(Schema.String, Schema.String);
        const config = Config.schema(schema, 'OTEL_RESOURCE_ATTRIBUTES');

        await assertConfigSuccess(
          config,
          ConfigProvider.fromEnv({
            env: {
              OTEL_RESOURCE_ATTRIBUTES: 'service.name=my-service,service.version=1.0.0,custom.attribute=value'
            }
          }),
          {
            'service.name': 'my-service',
            'service.version': '1.0.0',
            'custom.attribute': 'value'
          }
        );
      });

      it('options', async () => {
        const schema = Config.Record(Schema.String, Schema.String, { separator: '&', keyValueSeparator: '==' });
        const config = Config.schema(schema, 'OTEL_RESOURCE_ATTRIBUTES');

        await assertConfigSuccess(
          config,
          ConfigProvider.fromEnv({
            env: {
              OTEL_RESOURCE_ATTRIBUTES: 'service.name==my-service&service.version==1.0.0&custom.attribute==value'
            }
          }),
          {
            'service.name': 'my-service',
            'service.version': '1.0.0',
            'custom.attribute': 'value'
          }
        );
      });
    });
  });

  describe('fromEnv', () => {
    it('path argument', async () => {
      await assertConfigSuccess(Config.schema(Schema.String, 'a'), ConfigProvider.fromEnv({ env: { a: 'value' } }), 'value');
      await assertConfigSuccess(
        Config.schema(Schema.String, ['a', 'b']),
        ConfigProvider.fromEnv({ env: { a_b: 'value' } }),
        'value'
      );
      await assertConfigSuccess(
        Config.schema(Schema.UndefinedOr(Schema.String)),
        ConfigProvider.fromEnv({ env: {} }),
        undefined
      );
      await assertConfigSuccess(
        Config.schema(Schema.UndefinedOr(Schema.String), 'a'),
        ConfigProvider.fromEnv({ env: {} }),
        undefined
      );
    });

    describe('leafs and containers', () => {
      it('node can be both leaf and object', async () => {
        const schema = Schema.Struct({ a: Schema.Number });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', a_b: '2' } }), { a: 1 });
      });

      it('node can be both leaf and array', async () => {
        const schema = Schema.Struct({ a: Schema.Number });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', a_0: '2' } }), { a: 1 });
      });

      it('if a node can be both object and array, it should be an object', async () => {
        const schema = Schema.Struct({ a: Schema.Struct({ b: Schema.Number }) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', a_b: '2', a_0: '3' } }), {
          a: { b: 2 }
        });
      });
    });

    it('Null', async () => {
      const schema = Schema.Null;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'null' } }), null);
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected "null", got undefined
  at ["a"]`
      );
    });

    it('String', async () => {
      const schema = Schema.String;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), 'a');
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected string, got undefined
  at ["a"]`
      );
    });

    it('Number', async () => {
      const schema = Schema.Number;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected string | "Infinity" | "-Infinity" | "NaN", got undefined
  at ["a"]`
      );
    });

    it('Finite', async () => {
      const schema = Schema.Finite;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected string, got undefined
  at ["a"]`
      );
    });

    it('Int', async () => {
      const schema = Schema.Int;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected string, got undefined
  at ["a"]`
      );
    });

    it('Boolean', async () => {
      const schema = Schema.Boolean;
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'true' } }), true);
      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'false' } }), false);
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Expected "true" | "false", got undefined
  at ["a"]`
      );
    });

    describe('Struct', () => {
      it('required properties', async () => {
        const schema = Schema.Struct({ a: Schema.Number });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: 1 });
      });

      it('optionalKey properties', async () => {
        const schema = Schema.Struct({ a: Schema.optionalKey(Schema.Number) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: {} }), {});
      });

      it('optional properties', async () => {
        const config = Config.schema(Schema.Struct({ a: Schema.optional(Schema.Number) }));

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: {} }), {});
      });

      it('literal property', async () => {
        const schema = Schema.Struct({ a: Schema.Literals(['b', 'c']) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'b' } }), { a: 'b' });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'c' } }), { a: 'c' });
      });

      it('array property', async () => {
        const schema = Schema.Struct({ a: Schema.Array(Schema.Number) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }), {
          a: []
        });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: [1] });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a_0: '1' } }), { a: [1] });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a_0: '1', a_1: '2' } }), { a: [1, 2] });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', a_0: '2' } }), { a: [1] });
        await assertConfigFailure(
          config,
          ConfigProvider.fromEnv({ env: {} }),
          `Missing key
  at ["a"]`
        );
      });
    });

    it('Record(String, Finite)', async () => {
      const schema = Schema.Record(Schema.String, Schema.Finite);
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: 1 });
      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', b: '2' } }), { a: 1, b: 2 });
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: { a: '1', b: 'value' } }),
        `Expected a string representing a finite number, got "value"
  at ["b"]`
      );
    });

    describe('Tuple', () => {
      it('empty', async () => {
        const schema = Schema.Struct({ a: Schema.Tuple([]) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '' }, preserveEmptyStrings: true }), {
          a: []
        });
      });

      it('ensure array', async () => {
        const schema = Schema.Struct({ a: Schema.Tuple([Schema.Number]) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), { a: [1] });
      });

      it('required elements', async () => {
        const schema = Schema.Struct({ a: Schema.Tuple([Schema.String, Schema.Finite]) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a_0: 'a', a_1: '2' } }), { a: ['a', 2] });
        await assertConfigFailure(
          config,
          ConfigProvider.fromEnv({ env: { a: 'a' } }),
          `Missing key
  at ["a"][1]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromEnv({ env: { a_0: 'a', a_1: 'value' } }),
          `Expected a string representing a finite number, got "value"
  at ["a"][1]`
        );
      });
    });

    it('Array(Finite)', async () => {
      const schema = Schema.Struct({ a: Schema.Array(Schema.Finite) });
      const config = Config.schema(schema);

      // ensure array
      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1,2,3' } }), { a: [1, 2, 3] });
      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a_0: '1', a_1: '2' } }), { a: [1, 2] });
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: { a: 'a', a_0: '1' } }),
        `Expected a string representing a finite number, got "a"
  at ["a"][0]`
      );
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: { a_0: '1', a_2: '2' } }),
        `Expected string, got undefined
  at ["a"][1]`
      );
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: { a_0: '1', a_1: 'value' } }),
        `Expected a string representing a finite number, got "value"
  at ["a"][1]`
      );
    });

    describe('Union', () => {
      describe('Literals', () => {
        it('string', async () => {
          const schema = Schema.Struct({ a: Schema.Literals(['a', 'b']) });
          const config = Config.schema(schema);

          await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), { a: 'a' });
          await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'b' } }), { a: 'b' });
        });
      });

      it('inclusive', async () => {
        const schema = Schema.Union([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number })]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), { a: 'a' });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { b: '1' } }), { b: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a', b: '1' } }), { a: 'a' });
      });

      it('exclusive', async () => {
        const schema = Schema.Union([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number })], {
          mode: 'oneOf'
        });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), { a: 'a' });
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { b: '1' } }), { b: 1 });
        await assertConfigFailure(
          config,
          ConfigProvider.fromEnv({ env: { a: 'a', b: '1' } }),
          `Expected exactly one member to match the input {"a":"a","b":"1"}`
        );
      });

      it('number | string', async () => {
        const schema = Schema.Union([Schema.Number, Schema.String]);
        const config = Config.schema(schema, 'a');

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), 1);
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), 'a');
      });

      it('string | number', async () => {
        const schema = Schema.Union([Schema.String, Schema.Number]);
        const config = Config.schema(schema, 'a');

        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), 1);
        await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'a' } }), 'a');
      });
    });

    it('Suspend', async () => {
      interface A {
        readonly a: string;
        readonly as: ReadonlyArray<A>;
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend((): Schema.Codec<A> => schema))
      });
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1', as: '' }, preserveEmptyStrings: true }), {
        a: '1',
        as: []
      });
      await assertConfigSuccess(
        config,
        ConfigProvider.fromEnv({ env: { a: '1', as_0_a: '2', as_0_as: '' }, preserveEmptyStrings: true }),
        {
          a: '1',
          as: [{ a: '2', as: [] }]
        }
      );
    });

    it('Redacted(Int)', async () => {
      const schema = Schema.Redacted(Schema.Int);
      const config = Config.schema(schema, 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: '1' } }), Redacted.make(1));
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: {} }),
        `Invalid data <redacted>
  at ["a"]`
      );
      await assertConfigFailure(
        config,
        ConfigProvider.fromEnv({ env: { a: '1.1' } }),
        `Invalid data <redacted>
  at ["a"]`
      );
    });
  });

  describe('fromUnknown', () => {
    it('path argument', async () => {
      await assertConfigSuccess(Config.schema(Schema.String, []), ConfigProvider.fromUnknown('value'), 'value');
      await assertConfigSuccess(Config.schema(Schema.String, 'a'), ConfigProvider.fromUnknown({ a: 'value' }), 'value');
      await assertConfigSuccess(
        Config.schema(Schema.String, ['a', 'b']),
        ConfigProvider.fromUnknown({ a: { b: 'value' } }),
        'value'
      );
    });

    it('Undefined', async () => {
      const schema = Schema.Undefined;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown(undefined), undefined);
      await assertConfigFailure(config, ConfigProvider.fromUnknown('a'), `Expected undefined, got "a"`);
    });

    it('Null', async () => {
      const schema = Schema.Null;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('null'), null);
      await assertConfigFailure(config, ConfigProvider.fromUnknown('a'), `Expected "null", got "a"`);
    });

    it('String', async () => {
      const schema = Schema.String;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('value'), 'value');
      await assertConfigFailure(config, ConfigProvider.fromUnknown({}), `Expected string, got undefined`);
    });

    it('Number', async () => {
      const schema = Schema.Number;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown('a'),
        `Expected a string representing a finite number, got "a"
Expected "Infinity" | "-Infinity" | "NaN", got "a"`
      );
    });

    it('Finite', async () => {
      const schema = Schema.Finite;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown('a'),
        `Expected a string representing a finite number, got "a"`
      );
    });

    it('Int', async () => {
      const schema = Schema.Int;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), 1);
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown('a'),
        `Expected a string representing a finite number, got "a"`
      );
    });

    it('Boolean', async () => {
      const schema = Schema.Boolean;
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown('true'), true);
      await assertConfigSuccess(config, ConfigProvider.fromUnknown('false'), false);
      await assertConfigFailure(config, ConfigProvider.fromUnknown('a'), `Expected "true" | "false", got "a"`);
    });

    describe('Struct', () => {
      it('required properties', async () => {
        const schema = Schema.Struct({ a: Schema.Finite });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: 1 });
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({}),
          `Missing key
  at ["a"]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'value' }),
          `Expected a string representing a finite number, got "value"
  at ["a"]`
        );
      });

      it('optionalKey properties', async () => {
        const schema = Schema.Struct({ a: Schema.optionalKey(Schema.Number) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), {});
      });

      it('optional properties', async () => {
        const config = Config.schema(Schema.Struct({ a: Schema.optional(Schema.Number) }));

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({}), {});
      });

      it('literal property', async () => {
        const schema = Schema.Struct({ a: Schema.Literals(['b', 'c']) });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'b' }), { a: 'b' });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'c' }), { a: 'c' });
      });

      it('array property', async () => {
        const schema = Schema.Struct({ a: Schema.Array(Schema.Number) });
        const config = Config.schema(schema);

        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: '' }),
          `Missing key
  at ["a"]`
        );
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '' }, { preserveEmptyStrings: true }), {
          a: []
        });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: [1] });
      });
    });

    it('Record(String, Finite)', async () => {
      const schema = Schema.Record(Schema.String, Schema.Finite);
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: 1 });
      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1', b: '2' }), { a: 1, b: 2 });
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown({ a: '1', b: 'value' }),
        `Expected a string representing a finite number, got "value"
  at ["b"]`
      );
    });

    describe('Tuple', () => {
      it('ensure array', async () => {
        const schema = Schema.Tuple([Schema.Number]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown(['1']), [1]);
        await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), [1]);
      });

      it('required elements', async () => {
        const schema = Schema.Tuple([Schema.String, Schema.Finite]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown(['a', '2']), ['a', 2]);
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown(['a']),
          `Missing key
  at [1]`
        );
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown(['a', 'value']),
          `Expected a string representing a finite number, got "value"
  at [1]`
        );
      });
    });

    it('Array(Finite)', async () => {
      const schema = Schema.Array(Schema.Finite);
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown(['1']), [1]);
      // ensure array
      await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), [1]);
      await assertConfigSuccess(config, ConfigProvider.fromUnknown(['1', '2']), [1, 2]);
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown(['1', 'value']),
        `Expected a string representing a finite number, got "value"
  at [1]`
      );
    });

    describe('Union', () => {
      describe('Literals', () => {
        it('string', async () => {
          const schema = Schema.Literals(['a', 'b']);
          const config = Config.schema(schema);

          await assertConfigSuccess(config, ConfigProvider.fromUnknown('a'), 'a');
          await assertConfigSuccess(config, ConfigProvider.fromUnknown('b'), 'b');
        });
      });

      it('inclusive', async () => {
        const schema = Schema.Union([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number })]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a' }), { a: 'a' });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: '1' }), { b: 1 });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a', b: '1' }), { a: 'a' });
      });

      it('exclusive', async () => {
        const schema = Schema.Union([Schema.Struct({ a: Schema.String }), Schema.Struct({ b: Schema.Number })], {
          mode: 'oneOf'
        });
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'a' }), { a: 'a' });
        await assertConfigSuccess(config, ConfigProvider.fromUnknown({ b: '1' }), { b: 1 });
        await assertConfigFailure(
          config,
          ConfigProvider.fromUnknown({ a: 'a', b: '1' }),
          `Expected exactly one member to match the input {"a":"a","b":"1"}`
        );
      });

      it('number | string', async () => {
        const schema = Schema.Union([Schema.Number, Schema.String]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), 1);
        await assertConfigSuccess(config, ConfigProvider.fromUnknown('a'), 'a');
      });

      it('string | number', async () => {
        const schema = Schema.Union([Schema.String, Schema.Number]);
        const config = Config.schema(schema);

        await assertConfigSuccess(config, ConfigProvider.fromUnknown('1'), 1);
        await assertConfigSuccess(config, ConfigProvider.fromUnknown('a'), 'a');
      });
    });

    it('Suspend', async () => {
      interface A {
        readonly a: string;
        readonly as: ReadonlyArray<A>;
      }
      const schema = Schema.Struct({
        a: Schema.String,
        as: Schema.Array(Schema.suspend((): Schema.Codec<A> => schema))
      });
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1', as: [] }), { a: '1', as: [] });
      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1', as: [{ a: '2', as: [] }] }), {
        a: '1',
        as: [{ a: '2', as: [] }]
      });
    });

    it('Redacted(Int)', async () => {
      const schema = Schema.Struct({ a: Schema.Redacted(Schema.Int) });
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: '1' }), { a: Redacted.make(1) });
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown({}),
        `Missing key
  at ["a"]`
      );
      await assertConfigFailure(
        config,
        ConfigProvider.fromUnknown({ a: '1.1' }),
        `Invalid data <redacted>
  at ["a"]`
      );
    });

    it('URL', async () => {
      const schema = Schema.Struct({ a: Schema.URL });
      const config = Config.schema(schema);

      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: 'https://example.com' }), {
        a: new URL('https://example.com')
      });
    });
  });

  // The tests below patch upstream coverage holes.

  describe('coverage holes', () => {
    it('Array schema value parses flat strings, arrays, and custom separators', async () => {
      const config = Config.schema(Config.Array(Schema.String), 'a');

      await assertConfigSuccess(config, ConfigProvider.fromEnv({ env: { a: 'x,y,z' } }), ['x', 'y', 'z']);
      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ a: ['x', 'y'] }), ['x', 'y']);

      const custom = Config.schema(Config.Array(Schema.String, { separator: '|' }), 'a');
      await assertConfigSuccess(custom, ConfigProvider.fromEnv({ env: { a: 'x|y|z' } }), ['x', 'y', 'z']);

      const numbers = Config.schema(Config.Array(Schema.FiniteFromString), 'a');
      await assertConfigSuccess(numbers, ConfigProvider.fromEnv({ env: { a: '1,2,3' } }), [1, 2, 3]);
    });

    it('Boolean and Port schema values work with Config.schema', async () => {
      const provider = ConfigProvider.fromUnknown({ flag: 'yes', port: '8080' });

      await assertConfigSuccess(Config.schema(Config.Boolean, 'flag'), provider, true);
      await assertConfigSuccess(Config.schema(Config.Port, 'port'), provider, 8080);
    });

    it('LogLevel schema value works with Config.schema', async () => {
      const provider = ConfigProvider.fromUnknown({ level: 'Debug' });

      await assertConfigSuccess(Config.schema(Config.LogLevel, 'level'), provider, 'Debug');
    });

    it('parse accepts an explicit pathPrefix', async () => {
      const provider = ConfigProvider.fromUnknown({ app: { HOST: 'localhost' } });
      const value = await _Effect.runPromise(Config.string('HOST').parse(provider, ['app']).effect);
      strictEqual(value, 'localhost');
    });

    it('parse returns a fluent Effect that keeps chaining', async () => {
      const provider = ConfigProvider.fromUnknown({ HOST: 'localhost' });
      const value = await _Effect.runPromise(
        Config.string('HOST')
          .parse(provider)
          .map((host) => host.toUpperCase()).effect
      );
      strictEqual(value, 'LOCALHOST');
    });

    it('duration parses to the fluent Duration', async () => {
      const provider = ConfigProvider.fromUnknown({ TIMEOUT: '5 seconds' });
      const duration = await _Effect.runPromise(Config.duration('TIMEOUT').parse(provider).effect);
      assertTrue(Duration.is(duration));
      strictEqual(duration.toMillis, 5000);
    });

    it('option parses to the fluent Option', async () => {
      const provider = ConfigProvider.fromUnknown({ a: '1' });
      const some = await _Effect.runPromise(Config.finite('a').option.parse(provider).effect);
      assertTrue(Option.is(some));
      strictEqual(some.getOrUndefined, 1);

      const none = await _Effect.runPromise(Config.finite('missing').option.parse(provider).effect);
      assertTrue(Option.is(none));
      assertTrue(none.isNone());
    });

    it('unwrap returns a fluent Config input as-is', () => {
      const config = Config.string('HOST');
      strictEqual(Config.unwrap(config), config);
    });

    it('Success extracts the parsed value type', () => {
      const port = Config.number('PORT');
      const value: Config.Success<typeof port> = 3000;
      strictEqual(value, 3000);
    });

    it('toJSON and toString mirror the core representation', () => {
      const config = Config.succeed(1);
      deepStrictEqual(config.toJSON(), { _id: 'Config' });
      strictEqual(config.toString(), String(config.config));
    });

    it.effect('a fluent Config can be yielded inside fluent Effect.gen', () =>
      Effect.gen(function* () {
        const value = yield* Config.succeed(42);
        strictEqual(value, 42);
      })
    );
  });

  describe('core interop', () => {
    it('wrap and the config getter round-trip the underlying config', () => {
      const core = _Config.string('HOST');
      const fluent = Config.wrap(core);
      assertTrue(fluent.config === core);
    });

    it('is identifies fluent Configs', () => {
      assertTrue(Config.is(Config.string('HOST')));
      assertFalse(Config.is(_Config.string('HOST'))); // core configs are not fluent configs
      assertFalse(Config.is(null));
      assertFalse(Config.is({ parse: () => {} }));
    });

    it('the config getter unboxes for direct core usage', () => {
      // Fluent Configs are yieldable inside gen; for any other core usage the
      // supported path is explicit unboxing via the config getter.
      const provider = ConfigProvider.fromUnknown({ HOST: 'localhost' });
      const value = _Effect.runSync(_Effect.provide(Config.string('HOST').config, ConfigProvider.layer(provider)));
      strictEqual(value, 'localhost');
    });

    it('with applies a core transformation and re-wraps', async () => {
      const config = Config.string('HOST').with((core) => _Config.map(core, (host) => host.length));
      assertTrue(Config.is(config));
      await assertConfigSuccess(config, ConfigProvider.fromUnknown({ HOST: 'localhost' }), 9);
    });
  });
});
