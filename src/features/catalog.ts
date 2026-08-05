import type { Command } from 'obsidian';

import type { FeatureGroupKey } from './types';

export interface FeatureGroupDefinition {
  key: FeatureGroupKey;
  name: string;
  description: string;
  keywords: string[];
}

export interface CommandCatalogEntry {
  id: string;
  name: string;
  group?: FeatureGroupKey;
  keywords: string[];
  defaultEnabled: boolean;
}

export const FEATURE_GROUPS: readonly FeatureGroupDefinition[] = [
  {
    key: 'smartSymbols',
    name: '智能符号',
    description: '括号补全、语法跳过、代码块缩写与 Callout 转换。',
    keywords: ['符号', '括号', 'callout', '代码块'],
  },
  {
    key: 'formatBrush',
    name: '格式刷',
    description: '状态栏格式刷、标题刷、颜色与高亮刷。',
    keywords: ['格式', '高亮', '颜色', '标题'],
  },
  {
    key: 'smartPaste',
    name: '智能粘贴',
    description: '通过 ClipboardEvent 处理 URL、路径、HTML 与表格。',
    keywords: ['粘贴', '剪贴板', 'html', '表格', 'clipboard'],
  },
  {
    key: 'fullDocumentCleanup',
    name: '全文清理',
    description: '空格、空行、标点、断行、注释和批量链接整理。',
    keywords: ['全文', '清理', '空格', '空行', '标点', '链接'],
  },
];

const FULL_DOCUMENT_COMMANDS = new Set([
  'all-links',
  'add-lines',
  'del-lines',
  'space-lines',
  'add-twoSpace',
  'add-space2',
  'del-space1',
  'add-space1',
  'del-space2',
  'add-allSpspace',
  'del-allSpspace',
  'del-allZhushi',
  'edit-intext',
  'edit-biaodian',
  'edit-yufa',
  'edit-duanhang',
  'promote-lines-level',
  'Down-lines-level',
]);

const SMART_PASTE_COMMANDS = new Set(['paste-text', 'paste-picText']);
const SMART_SYMBOL_COMMANDS = new Set(['auto-text', 'auto-texts']);

export const REDUNDANT_CORE_COMMANDS = new Set([
  'mouse-up',
  'mouse-down',
  'mouse-left',
  'mouse-right',
  'mouse-start',
  'mouse-end',
  'note-start',
  'note-end',
  'biaoti0-text',
  'biaoti1-text',
  'biaoti2-text',
  'biaoti3-text',
  'biaoti4-text',
  'biaoti5-text',
  'biaoti6-text',
  'cuti-text',
  'xieti-text',
  'shanchu-text',
  'add-daima',
]);

export function featureGroupForCommand(commandId: string): FeatureGroupKey | undefined {
  if (SMART_SYMBOL_COMMANDS.has(commandId)) return 'smartSymbols';
  if (SMART_PASTE_COMMANDS.has(commandId)) return 'smartPaste';
  if (FULL_DOCUMENT_COMMANDS.has(commandId)) return 'fullDocumentCleanup';
  if (commandId.endsWith('-format') || commandId === 'quit-format') return 'formatBrush';
  return undefined;
}

export function commandDefaultEnabled(commandId: string): boolean {
  return !REDUNDANT_CORE_COMMANDS.has(commandId);
}

export function commandCatalogEntry(command: Command): CommandCatalogEntry {
  const group = featureGroupForCommand(command.id);
  const groupDefinition = FEATURE_GROUPS.find((definition) => definition.key === group);
  return {
    id: command.id,
    name: command.name,
    group,
    keywords: [
      command.id,
      command.name,
      ...(groupDefinition?.keywords ?? []),
      groupDefinition?.name ?? '',
    ].filter(Boolean),
    defaultEnabled: commandDefaultEnabled(command.id),
  };
}
