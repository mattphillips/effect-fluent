import * as _Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import { describe, it } from '@effect-fluent/vitest';
import { assertNone, assertSome, assertTrue, strictEqual } from '@effect-fluent/vitest/utils';
import { Cause, CauseTypeId } from '../src/Cause.js';
import { Effect } from '../src/Effect.js';

describe('Cause', () => {
  describe('CauseTypeId', () => {
    // Upstream asserts `Cause.TypeId` is the string constant "~effect/Cause";
    // the fluent wrapper brands with its own unique symbol instead.
    it('is a symbol', () => {
      strictEqual(typeof CauseTypeId, 'symbol');
    });
  });

  describe('is', () => {
    it('returns true for Cause values', () => {
      strictEqual(Cause.is(Cause.empty), true);
      strictEqual(Cause.is(Cause.fail('error')), true);
      strictEqual(Cause.is(Cause.die('defect')), true);
      strictEqual(Cause.is(Cause.interrupt(1)), true);
    });

    it('returns false for non-Cause values', () => {
      strictEqual(Cause.is(null), false);
      strictEqual(Cause.is(undefined), false);
      strictEqual(Cause.is('string'), false);
      strictEqual(Cause.is(42), false);
      strictEqual(Cause.is({}), false);
      strictEqual(Cause.is([]), false);
    });

    it('returns false for core (non-fluent) Cause values', () => {
      strictEqual(Cause.is(_Cause.fail('error')), false);
    });
  });

  describe('isReason', () => {
    it('returns true for Reason values', () => {
      strictEqual(Cause.isReason(Cause.makeFailReason('error')), true);
      strictEqual(Cause.isReason(Cause.makeDieReason('defect')), true);
      strictEqual(Cause.isReason(Cause.makeInterruptReason(1)), true);
    });

    it('returns true for reasons extracted from a cause', () => {
      const reason = Cause.fail('error').reasons[0];
      strictEqual(Cause.isReason(reason), true);
    });

    it('returns false for non-Reason values', () => {
      strictEqual(Cause.isReason(null), false);
      strictEqual(Cause.isReason('string'), false);
      strictEqual(Cause.isReason(Cause.fail('error')), false);
    });
  });

  describe('isFailReason', () => {
    it('narrows Fail reasons', () => {
      const reason = Cause.fail('error').reasons[0];
      strictEqual(Cause.isFailReason(reason), true);
    });

    it('rejects Die and Interrupt reasons', () => {
      const die = Cause.die('defect').reasons[0];
      const interrupt = Cause.interrupt(1).reasons[0];
      strictEqual(Cause.isFailReason(die), false);
      strictEqual(Cause.isFailReason(interrupt), false);
    });
  });

  describe('isDieReason', () => {
    it('narrows Die reasons', () => {
      const reason = Cause.die('defect').reasons[0];
      strictEqual(Cause.isDieReason(reason), true);
    });

    it('rejects Fail and Interrupt reasons', () => {
      const fail = Cause.fail('error').reasons[0];
      const interrupt = Cause.interrupt(1).reasons[0];
      strictEqual(Cause.isDieReason(fail), false);
      strictEqual(Cause.isDieReason(interrupt), false);
    });
  });

  describe('isInterruptReason', () => {
    it('narrows Interrupt reasons', () => {
      const reason = Cause.interrupt(1).reasons[0];
      strictEqual(Cause.isInterruptReason(reason), true);
    });

    it('rejects Fail and Die reasons', () => {
      const fail = Cause.fail('error').reasons[0];
      const die = Cause.die('defect').reasons[0];
      strictEqual(Cause.isInterruptReason(fail), false);
      strictEqual(Cause.isInterruptReason(die), false);
    });
  });

  describe('empty', () => {
    it('has no reasons', () => {
      strictEqual(Cause.empty.reasons.length, 0);
    });

    it('is a Cause', () => {
      strictEqual(Cause.is(Cause.empty), true);
    });
  });

  describe('fail', () => {
    it('creates a cause with a single Fail reason', () => {
      const cause = Cause.fail('error');
      strictEqual(cause.reasons.length, 1);
      strictEqual(Cause.isFailReason(cause.reasons[0]), true);
    });

    it('preserves the error value', () => {
      const cause = Cause.fail('error');
      const reason = cause.reasons[0];
      if (Cause.isFailReason(reason)) {
        strictEqual(reason.error, 'error');
      }
    });

    it('works with various error types', () => {
      const obj = { key: 'value' };
      const cause = Cause.fail(obj);
      const reason = cause.reasons[0];
      if (Cause.isFailReason(reason)) {
        strictEqual(reason.error, obj);
      }
    });
  });

  describe('die', () => {
    it('creates a cause with a single Die reason', () => {
      const cause = Cause.die('defect');
      strictEqual(cause.reasons.length, 1);
      strictEqual(Cause.isDieReason(cause.reasons[0]), true);
    });

    it('preserves the defect value', () => {
      const cause = Cause.die('defect');
      const reason = cause.reasons[0];
      if (Cause.isDieReason(reason)) {
        strictEqual(reason.defect, 'defect');
      }
    });

    it('works with Error instances', () => {
      const err = new Error('boom');
      const cause = Cause.die(err);
      const reason = cause.reasons[0];
      if (Cause.isDieReason(reason)) {
        strictEqual(reason.defect, err);
      }
    });
  });

  describe('interrupt', () => {
    it('creates a cause with a single Interrupt reason', () => {
      const cause = Cause.interrupt(123);
      strictEqual(cause.reasons.length, 1);
      strictEqual(Cause.isInterruptReason(cause.reasons[0]), true);
    });

    it('preserves the fiber ID', () => {
      const cause = Cause.interrupt(42);
      const reason = cause.reasons[0];
      if (Cause.isInterruptReason(reason)) {
        strictEqual(reason.fiberId, 42);
      }
    });

    it('allows undefined fiber ID', () => {
      const cause = Cause.interrupt();
      const reason = cause.reasons[0];
      if (Cause.isInterruptReason(reason)) {
        strictEqual(reason.fiberId, undefined);
      }
    });
  });

  describe('fromReasons', () => {
    it('creates a cause from an array of reasons', () => {
      const reasons = [Cause.makeFailReason('err1'), Cause.makeFailReason('err2')];
      const cause = Cause.fromReasons(reasons);
      strictEqual(cause.reasons.length, 2);
    });

    it('creates empty cause from empty array', () => {
      const cause = Cause.fromReasons([]);
      strictEqual(cause.reasons.length, 0);
    });

    it('supports mixed reason types', () => {
      const reasons = [
        Cause.makeFailReason('error'),
        Cause.makeDieReason('defect'),
        Cause.makeInterruptReason(1)
      ];
      const cause = Cause.fromReasons(reasons);
      strictEqual(cause.reasons.length, 3);
    });
  });

  describe('makeFailReason', () => {
    it('creates a Fail reason with _tag and error', () => {
      const reason = Cause.makeFailReason('error');
      strictEqual(reason._tag, 'Fail');
      strictEqual(reason.error, 'error');
    });
  });

  describe('makeDieReason', () => {
    it('creates a Die reason with _tag and defect', () => {
      const reason = Cause.makeDieReason('defect');
      strictEqual(reason._tag, 'Die');
      strictEqual(reason.defect, 'defect');
    });
  });

  describe('makeInterruptReason', () => {
    it('creates an Interrupt reason with _tag and fiberId', () => {
      const reason = Cause.makeInterruptReason(42);
      strictEqual(reason._tag, 'Interrupt');
      strictEqual(reason.fiberId, 42);
    });

    it('allows undefined fiberId', () => {
      const reason = Cause.makeInterruptReason();
      strictEqual(reason._tag, 'Interrupt');
      strictEqual(reason.fiberId, undefined);
    });
  });

  describe('hasFails', () => {
    it('returns true when cause has Fail reasons', () => {
      strictEqual(Cause.fail('error').hasFails, true);
    });

    it('returns false when cause has no Fail reasons', () => {
      strictEqual(Cause.die('defect').hasFails, false);
      strictEqual(Cause.interrupt(1).hasFails, false);
      strictEqual(Cause.empty.hasFails, false);
    });

    it('returns true for combined cause with at least one Fail', () => {
      const combined = Cause.die('defect').combine(Cause.fail('error'));
      strictEqual(combined.hasFails, true);
    });
  });

  describe('hasDies', () => {
    it('returns true when cause has Die reasons', () => {
      strictEqual(Cause.die('defect').hasDies, true);
    });

    it('returns false when cause has no Die reasons', () => {
      strictEqual(Cause.fail('error').hasDies, false);
      strictEqual(Cause.interrupt(1).hasDies, false);
      strictEqual(Cause.empty.hasDies, false);
    });
  });

  describe('hasInterrupts', () => {
    it('returns true when cause has Interrupt reasons', () => {
      strictEqual(Cause.interrupt(1).hasInterrupts, true);
    });

    it('returns false when cause has no Interrupt reasons', () => {
      strictEqual(Cause.fail('error').hasInterrupts, false);
      strictEqual(Cause.die('defect').hasInterrupts, false);
      strictEqual(Cause.empty.hasInterrupts, false);
    });
  });

  describe('hasInterruptsOnly', () => {
    it('returns true when all reasons are Interrupts', () => {
      strictEqual(Cause.interrupt(1).hasInterruptsOnly, true);
      const combined = Cause.interrupt(1).combine(Cause.interrupt(2));
      strictEqual(combined.hasInterruptsOnly, true);
    });

    it('returns false for empty cause', () => {
      strictEqual(Cause.empty.hasInterruptsOnly, false);
    });

    it('returns false when mixed with other reason types', () => {
      const combined = Cause.interrupt(1).combine(Cause.fail('error'));
      strictEqual(combined.hasInterruptsOnly, false);
    });
  });

  describe('squash', () => {
    it('returns the first Fail error', () => {
      strictEqual(Cause.fail('error').squash, 'error');
    });

    it('returns the first Die defect when no Fail', () => {
      strictEqual(Cause.die('defect').squash, 'defect');
    });

    it('returns an Error for interrupt-only cause', () => {
      const result = Cause.interrupt(1).squash;
      assertTrue(result instanceof Error);
    });

    it('returns an Error for empty cause', () => {
      const result = Cause.empty.squash;
      assertTrue(result instanceof Error);
    });

    it('prefers Fail over Die', () => {
      const combined = Cause.die('defect').combine(Cause.fail('error'));
      strictEqual(combined.squash, 'error');
    });
  });

  describe('findFail', () => {
    it('returns success with the first Fail reason', () => {
      const result = Cause.fail('error').findFail;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success.error, 'error');
        strictEqual(result.success._tag, 'Fail');
      }
    });

    it('returns failure when no Fail reason exists', () => {
      const result = Cause.die('defect').findFail;
      strictEqual(result.isFailure(), true);
    });

    it('returns failure for empty cause', () => {
      const result = Cause.empty.findFail;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('findError', () => {
    it('returns success with the error value', () => {
      const result = Cause.fail('error').findError;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success, 'error');
      }
    });

    it('returns failure when no Fail reason exists', () => {
      const result = Cause.die('defect').findError;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('findErrorOption', () => {
    it('returns Some with the error value', () => {
      assertSome(Cause.fail('error').findErrorOption, 'error');
    });

    it('returns None when no Fail reason exists', () => {
      assertNone(Cause.die('defect').findErrorOption);
      assertNone(Cause.empty.findErrorOption);
    });
  });

  describe('findDie', () => {
    it('returns success with the first Die reason', () => {
      const result = Cause.die('defect').findDie;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success.defect, 'defect');
        strictEqual(result.success._tag, 'Die');
      }
    });

    it('returns failure when no Die reason exists', () => {
      const result = Cause.fail('error').findDie;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('findDefect', () => {
    it('returns success with the defect value', () => {
      const result = Cause.die('defect').findDefect;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success, 'defect');
      }
    });

    it('returns failure when no Die reason exists', () => {
      const result = Cause.fail('error').findDefect;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('findInterrupt', () => {
    it('returns success with the first Interrupt reason', () => {
      const result = Cause.interrupt(42).findInterrupt;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success.fiberId, 42);
        strictEqual(result.success._tag, 'Interrupt');
      }
    });

    it('returns failure when no Interrupt reason exists', () => {
      const result = Cause.fail('error').findInterrupt;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('interruptors', () => {
    it('returns a set of fiber IDs', () => {
      const cause = Cause.interrupt(1).combine(Cause.interrupt(2));
      const ids = cause.interruptors;
      strictEqual(ids.has(1), true);
      strictEqual(ids.has(2), true);
      strictEqual(ids.size, 2);
    });

    it('returns empty set for non-interrupt causes', () => {
      strictEqual(Cause.fail('error').interruptors.size, 0);
      strictEqual(Cause.empty.interruptors.size, 0);
    });

    it('excludes undefined fiber IDs from set', () => {
      const cause = Cause.interrupt();
      const ids = cause.interruptors;
      strictEqual(ids.has(undefined as any), false);
    });
  });

  describe('filterInterruptors', () => {
    it('returns success with fiber ID set when interrupts exist', () => {
      const result = Cause.interrupt(1).filterInterruptors;
      strictEqual(result.isSuccess(), true);
      if (result.isSuccess()) {
        strictEqual(result.success.has(1), true);
      }
    });

    it('returns failure when no interrupts exist', () => {
      const result = Cause.fail('error').filterInterruptors;
      strictEqual(result.isFailure(), true);
    });
  });

  describe('map', () => {
    it('transforms error values in Fail reasons', () => {
      const cause = Cause.fail('error');
      const mapped = cause.map((e) => e.toUpperCase());
      const reason = mapped.reasons[0];
      if (Cause.isFailReason(reason)) {
        strictEqual(reason.error, 'ERROR');
      }
    });

    // Upstream's data-last (pipeable) form, adapted to fluent chaining.
    it('works when chained', () => {
      const mapped = Cause.fail(1).map((n) => n + 1);
      const reason = mapped.reasons[0];
      if (Cause.isFailReason(reason)) {
        strictEqual(reason.error, 2);
      }
    });

    it('does not affect Die reasons', () => {
      const cause = Cause.die('defect');
      const mapped = cause.map(() => 'should not appear');
      strictEqual(mapped.reasons.length, 1);
      strictEqual(Cause.isDieReason(mapped.reasons[0]), true);
    });

    it('does not affect Interrupt reasons', () => {
      const cause = Cause.interrupt(1);
      const mapped = cause.map(() => 'should not appear');
      strictEqual(mapped.reasons.length, 1);
      strictEqual(Cause.isInterruptReason(mapped.reasons[0]), true);
    });

    it('maps empty cause to empty cause', () => {
      const mapped = Cause.empty.map(() => 'x');
      strictEqual(mapped.reasons.length, 0);
    });
  });

  describe('combine', () => {
    it('merges two causes', () => {
      const combined = Cause.fail('a').combine(Cause.fail('b'));
      strictEqual(combined.reasons.length, 2);
    });

    // Upstream's data-last (pipeable) form, adapted to fluent chaining.
    it('works when chained', () => {
      const combined = Cause.fail('a').combine(Cause.fail('b'));
      strictEqual(combined.reasons.length, 2);
    });

    it('combining with empty returns the other cause', () => {
      const cause = Cause.fail('error');
      const combined1 = cause.combine(Cause.empty);
      const combined2 = Cause.empty.combine(cause);
      strictEqual(combined1.reasons.length, 1);
      strictEqual(combined2.reasons.length, 1);
    });

    it('combines mixed reason types', () => {
      const combined = Cause.fail('error').combine(Cause.die('defect').combine(Cause.interrupt(1)));
      strictEqual(combined.reasons.length, 3);
    });
  });

  describe('prettyErrors', () => {
    it('converts Fail with Error to array of Errors', () => {
      const cause = Cause.fail(new Error('boom'));
      const errors = cause.prettyErrors();
      strictEqual(errors.length, 1);
      assertTrue(errors[0] instanceof Error);
      assertTrue(errors[0].message.includes('boom'));
    });

    it('converts Fail with string to Error', () => {
      const cause = Cause.fail('string error');
      const errors = cause.prettyErrors();
      strictEqual(errors.length, 1);
      assertTrue(errors[0] instanceof Error);
    });

    it('converts Die to Error', () => {
      const cause = Cause.die('defect');
      const errors = cause.prettyErrors();
      strictEqual(errors.length, 1);
      assertTrue(errors[0] instanceof Error);
    });

    it('returns InterruptError for interrupt-only cause', () => {
      const cause = Cause.interrupt(1);
      const errors = cause.prettyErrors();
      strictEqual(errors.length, 1);
      assertTrue(errors[0] instanceof Error);
    });

    it('handles empty cause', () => {
      const errors = Cause.empty.prettyErrors();
      assertTrue(Array.isArray(errors));
    });
  });

  describe('pretty', () => {
    it('renders a Fail cause as a string', () => {
      const rendered = Cause.fail('something went wrong').pretty;
      strictEqual(typeof rendered, 'string');
      assertTrue(rendered.includes('something went wrong'));
    });

    it('renders a Die cause as a string', () => {
      const rendered = Cause.die(new Error('unexpected')).pretty;
      strictEqual(typeof rendered, 'string');
      assertTrue(rendered.includes('unexpected'));
    });

    it('returns a string for empty cause', () => {
      const rendered = Cause.empty.pretty;
      strictEqual(typeof rendered, 'string');
    });
  });

  describe('annotate', () => {
    it('attaches annotations to a cause', () => {
      const cause = Cause.fail('error');
      const annotated = cause.annotate(Context.empty());
      strictEqual(Cause.is(annotated), true);
      strictEqual(annotated.reasons.length, 1);
    });

    // Upstream's data-last (pipeable) form, adapted to fluent chaining.
    it('works when chained', () => {
      const annotated = Cause.fail('error').annotate(Context.empty());
      strictEqual(Cause.is(annotated), true);
    });

    it('does not mutate the original cause', () => {
      const original = Cause.fail('error');
      original.annotate(Context.empty());
      strictEqual(original.reasons.length, 1);
    });
  });

  describe('reasonAnnotations', () => {
    it('returns annotations from a reason', () => {
      const reason = Cause.makeFailReason('error');
      const anns = Cause.reasonAnnotations(reason);
      assertTrue(anns !== undefined);
    });
  });

  describe('annotations', () => {
    it('returns merged annotations from a cause', () => {
      const anns = Cause.fail('error').annotations;
      assertTrue(anns !== undefined);
    });
  });

  describe('NoSuchElementError', () => {
    it('creates an error with _tag and message', () => {
      const error = new Cause.NoSuchElementError('not found');
      strictEqual(error._tag, 'NoSuchElementError');
      strictEqual(error.message, 'not found');
    });

    it('creates an error without message', () => {
      const error = new Cause.NoSuchElementError();
      strictEqual(error._tag, 'NoSuchElementError');
    });

    it('is an instance of Error', () => {
      const error = new Cause.NoSuchElementError();
      assertTrue(error instanceof Error);
    });
  });

  describe('isNoSuchElementError', () => {
    it('returns true for NoSuchElementError instances', () => {
      strictEqual(Cause.isNoSuchElementError(new Cause.NoSuchElementError()), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isNoSuchElementError('nope'), false);
      strictEqual(Cause.isNoSuchElementError(new Error()), false);
      strictEqual(Cause.isNoSuchElementError(null), false);
    });
  });

  describe('Done', () => {
    it('creates a Done signal without value', () => {
      const d = Cause.Done();
      strictEqual(d._tag, 'Done');
      strictEqual(d.value, undefined);
    });

    it('creates a Done signal with a value', () => {
      const d = Cause.Done(42);
      strictEqual(d._tag, 'Done');
      strictEqual(d.value, 42);
    });
  });

  describe('isDone', () => {
    it('returns true for Done values', () => {
      strictEqual(Cause.isDone(Cause.Done()), true);
      strictEqual(Cause.isDone(Cause.Done(42)), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isDone('not done'), false);
      strictEqual(Cause.isDone(null), false);
      strictEqual(Cause.isDone(new Cause.NoSuchElementError()), false);
    });
  });

  describe('done', () => {
    it.effect('fails with a Done signal carrying the value', () => {
      return Effect.gen(function* () {
        const error = yield* Cause.done(42).flip;
        strictEqual(Cause.isDone(error), true);
        strictEqual(error._tag, 'Done');
        strictEqual(error.value, 42);
      });
    });
  });

  describe('TimeoutError', () => {
    it('creates an error with _tag and message', () => {
      const error = new Cause.TimeoutError('timed out');
      strictEqual(error._tag, 'TimeoutError');
      strictEqual(error.message, 'timed out');
    });

    it('creates an error without message', () => {
      const error = new Cause.TimeoutError();
      strictEqual(error._tag, 'TimeoutError');
    });

    it('is an instance of Error', () => {
      assertTrue(new Cause.TimeoutError() instanceof Error);
    });
  });

  describe('isTimeoutError', () => {
    it('returns true for TimeoutError instances', () => {
      strictEqual(Cause.isTimeoutError(new Cause.TimeoutError()), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isTimeoutError('nope'), false);
      strictEqual(Cause.isTimeoutError(new Error()), false);
    });
  });

  describe('IllegalArgumentError', () => {
    it('creates an error with _tag and message', () => {
      const error = new Cause.IllegalArgumentError('bad arg');
      strictEqual(error._tag, 'IllegalArgumentError');
      strictEqual(error.message, 'bad arg');
    });

    it('creates an error without message', () => {
      const error = new Cause.IllegalArgumentError();
      strictEqual(error._tag, 'IllegalArgumentError');
    });

    it('is an instance of Error', () => {
      assertTrue(new Cause.IllegalArgumentError() instanceof Error);
    });
  });

  describe('isIllegalArgumentError', () => {
    it('returns true for IllegalArgumentError instances', () => {
      strictEqual(Cause.isIllegalArgumentError(new Cause.IllegalArgumentError()), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isIllegalArgumentError('nope'), false);
      strictEqual(Cause.isIllegalArgumentError(new Error()), false);
    });
  });

  describe('ExceededCapacityError', () => {
    it('creates an error with _tag and message', () => {
      const error = new Cause.ExceededCapacityError('queue full');
      strictEqual(error._tag, 'ExceededCapacityError');
      strictEqual(error.message, 'queue full');
    });

    it('creates an error without message', () => {
      const error = new Cause.ExceededCapacityError();
      strictEqual(error._tag, 'ExceededCapacityError');
    });

    it('is an instance of Error', () => {
      assertTrue(new Cause.ExceededCapacityError() instanceof Error);
    });
  });

  describe('isExceededCapacityError', () => {
    it('returns true for ExceededCapacityError instances', () => {
      strictEqual(Cause.isExceededCapacityError(new Cause.ExceededCapacityError()), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isExceededCapacityError('nope'), false);
      strictEqual(Cause.isExceededCapacityError(new Error()), false);
    });
  });

  describe('UnknownError', () => {
    it('creates an error with cause and message', () => {
      const error = new Cause.UnknownError('original', 'wrapper message');
      strictEqual(error._tag, 'UnknownError');
      strictEqual(error.message, 'wrapper message');
    });

    it('stores the original cause', () => {
      const original = { raw: true };
      const error = new Cause.UnknownError(original);
      strictEqual(error._tag, 'UnknownError');
    });

    it('is an instance of Error', () => {
      assertTrue(new Cause.UnknownError('x') instanceof Error);
    });
  });

  describe('isUnknownError', () => {
    it('returns true for UnknownError instances', () => {
      strictEqual(Cause.isUnknownError(new Cause.UnknownError('x')), true);
    });

    it('returns false for other values', () => {
      strictEqual(Cause.isUnknownError('nope'), false);
      strictEqual(Cause.isUnknownError(new Error()), false);
    });
  });

  describe('core interop', () => {
    it('wrap lifts a core Cause into the fluent API', () => {
      const core = _Cause.fail('boom');
      const fluent = Cause.wrap(core);
      strictEqual(Cause.is(fluent), true);
      strictEqual(fluent.hasFails, true);
    });

    it('the cause getter round-trips to the underlying core Cause', () => {
      const core = _Cause.die('defect');
      strictEqual(Cause.wrap(core).cause, core);
      assertTrue(_Cause.isCause(Cause.fail('error').cause));
    });

    it('with applies a core transformation and re-wraps', () => {
      const mapped = Cause.fail('error').with((core) => _Cause.map(core, (e) => e.toUpperCase()));
      strictEqual(Cause.is(mapped), true);
      assertSome(mapped.findErrorOption, 'ERROR');
    });
  });
});
