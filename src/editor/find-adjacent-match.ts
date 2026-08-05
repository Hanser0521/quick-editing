import { escapeRegExp } from '../utils/text.ts';

export type MatchDirection = '上' | '下';

export interface MatchRange {
  from: number;
  to: number;
}

function globalPattern(pattern: string | RegExp): RegExp | undefined {
  if (typeof pattern === 'string') {
    return pattern === '' ? undefined : new RegExp(escapeRegExp(pattern), 'g');
  }

  const flags = pattern.flags.replace(/[gy]/g, '') + 'g';
  return new RegExp(pattern.source, flags);
}

function matchesIn(text: string, pattern: string | RegExp): RegExpExecArray[] {
  const expression = globalPattern(pattern);
  if (!expression) return [];

  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text)) !== null) {
    if (match[0].length > 0) matches.push(match);
    if (expression.lastIndex === match.index) expression.lastIndex += 1;
  }
  return matches;
}

export function findAdjacentMatch(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  pattern: string | RegExp,
  direction: MatchDirection,
): MatchRange | undefined {
  const from = Math.max(0, Math.min(text.length, selectionStart, selectionEnd));
  const to = Math.max(from, Math.min(text.length, Math.max(selectionStart, selectionEnd)));

  if (direction === '下') {
    const match = matchesIn(text.slice(to), pattern)[0];
    if (!match) return undefined;
    const start = to + match.index;
    return { from: start, to: start + match[0].length };
  }

  const matches = matchesIn(text.slice(0, from), pattern);
  const match = matches.at(-1);
  if (!match) return undefined;
  return { from: match.index, to: match.index + match[0].length };
}
