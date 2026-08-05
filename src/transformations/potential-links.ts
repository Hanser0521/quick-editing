export interface PotentialLinkResult {
  text: string;
  linkedTitles: string[];
}

interface TextRange {
  start: number;
  end: number;
}

interface Replacement extends TextRange {
  title: string;
}

const UNSAFE_WIKI_TITLE = /[\[\]|#^\r\n]/;
const ASCII_WORD = /[A-Za-z0-9_]/;

function addRegexRanges(value: string, expression: RegExp, ranges: TextRange[]): void {
  for (const match of value.matchAll(expression)) {
    if (match.index === undefined) continue;
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
}

function blockRanges(value: string): TextRange[] {
  const ranges: TextRange[] = [];
  const lines = Array.from(value.matchAll(/.*(?:\r?\n|$)/g))
    .filter((match) => match[0] !== '');
  let frontmatter = /^\uFEFF?---\s*(?:\r?\n|$)/.test(value);
  let fence: { character: string; length: number; start: number } | null = null;

  for (const line of lines) {
    const start = line.index ?? 0;
    const content = line[0].replace(/\r?\n$/, '');
    if (frontmatter) {
      ranges.push({ start, end: start + line[0].length });
      if (start > 0 && /^(?:---|\.\.\.)\s*$/.test(content)) frontmatter = false;
      continue;
    }

    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(content)?.[1];
    if (!fence && marker) {
      fence = { character: marker[0] ?? '`', length: marker.length, start };
    }
    if (fence) {
      ranges.push({ start, end: start + line[0].length });
      const closing = new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`);
      if (start > fence.start && closing.test(content)) fence = null;
    }
  }
  return ranges;
}

function protectedRanges(value: string): TextRange[] {
  const ranges = blockRanges(value);
  addRegexRanges(value, /!?\[\[[^\]\r\n]*\]\]/g, ranges);
  addRegexRanges(value, /!?\[[^\]\r\n]*\]\([^\r\n)]*\)/g, ranges);
  addRegexRanges(value, /(`+)[^\r\n]*?\1/g, ranges);
  addRegexRanges(value, /%%[^\r\n]*?%%/g, ranges);
  addRegexRanges(value, /https?:\/\/[^\s<>)\]]+/g, ranges);
  addRegexRanges(value, /<\/?[A-Za-z][^<>]*>/g, ranges);
  for (const match of value.matchAll(/(^|[\s([{])(#[^\s#]+)/gm)) {
    if (match.index === undefined || !match[2]) continue;
    const start = match.index + (match[1]?.length ?? 0);
    ranges.push({ start, end: start + match[2].length });
  }
  return ranges;
}

function overlaps(range: TextRange, ranges: TextRange[]): boolean {
  return ranges.some((candidate) => range.start < candidate.end && range.end > candidate.start);
}

function hasWordBoundary(value: string, title: string, start: number): boolean {
  const previous = value[start - 1] ?? '';
  const next = value[start + title.length] ?? '';
  const first = title[0] ?? '';
  const last = title.at(-1) ?? '';
  if (ASCII_WORD.test(first) && ASCII_WORD.test(previous)) return false;
  if (ASCII_WORD.test(last) && ASCII_WORD.test(next)) return false;
  return true;
}

function normalizedTitles(titles: Iterable<string>): string[] {
  return Array.from(new Set(
    Array.from(titles, (title) => title.trim())
      .filter((title) => title.length >= 2 && !UNSAFE_WIKI_TITLE.test(title)),
  )).sort((left, right) => right.length - left.length || left.localeCompare(right));
}

export function linkPotentialTitles(
  value: string,
  titles: Iterable<string>,
): PotentialLinkResult {
  const protectedText = protectedRanges(value);
  const replacements: Replacement[] = [];

  for (const title of normalizedTitles(titles)) {
    let start = value.indexOf(title);
    while (start >= 0) {
      const candidate = { start, end: start + title.length };
      if (!overlaps(candidate, protectedText) &&
          !overlaps(candidate, replacements) &&
          hasWordBoundary(value, title, start)) {
        replacements.push({ ...candidate, title });
        break;
      }
      start = value.indexOf(title, start + 1);
    }
  }

  let text = value;
  for (const replacement of replacements.slice().sort((left, right) => right.start - left.start)) {
    text = `${text.slice(0, replacement.start)}[[${replacement.title}]]${text.slice(replacement.end)}`;
  }
  const linkedTitles = replacements
    .slice()
    .sort((left, right) => left.start - right.start)
    .map((replacement) => replacement.title);
  return { text, linkedTitles };
}
