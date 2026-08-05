export function repairUnexpectedLineBreaks(value: string): string {
  return value
    .replace(/(?<=[^a-zA-Z])\s+(?=\r*\n)/g, '')
    .replace(/(?<=\w)\s+(?=\r*\n)/g, ' ')
    .replace(/([^。？！.?!\w])(\r*\n)+/gm, '$1')
    .replace(/(\w)(\r*\n)+/gm, '$1 ');
}

export function normalizeMixedPunctuation(value: string): string {
  return value
    .replace(/\n/g, '↫')
    .replace(/(?<=[一-龥”’）》】])\s*,\s*([一-龥“‘（《【↫])/g, '，$1')
    .replace(/(?<=[一-龥”’）》】])\s*\.\s*([一-龥“‘（《【↫]|$)/g, '。$1')
    .replace(/(?<=[一-龥”’）》】])\s*\?\s*([一-龥“‘（《【↫]|$)/g, '？$1')
    .replace(/(?<=[一-龥”’）》】])\s*:\s*([一-龥“‘（《【↫]|$)/g, '：$1')
    .replace(/(?<=[一-龥”’）》】])\s*;\s*([一-龥“‘（《【↫]|$)/g, '；$1')
    .replace(/(?<=[a-zA-Z0-9])\s*;\s*([一-龥“‘（《【↫]|$)/g, '；$1')
    .replace(/(?<=[一-龥”’）》】])\s*;\s*([a-zA-Z0-9↫]|$)/g, '；$1')
    .replace(/(?<=[a-zA-Z0-9])\s*;\s*([一-龥↫]|$)/g, '；$1')
    .replace(/(?<=[一-龥])\s*;\s*([a-zA-Z0-9↫]|$)/g, '；$1')
    .replace(/(?<=[一-龥])\s+(?=[一-龥])/g, '')
    .replace(/(?<=[^一-龥])，([^一-龥])/g, ',$1')
    .replace(/(?<=[^一-龥])。([^一-龥])/g, '.$1')
    .replace(/(?<=[^一-龥])？([^一-龥])/g, '?$1')
    .replace(/(?<=[^一-龥])：([^一-龥])/g, ':$1')
    .replace(/(?<=[^一-龥])；([^一-龥])/g, ';$1')
    .replace(/[（(]([^一-龥]+)[）)]/g, '($1)')
    .replace(/[（(](.*?[一-龥].*?)[）)]/g, '（$1）')
    .replace(/：：/g, '::')
    .replace(/【【/g, '[[')
    .replace(/】】/g, ']]')
    .replace(/(?<=[,.?!])([^\s0-9a-zA-Z])/g, ' $1')
    .replace(/↫/g, '\n');
}

export function repairMarkdownSyntax(value: string): string {
  return value
    .replace(/[【[]([^\[\]【】]*)[】\]][（(]([^()（）]*)[）)]/g, '[$1]($2)')
    .replace(/\[+([^\[\]]*)\]+\(/g, '[$1](')
    .replace(/(?<=^|\s) {4}/gm, '\t')
    .replace(/(?<=\]\([^()\r\n]+\))(?=\r?$)/gm, '  ')
    .replace(/\*\s+>\s+/g, '- ')
    .replace(/(?<=\s)[0-9]+。 /g, '1. ');
}

export function repairExternalText(value: string): string {
  return normalizeMixedPunctuation(repairUnexpectedLineBreaks(value));
}
