import { Notice, Setting } from 'obsidian';

import { FEATURE_GROUPS, type CommandCatalogEntry } from '../features/catalog';
import type { QuickEditingSettings } from '../settings';

export interface ModernSettingsPlugin {
  settings: QuickEditingSettings;
  getCommandCatalog(): readonly CommandCatalogEntry[];
  isCommandEnabled(commandId: string): boolean;
  saveSettings(): Promise<void>;
}

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function renderModernSettings(
  containerEl: HTMLElement,
  plugin: ModernSettingsPlugin,
): void {
  containerEl.createEl('h3', { text: '功能组与命令' });
  containerEl.createEl('p', {
    cls: 'setting-item-description',
    text: '功能组和命令开关在插件重载后生效。Obsidian 已内置且实现更完整的命令默认关闭，可在下方单独恢复。',
  });

  for (const definition of FEATURE_GROUPS) {
    const row = new Setting(containerEl)
      .setName(definition.name)
      .setDesc(`${definition.description} 搜索关键词：${definition.keywords.join('、')}`)
      .addToggle((toggle) => toggle
        .setValue(plugin.settings.featureGroups[definition.key])
        .onChange(async (value) => {
          plugin.settings.featureGroups[definition.key] = value;
          await plugin.saveSettings();
          new Notice('功能组设置已保存，重载 Quick Editing 后生效');
        }));
    row.settingEl.dataset.quickEditingKeywords = [
      definition.name,
      definition.description,
      ...definition.keywords,
    ].join(' ');
  }

  new Setting(containerEl)
    .setName('粘贴时自动识别')
    .setDesc('通过 ClipboardEvent 读取 text/html 和 text/plain；Office 表格使用 HTML DOM 解析。')
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.smartPasteOnPaste)
      .onChange(async (value) => {
        plugin.settings.smartPasteOnPaste = value;
        await plugin.saveSettings();
      }));

  new Setting(containerEl)
    .setName('全文转换前预览')
    .setDesc('先显示预计修改处数、影响行数和前后片段；应用后提示可撤销。')
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.previewFullDocumentChanges)
      .onChange(async (value) => {
        plugin.settings.previewFullDocumentChanges = value;
        await plugin.saveSettings();
      }));

  containerEl.createEl('h3', { text: '命令开关' });
  const commandRows: Array<{ entry: CommandCatalogEntry; element: HTMLElement }> = [];
  const commandList = containerEl.createDiv({ cls: 'quick-editing-command-list' });
  const search = new Setting(containerEl)
    .setName('搜索命令')
    .setDesc('可按命令名称、ID、功能组或关键词筛选。');
  search.settingEl.addClass('quick-editing-command-search');
  commandList.before(search.settingEl);

  const entries = [...plugin.getCommandCatalog()]
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  for (const entry of entries) {
    const group = FEATURE_GROUPS.find((definition) => definition.key === entry.group);
    const row = new Setting(commandList)
      .setName(entry.name)
      .setDesc([
        `ID: ${entry.id}`,
        group ? `功能组：${group.name}` : '',
        entry.defaultEnabled ? '' : '默认关闭：Obsidian 核心已有同类能力',
      ].filter(Boolean).join('；'))
      .addToggle((toggle) => toggle
        .setValue(plugin.isCommandEnabled(entry.id))
        .onChange(async (value) => {
          plugin.settings.commandEnabled[entry.id] = value;
          await plugin.saveSettings();
          new Notice('命令设置已保存，重载 Quick Editing 后生效');
        }));
    row.settingEl.dataset.quickEditingKeywords = [
      entry.id,
      entry.name,
      group?.name ?? '',
      ...entry.keywords,
    ].join(' ');
    commandRows.push({ entry, element: row.settingEl });
  }

  search.addText((text) => {
    text.setPlaceholder('例如：粘贴、表格、format、全文');
    text.inputEl.setAttr('aria-label', '搜索 Quick Editing 命令');
    text.onChange((value) => {
      const query = normalizedSearch(value);
      for (const row of commandRows) {
        const haystack = normalizedSearch(row.element.dataset.quickEditingKeywords ?? row.entry.name);
        row.element.toggle(query === '' || haystack.includes(query));
      }
    });
  });
}
