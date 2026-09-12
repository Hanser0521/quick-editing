import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commandSearchNames,
  localizeCommandNameForLocale,
  resolveQuickEditingLocale,
  translate,
} from '../src/i18n/core.ts';

test('uses Chinese for Chinese language variants and English as the fallback', () => {
  assert.equal(resolveQuickEditingLocale('zh'), 'zh-cn');
  assert.equal(resolveQuickEditingLocale('zh-CN'), 'zh-cn');
  assert.equal(resolveQuickEditingLocale('zh-TW'), 'zh-cn');
  assert.equal(resolveQuickEditingLocale('en-US'), 'en');
  assert.equal(resolveQuickEditingLocale('fr'), 'en');
});

test('interpolates localized messages without dropping unknown placeholders', () => {
  assert.equal(
    translate('preview.done', { title: 'Cleanup', count: 3 }, 'en'),
    'Completed Cleanup. Estimated changes: 3.',
  );
  assert.equal(
    translate('preview.done', { title: '全文清理', count: 3 }, 'zh-cn'),
    '已完成 全文清理，预计修改 3 处。',
  );
  assert.equal(
    translate('settings.commandCount', { count: 2 }, 'en'),
    'Showing 2 of {total} commands',
  );
});

test('localizes command names and keeps both languages searchable', () => {
  assert.equal(localizeCommandNameForLocale('paste-text', '智能粘贴', 'en'), 'Smart paste');
  assert.equal(localizeCommandNameForLocale('paste-text', '智能粘贴', 'zh-cn'), '智能粘贴');
  assert.deepEqual(commandSearchNames('paste-text', '智能粘贴'), ['智能粘贴', 'Smart paste']);
});
