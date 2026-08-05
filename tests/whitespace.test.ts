import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCjkLatinSpacing,
  removeHorizontalSpaces,
  removeInlineComments,
  trimTrailingWhitespace,
} from '../src/transformations/whitespace.ts';

test('adds spaces only at Latin and Han boundaries', () => {
  assert.equal(addCjkLatinSpacing('china中国和中文Codex'), 'china 中国和中文 Codex');
  assert.equal(addCjkLatinSpacing('123中文 Markdown-文本'), '123中文 Markdown-文本');
});

test('removes half-width and full-width spaces without removing line breaks', () => {
  assert.equal(removeHorizontalSpaces('a b　c\nnext line'), 'abc\nnextline');
});

test('removes inline Obsidian comments but preserves multiline boundaries', () => {
  assert.equal(removeInlineComments('前%%注释%%后\n%%未闭合'), '前后\n%%未闭合');
});

test('trims trailing whitespace while preserving CRLF and blank lines', () => {
  assert.equal(trimTrailingWhitespace('a  \r\n  \r\nb\t'), 'a\r\n\r\nb');
});
