import { markdownNodeRanges, type MarkdownRange } from '../markdown/context.ts';

const IMAGE_NODE_TYPES = ['image', 'imageReference'] as const;
const WIKI_EMBED_PROTECTED_NODE_TYPES = [
  'yaml',
  'toml',
  'code',
  'inlineCode',
  'math',
  'inlineMath',
  'html',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'definition',
] as const;

function overlaps(left: MarkdownRange, right: MarkdownRange): boolean {
  return left.to > right.from && left.from < right.to;
}

function mergeImageRanges(ranges: MarkdownRange[]): MarkdownRange[] {
  const sorted = ranges
    .filter((range) => range.to > range.from)
    .sort((left, right) => left.from - right.from || right.to - left.to);
  const merged: MarkdownRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export function markdownImageLinkRanges(markdown: string): MarkdownRange[] {
  const ranges = markdownNodeRanges(markdown, IMAGE_NODE_TYPES);
  const protectedRanges = markdownNodeRanges(markdown, WIKI_EMBED_PROTECTED_NODE_TYPES);

  for (const match of markdown.matchAll(/!\[\[[^\]\r\n]+\]\]/g)) {
    if (match.index === undefined) continue;
    const candidate = {
      from: match.index,
      to: match.index + match[0].length,
      type: 'wikiImage',
    };
    if (!protectedRanges.some((range) => overlaps(candidate, range))) ranges.push(candidate);
  }

  for (const htmlRange of markdownNodeRanges(markdown, ['html'])) {
    const html = markdown.slice(htmlRange.from, htmlRange.to);
    for (const match of html.matchAll(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
      if (match.index === undefined) continue;
      ranges.push({
        from: htmlRange.from + match.index,
        to: htmlRange.from + match.index + match[0].length,
        type: 'htmlImage',
      });
    }
  }

  return mergeImageRanges(ranges);
}

export function removeImageLinksInRange(
  markdown: string,
  from: number,
  to: number,
): string {
  const start = Math.max(0, Math.min(from, markdown.length));
  const end = Math.max(start, Math.min(to, markdown.length));
  const ranges = markdownImageLinkRanges(markdown)
    .filter((range) => range.from >= start && range.to <= end);
  let cursor = start;
  let output = '';
  for (const range of ranges) {
    output += markdown.slice(cursor, range.from);
    cursor = range.to;
  }
  return output + markdown.slice(cursor, end);
}

export function removeImageLinks(markdown: string): string {
  return removeImageLinksInRange(markdown, 0, markdown.length);
}
