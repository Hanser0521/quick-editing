const CJK = '\\p{Script=Han}';

export function addCjkLatinSpacing(text: string): string {
  return text
    .replace(new RegExp(`([A-Za-z]+)(${CJK}+)`, 'gu'), '$1 $2')
    .replace(new RegExp(`(${CJK}+)([A-Za-z]+)`, 'gu'), '$1 $2');
}

export function removeHorizontalSpaces(text: string): string {
  return text.replace(/[ \u3000]+/g, '');
}

export function removeInlineComments(text: string): string {
  return text.replace(/%%[^%\r\n]*%%/g, '');
}

export function trimTrailingWhitespace(text: string): string {
  return text.replace(/[ \t\u3000]+$/gm, '');
}
