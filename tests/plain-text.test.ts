import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownToPlainText } from '../src/transformations/plain-text.ts';

test('extracts nested formatting and native colored highlights without leftover asterisks', () => {
  assert.equal(markdownToPlainText('==🔴**中文 _English_**== and 🔴 ordinary emoji.'), '中文 English and 🔴 ordinary emoji.');
  assert.equal(markdownToPlainText('***bold italic***, ~~deleted~~ and ==plain=='), 'bold italic, deleted and plain');
});

test('extracts link labels, aliases, image alt text, and headings', () => {
  assert.equal(markdownToPlainText('# [label](https://example.com) [[note#heading|Alias]] ![alt](pic.png)'), 'label Alias alt');
});

test('preserves code examples, literal colored emoji, formula syntax, and CRLF', () => {
  assert.equal(markdownToPlainText('```md\r\n==🔴literal==\r\n```\r\n\r\n$x+y$'), '==🔴literal==\r\n\r\n$x+y$');
  assert.equal(markdownToPlainText('`**code**` and \\==🔴literal=='), '**code** and ==🔴literal==');
  assert.equal(markdownToPlainText('`[[target|literal]]` and $[[x|y]]$'), '[[target|literal]] and $[[x|y]]$');
});

test('keeps table rows and punctuation while removing cell formatting', () => {
  assert.equal(markdownToPlainText('| **名称** | ==🟢值== |\r\n| --- | --- |\r\n| A，B | 1.2 |'), '| 名称 | 值 |\r\n| --- | --- |\r\n| A，B | 1.2 |');
});
