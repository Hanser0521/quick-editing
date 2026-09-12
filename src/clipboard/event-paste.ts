import type { Editor } from 'obsidian';

import { htmlToMarkdown, type HtmlDocumentParser } from './html-to-markdown.ts';
import {
  transformClipboardText,
  type SmartPasteKind,
  type SmartPasteLabels,
} from './smart-paste.ts';

export interface ClipboardPayload {
  html: string;
  text: string;
}

export interface ClipboardPasteResult {
  kind: SmartPasteKind | 'html' | 'html-table';
  text: string;
}

const STRUCTURED_HTML = /<(?:table|thead|tbody|tr|t[dh]|p|div|ul|ol|li|h[1-6]|pre|blockquote|strong|em|a|img)\b/i;

export function transformClipboardPayload(
  payload: ClipboardPayload,
  selectedText = '',
  parse?: HtmlDocumentParser,
  labels?: SmartPasteLabels,
): ClipboardPasteResult | null {
  if (payload.html.trim() !== '' && STRUCTURED_HTML.test(payload.html)) {
    const markdown = htmlToMarkdown(payload.html, parse, labels?.image);
    if (markdown !== '') {
      return {
        kind: /<table\b/i.test(payload.html) ? 'html-table' : 'html',
        text: markdown,
      };
    }
  }

  const plainResult = transformClipboardText(payload.text, selectedText, labels);
  if (plainResult.kind === 'empty' || plainResult.kind === 'code') return null;
  return plainResult;
}

export function handleClipboardEvent(
  event: ClipboardEvent,
  editor: Editor,
  parse?: HtmlDocumentParser,
  labels?: SmartPasteLabels,
): ClipboardPasteResult | null {
  if (event.defaultPrevented || !event.clipboardData) return null;
  const result = transformClipboardPayload(
    {
      html: event.clipboardData.getData('text/html'),
      text: event.clipboardData.getData('text/plain'),
    },
    editor.getSelection(),
    parse,
    labels,
  );
  if (!result) return null;
  event.preventDefault();
  editor.replaceSelection(result.text);
  return result;
}
