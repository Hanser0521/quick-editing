import { isWindowsPath, windowsPathToFileUrl } from '../utils/windows-path.ts';

export type SmartPasteKind =
  | 'empty'
  | 'media-url'
  | 'url'
  | 'media-path'
  | 'path'
  | 'table'
  | 'code';

export interface SmartPasteResult {
  kind: SmartPasteKind;
  text: string;
}

export interface SmartPasteLabels {
  image: string;
  link: string;
  local: string;
}

const DEFAULT_LABELS: SmartPasteLabels = {
  image: '图片',
  link: '链接',
  local: '本地',
};

const MEDIA_EXTENSION = /\.(?:avif|gif|jpe?g|m4a|mid|mov|mp3|mp4|png|svg|wav|webp)(?:[?#].*)?$/i;
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeLabel(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&');
}

function escapeTableCell(value: string): string {
  const escaped = value.replace(/\|/g, '\\|').trim();
  return escaped === '' ? ' ' : escaped;
}

function convertTsv(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const rows = normalized.split('\n').map((row) => row.split('\t'));
  const columnCount = Math.max(...rows.map((row) => row.length));
  if (rows.length === 0 || columnCount < 2) return null;

  const formatRow = (row: string[]): string => {
    const cells = Array.from({ length: columnCount }, (_, index) =>
      escapeTableCell(row[index] ?? ''),
    );
    return `| ${cells.join(' | ')} |`;
  };

  const [header = [], ...body] = rows;
  return [
    formatRow(header),
    `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`,
    ...body.map(formatRow),
  ].join('\n');
}

function wrapCodeFence(value: string): string {
  const longestRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  const content = value.endsWith('\n') ? value : `${value}\n`;
  return `${fence}\n${content}${fence}\n`;
}

export function transformClipboardText(
  clipboardText: string,
  selectedText = '',
  labels: SmartPasteLabels = DEFAULT_LABELS,
): SmartPasteResult {
  const trimmed = clipboardText.trim();
  const label = escapeLabel(selectedText.trim());
  if (trimmed === '') return { kind: 'empty', text: '' };

  if (isHttpUrl(trimmed)) {
    if (MEDIA_EXTENSION.test(trimmed)) {
      return { kind: 'media-url', text: `![${label || labels.image}](${trimmed})` };
    }
    return { kind: 'url', text: `[${label || labels.link}](${trimmed})` };
  }

  if (isWindowsPath(trimmed)) {
    const kind = MEDIA_EXTENSION.test(trimmed) ? 'media-path' : 'path';
    const prefix = kind === 'media-path' ? '!' : '';
    const fileUrl = windowsPathToFileUrl(trimmed);
    return { kind, text: `${prefix}[${label || labels.local}](${fileUrl})` };
  }

  const table = convertTsv(clipboardText);
  if (table !== null) return { kind: 'table', text: table };

  return { kind: 'code', text: wrapCodeFence(clipboardText) };
}
