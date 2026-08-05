import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mathFromMarkdown } from 'mdast-util-math';
import { frontmatter } from 'micromark-extension-frontmatter';
import { math } from 'micromark-extension-math';

export interface MarkdownRange {
  from: number;
  to: number;
  type: string;
}

interface PositionedNode {
  type: string;
  position?: {
    start: { offset?: number };
    end: { offset?: number };
  };
  children?: PositionedNode[];
}

const PROTECTED_NODE_TYPES = new Set([
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
]);

function mergeRanges(ranges: MarkdownRange[]): MarkdownRange[] {
  const sorted = ranges
    .filter((range) => range.to > range.from)
    .sort((left, right) => left.from - right.from || right.to - left.to);
  const merged: MarkdownRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
      if (!previous.type.includes(range.type)) previous.type = `${previous.type},${range.type}`;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function collectProtectedNodes(node: PositionedNode, output: MarkdownRange[]): void {
  const from = node.position?.start.offset;
  const to = node.position?.end.offset;
  if (
    PROTECTED_NODE_TYPES.has(node.type) &&
    typeof from === 'number' &&
    typeof to === 'number'
  ) {
    output.push({ from, to, type: node.type });
    return;
  }
  for (const child of node.children ?? []) collectProtectedNodes(child, output);
}

function collectObsidianRanges(markdown: string): MarkdownRange[] {
  const ranges: MarkdownRange[] = [];
  for (const match of markdown.matchAll(/!?\[\[[^\]\n]+\]\]/g)) {
    if (match.index !== undefined) {
      ranges.push({ from: match.index, to: match.index + match[0].length, type: 'wikiLink' });
    }
  }
  for (const match of markdown.matchAll(/%%[\s\S]*?%%/g)) {
    if (match.index !== undefined) {
      ranges.push({ from: match.index, to: match.index + match[0].length, type: 'comment' });
    }
  }
  return ranges;
}

export function markdownProtectedRanges(markdown: string): MarkdownRange[] {
  const tree = fromMarkdown(markdown, {
    extensions: [frontmatter(['yaml', 'toml']), math()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml']), mathFromMarkdown()],
  }) as PositionedNode;
  const ranges = collectObsidianRanges(markdown);
  collectProtectedNodes(tree, ranges);
  return mergeRanges(ranges);
}

export function isMarkdownOffsetProtected(markdown: string, offset: number): boolean {
  return markdownProtectedRanges(markdown).some(
    (range) => offset >= range.from && offset < range.to,
  );
}

export function transformMarkdownOutsideProtected(
  markdown: string,
  transform: (value: string) => string,
): string {
  const ranges = markdownProtectedRanges(markdown);
  if (ranges.length === 0) return transform(markdown);

  let cursor = 0;
  let output = '';
  for (const range of ranges) {
    output += transform(markdown.slice(cursor, range.from));
    output += markdown.slice(range.from, range.to);
    cursor = range.to;
  }
  output += transform(markdown.slice(cursor));
  return output;
}

export function transformMarkdownRangeOutsideProtected(
  markdown: string,
  from: number,
  to: number,
  transform: (value: string) => string,
): string {
  const start = Math.max(0, Math.min(from, markdown.length));
  const end = Math.max(start, Math.min(to, markdown.length));
  const intersections = markdownProtectedRanges(markdown)
    .filter((range) => range.to > start && range.from < end)
    .map((range) => ({
      ...range,
      from: Math.max(start, range.from),
      to: Math.min(end, range.to),
    }));
  if (intersections.length === 0) return transform(markdown.slice(start, end));

  let cursor = start;
  let output = '';
  for (const range of intersections) {
    output += transform(markdown.slice(cursor, range.from));
    output += markdown.slice(range.from, range.to);
    cursor = range.to;
  }
  output += transform(markdown.slice(cursor, end));
  return output;
}
