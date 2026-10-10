import assert from 'node:assert/strict';
import test from 'node:test';
import { removeNativeHighlightColors } from '../src/transformations/highlight-colors.ts';

test('removes all six native highlight color markers but preserves ordinary emoji', () => {
  for (const color of ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣']) {
    assert.equal(removeNativeHighlightColors(`==${color}**中文 English**== ${color}`), `==**中文 English**== ${color}`);
  }
  assert.equal(removeNativeHighlightColors('==plain 🔴 text=='), '==plain 🔴 text==');
});

test('preserves literal native-highlight examples in code, frontmatter, math, and HTML', () => {
  for (const source of [
    '`==🔴example==`',
    '```md\r\n==🔴example==\r\n```',
    '---\nexample: ==🔴example==\n---',
    '$==🔴x==$\n\n$$\n==🟢y==\n$$',
    '<pre>==🔴example==</pre>',
    '\\==🔴escaped==',
    '==🔴unfinished',
  ]) assert.equal(removeNativeHighlightColors(source), source);
});

test('supports nested formatting, CRLF, tables, and escaped closing markers', () => {
  assert.equal(removeNativeHighlightColors('| ==🔵**引用**== |\r\n| ==🟣想法== |'), '| ==**引用**== |\r\n| ==想法== |');
  assert.equal(removeNativeHighlightColors('==🔴literal\\=='), '==🔴literal\\==');
});
