import { Duration as _Duration, Equal } from 'effect';
import { describe, it } from '@effect-fluent/vitest';
import {
  assertFalse,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from '@effect-fluent/vitest/utils';
import { Duration } from '../src/Duration.js';

describe('Duration', () => {
  it('fromInputUnsafe', () => {
    const millis100 = Duration.millis(100);
    assertTrue(Duration.fromInputUnsafe(millis100) === millis100);

    deepStrictEqual(Duration.fromInputUnsafe(100), millis100);

    deepStrictEqual(Duration.fromInputUnsafe(10n), Duration.nanos(10n));

    deepStrictEqual(Duration.fromInputUnsafe('1 nano'), Duration.nanos(1n));
    deepStrictEqual(Duration.fromInputUnsafe('10 nanos'), Duration.nanos(10n));
    deepStrictEqual(Duration.fromInputUnsafe('1.5 nanos'), Duration.nanos(2n));
    deepStrictEqual(Duration.fromInputUnsafe('-1.5 nanos'), Duration.nanos(-2n));
    deepStrictEqual(Duration.fromInputUnsafe('1 micro'), Duration.micros(1n));
    deepStrictEqual(Duration.fromInputUnsafe('10 micros'), Duration.micros(10n));
    deepStrictEqual(Duration.fromInputUnsafe('1.5 micros'), Duration.nanos(1500n));
    deepStrictEqual(Duration.fromInputUnsafe('-1.5 micros'), Duration.nanos(-1500n));
    deepStrictEqual(Duration.fromInputUnsafe('1 milli'), Duration.millis(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 millis'), Duration.millis(10));
    deepStrictEqual(Duration.fromInputUnsafe('1 second'), Duration.seconds(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 seconds'), Duration.seconds(10));
    deepStrictEqual(Duration.fromInputUnsafe('1 minute'), Duration.minutes(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 minutes'), Duration.minutes(10));
    deepStrictEqual(Duration.fromInputUnsafe('1 hour'), Duration.hours(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 hours'), Duration.hours(10));
    deepStrictEqual(Duration.fromInputUnsafe('1 day'), Duration.days(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 days'), Duration.days(10));
    deepStrictEqual(Duration.fromInputUnsafe('1 week'), Duration.weeks(1));
    deepStrictEqual(Duration.fromInputUnsafe('10 weeks'), Duration.weeks(10));

    deepStrictEqual(Duration.fromInputUnsafe('1.5 seconds'), Duration.seconds(1.5));
    deepStrictEqual(Duration.fromInputUnsafe('-1.5 seconds'), Duration.seconds(-1.5));
    deepStrictEqual(Duration.fromInputUnsafe('Infinity'), Duration.infinity);
    deepStrictEqual(Duration.fromInputUnsafe('-Infinity'), Duration.negativeInfinity);

    deepStrictEqual(Duration.fromInputUnsafe([500, 123456789]), Duration.nanos(500123456789n));
    deepStrictEqual(Duration.fromInputUnsafe([-500, 123456789]), Duration.nanos(-500000000000n + 123456789n));
    deepStrictEqual(Duration.fromInputUnsafe([0, 1.5]), Duration.nanos(2n));
    deepStrictEqual(Duration.fromInputUnsafe([0, -1.5]), Duration.nanos(-2n));
    deepStrictEqual(Duration.fromInputUnsafe([0.0000000005, 0.5]), Duration.nanos(1n));
    deepStrictEqual(Duration.fromInputUnsafe([Infinity, 0]), Duration.infinity);
    deepStrictEqual(Duration.fromInputUnsafe([-Infinity, 0]), Duration.negativeInfinity);
    deepStrictEqual(Duration.fromInputUnsafe([NaN, 0]), Duration.zero);
    deepStrictEqual(Duration.fromInputUnsafe([0, Infinity]), Duration.infinity);
    deepStrictEqual(Duration.fromInputUnsafe([0, -Infinity]), Duration.negativeInfinity);
    deepStrictEqual(Duration.fromInputUnsafe([0, NaN]), Duration.zero);

    // object input
    deepStrictEqual(Duration.fromInputUnsafe({}), Duration.zero);
    deepStrictEqual(Duration.fromInputUnsafe({ hours: 2 }), Duration.hours(2));
    deepStrictEqual(Duration.fromInputUnsafe({ weeks: 1 }), Duration.weeks(1));
    deepStrictEqual(Duration.fromInputUnsafe({ days: 3 }), Duration.days(3));
    deepStrictEqual(Duration.fromInputUnsafe({ minutes: 45 }), Duration.minutes(45));
    deepStrictEqual(Duration.fromInputUnsafe({ seconds: 30 }), Duration.seconds(30));
    deepStrictEqual(Duration.fromInputUnsafe({ milliseconds: 500 }), Duration.millis(500));
    deepStrictEqual(Duration.fromInputUnsafe({ hours: 1, minutes: 30 }), Duration.hours(1).sum(Duration.minutes(30)));
    deepStrictEqual(Duration.fromInputUnsafe({ hours: -1 }), Duration.hours(-1));
    deepStrictEqual(Duration.fromInputUnsafe({ seconds: 1, nanoseconds: 500 }), Duration.nanos(1_000_000_500n));
    deepStrictEqual(Duration.fromInputUnsafe({ microseconds: 100 }), Duration.micros(100n));
    deepStrictEqual(Duration.fromInputUnsafe({ microseconds: -1.5 }), Duration.nanos(-1500n));
    deepStrictEqual(Duration.fromInputUnsafe({ nanoseconds: 1.5 }), Duration.nanos(2n));
    deepStrictEqual(Duration.fromInputUnsafe({ nanoseconds: -1.5 }), Duration.nanos(-2n));
    deepStrictEqual(Duration.fromInputUnsafe({ milliseconds: 0.0000005, nanoseconds: 0.5 }), Duration.nanos(1n));
    deepStrictEqual(
      Duration.fromInputUnsafe({ days: 1, hours: 2, minutes: 30, seconds: 15 }),
      Duration.days(1).sum(Duration.hours(2)).sum(Duration.minutes(30).sum(Duration.seconds(15)))
    );
  });

  it('fromInput', () => {
    const millis100 = Duration.millis(100);
    assertSome(Duration.fromInput(millis100), millis100);

    assertSome(Duration.fromInput(100), millis100);

    assertSome(Duration.fromInput(10n), Duration.nanos(10n));

    assertSome(Duration.fromInput('1 nano'), Duration.nanos(1n));
    assertSome(Duration.fromInput('10 nanos'), Duration.nanos(10n));
    assertSome(Duration.fromInput('1 micro'), Duration.micros(1n));
    assertSome(Duration.fromInput('10 micros'), Duration.micros(10n));
    assertSome(Duration.fromInput('1 milli'), Duration.millis(1));
    assertSome(Duration.fromInput('10 millis'), Duration.millis(10));
    assertSome(Duration.fromInput('1 second'), Duration.seconds(1));
    assertSome(Duration.fromInput('10 seconds'), Duration.seconds(10));
    assertSome(Duration.fromInput('1 minute'), Duration.minutes(1));
    assertSome(Duration.fromInput('10 minutes'), Duration.minutes(10));
    assertSome(Duration.fromInput('1 hour'), Duration.hours(1));
    assertSome(Duration.fromInput('10 hours'), Duration.hours(10));
    assertSome(Duration.fromInput('1 day'), Duration.days(1));
    assertSome(Duration.fromInput('10 days'), Duration.days(10));
    assertSome(Duration.fromInput('1 week'), Duration.weeks(1));
    assertSome(Duration.fromInput('10 weeks'), Duration.weeks(10));

    assertSome(Duration.fromInput('1.5 seconds'), Duration.seconds(1.5));
    assertSome(Duration.fromInput('-1.5 seconds'), Duration.seconds(-1.5));
    assertSome(Duration.fromInput('Infinity'), Duration.infinity);
    assertSome(Duration.fromInput('-Infinity'), Duration.negativeInfinity);

    assertSome(Duration.fromInput([500, 123456789]), Duration.nanos(500123456789n));
    assertSome(Duration.fromInput([-500, 123456789]), Duration.nanos(-500000000000n + 123456789n));
    assertSome(Duration.fromInput([Infinity, 0]), Duration.infinity);
    assertSome(Duration.fromInput([-Infinity, 0]), Duration.negativeInfinity);
    assertSome(Duration.fromInput([NaN, 0]), Duration.zero);
    assertSome(Duration.fromInput([0, Infinity]), Duration.infinity);
    assertSome(Duration.fromInput([0, -Infinity]), Duration.negativeInfinity);
    assertSome(Duration.fromInput([0, NaN]), Duration.zero);

    assertNone(Duration.fromInput('invalid' as any));
  });

  it('Order', () => {
    // millis
    deepStrictEqual(Duration.Order(Duration.millis(1), Duration.millis(2)), -1);
    deepStrictEqual(Duration.Order(Duration.millis(2), Duration.millis(1)), 1);
    deepStrictEqual(Duration.Order(Duration.millis(2), Duration.millis(2)), 0);
    deepStrictEqual(Duration.Order(Duration.millis(1), Duration.nanos(2_000_000n)), -1);

    // nanos
    deepStrictEqual(Duration.Order(Duration.nanos(1n), Duration.nanos(2n)), -1);
    deepStrictEqual(Duration.Order(Duration.nanos(2n), Duration.nanos(1n)), 1);
    deepStrictEqual(Duration.Order(Duration.nanos(2n), Duration.nanos(2n)), 0);
    deepStrictEqual(Duration.Order(Duration.nanos(2_000_000n), Duration.millis(1)), 1);

    // infinity
    deepStrictEqual(Duration.Order(Duration.infinity, Duration.infinity), 0);
    deepStrictEqual(Duration.Order(Duration.infinity, Duration.millis(1)), 1);
    deepStrictEqual(Duration.Order(Duration.infinity, Duration.nanos(1n)), 1);
    deepStrictEqual(Duration.Order(Duration.millis(1), Duration.infinity), -1);
    deepStrictEqual(Duration.Order(Duration.nanos(1n), Duration.infinity), -1);
  });

  it('Equivalence', () => {
    // millis
    assertTrue(Duration.Equivalence(Duration.millis(1), Duration.millis(1)));
    assertTrue(Duration.Equivalence(Duration.millis(1), Duration.nanos(1_000_000n)));
    assertFalse(Duration.Equivalence(Duration.millis(1), Duration.millis(2)));

    // nanos
    assertTrue(Duration.Equivalence(Duration.nanos(1n), Duration.nanos(1n)));
    assertTrue(Duration.Equivalence(Duration.nanos(1_000_000n), Duration.millis(1)));
    assertFalse(Duration.Equivalence(Duration.nanos(1n), Duration.nanos(2n)));

    // infinity
    assertTrue(Duration.Equivalence(Duration.infinity, Duration.infinity));
    assertFalse(Duration.Equivalence(Duration.infinity, Duration.millis(1)));
    assertFalse(Duration.Equivalence(Duration.infinity, Duration.nanos(1n)));
    assertFalse(Duration.Equivalence(Duration.millis(1), Duration.infinity));
    assertFalse(Duration.Equivalence(Duration.nanos(1n), Duration.infinity));
  });

  it('max', () => {
    deepStrictEqual(Duration.millis(1).max(Duration.millis(2)), Duration.millis(2));
    deepStrictEqual(Duration.minutes(1).max(Duration.millis(2)), Duration.minutes(1));
  });

  it('min', () => {
    deepStrictEqual(Duration.millis(1).min(Duration.millis(2)), Duration.millis(1));
    deepStrictEqual(Duration.minutes(1).min(Duration.millis(2)), Duration.millis(2));
  });

  it('clamp', () => {
    deepStrictEqual(
      Duration.millis(1).clamp({
        minimum: Duration.millis(2),
        maximum: Duration.millis(3)
      }),
      Duration.millis(2)
    );
    deepStrictEqual(
      Duration.minutes(1.5).clamp({
        minimum: Duration.minutes(1),
        maximum: Duration.minutes(2)
      }),
      Duration.minutes(1.5)
    );
  });

  it('equals', () => {
    assertTrue(Duration.hours(1).equals(Duration.minutes(60)));
  });

  it('between', () => {
    assertTrue(
      Duration.hours(1).between({
        minimum: Duration.minutes(59),
        maximum: Duration.minutes(61)
      })
    );
    assertTrue(
      Duration.minutes(1).between({
        minimum: Duration.seconds(59),
        maximum: Duration.seconds(61)
      })
    );
  });

  it('divide', () => {
    // millis
    assertSome(Duration.minutes(1).divide(2), Duration.seconds(30));
    assertSome(Duration.seconds(1).divide(3), Duration.nanos(333333333n));
    assertSome(Duration.zero.divide(2), Duration.zero);
    assertSome(Duration.minutes(1).divide(0.5), Duration.minutes(2));
    assertSome(Duration.minutes(1).divide(1.5), Duration.seconds(40));

    // nanos
    assertSome(Duration.nanos(2n).divide(2), Duration.nanos(1n));
    assertSome(Duration.nanos(1n).divide(3), Duration.zero);
    assertNone(Duration.nanos(1n).divide(0.5));
    assertNone(Duration.nanos(1n).divide(1.5));

    // infinity
    assertSome(Duration.infinity.divide(2), Duration.infinity);
    assertSome(Duration.infinity.divide(-2), Duration.negativeInfinity);
    assertSome(Duration.negativeInfinity.divide(-2), Duration.infinity);

    // divide by zero
    assertNone(Duration.minutes(1).divide(0));
    assertNone(Duration.minutes(1).divide(-0));
    assertNone(Duration.nanos(1n).divide(0));
    assertNone(Duration.nanos(1n).divide(-0));

    // bad by
    assertNone(Duration.minutes(1).divide(NaN));
    assertNone(Duration.nanos(1n).divide(NaN));
    assertNone(Duration.infinity.divide(NaN));

    assertNone(Duration.minutes(1).divide(Infinity));
    assertNone(Duration.nanos(1n).divide(Infinity));
    assertNone(Duration.infinity.divide(Infinity));

    assertNone(Duration.minutes(1).divide(-Infinity));
    assertNone(Duration.nanos(1n).divide(-Infinity));
    assertNone(Duration.infinity.divide(-Infinity));
  });

  it('divideUnsafe', () => {
    // millis
    deepStrictEqual(Duration.minutes(1).divideUnsafe(2), Duration.seconds(30));
    deepStrictEqual(Duration.seconds(1).divideUnsafe(3), Duration.nanos(333333333n));
    deepStrictEqual(Duration.zero.divideUnsafe(2), Duration.zero);
    deepStrictEqual(Duration.minutes(1).divideUnsafe(0.5), Duration.minutes(2));
    deepStrictEqual(Duration.minutes(1).divideUnsafe(1.5), Duration.seconds(40));

    // nanos
    deepStrictEqual(Duration.nanos(2n).divideUnsafe(2), Duration.nanos(1n));
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(3), Duration.zero);
    throws(() => Duration.nanos(1n).divideUnsafe(0.5));
    throws(() => Duration.nanos(1n).divideUnsafe(1.5));

    // infinity
    deepStrictEqual(Duration.infinity.divideUnsafe(2), Duration.infinity);

    // divide by zero (IEEE 754 sign rules)
    deepStrictEqual(Duration.minutes(1).divideUnsafe(0), Duration.infinity);
    deepStrictEqual(Duration.minutes(1).divideUnsafe(-0), Duration.negativeInfinity);
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(0), Duration.infinity);
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(-0), Duration.negativeInfinity);
    deepStrictEqual(Duration.nanos(-1n).divideUnsafe(0), Duration.negativeInfinity);
    deepStrictEqual(Duration.nanos(-1n).divideUnsafe(-0), Duration.infinity);
    deepStrictEqual(Duration.zero.divideUnsafe(0), Duration.zero);
    deepStrictEqual(Duration.zero.divideUnsafe(-0), Duration.zero);

    // bad by
    deepStrictEqual(Duration.minutes(1).divideUnsafe(NaN), Duration.zero);
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(NaN), Duration.zero);
    deepStrictEqual(Duration.infinity.divideUnsafe(NaN), Duration.zero);

    deepStrictEqual(Duration.minutes(1).divideUnsafe(Infinity), Duration.zero);
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(Infinity), Duration.zero);
    deepStrictEqual(Duration.infinity.divideUnsafe(Infinity), Duration.zero);

    deepStrictEqual(Duration.minutes(1).divideUnsafe(-Infinity), Duration.zero);
    deepStrictEqual(Duration.nanos(1n).divideUnsafe(-Infinity), Duration.zero);
    deepStrictEqual(Duration.infinity.divideUnsafe(-Infinity), Duration.zero);
  });

  it('times', () => {
    deepStrictEqual(Duration.seconds(1).times(60), Duration.minutes(1));
    deepStrictEqual(Duration.nanos(2n).times(10), Duration.nanos(20n));
    deepStrictEqual(Duration.infinity.times(60), Duration.infinity);
  });

  it('sum', () => {
    // millis
    deepStrictEqual(Duration.seconds(30).sum(Duration.seconds(30)), Duration.minutes(1));

    // nanos
    deepStrictEqual(Duration.nanos(30n).sum(Duration.nanos(30n)), Duration.nanos(60n));

    // infinity
    deepStrictEqual(Duration.infinity.sum(Duration.seconds(30)), Duration.infinity);
    deepStrictEqual(Duration.seconds(30).sum(Duration.infinity), Duration.infinity);
    deepStrictEqual(Duration.infinity.sum(Duration.nanos(1n)), Duration.infinity);
    deepStrictEqual(Duration.nanos(1n).sum(Duration.infinity), Duration.infinity);
    deepStrictEqual(Duration.infinity.sum(Duration.infinity), Duration.infinity);
  });

  it('subtract', () => {
    // millis
    deepStrictEqual(Duration.seconds(30).subtract(Duration.seconds(10)), Duration.seconds(20));
    deepStrictEqual(Duration.seconds(30).subtract(Duration.seconds(30)), Duration.zero);
    deepStrictEqual(Duration.seconds(30).subtract(Duration.seconds(40)), Duration.seconds(-10));

    // nanos
    deepStrictEqual(Duration.nanos(30n).subtract(Duration.nanos(10n)), Duration.nanos(20n));
    deepStrictEqual(Duration.nanos(30n).subtract(Duration.nanos(30n)), Duration.zero);
    deepStrictEqual(Duration.nanos(30n).subtract(Duration.nanos(40n)), Duration.nanos(-10n));

    // infinity
    deepStrictEqual(Duration.infinity.subtract(Duration.seconds(30)), Duration.infinity);
    deepStrictEqual(Duration.infinity.subtract(Duration.nanos(30n)), Duration.infinity);
    deepStrictEqual(Duration.seconds(30).subtract(Duration.infinity), Duration.negativeInfinity);
    deepStrictEqual(Duration.nanos(30n).subtract(Duration.infinity), Duration.negativeInfinity);
    deepStrictEqual(Duration.infinity.subtract(Duration.infinity), Duration.zero);

    // negativeInfinity
    deepStrictEqual(Duration.infinity.subtract(Duration.negativeInfinity), Duration.infinity);
    deepStrictEqual(Duration.negativeInfinity.subtract(Duration.infinity), Duration.negativeInfinity);
    deepStrictEqual(Duration.negativeInfinity.subtract(Duration.negativeInfinity), Duration.zero);
    deepStrictEqual(Duration.negativeInfinity.subtract(Duration.seconds(5)), Duration.negativeInfinity);
    deepStrictEqual(Duration.seconds(5).subtract(Duration.negativeInfinity), Duration.infinity);
  });

  it('isGreaterThan', () => {
    assertTrue(Duration.seconds(30).isGreaterThan(Duration.seconds(20)));
    assertFalse(Duration.seconds(30).isGreaterThan(Duration.seconds(30)));
    assertFalse(Duration.seconds(30).isGreaterThan(Duration.seconds(60)));

    assertTrue(Duration.nanos(30n).isGreaterThan(Duration.nanos(20n)));
    assertFalse(Duration.nanos(30n).isGreaterThan(Duration.nanos(30n)));
    assertFalse(Duration.nanos(30n).isGreaterThan(Duration.nanos(60n)));

    assertTrue(Duration.millis(1).isGreaterThan(Duration.nanos(1n)));

    assertTrue(Duration.infinity.isGreaterThan(Duration.seconds(20)));
    assertFalse(Duration.seconds(-Infinity).isGreaterThan(Duration.infinity));
    assertFalse(Duration.nanos(1n).isGreaterThan(Duration.infinity));
  });

  it('isGreaterThanOrEqualTo', () => {
    assertTrue(Duration.seconds(30).isGreaterThanOrEqualTo(Duration.seconds(20)));
    assertTrue(Duration.seconds(30).isGreaterThanOrEqualTo(Duration.seconds(30)));
    assertFalse(Duration.seconds(30).isGreaterThanOrEqualTo(Duration.seconds(60)));

    assertTrue(Duration.nanos(30n).isGreaterThanOrEqualTo(Duration.nanos(20n)));
    assertTrue(Duration.nanos(30n).isGreaterThanOrEqualTo(Duration.nanos(30n)));
    assertFalse(Duration.nanos(30n).isGreaterThanOrEqualTo(Duration.nanos(60n)));
  });

  it('isLessThan', () => {
    assertTrue(Duration.seconds(20).isLessThan(Duration.seconds(30)));
    assertFalse(Duration.seconds(30).isLessThan(Duration.seconds(30)));
    assertFalse(Duration.seconds(60).isLessThan(Duration.seconds(30)));

    assertTrue(Duration.nanos(20n).isLessThan(Duration.nanos(30n)));
    assertFalse(Duration.nanos(30n).isLessThan(Duration.nanos(30n)));
    assertFalse(Duration.nanos(60n).isLessThan(Duration.nanos(30n)));

    assertTrue(Duration.nanos(1n).isLessThan(Duration.millis(1)));
  });

  it('isLessThanOrEqualTo', () => {
    assertTrue(Duration.seconds(20).isLessThanOrEqualTo(Duration.seconds(30)));
    assertTrue(Duration.seconds(30).isLessThanOrEqualTo(Duration.seconds(30)));
    assertFalse(Duration.seconds(60).isLessThanOrEqualTo(Duration.seconds(30)));

    assertTrue(Duration.nanos(20n).isLessThanOrEqualTo(Duration.nanos(30n)));
    assertTrue(Duration.nanos(30n).isLessThanOrEqualTo(Duration.nanos(30n)));
    assertFalse(Duration.nanos(60n).isLessThanOrEqualTo(Duration.nanos(30n)));
  });

  it('toString()', () => {
    strictEqual(String(Duration.infinity), `Infinity`);
    strictEqual(String(Duration.nanos(10n)), `10 nanos`);
    strictEqual(String(Duration.millis(2)), `2 millis`);
    strictEqual(String(Duration.millis(2.125)), `2125000 nanos`);
    strictEqual(String(Duration.seconds(2)), `2000 millis`);
    strictEqual(String(Duration.seconds(2.5)), `2500 millis`);
  });

  it('format', () => {
    strictEqual(Duration.infinity.format, `Infinity`);
    strictEqual(Duration.minutes(5).format, `5m`);
    strictEqual(Duration.minutes(5.325).format, `5m 19s 500ms`);
    strictEqual(Duration.hours(3).format, `3h`);
    strictEqual(Duration.hours(3.11125).format, `3h 6m 40s 500ms`);
    strictEqual(Duration.days(2).format, `2d`);
    strictEqual(Duration.days(2.25).format, `2d 6h`);
    strictEqual(Duration.weeks(1).format, `7d`);
    strictEqual(Duration.zero.format, `0`);
  });

  it('parts', () => {
    deepStrictEqual(Duration.infinity.parts, {
      days: Infinity,
      hours: Infinity,
      minutes: Infinity,
      seconds: Infinity,
      millis: Infinity,
      nanos: Infinity
    });

    deepStrictEqual(Duration.minutes(5.325).parts, {
      days: 0,
      hours: 0,
      minutes: 5,
      seconds: 19,
      millis: 500,
      nanos: 0
    });

    deepStrictEqual(Duration.minutes(3.11125).parts, {
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 6,
      millis: 675,
      nanos: 0
    });
  });

  it('toJSON', () => {
    deepStrictEqual(Duration.seconds(2).toJSON(), { _id: 'Duration', _tag: 'Millis', millis: 2000 });
    deepStrictEqual(Duration.nanos(5n).toJSON(), { _id: 'Duration', _tag: 'Nanos', nanos: '5' });
    deepStrictEqual(Duration.millis(1.5).toJSON(), { _id: 'Duration', _tag: 'Nanos', nanos: '1500000' });
    deepStrictEqual(Duration.infinity.toJSON(), { _id: 'Duration', _tag: 'Infinity' });
  });

  it(`inspect`, async () => {
    if (typeof window === 'undefined') {
      const { inspect } = await import('node:util');
      deepStrictEqual(inspect(Duration.millis(1000)), inspect({ _id: 'Duration', _tag: 'Millis', millis: 1000 }));
    }
  });

  it('.pipe()', () => {
    deepStrictEqual(
      Duration.seconds(1).pipe((self) => self.sum(Duration.seconds(1))),
      Duration.seconds(2)
    );
  });

  it('is', () => {
    assertTrue(Duration.is(Duration.millis(100)));
    assertFalse(Duration.is(_Duration.millis(100))); // core durations are not fluent durations
    assertFalse(Duration.is(null));
  });

  it('zero', () => {
    deepStrictEqual(Duration.seconds(1).sum(Duration.zero), Duration.seconds(1));
  });

  it('weeks', () => {
    assertTrue(Equal.equals(Duration.weeks(1), Duration.days(7)));
    assertFalse(Equal.equals(Duration.weeks(1), Duration.days(1)));
  });

  it('toMillis', () => {
    strictEqual(Duration.millis(1).toMillis, 1);
    strictEqual(Duration.nanos(1n).toMillis, 0.000001);
    strictEqual(Duration.infinity.toMillis, Infinity);
  });

  it('toSeconds', () => {
    strictEqual(Duration.millis(1).toSeconds, 0.001);
    strictEqual(Duration.nanos(1n).toSeconds, 1e-9);
    strictEqual(Duration.infinity.toSeconds, Infinity);
  });

  it('toNanos', () => {
    assertSome(Duration.nanos(1n).toNanos, 1n);
    assertNone(Duration.infinity.toNanos);
    assertNone(Duration.negativeInfinity.toNanos);
    assertSome(Duration.millis(1.0005).toNanos, 1_000_500n);
    assertSome(Duration.millis(100).toNanos, 100_000_000n);
  });

  it('toNanosUnsafe', () => {
    strictEqual(Duration.nanos(1n).toNanosUnsafe, 1n);
    throws(() => Duration.infinity.toNanosUnsafe);
    strictEqual(Duration.millis(1.0005).toNanosUnsafe, 1_000_500n);
    strictEqual(Duration.millis(0.0000015).toNanosUnsafe, 2n);
    strictEqual(Duration.millis(-0.0000015).toNanosUnsafe, -2n);
    strictEqual(Duration.millis(100).toNanosUnsafe, 100_000_000n);
  });

  it('toHrTime', () => {
    deepStrictEqual(Duration.millis(1).toHrTime, [0, 1_000_000]);
    deepStrictEqual(Duration.nanos(1n).toHrTime, [0, 1]);
    deepStrictEqual(Duration.nanos(1_000_000_001n).toHrTime, [1, 1]);
    deepStrictEqual(Duration.millis(1001).toHrTime, [1, 1_000_000]);
    deepStrictEqual(Duration.infinity.toHrTime, [Infinity, 0]);
  });

  it('negative values', () => {
    // negative constructors produce negative durations
    assertTrue(Duration.millis(-1).isNegative);
    assertTrue(Duration.nanos(-1n).isNegative);
    strictEqual(Duration.millis(-1).toMillis, -1);
    strictEqual(Duration.nanos(-1n).toNanosUnsafe, -1n);

    // isNegative / isPositive
    assertTrue(Duration.seconds(-5).isNegative);
    assertFalse(Duration.zero.isNegative);
    assertFalse(Duration.seconds(5).isNegative);
    assertFalse(Duration.infinity.isNegative);
    assertTrue(Duration.negativeInfinity.isNegative);

    assertTrue(Duration.seconds(5).isPositive);
    assertFalse(Duration.zero.isPositive);
    assertFalse(Duration.seconds(-5).isPositive);
    assertTrue(Duration.infinity.isPositive);
    assertFalse(Duration.negativeInfinity.isPositive);

    // abs
    deepStrictEqual(Duration.seconds(-5).abs, Duration.seconds(5));
    deepStrictEqual(Duration.seconds(5).abs, Duration.seconds(5));
    deepStrictEqual(Duration.zero.abs, Duration.zero);
    deepStrictEqual(Duration.negativeInfinity.abs, Duration.infinity);
    deepStrictEqual(Duration.infinity.abs, Duration.infinity);

    // negate
    deepStrictEqual(Duration.seconds(5).negate, Duration.seconds(-5));
    deepStrictEqual(Duration.seconds(-5).negate, Duration.seconds(5));
    deepStrictEqual(Duration.zero.negate, Duration.zero);
    deepStrictEqual(Duration.infinity.negate, Duration.negativeInfinity);
    deepStrictEqual(Duration.negativeInfinity.negate, Duration.infinity);

    // negativeInfinity
    assertFalse(Duration.negativeInfinity.isFinite);
    assertFalse(Duration.negativeInfinity.isZero);
    strictEqual(Duration.negativeInfinity.toMillis, -Infinity);
    strictEqual(Duration.negativeInfinity.toSeconds, -Infinity);
    deepStrictEqual(Duration.negativeInfinity.toHrTime, [-Infinity, 0]);

    // format
    strictEqual(Duration.seconds(-5).format, '-5s');
    strictEqual(Duration.negativeInfinity.format, '-Infinity');

    // Order with negatives
    deepStrictEqual(Duration.Order(Duration.negativeInfinity, Duration.negativeInfinity), 0);
    deepStrictEqual(Duration.Order(Duration.negativeInfinity, Duration.seconds(-5)), -1);
    deepStrictEqual(Duration.Order(Duration.seconds(-5), Duration.negativeInfinity), 1);
    deepStrictEqual(Duration.Order(Duration.negativeInfinity, Duration.infinity), -1);
    deepStrictEqual(Duration.Order(Duration.infinity, Duration.negativeInfinity), 1);
    deepStrictEqual(Duration.Order(Duration.seconds(-5), Duration.seconds(-3)), -1);
    deepStrictEqual(Duration.Order(Duration.seconds(-3), Duration.seconds(-5)), 1);

    // Equivalence with negatives
    assertTrue(Duration.Equivalence(Duration.negativeInfinity, Duration.negativeInfinity));
    assertFalse(Duration.Equivalence(Duration.negativeInfinity, Duration.infinity));

    // sum with negativeInfinity
    deepStrictEqual(Duration.infinity.sum(Duration.negativeInfinity), Duration.zero);
    deepStrictEqual(Duration.negativeInfinity.sum(Duration.infinity), Duration.zero);
    deepStrictEqual(Duration.negativeInfinity.sum(Duration.negativeInfinity), Duration.negativeInfinity);
    deepStrictEqual(Duration.negativeInfinity.sum(Duration.seconds(5)), Duration.negativeInfinity);

    // times with negatives
    deepStrictEqual(Duration.infinity.times(-1), Duration.negativeInfinity);
    deepStrictEqual(Duration.negativeInfinity.times(-1), Duration.infinity);
    deepStrictEqual(Duration.infinity.times(0), Duration.zero);
    deepStrictEqual(Duration.seconds(5).times(-2), Duration.seconds(-10));

    // parts with negative
    deepStrictEqual(Duration.negativeInfinity.parts, {
      days: -Infinity,
      hours: -Infinity,
      minutes: -Infinity,
      seconds: -Infinity,
      millis: -Infinity,
      nanos: -Infinity
    });

    // toString with negatives
    strictEqual(String(Duration.negativeInfinity), '-Infinity');
    strictEqual(String(Duration.millis(-5)), '-5 millis');
    strictEqual(String(Duration.nanos(-10n)), '-10 nanos');

    // toJSON with negatives
    deepStrictEqual(Duration.negativeInfinity.toJSON(), { _id: 'Duration', _tag: 'NegativeInfinity' });
  });

  it('match', () => {
    const match = (self: Duration) =>
      self.match({
        onMillis: (millis) => `millis: ${millis}`,
        onNanos: (nanos) => `nanos: ${nanos}`,
        onInfinity: () => 'infinity'
      });
    strictEqual(match(Duration.millis(100)), 'millis: 100');
    strictEqual(match(Duration.nanos(10n)), 'nanos: 10');
    strictEqual(match(Duration.infinity), 'infinity');
  });

  it('matchPair', () => {
    const options = {
      onMillis: (self: number, that: number) => `millis: ${self} ${that}`,
      onNanos: (self: bigint, that: bigint) => `nanos: ${self} ${that}`,
      onInfinity: (self: Duration, that: Duration) => `infinity: ${self} ${that}`
    };

    strictEqual(Duration.millis(1).matchPair(Duration.millis(2), options), 'millis: 1 2');
    strictEqual(Duration.nanos(1n).matchPair(Duration.nanos(2n), options), 'nanos: 1 2');
    // mixed precision promotes to nanos
    strictEqual(Duration.millis(1).matchPair(Duration.nanos(2n), options), 'nanos: 1000000 2');
    // onInfinity receives the fluent wrappers
    strictEqual(Duration.infinity.matchPair(Duration.millis(1), options), 'infinity: Infinity 1 millis');
  });

  it('isFinite', () => {
    assertTrue(Duration.millis(100).isFinite);
    assertTrue(Duration.nanos(100n).isFinite);
    assertFalse(Duration.infinity.isFinite);
  });

  it('isZero', () => {
    assertTrue(Duration.zero.isZero);
    assertTrue(Duration.millis(0).isZero);
    assertTrue(Duration.nanos(0n).isZero);
    assertFalse(Duration.infinity.isZero);
    assertFalse(Duration.millis(1).isZero);
    assertFalse(Duration.nanos(1n).isZero);
  });

  it('toMinutes', () => {
    strictEqual(Duration.millis(60000).toMinutes, 1);
    strictEqual(Duration.nanos(60000000000n).toMinutes, 1);
    strictEqual(Duration.infinity.toMinutes, Infinity);
  });

  it('toHours', () => {
    strictEqual(Duration.millis(3_600_000).toHours, 1);
    strictEqual(Duration.nanos(3_600_000_000_000n).toHours, 1);
    strictEqual(Duration.infinity.toHours, Infinity);
  });

  it('toDays', () => {
    strictEqual(Duration.millis(86_400_000).toDays, 1);
    strictEqual(Duration.nanos(86_400_000_000_000n).toDays, 1);
    strictEqual(Duration.infinity.toDays, Infinity);
  });

  it('toWeeks', () => {
    strictEqual(Duration.millis(604_800_000).toWeeks, 1);
    strictEqual(Duration.nanos(604_800_000_000_000n).toWeeks, 1);
    strictEqual(Duration.infinity.toWeeks, Infinity);
  });

  it('ReducerSum', () => {
    deepStrictEqual(Duration.ReducerSum.combine(Duration.millis(1), Duration.millis(2)), Duration.millis(3));
  });

  it('CombinerMax', () => {
    deepStrictEqual(Duration.CombinerMax.combine(Duration.millis(1), Duration.millis(2)), Duration.millis(2));
  });

  it('CombinerMin', () => {
    deepStrictEqual(Duration.CombinerMin.combine(Duration.millis(1), Duration.millis(2)), Duration.millis(1));
  });

  it('fluent chaining', () => {
    const result = Duration.minutes(2).sum(Duration.seconds(30)).subtract(Duration.seconds(15)).times(2).abs;

    assertTrue(result.equals(Duration.minutes(4).sum(Duration.seconds(30))));
  });

  it('core interop', () => {
    const core = _Duration.seconds(1);
    const fluent = Duration.wrap(core);

    assertTrue(fluent.duration === core);
    deepStrictEqual(
      fluent.with((d) => _Duration.sum(d, _Duration.seconds(1))),
      Duration.seconds(2)
    );
  });
});
