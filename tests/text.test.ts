import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeRegExp } from '../src/utils/text.ts';

test('escapes every regular expression metacharacter', () => {
  const source = 'a+b*(c)[d]{e}.?^$|\\';
  const expression = new RegExp(`^${escapeRegExp(source)}$`);
  assert.equal(expression.test(source), true);
  assert.equal(expression.test('aab'), false);
});
