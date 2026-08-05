import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commandCatalogEntry,
  featureGroupForCommand,
} from '../src/features/catalog.ts';

test('maps independent command groups', () => {
  assert.equal(featureGroupForCommand('auto-text'), 'smartSymbols');
  assert.equal(featureGroupForCommand('paste-text'), 'smartPaste');
  assert.equal(featureGroupForCommand('edit-biaodian'), 'fullDocumentCleanup');
  assert.equal(featureGroupForCommand('cuti-format'), 'formatBrush');
  assert.equal(featureGroupForCommand('internal-link'), undefined);
});

test('adds IDs, names, groups and search keywords to the command catalog', () => {
  assert.deepEqual(commandCatalogEntry({
    id: 'paste-text',
    name: '智能粘贴',
    callback: () => undefined,
  }), {
    id: 'paste-text',
    name: '智能粘贴',
    group: 'smartPaste',
    keywords: ['paste-text', '智能粘贴', '粘贴', '剪贴板', 'html', '表格', 'clipboard', '智能粘贴'],
  });
});
