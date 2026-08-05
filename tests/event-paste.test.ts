import assert from 'node:assert/strict';
import test from 'node:test';
import { DOMParser } from 'linkedom';
import type { Editor } from 'obsidian';

import { handleClipboardEvent, transformClipboardPayload } from '../src/clipboard/event-paste.ts';

const parse = (html: string): Document =>
  new DOMParser().parseFromString(html, 'text/html') as unknown as Document;

test('prefers Office-style HTML table DOM over lossy plain clipboard text', () => {
  const result = transformClipboardPayload({
    html: '<html><body><table><tr><th>名称</th><th>值</th></tr><tr><td>A</td><td>1|2</td></tr></table></body></html>',
    text: '名称\t值\r\nA\t1|2',
  }, '', parse);
  assert.deepEqual(result, {
    kind: 'html-table',
    text: '| 名称 | 值 |\n| --- | --- |\n| A | 1\\|2 |',
  });
});

test('uses ClipboardEvent data and prevents the native paste only when handled', () => {
  let replacement = '';
  let prevented = false;
  const event = {
    defaultPrevented: false,
    clipboardData: {
      getData: (type: string) => type === 'text/plain' ? 'https://example.com' : '',
    },
    preventDefault: () => { prevented = true; },
  } as unknown as ClipboardEvent;
  const editor = {
    getSelection: () => '官网',
    replaceSelection: (value: string) => { replacement = value; },
  } as unknown as Editor;
  assert.equal(handleClipboardEvent(event, editor)?.kind, 'url');
  assert.equal(prevented, true);
  assert.equal(replacement, '[官网](https://example.com)');
});

test('leaves arbitrary plain text to Obsidian normal paste', () => {
  assert.equal(transformClipboardPayload({ html: '', text: '普通段落' }), null);
});
