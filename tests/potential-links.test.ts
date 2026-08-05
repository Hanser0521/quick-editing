import assert from 'node:assert/strict';
import test from 'node:test';

import { linkPotentialTitles } from '../src/transformations/potential-links.ts';

test('links the first eligible occurrence of each title', () => {
  assert.deepEqual(
    linkPotentialTitles('知识管理与知识管理，Java 和 JavaScript。', ['知识管理', 'Java']),
    {
      text: '[[知识管理]]与知识管理，[[Java]] 和 JavaScript。',
      linkedTitles: ['知识管理', 'Java'],
    },
  );
});

test('protects frontmatter, code, existing links, tags, URLs, and comments', () => {
  const input = [
    '---',
    'topic: 知识管理',
    '---',
    '`知识管理` [[知识管理]] [知识管理](target) #知识管理',
    'https://example.com/知识管理 %%知识管理%%',
    '```md',
    '知识管理',
    '```',
    '正文知识管理',
  ].join('\n');
  const result = linkPotentialTitles(input, ['知识管理']);
  assert.equal(result.text, input.replace('正文知识管理', '正文[[知识管理]]'));
  assert.deepEqual(result.linkedTitles, ['知识管理']);
});

test('prefers longer overlapping titles and preserves literal marker characters', () => {
  assert.deepEqual(
    linkPotentialTitles('⚘知识管理与知识', ['知识', '知识管理', '知识管理', '']),
    {
      text: '⚘[[知识管理]]与[[知识]]',
      linkedTitles: ['知识管理', '知识'],
    },
  );
});

test('skips unsafe wiki-link targets and leaves unmatched text unchanged', () => {
  const input = 'A#B 与 单字';
  assert.deepEqual(linkPotentialTitles(input, ['A#B', '单']), {
    text: input,
    linkedTitles: [],
  });
});
