import assert from 'node:assert/strict';
import test from 'node:test';

import { findAdjacentMatch } from '../src/editor/find-adjacent-match.ts';

test('finds adjacent literal text in both directions', () => {
  const text = '目标 one\nselected\n目标 two';
  const selectionStart = text.indexOf('selected');
  const selectionEnd = selectionStart + 'selected'.length;

  assert.deepEqual(findAdjacentMatch(text, selectionStart, selectionEnd, '目标', '上'), {
    from: 0,
    to: 2,
  });
  assert.deepEqual(findAdjacentMatch(text, selectionStart, selectionEnd, '目标', '下'), {
    from: text.lastIndexOf('目标'),
    to: text.lastIndexOf('目标') + 2,
  });
});

test('treats ordinary selected text as a literal instead of a regular expression', () => {
  assert.deepEqual(findAdjacentMatch('a.b / a.b', 0, 3, 'a.b', '下'), {
    from: 6,
    to: 9,
  });
  assert.equal(findAdjacentMatch('axb / a.b', 0, 3, 'a.b', '上'), undefined);
});

test('supports syntax expressions and normalizes reversed selection offsets', () => {
  const text = '**一**\n==二==\n**三**';
  const start = text.indexOf('==二==');
  const end = start + '==二=='.length;

  assert.deepEqual(findAdjacentMatch(text, end, start, /\*\*[^*]+\*\*/g, '上'), {
    from: 0,
    to: 5,
  });
  assert.deepEqual(findAdjacentMatch(text, end, start, /\*\*[^*]+\*\*/g, '下'), {
    from: text.lastIndexOf('**三**'),
    to: text.length,
  });
});

test('returns undefined for empty patterns, zero-length matches, and absent targets', () => {
  assert.equal(findAdjacentMatch('text', 0, 0, '', '下'), undefined);
  assert.equal(findAdjacentMatch('text', 0, 0, /^/gm, '下'), undefined);
  assert.equal(findAdjacentMatch('text', 0, 0, 'missing', '下'), undefined);
});
