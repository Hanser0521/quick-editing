import type { SettingDefinition, SettingDefinitionItem } from 'obsidian';

import { FEATURE_GROUPS, type CommandCatalogEntry } from '../features/catalog.ts';
import type { FeatureGroupKey } from '../features/types';
import { translate, type MessageKey, type QuickEditingLocale } from '../i18n/core.ts';
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

// The 1.14 changelog documents IDs, but 1.14.4's type package does not yet
// declare them. Keep the compatibility type local; older hosts ignore IDs.
export type StableSettingDefinitionItem = SettingDefinitionItem & {
  id: string;
  items?: StableSettingDefinitionItem[];
};

function commandDefinitions(entries: readonly CommandCatalogEntry[]): Array<SettingDefinition & { id: string }> {
  return entries.map((entry) => ({
    id: `command.${entry.id}`,
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
  locale: QuickEditingLocale,
): StableSettingDefinitionItem[] {
  const t: typeof translate = (key, variables) => translate(key, variables, locale);
  const commands = [...plugin.getCommandCatalog()]
    .sort((left, right) => left.name.localeCompare(right.name));

  return [
    {
      id: 'features',
      type: 'group',
      heading: t('settings.featureSection'),
      items: [
        ...FEATURE_GROUPS.map((definition) => ({
          id: `feature.${definition.key}`,
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
          id: 'smartPasteOnPaste',
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
          id: 'previewFullDocumentChanges',
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
      id: 'internalLinks',
      type: 'group',
      heading: t('settings.internalLinksSection'),
      items: [
        {
          id: 'linkWords',
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
      id: 'colors',
      type: 'group',
      heading: t('settings.colorsSection'),
      items: COLOR_KEYS.map((color) => ({
        id: color.key,
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
      id: 'dualWindow',
      type: 'group',
      heading: t('settings.dualWindowSection'),
      items: [
        {
          id: 'maxScroll',
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
      id: 'commands',
      type: 'group',
      heading: t('settings.commandSection'),
      search: {
        placeholder: t('settings.commandSearchPlaceholder'),
        match: commandMatches,
      },
      items: commandDefinitions(commands),
    },
    {
      id: 'coreDivision',
      name: t('settings.coreDivision'),
      desc: t('settings.coreDivisionDescription'),
      aliases: ['Obsidian core', '核心命令', 'color highlights', '彩色高亮'],
    },
  ];
}
