import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ArithmeticEvaluationError,
  evaluateArithmetic,
} from '../src/utils/arithmetic.ts';

test('respects arithmetic precedence and parentheses', () => {
  assert.equal(evaluateArithmetic('2 + 3 * 4'), 14);
  assert.equal(evaluateArithmetic('(2 + 3) * 4'), 20);
});

test('supports Chinese multiplication habits and unary signs', () => {
  assert.equal(evaluateArithmetic('-2x(3 + 4)'), -14);
  assert.equal(evaluateArithmetic('6×.5'), 3);
});

test('rejects code and malformed expressions', () => {
  assert.throws(() => evaluateArithmetic('globalThis.process.exit()'));
  assert.throws(() => evaluateArithmetic('1 +'));
  assert.throws(() => evaluateArithmetic('1 / 0'));
  assert.throws(() => evaluateArithmetic('(1 + 2'));
});

test('returns stable error codes that the UI can localize', () => {
  assert.throws(
    () => evaluateArithmetic('1 / 0'),
    (error) => error instanceof ArithmeticEvaluationError && error.code === 'divisionByZero',
  );
});
