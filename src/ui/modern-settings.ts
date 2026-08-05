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

export function createSettingsSection(
  containerEl: HTMLElement,
  title: string,
  description: string,
): HTMLElement {
  const section = containerEl.createDiv({ cls: 'quick-editing-settings-section' });
  const header = section.createDiv({ cls: 'quick-editing-settings-section-header' });
  header.createEl('h3', { text: title });
  header.createEl('p', { text: description });
  return section.createDiv({ cls: 'quick-editing-settings-section-content' });
}

export function renderModernSettings(
  containerEl: HTMLElement,
  plugin: ModernSettingsPlugin,
): void {
  const featureSection = createSettingsSection(
    containerEl,
    '功能模块',
    '按使用场景启用功能；关闭后，该组命令和自动处理不会注册。',
  );
  const featureGrid = featureSection.createDiv({ cls: 'quick-editing-feature-grid' });
  for (const definition of FEATURE_GROUPS) {
    const row = new Setting(featureGrid)
      .setName(definition.name)
      .setDesc(definition.description)
      .addToggle((toggle) => toggle
        .setValue(plugin.settings.featureGroups[definition.key])
        .onChange(async (value) => {
          plugin.settings.featureGroups[definition.key] = value;
          await plugin.saveSettings();
          new Notice('功能模块已保存，重载 Quick Editing 后生效');
        }));
    row.settingEl.addClass('quick-editing-feature-card');
    row.settingEl.dataset.quickEditingKeywords = [
      definition.name,
      definition.description,
      ...definition.keywords,
    ].join(' ');
  }

  const behaviorGrid = featureSection.createDiv({ cls: 'quick-editing-behavior-grid' });
  const pasteSetting = new Setting(behaviorGrid)
    .setName('粘贴时自动识别')
    .setDesc('识别 URL、路径、HTML 和 Office 表格。')
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.smartPasteOnPaste)
      .onChange(async (value) => {
        plugin.settings.smartPasteOnPaste = value;
        await plugin.saveSettings();
      }));
  pasteSetting.settingEl.addClass('quick-editing-behavior-card');

  const previewSetting = new Setting(behaviorGrid)
    .setName('全文转换前预览')
    .setDesc('显示修改数量、影响行和前后片段。')
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.previewFullDocumentChanges)
      .onChange(async (value) => {
        plugin.settings.previewFullDocumentChanges = value;
        await plugin.saveSettings();
      }));
  previewSetting.settingEl.addClass('quick-editing-behavior-card');

  const commandSection = createSettingsSection(
    containerEl,
    '命令管理',
    '可按名称、ID、功能组或关键词筛选，并逐条控制是否注册。',
  );
  const commandRows: Array<{ entry: CommandCatalogEntry; element: HTMLElement }> = [];
  const entries = [...plugin.getCommandCatalog()]
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));

  const search = new Setting(commandSection)
    .setName('搜索命令');
  search.settingEl.addClass('quick-editing-command-search');

  const resultCount = commandSection.createDiv({ cls: 'quick-editing-command-count' });
  const commandList = commandSection.createDiv({ cls: 'quick-editing-command-list' });
  const emptyState = commandSection.createDiv({
    cls: 'quick-editing-command-empty',
    text: '没有匹配的命令',
  });
  emptyState.hide();

  for (const entry of entries) {
    const group = FEATURE_GROUPS.find((definition) => definition.key === entry.group);
    const row = new Setting(commandList)
      .setName(entry.name)
      .addToggle((toggle) => toggle
        .setValue(plugin.isCommandEnabled(entry.id))
        .onChange(async (value) => {
          plugin.settings.commandEnabled[entry.id] = value;
          await plugin.saveSettings();
          new Notice('命令设置已保存，重载 Quick Editing 后生效');
        }));
    row.settingEl.addClass('quick-editing-command-row');
    row.descEl.empty();
    if (group) {
      row.descEl.createSpan({
        cls: 'quick-editing-command-group',
        text: group.name,
      });
    }
    row.descEl.createEl('code', {
      cls: 'quick-editing-command-id',
      text: entry.id,
    });
    row.settingEl.dataset.quickEditingKeywords = [
      entry.id,
      entry.name,
      group?.name ?? '',
      ...entry.keywords,
    ].join(' ');
    commandRows.push({ entry, element: row.settingEl });
  }

  const updateResults = (value: string): void => {
    const query = normalizedSearch(value);
    let visibleCount = 0;
    for (const row of commandRows) {
      const haystack = normalizedSearch(
        row.element.dataset.quickEditingKeywords ?? row.entry.name,
      );
      const visible = query === '' || haystack.includes(query);
      row.element.toggle(visible);
      if (visible) visibleCount += 1;
    }
    resultCount.setText(`显示 ${visibleCount} / ${commandRows.length} 条命令`);
    emptyState.toggle(visibleCount === 0);
  };

  search.addText((text) => {
    text.setPlaceholder('搜索名称、ID 或功能组');
    text.inputEl.addClass('quick-editing-command-search-input');
    text.inputEl.setAttr('aria-label', '搜索 Quick Editing 命令');
    text.onChange(updateResults);
  });
  updateResults('');
}
