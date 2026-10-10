import { markdownNodeRanges } from '../markdown/context.ts';

function isEscaped(source: string, offset: number): boolean {
  let slashes = 0;
  for (let index = offset - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1;
  return slashes % 2 === 1;
}

/** Strip only Obsidian 1.14's color metadata, never ordinary colored emoji. */
export function removeNativeHighlightColors(source: string): string {
  if (!/==(?:🔴|🟠|🟡|🟢|🔵|🟣)/u.test(source)) return source;
  const protectedRanges = markdownNodeRanges(source, [
    'yaml', 'toml', 'code', 'inlineCode', 'math', 'inlineMath', 'html',
  ]);
  return source.replace(/==(🔴|🟠|🟡|🟢|🔵|🟣)([^=]*?)==/gu, (match, _color: string, body: string, offset: number) => {
    const closingOffset = offset + match.length - 2;
    if (isEscaped(source, offset) || isEscaped(source, closingOffset)
      || protectedRanges.some((range) => offset >= range.from && offset < range.to)) return match;
    return `==${body}==`;
  });
}

/** Strip highlight/strike delimiters for plain text, including nested styling. */
export function removePlainTextDelimiters(source: string): string {
  const ranges = markdownNodeRanges(source, ['yaml', 'toml', 'code', 'inlineCode', 'math', 'inlineMath', 'html']);
  return source.replace(/(==|~~)([\s\S]*?)\1/g, (match, delimiter: string, body: string, offset: number) => {
    if (isEscaped(source, offset) || isEscaped(source, offset + match.length - 2)
      || ranges.some((range) => offset >= range.from && offset < range.to)) return match;
    return delimiter === '==' ? body.replace(/^(?:🔴|🟠|🟡|🟢|🔵|🟣)/u, '') : body;
  });
}
