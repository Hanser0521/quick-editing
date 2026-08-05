export type HtmlDocumentParser = (html: string) => Document;

function escapeMarkdown(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&');
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim() || ' ';
}

function safeUrl(value: string, image = false): string | null {
  const normalized = Array.from(value.trim())
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('');
  if (/^(?:javascript|vbscript):/i.test(normalized)) return null;
  if (/^data:/i.test(normalized)) {
    if (!image || !/^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i.test(normalized)) {
      return null;
    }
  }
  return normalized || null;
}

function markdownDestination(value: string): string {
  try {
    return encodeURI(value).replace(/\(/g, '%28').replace(/\)/g, '%29');
  } catch {
    return value.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
  }
}

function isSafeColor(value: string): boolean {
  return /^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([^();]*\))$/i
    .test(value.trim());
}

function safeStyle(element: Element): string {
  const style = element.getAttribute('style') ?? '';
  return style
    .split(';')
    .map((part) => part.trim())
    .map((part) => {
      const match = /^(color|background-color)\s*:\s*(.+)$/i.exec(part);
      if (!match || !isSafeColor(match[2] ?? '')) return '';
      return `${match[1]?.toLowerCase()}: ${match[2]?.trim()}`;
    })
    .filter(Boolean)
    .join('; ')
    .replace(/"/g, '&quot;');
}

function renderList(element: Element, ordered: boolean, depth = 0): string {
  const items = Array.from(element.children).filter(
    (child) => child.tagName.toLowerCase() === 'li',
  );
  const lines: string[] = [];
  items.forEach((item, index) => {
    const nestedLists = Array.from(item.children).filter((child) =>
      ['ul', 'ol'].includes(child.tagName.toLowerCase()),
    );
    const content = Array.from(item.childNodes)
      .filter((child) => !(
        child.nodeType === 1 &&
        ['ul', 'ol'].includes((child as Element).tagName.toLowerCase())
      ))
      .map(renderNode)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    const marker = ordered ? `${index + 1}.` : '-';
    lines.push(`${'  '.repeat(depth)}${marker} ${content}`);
    for (const nested of nestedLists) {
      lines.push(renderList(nested, nested.tagName.toLowerCase() === 'ol', depth + 1).trimEnd());
    }
  });
  return `${lines.join('\n')}\n\n`;
}

function renderTable(element: Element): string {
  let pendingRowSpans: number[] = [];
  const rows = Array.from(element.querySelectorAll('tr'))
    .filter((row) => row.closest('table') === element)
    .map((row) => {
      const cells = Array.from(row.children).filter((cell) =>
        ['th', 'td'].includes(cell.tagName.toLowerCase()),
      );
      const output: string[] = [];
      const nextRowSpans = pendingRowSpans.map((remaining) => Math.max(0, remaining - 1));
      let column = 0;

      const appendPendingCells = (): void => {
        while ((pendingRowSpans[column] ?? 0) > 0) {
          output.push(' ');
          column += 1;
        }
      };

      for (const cell of cells) {
        appendPendingCells();
        const columnSpan = Math.max(1, Number.parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1);
        const rowSpan = Math.max(1, Number.parseInt(cell.getAttribute('rowspan') ?? '1', 10) || 1);
        output.push(escapeTableCell(Array.from(cell.childNodes).map(renderNode).join('')));
        for (let offset = 1; offset < columnSpan; offset += 1) output.push(' ');
        if (rowSpan > 1) {
          for (let offset = 0; offset < columnSpan; offset += 1) {
            nextRowSpans[column + offset] = Math.max(nextRowSpans[column + offset] ?? 0, rowSpan - 1);
          }
        }
        column += columnSpan;
      }

      const lastPendingColumn = pendingRowSpans.findLastIndex((remaining) => remaining > 0);
      while (column <= lastPendingColumn) {
        output.push(' ');
        column += 1;
      }
      pendingRowSpans = nextRowSpans;
      return output;
    })
    .filter((row) => row.length > 0);
  if (rows.length === 0) return '';
  const columnCount = Math.max(...rows.map((row) => row.length));
  const formatRow = (row: string[]): string => {
    const cells = Array.from({ length: columnCount }, (_, index) => row[index] ?? ' ');
    return `| ${cells.join(' | ')} |`;
  };
  const [header = [], ...body] = rows;
  return `${[
    formatRow(header),
    formatRow(Array.from({ length: columnCount }, () => '---')),
    ...body.map(formatRow),
  ].join('\n')}\n\n`;
}

function renderNode(node: Node): string {
  if (node.nodeType === 3) return (node.nodeValue ?? '').replace(/\u00a0/g, ' ');
  if (node.nodeType !== 1) return '';

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const content = (): string => Array.from(element.childNodes).map(renderNode).join('');
  if (['script', 'style', 'meta', 'link', 'noscript'].includes(tag)) return '';
  if (tag === 'br') return '\n';
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag.slice(1)))} ${content().trim()}\n\n`;
  if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
    return `${content().trim()}\n\n`;
  }
  if (tag === 'strong' || tag === 'b') return `**${content().trim()}**`;
  if (tag === 'em' || tag === 'i') return `*${content().trim()}*`;
  if (tag === 'del' || tag === 's' || tag === 'strike') return `~~${content().trim()}~~`;
  if (tag === 'u') return `<u>${content().trim()}</u>`;
  if (tag === 'code' && element.parentElement?.tagName.toLowerCase() !== 'pre') {
    const value = content();
    const longest = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
    const fence = '`'.repeat(Math.max(1, longest + 1));
    const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
    return `${fence}${padding}${value}${padding}${fence}`;
  }
  if (tag === 'pre') {
    const value = element.textContent ?? '';
    const longest = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    return `${fence}\n${value.replace(/\n$/, '')}\n${fence}\n\n`;
  }
  if (tag === 'a') {
    const href = safeUrl(element.getAttribute('href') ?? '');
    const label = escapeMarkdown(content().trim());
    return href ? `[${label || href}](${markdownDestination(href)})` : label;
  }
  if (tag === 'img') {
    const alt = escapeMarkdown(element.getAttribute('alt') || '图片');
    const source = safeUrl(element.getAttribute('src') ?? '', true);
    return source ? `![${alt}](${markdownDestination(source)})` : alt;
  }
  if (tag === 'ul' || tag === 'ol') return renderList(element, tag === 'ol');
  if (tag === 'table') return renderTable(element);
  if (tag === 'blockquote') {
    return `${content().trim().split('\n').map((line) => `> ${line}`).join('\n')}\n\n`;
  }
  if (tag === 'span') {
    const value = content();
    const style = safeStyle(element);
    return style ? `<span style="${style}">${value}</span>` : value;
  }
  return content();
}

export function htmlToMarkdown(
  html: string,
  parse: HtmlDocumentParser = (source) => new DOMParser().parseFromString(source, 'text/html'),
): string {
  const source = /<(?:html|body)\b/i.test(html)
    ? html
    : `<!doctype html><html><body>${html}</body></html>`;
  const document = parse(source);
  const markdown = Array.from(document.body.childNodes).map(renderNode).join('');
  return markdown
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
