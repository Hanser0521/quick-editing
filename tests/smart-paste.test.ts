import assert from 'node:assert/strict';
import test from 'node:test';

import { transformClipboardText } from '../src/clipboard/smart-paste.ts';

test('converts regular and media URLs with an optional selected label', () => {
  assert.deepEqual(transformClipboardText('https://example.com?a=1:2'), {
    kind: 'url',
    text: '[链接](https://example.com?a=1:2)',
  });
  assert.deepEqual(transformClipboardText('https://example.com/a.webp?size=2', '封面'), {
    kind: 'media-url',
    text: '![封面](https://example.com/a.webp?size=2)',
  });
});

test('converts Windows paths without treating arbitrary text as a path', () => {
  assert.deepEqual(transformClipboardText('C:\\notes\\draft.md'), {
    kind: 'path',
    text: '[本地](file:///C:/notes/draft.md)',
  });
  assert.deepEqual(transformClipboardText('C:\\images\\cover image.png'), {
    kind: 'media-path',
    text: '![本地](file:///C:/images/cover%20image.png)',
  });
  assert.equal(transformClipboardText('not:a:path').kind, 'code');
});

test('converts TSV into a padded Markdown table and escapes pipes', () => {
  assert.equal(
    transformClipboardText('名称\t说明\r\nA\t一|二\r\nB\t').text,
    '| 名称 | 说明 |\n| --- | --- |\n| A | 一\\|二 |\n| B |   |',
  );
});

test('uses a longer code fence when clipboard text contains backticks', () => {
  const result = transformClipboardText('before ``` inside');
  assert.equal(result.kind, 'code');
  assert.equal(result.text, '````\nbefore ``` inside\n````\n');
});

test('does not insert content for an empty clipboard', () => {
  assert.deepEqual(transformClipboardText('  \n'), { kind: 'empty', text: '' });
});
