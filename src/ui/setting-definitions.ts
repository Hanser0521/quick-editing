import type { SettingDefinition, SettingDefinitionItem } from 'obsidian';

import { FEATURE_GROUPS, type CommandCatalogEntry } from '../features/catalog';
import type { FeatureGroupKey } from '../features/types';
import { t, type MessageKey } from '../i18n';
import type { QuickEditingSettings } from '../settings';
import type { ModernSettingsPlugin } from './modern-settings';

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

const COLOR_KEYS: Array<{
  key: keyof Pick<
    QuickEditingSettings,
    | 'hColor1'
    | 'hColor2'
    | 'hColor3'
    | 'hColor4'
    | 'hColor5'
    | 'bColor1'
    | 'bColor2'
    | 'bColor3'
    | 'bColor4'
    | 'bColor5'
  >;
  label: MessageKey;
  index: number;
}> = [
  { key: 'hColor1', label: 'settings.textColor', index: 1 },
  { key: 'hColor2', label: 'settings.textColor', index: 2 },
  { key: 'hColor3', label: 'settings.textColor', index: 3 },
  { key: 'hColor4', label: 'settings.textColor', index: 4 },
  { key: 'hColor5', label: 'settings.textColor', index: 5 },
  { key: 'bColor1', label: 'settings.backgroundColor', index: 1 },
  { key: 'bColor2', label: 'settings.backgroundColor', index: 2 },
  { key: 'bColor3', label: 'settings.backgroundColor', index: 3 },
  { key: 'bColor4', label: 'settings.backgroundColor', index: 4 },
  { key: 'bColor5', label: 'settings.backgroundColor', index: 5 },
];

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function commandMatches(definition: SettingDefinition, query: string): boolean {
  const normalizedQuery = normalizedSearch(query);
  if (normalizedQuery === '') return true;
  const description = typeof definition.desc === 'string'
    ? definition.desc
    : definition.desc?.textContent ?? '';
  return normalizedSearch([
    definition.name,
    description,
    ...(definition.aliases ?? []),
  ].join(' ')).includes(normalizedQuery);
}

function commandDefinitions(entries: readonly CommandCatalogEntry[]): SettingDefinition[] {
  return entries.map((entry) => ({
    name: entry.name,
    desc: entry.id,
    aliases: [...entry.keywords],
    control: {
      type: 'toggle',
      key: `commandEnabled.${entry.id}`,
      defaultValue: true,
    },
  }));
}

export function createQuickEditingSettingDefinitions(
  plugin: ModernSettingsPlugin,
): SettingDefinitionItem[] {
  const commands = [...plugin.getCommandCatalog()]
    .sort((left, right) => left.name.localeCompare(right.name));

  return [
    {
      type: 'group',
      heading: t('settings.featureSection'),
      items: [
        ...FEATURE_GROUPS.map((definition) => ({
          name: t(FEATURE_NAME_KEYS[definition.key]),
          desc: t(FEATURE_DESCRIPTION_KEYS[definition.key]),
          aliases: [definition.name, definition.description, ...definition.keywords],
          control: {
            type: 'toggle' as const,
            key: `featureGroups.${definition.key}`,
            defaultValue: true,
          },
        })),
        {
          name: t('settings.autoPaste'),
          desc: t('settings.autoPasteDescription'),
          aliases: ['smart paste', 'clipboard', '智能粘贴', '剪贴板'],
          control: {
            type: 'toggle',
            key: 'smartPasteOnPaste',
            defaultValue: true,
            disabled: () => !plugin.settings.featureGroups.smartPaste,
          },
        },
        {
          name: t('settings.preview'),
          desc: t('settings.previewDescription'),
          aliases: ['preview', 'undo', '预览', '撤销'],
          control: {
            type: 'toggle',
            key: 'previewFullDocumentChanges',
            defaultValue: true,
            disabled: () => !plugin.settings.featureGroups.fullDocumentCleanup,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: t('settings.internalLinksSection'),
      items: [
        {
          name: t('settings.potentialTitles'),
          desc: t('settings.potentialTitlesDescription'),
          aliases: ['internal links', 'aliases', '内部链接', '潜在链接'],
          control: {
            type: 'textarea',
            key: 'linkWords',
            defaultValue: '',
            placeholder: t('settings.potentialTitlesPlaceholder'),
            rows: 8,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: t('settings.colorsSection'),
      items: COLOR_KEYS.map((color) => ({
        name: t(color.label, { index: color.index }),
        desc: t('settings.colorsDescription'),
        aliases: ['format brush', 'color', 'highlight', '格式刷', '颜色', '荧光笔'],
        control: {
          type: 'color' as const,
          key: color.key,
        },
      })),
    },
    {
      type: 'group',
      heading: t('settings.dualWindowSection'),
      items: [
        {
          name: t('settings.leftWindowScroll'),
          desc: t('settings.leftWindowScrollDescription'),
          aliases: ['scroll', 'dual window', '滚动', '双窗'],
          control: {
            type: 'slider',
            key: 'maxScroll',
            min: 25,
            max: 900,
            step: 25,
          },
        },
      ],
    },
    {
      type: 'group',
      heading: t('settings.commandSection'),
      search: {
        placeholder: t('settings.commandSearchPlaceholder'),
        match: commandMatches,
      },
      items: commandDefinitions(commands),
    },
    {
      name: t('settings.coreDivision'),
      desc: t('settings.coreDivisionDescription'),
      aliases: ['Obsidian core', '核心命令', 'color highlights', '彩色高亮'],
    },
  ];
}
