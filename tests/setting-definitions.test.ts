import assert from 'node:assert/strict';
import test from 'node:test';
import { createQuickEditingSettingDefinitions, type StableSettingDefinitionItem } from '../src/ui/setting-definitions.ts';
import { sanitizeSettings } from '../src/settings.ts';

function ids(items: StableSettingDefinitionItem[]): string[] {
  return items.flatMap((item) => [item.id, ...ids(item.items ?? [])]).sort();
}

test('all settings have unique IDs independent of language and command sorting', () => {
  const plugin = {
    settings: sanitizeSettings(null),
    getCommandCatalog: () => [
      { id: 'paste-text', name: 'Smart paste', keywords: ['智能粘贴'] },
      { id: 'auto-text', name: 'Smart symbols', keywords: ['智能符号'] },
    ],
    isCommandEnabled: () => true,
    saveSettings: async () => undefined,
  };
  const english = createQuickEditingSettingDefinitions(plugin, 'en');
  plugin.getCommandCatalog = () => [
    { id: 'auto-text', name: '智能符号', keywords: ['Smart symbols'] },
    { id: 'paste-text', name: '智能粘贴', keywords: ['Smart paste'] },
  ];
  const chinese = createQuickEditingSettingDefinitions(plugin, 'zh-cn');
  const englishIds = ids(english);
  assert.deepEqual(englishIds, ids(chinese));
  assert.equal(new Set(englishIds).size, englishIds.length);
  assert.equal(englishIds.includes('command.paste-text'), true);
  assert.equal(englishIds.every((id) => id !== ''), true);
});
