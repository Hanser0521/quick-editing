import assert from 'node:assert/strict';
import test from 'node:test';
import { DOMParser } from 'linkedom';

import { htmlToMarkdown } from '../src/clipboard/html-to-markdown.ts';

const parse = (html: string): Document =>
  new DOMParser().parseFromString(html, 'text/html') as unknown as Document;

test('converts common rich-text elements', () => {
  assert.equal(
    htmlToMarkdown('<h2>标题</h2><p>一段 <b>粗体</b> 和 <a href="https://example.com">链接</a></p>', parse),
    '## 标题\n\n一段 **粗体** 和 [链接](https://example.com)',
  );
});

test('converts nested lists and tables', () => {
  const html = '<ul><li>A<ol><li>B</li></ol></li></ul><table><tr><th>名</th><th>值</th></tr><tr><td>A</td><td>1|2</td></tr></table>';
  assert.equal(
    htmlToMarkdown(html, parse),
    '- A\n  1. B\n\n| 名 | 值 |\n| --- | --- |\n| A | 1\\|2 |',
  );
});

test('keeps images and safe color styles while dropping scripts', () => {
  const html = '<p><span style="font-size: 30px; color: red">红色</span><img src="x.png" alt="图"></p><script>alert(1)</script>';
  assert.equal(
    htmlToMarkdown(html, parse),
    '<span style="color: red">红色</span>![图](x.png)',
  );
});

test('drops dangerous links, image data, and executable CSS values', () => {
  const html = '<p><a href="java&#10;script:alert(1)">危险</a><img src="data:text/html;base64,PHNjcmlwdD4=" alt="坏图"><span style="color: expression(alert(1)); background: url(x); background-color: #fff">安全</span></p>';
  assert.equal(
    htmlToMarkdown(html, parse),
    '危险坏图<span style="background-color: #fff">安全</span>',
  );
});

test('escapes complex link destinations and inline code fences', () => {
  const html = '<p><a href="https://example.com/a (b)">链接</a> <code>a``b</code> <code>`edge`</code></p>';
  assert.equal(
    htmlToMarkdown(html, parse),
    '[链接](https://example.com/a%20%28b%29) ```a``b``` `` `edge` ``',
  );
});

test('expands merged table cells into a rectangular Markdown table', () => {
  const html = '<table><tr><th rowspan="2">A</th><th colspan="2">B</th></tr><tr><td>C</td><td>D</td></tr></table>';
  assert.equal(
    htmlToMarkdown(html, parse),
    '| A | B |   |\n| --- | --- | --- |\n|   | C | D |',
  );
});
