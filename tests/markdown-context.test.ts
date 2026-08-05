import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isMarkdownOffsetProtected,
  markdownProtectedRanges,
  transformMarkdownOutsideProtected,
  transformMarkdownRangeOutsideProtected,
} from '../src/markdown/context.ts';
import { addCjkLatinSpacing } from '../src/transformations/whitespace.ts';

test('protects frontmatter, fenced and inline code, math, links, and comments', () => {
  const input = [
    '---',
    'title: 中文ABC',
    '---',
    '正文中文ABC，`中文ABC` 和 $中文ABC$。',
    '[[中文ABC|别名]] [中文ABC](target) %%中文ABC%%',
    '```ts',
    'const value = "中文ABC";',
    '```',
    '$$',
    '中文ABC',
    '$$',
  ].join('\n');
  const output = transformMarkdownOutsideProtected(input, addCjkLatinSpacing);
  assert.equal(output, input.replace('正文中文ABC', '正文中文 ABC'));
  assert.deepEqual(
    new Set(markdownProtectedRanges(input).flatMap((range) => range.type.split(','))).has('code'),
    true,
  );
});

test('recognizes a cursor inside protected syntax but not ordinary text', () => {
  const input = '普通文本\n```js\nconst a = 1;\n```\n结尾';
  assert.equal(isMarkdownOffsetProtected(input, input.indexOf('const')), true);
  assert.equal(isMarkdownOffsetProtected(input, input.indexOf('普通')), false);
});

test('selection conversion uses full-document context', () => {
  const input = '前文\n```txt\n中文ABC\n```\n后文中文ABC';
  const protectedStart = input.indexOf('中文ABC');
  const protectedResult = transformMarkdownRangeOutsideProtected(
    input,
    protectedStart,
    protectedStart + '中文ABC'.length,
    addCjkLatinSpacing,
  );
  assert.equal(protectedResult, '中文ABC');

  const normalStart = input.lastIndexOf('中文ABC');
  assert.equal(
    transformMarkdownRangeOutsideProtected(
      input,
      normalStart,
      normalStart + '中文ABC'.length,
      addCjkLatinSpacing,
    ),
    '中文 ABC',
  );
});

test('preserves CRLF and table structure while converting nested Markdown text', () => {
  const input = '**中文ABC**\r\n\r\n| 列 | 值 |\r\n| --- | --- |\r\n| 中文ABC | `中文ABC` |';
  const output = transformMarkdownOutsideProtected(input, addCjkLatinSpacing);
  assert.equal(
    output,
    '**中文 ABC**\r\n\r\n| 列 | 值 |\r\n| --- | --- |\r\n| 中文 ABC | `中文ABC` |',
  );
});
