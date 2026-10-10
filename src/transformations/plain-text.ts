import { parseMarkdownTree, type PositionedNode } from '../markdown/context.ts';
import { removePlainTextDelimiters } from './highlight-colors.ts';

/** Extract visible Markdown text; code and math contents are never reformatted. */
export function markdownToPlainText(source: string): string {
  const markdown = removePlainTextDelimiters(source);
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  function render(node: PositionedNode): string {
    const children = node.children ?? [];
    switch (node.type) {
      case 'root':
        return children.map(render).filter(Boolean).join(`${newline}${newline}`);
      case 'list':
      case 'listItem':
      case 'blockquote':
        return children.map(render).join(newline);
      case 'text':
        return (node.value ?? '').replace(/!?\[\[([^\]\n]+)\]\]/g, (_match, target: string) => {
          const separator = target.lastIndexOf('|');
          return separator >= 0 ? target.slice(separator + 1) : target;
        });
      case 'inlineCode':
      case 'code':
        return node.value ?? '';
      case 'yaml':
      case 'toml':
      case 'math':
      case 'inlineMath': {
        const from = node.position?.start.offset;
        const to = node.position?.end.offset;
        return typeof from === 'number' && typeof to === 'number' ? markdown.slice(from, to) : node.value ?? '';
      }
      case 'image':
      case 'imageReference':
        return node.alt ?? '';
      case 'break':
        return newline;
      case 'definition':
      case 'thematicBreak':
        return '';
      case 'html':
        return (node.value ?? '').replace(/<[^>]+>/g, '');
      default:
        return children.map(render).join('');
    }
  }
  return render(parseMarkdownTree(markdown))
    .replace(/\r?\n/g, newline);
}
