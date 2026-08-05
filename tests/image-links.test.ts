import assert from 'node:assert/strict';
import test from 'node:test';

import {
  markdownImageLinkRanges,
  removeImageLinks,
  removeImageLinksInRange,
} from '../src/transformations/image-links.ts';

test('removes Markdown, reference, Obsidian, and HTML image links only', () => {
  const input = [
    '保留 [网页](https://example.com) 和 [[普通笔记]]。',
    '删除 ![封面](assets/cover(1).png "标题") 与 ![[photo.jpg|300]]。',
    '引用 ![示意图][diagram]，HTML <img src="photo.png" alt="图">。',
    '',
    '[diagram]: assets/diagram.png',
  ].join('\n');

  assert.equal(
    removeImageLinks(input),
    [
      '保留 [网页](https://example.com) 和 [[普通笔记]]。',
      '删除  与 。',
      '引用 ，HTML 。',
      '',
      '[diagram]: assets/diagram.png',
    ].join('\n'),
  );
  assert.equal(markdownImageLinkRanges(input).length, 4);
});

test('does not remove image-like text from protected Markdown contexts', () => {
  const input = [
    '---',
    'cover: "![[frontmatter.png]]"',
    '---',
    '`![[inline-code.png]]` 与 $![[formula.png]]$',
    '```md',
    '![code](inside.png)',
    '![[code-wiki.png]]',
    '```',
    '正文 ![[remove-me.png]]',
  ].join('\n');

  assert.equal(removeImageLinks(input), input.replace('![[remove-me.png]]', ''));
});

test('range removal uses full-document context and preserves CRLF', () => {
  const input = '前文\r\n`![[keep.png]]`\r\n正文 ![[remove.png]] 结尾';
  const start = input.indexOf('正文');
  assert.equal(
    removeImageLinksInRange(input, start, input.length),
    '正文  结尾',
  );
  const protectedStart = input.indexOf('![[keep.png]]');
  assert.equal(
    removeImageLinksInRange(input, protectedStart, protectedStart + '![[keep.png]]'.length),
    '![[keep.png]]',
  );
});
