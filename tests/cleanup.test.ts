import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeMixedPunctuation,
  repairExternalText,
  repairMarkdownSyntax,
  repairUnexpectedLineBreaks,
} from '../src/transformations/cleanup.ts';

test('repairs unexpected line breaks without joining after sentence punctuation', () => {
  assert.equal(
    repairUnexpectedLineBreaks('中文\n继续\n结束。\nNext\nline'),
    '中文继续结束。\nNext line',
  );
});

test('normalizes punctuation according to adjacent script', () => {
  assert.equal(
    normalizeMixedPunctuation('中文, 中文.\nABC，DEF（test）【【链接】】'),
    '中文，中文。\nABC,DEF(test)[[链接]]',
  );
});

test('repairs common imported Markdown syntax without special-casing an empty selection', () => {
  assert.equal(
    repairMarkdownSyntax('【标题】（https://example.com）\n    缩进\n* > 项目'),
    '[标题](https://example.com)  \n\t缩进\n- 项目',
  );
  assert.equal(repairMarkdownSyntax(''), '');
});

test('combines line-break and punctuation cleanup for external text', () => {
  assert.equal(repairExternalText('中文,\n继续'), '中文，继续');
});
