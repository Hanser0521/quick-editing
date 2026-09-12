import { Notice, Setting } from 'obsidian';

import { FEATURE_GROUPS, type CommandCatalogEntry } from '../features/catalog';
import type { FeatureGroupKey } from '../features/types';
import { getQuickEditingLocale, t, type MessageKey } from '../i18n';
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

const FEATURE_NAME_KEYS: Record<FeatureGroupKey, MessageKey> = {
  smartSymbols: 'feature.smartSymbols.name',
  formatBrush: 'feature.formatBrush.name',
  smartPaste: 'feature.smartPaste.name',
  fullDocumentCleanup: 'feature.fullDocumentCleanup.name',
};

const FEATURE_DESCRIPTION_KEYS: Record<FeatureGroupKey, MessageKey> = {
  smartSymbols: 'feature.smartSymbols.description',
  formatBrush: 'feature.formatBrush.description',
  smartPaste: 'feature.smartPaste.description',
  fullDocumentCleanup: 'feature.fullDocumentCleanup.description',
};

function localizedFeatureGroup(key: FeatureGroupKey) {
  const original = FEATURE_GROUPS.find((definition) => definition.key === key);
  return {
    key,
    name: t(FEATURE_NAME_KEYS[key]),
    description: t(FEATURE_DESCRIPTION_KEYS[key]),
    keywords: original?.keywords ?? [],
    originalName: original?.name ?? '',
    originalDescription: original?.description ?? '',
  };
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
    t('settings.featureSection'),
    t('settings.featureSectionDescription'),
  );
  const featureGrid = featureSection.createDiv({ cls: 'quick-editing-feature-grid' });
  for (const sourceDefinition of FEATURE_GROUPS) {
    const definition = localizedFeatureGroup(sourceDefinition.key);
    const row = new Setting(featureGrid)
      .setName(definition.name)
      .setDesc(definition.description)
      .addToggle((toggle) => toggle
        .setValue(plugin.settings.featureGroups[definition.key])
        .onChange(async (value) => {
          plugin.settings.featureGroups[definition.key] = value;
          await plugin.saveSettings();
          new Notice(t('settings.featureSaved'));
        }));
    row.settingEl.addClass('quick-editing-feature-card');
    row.settingEl.dataset.quickEditingKeywords = [
      definition.name,
      definition.description,
      definition.originalName,
      definition.originalDescription,
      ...definition.keywords,
    ].join(' ');
  }

  const behaviorGrid = featureSection.createDiv({ cls: 'quick-editing-behavior-grid' });
  const pasteSetting = new Setting(behaviorGrid)
    .setName(t('settings.autoPaste'))
    .setDesc(t('settings.autoPasteDescription'))
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.smartPasteOnPaste)
      .onChange(async (value) => {
        plugin.settings.smartPasteOnPaste = value;
        await plugin.saveSettings();
      }));
  pasteSetting.settingEl.addClass('quick-editing-behavior-card');

  const previewSetting = new Setting(behaviorGrid)
    .setName(t('settings.preview'))
    .setDesc(t('settings.previewDescription'))
    .addToggle((toggle) => toggle
      .setValue(plugin.settings.previewFullDocumentChanges)
      .onChange(async (value) => {
        plugin.settings.previewFullDocumentChanges = value;
        await plugin.saveSettings();
      }));
  previewSetting.settingEl.addClass('quick-editing-behavior-card');

  const commandSection = createSettingsSection(
    containerEl,
    t('settings.commandSection'),
    t('settings.commandSectionDescription'),
  );
  const commandRows: Array<{ entry: CommandCatalogEntry; element: HTMLElement }> = [];
  const entries = [...plugin.getCommandCatalog()]
    .sort((left, right) => left.name.localeCompare(right.name, getQuickEditingLocale()));

  const search = new Setting(commandSection)
    .setName(t('settings.commandSearch'));
  search.settingEl.addClass('quick-editing-command-search');

  const resultCount = commandSection.createDiv({ cls: 'quick-editing-command-count' });
  const commandList = commandSection.createDiv({ cls: 'quick-editing-command-list' });
  const emptyState = commandSection.createDiv({
    cls: 'quick-editing-command-empty',
    text: t('settings.commandEmpty'),
  });
  emptyState.hide();

  for (const entry of entries) {
    const group = entry.group ? localizedFeatureGroup(entry.group) : undefined;
    const row = new Setting(commandList)
      .setName(entry.name)
      .addToggle((toggle) => toggle
        .setValue(plugin.isCommandEnabled(entry.id))
        .onChange(async (value) => {
          plugin.settings.commandEnabled[entry.id] = value;
          await plugin.saveSettings();
          new Notice(t('settings.commandSaved'));
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
    resultCount.setText(t('settings.commandCount', {
      count: visibleCount,
      total: commandRows.length,
    }));
    emptyState.toggle(visibleCount === 0);
  };

  search.addText((text) => {
    text.setPlaceholder(t('settings.commandSearchPlaceholder'));
    text.inputEl.addClass('quick-editing-command-search-input');
    text.inputEl.setAttr('aria-label', t('settings.commandSearchAria'));
    text.onChange(updateResults);
  });
  updateResults('');
}
