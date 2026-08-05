import type { TFile } from 'obsidian';

export interface InternalLinkServices {
  resolveLink(linkpath: string, sourcePath: string): TFile | null;
  resolveAlias(alias: string): TFile | null;
  generateLink(file: TFile, sourcePath: string, subpath: string, alias: string): string;
}

interface ParsedLinkInput {
  linkpath: string;
  subpath: string;
  alias: string;
  wasWikiLink: boolean;
}

function parseLinkInput(value: string): ParsedLinkInput | null {
  const trimmed = value.trim();
  const wikiMatch = /^!?\[\[([\s\S]+)\]\]$/.exec(trimmed);
  const body = wikiMatch?.[1] ?? trimmed;
  const pipeIndex = body.lastIndexOf('|');
  const target = (pipeIndex >= 0 ? body.slice(0, pipeIndex) : body).trim();
  const alias = (pipeIndex >= 0 ? body.slice(pipeIndex + 1) : '').trim();
  const subpathIndex = target.search(/[#^]/);
  const linkpath = (subpathIndex >= 0 ? target.slice(0, subpathIndex) : target).trim();
  const subpath = subpathIndex >= 0 ? target.slice(subpathIndex).trim() : '';
  if (linkpath === '' || /[\[\]\n\r]/.test(linkpath)) return null;
  return { linkpath, subpath, alias, wasWikiLink: Boolean(wikiMatch) };
}

function defaultAlias(input: ParsedLinkInput, file: TFile): string {
  if (input.alias !== '') return input.alias;
  const pathWithoutExtension = file.path.replace(/\.md$/i, '');
  if (input.linkpath === file.basename || input.linkpath === pathWithoutExtension) return '';
  return input.linkpath;
}

export function generateResolvedInternalLink(
  value: string,
  sourcePath: string,
  services: InternalLinkServices,
): string | null {
  const input = parseLinkInput(value);
  if (!input) return null;
  if (input.wasWikiLink) return input.alias || `${input.linkpath}${input.subpath}`;

  const file = services.resolveLink(input.linkpath, sourcePath)
    ?? services.resolveAlias(input.linkpath);
  if (!file) return `[[${input.linkpath}${input.subpath}${input.alias ? `|${input.alias}` : ''}]]`;
  return services.generateLink(
    file,
    sourcePath,
    input.subpath,
    defaultAlias(input, file),
  );
}

export function convertInternalLinkSelection(
  selection: string,
  sourcePath: string,
  services: InternalLinkServices,
): string {
  return selection
    .split(/([、\r\n]+)/)
    .map((part) => {
      if (/^[、\r\n]+$/.test(part) || part.trim() === '') return part;
      const leading = part.match(/^\s*/)?.[0] ?? '';
      const trailing = part.match(/\s*$/)?.[0] ?? '';
      const core = part.slice(leading.length, part.length - trailing.length);
      return `${leading}${generateResolvedInternalLink(core, sourcePath, services) ?? core}${trailing}`;
    })
    .join('');
}
