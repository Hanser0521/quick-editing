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
    getValue: () => '官网',
    listSelections: () => [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 2 } }],
    posToOffset: (position: { ch: number }) => position.ch,
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

for (const [name, source, offset] of [
  ['code fence', '```js\nURL\n```', 7],
  ['open code fence at EOF', '```js\n', 6],
  ['frontmatter', '---\nurl: value\n---\n', 10],
  ['inline code', '`url`', 2],
  ['inline math', '$x+y$', 2],
  ['math block', '$$\nx+y\n$$', 4],
  ['comment', '%% hidden %%', 5],
  ['wiki link', '[[note|label]]', 8],
] as const) {
  test(`leaves ${name} paste to the native editor`, () => {
    let prevented = false;
    let replaced = false;
    const event = {
      defaultPrevented: false,
      clipboardData: { getData: () => 'https://example.com' },
      preventDefault: () => { prevented = true; },
    } as unknown as ClipboardEvent;
    const editor = {
      getValue: () => source,
      listSelections: () => [{ anchor: { line: 0, ch: offset }, head: { line: 0, ch: offset } }],
      posToOffset: (position: { ch: number }) => position.ch,
      getSelection: () => '',
      replaceSelection: () => { replaced = true; },
    } as unknown as Editor;
    assert.equal(handleClipboardEvent(event, editor, parse), null);
    assert.equal(prevented, false);
    assert.equal(replaced, false);
  });
}

test('mixed and multi-cursor selections intersecting protected content stay native', async () => {
  const { isPasteContextProtected } = await import('../src/clipboard/event-paste.ts');
  const source = 'text `code` end';
  const editor = {
    getValue: () => source,
    posToOffset: (position: { ch: number }) => position.ch,
    listSelections: () => [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: source.length } }],
  } as unknown as Editor;
  assert.equal(isPasteContextProtected(editor), true);
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 3 } },
    { anchor: { line: 0, ch: 7 }, head: { line: 0, ch: 7 } },
  ];
  assert.equal(isPasteContextProtected(editor), true);
});
